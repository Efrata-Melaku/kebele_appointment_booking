const { Prisma } = require('@prisma/client');
const { runTransaction } = require('../models/_client');
const appointmentModel = require('../models/appointment.model');
const appointmentGroupModel = require('../models/appointmentGroup.model');
const residentModel = require('../models/resident.model');
const userModel = require('../models/user.model');
const generateAppointmentNumber = require('../utils/generateAppointmentNumber');
const { isAppointmentNumberRef } = require('../utils/appointmentRef');
const { APPOINTMENT_STATUS } = require('../config/constants');
const { attachTimeSlot, attachTimeSlotMany } = require('../utils/appointmentSlot');
const slotAvailability = require('./slotAvailability.service');
const formSubmissionService = require('./formSubmission.service');
const dynamicFormService = require('./dynamicForm.service');
const {
  requireNormalizedPhone,
  assertPhoneMatchesResident,
  normalizeEthiopianPhone,
} = require('../utils/ethiopianPhone');
const { resolveDateFilterRange } = require('../utils/dateRange');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const BOOKING_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 8000,
  timeout: 15000,
};

const READ_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 8000,
  timeout: 15000,
};

const appointmentInclude = {
  group: {
    include: {
      resident: true,
    },
  },
  service: {
    include: {
      department: true,
    },
  },
  feedback: true,
};

const appointmentCreateSelect = {
  id: true,
  status: true,
  documentUrl: true,
  createdAt: true,
  updatedAt: true,
  serviceId: true,
  slotDate: true,
  slotStartTime: true,
  slotEndTime: true,
  groupId: true,
  group: {
    select: {
      appointmentNumber: true,
      resident: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          gender: true,
          documentUrl: true,
        },
      },
    },
  },
  service: {
    select: {
      id: true,
      name: true,
      description: true,
      durationInMinutes: true,
      staffCount: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  },
};

function withPublicNumber(apt) {
  if (!apt) return apt;
  const mapped = attachTimeSlot(apt);
  const { group, ...rest } = mapped;
  return {
    ...rest,
    appointmentNumber: group?.appointmentNumber,
    resident: group?.resident,
  };
}

function startOfDayUtc(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function assertMoreThanOneDayBeforeSlot(slotDate) {
  const slotDay = startOfDayUtc(slotDate);
  const today = startOfDayUtc(new Date());
  const diffMs = slotDay.getTime() - today.getTime();
  const diffDays = diffMs / 86400000;
  if (diffDays <= 1) {
    throw new Error(
      'This change is only allowed when more than one full day remains before the appointment date.'
    );
  }
}

function parseBookingSlot(appointmentData) {
  const { serviceId, slotDate, slotStart, timeSlotId } = appointmentData;

  if (slotDate && slotStart) {
    return {
      serviceId: Number(serviceId),
      slotDate: String(slotDate),
      slotStart: String(slotStart),
    };
  }

  if (timeSlotId != null) {
    throw new Error('timeSlotId is no longer supported; use slotDate and slotStart');
  }

  throw new Error('slotDate and slotStart are required');
}

function buildAdminWhere(filters) {
  const where = {};
  const groupWhere = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.serviceId) {
    where.serviceId = Number(filters.serviceId);
  }
  if (filters.departmentId) {
    where.service = { departmentId: Number(filters.departmentId) };
  }
  const slotDateRange = resolveDateFilterRange(filters);
  if (slotDateRange) {
    where.slotDate = slotDateRange;
  }
  if (filters.appointmentNumber?.trim()) {
    groupWhere.appointmentNumber = { contains: filters.appointmentNumber.trim() };
  }
  if (filters.residentName?.trim()) {
    groupWhere.resident = {
      fullName: { contains: filters.residentName.trim() },
    };
  }
  if (filters.phone?.trim()) {
    const normalized = normalizeEthiopianPhone(filters.phone) || filters.phone.trim();
    groupWhere.resident = {
      ...(groupWhere.resident || {}),
      phone: normalized,
    };
  }
  if (Object.keys(groupWhere).length) {
    where.group = groupWhere;
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { group: { appointmentNumber: { contains: q } } },
      { group: { resident: { fullName: { contains: q } } } },
      { group: { resident: { phone: { contains: q } } } },
    ];
  }

  return where;
}

function mapAdminListRow(apt) {
  const flat = attachTimeSlot(apt);
  return {
    id: flat.id,
    appointmentNumber: flat.group?.appointmentNumber,
    residentName: flat.group?.resident?.fullName,
    phone: flat.group?.resident?.phone,
    serviceName: flat.service?.name,
    departmentName: flat.service?.department?.name,
    status: flat.status,
    slotDate: flat.slotDate,
    slotStartTime: flat.slotStartTime,
    slotEndTime: flat.slotEndTime,
    timeSlot: flat.timeSlot,
    createdAt: flat.createdAt,
    updatedAt: flat.updatedAt,
    hasFeedback: Boolean(flat.feedback),
    feedbackRating: flat.feedback?.rating ?? null,
  };
}

class AppointmentService {
  async getAvailableSlots(serviceId, date) {
    return slotAvailability.getAvailableSlotsForResidents(serviceId, date);
  }

  async createAppointment(
    appointmentData,
    documentUrl = null,
    formResponseRows = null,
    fileMetaByFieldId = {}
  ) {
    const { fullName, gender } = appointmentData;
    const phone = requireNormalizedPhone(appointmentData.phone);
    const { serviceId, slotDate, slotStart } = parseBookingSlot(appointmentData);

    const resolved = await slotAvailability.resolveBookableSlot(serviceId, slotDate, slotStart);

    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const appointmentNumber = generateAppointmentNumber();
      try {
        return await runTransaction(async (tx) => {
          await slotAvailability.assertSlotHasCapacity(tx, {
            serviceId: resolved.service.id,
            slotDate: resolved.dayStart,
            slotStartTime: resolved.slotStartTime,
            staffCount: resolved.staffCount,
          });

          const resident = await residentModel.upsertResident(
            { phone },
            {
              fullName,
              phone,
              gender,
              documentUrl: documentUrl != null && documentUrl !== '' ? documentUrl : null,
            },
            {
              fullName,
              gender,
              ...(documentUrl != null && documentUrl !== '' ? { documentUrl } : {}),
            },
            { select: { id: true } },
            tx
          );

          const group = await appointmentGroupModel.createAppointmentGroup(
            {
              appointmentNumber,
              residentId: resident.id,
            },
            { select: { id: true } },
            tx
          );

          const appointment = await appointmentModel.createAppointment(
            {
              groupId: group.id,
              serviceId: resolved.service.id,
              slotDate: resolved.dayStart,
              slotStartTime: resolved.slotStartTime,
              slotEndTime: resolved.slotEndTime,
              ...(documentUrl != null && documentUrl !== ''
                ? { documentUrl }
                : {}),
            },
            { select: appointmentCreateSelect },
            tx
          );

          if (formResponseRows?.length) {
            await formSubmissionService.createSubmission(tx, {
              serviceId: resolved.service.id,
              appointmentId: appointment.id,
              residentId: resident.id,
              rows: formResponseRows,
              fileMetaByFieldId,
            });
          }

          const withResponses = await formSubmissionService.attachSubmissionToAppointment(appointment);
          return withPublicNumber(withResponses);
        }, BOOKING_TRANSACTION_OPTIONS);
      } catch (err) {
        if (err.code === 'P2002') {
          const targets = Array.isArray(err.meta?.target) ? err.meta.target : [];
          if (targets.includes('appointmentNumber')) {
            continue;
          }
        }
        throw err;
      }
    }

    throw new Error('Unable to generate a unique appointment number, please try again');
  }

  async rescheduleAppointment(appointmentId, { phone, slotDate, slotStart, timeSlotId }) {
    if (timeSlotId != null) {
      throw new Error('timeSlotId is no longer supported; use slotDate and slotStart');
    }

    const normalizedPhone = requireNormalizedPhone(phone);

    return runTransaction(async (tx) => {
      const appointment = await appointmentModel.findAppointmentById(appointmentId, {
        include: {
          group: { include: { resident: true } },
        },
      }, tx);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      assertPhoneMatchesResident(appointment.group.resident.phone, normalizedPhone);

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Cannot reschedule a cancelled appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
        throw new Error('Cannot reschedule a completed appointment');
      }

      assertMoreThanOneDayBeforeSlot(appointment.slotDate);

      const resolved = await slotAvailability.resolveBookableSlot(
        appointment.serviceId,
        slotDate,
        slotStart
      );

      const sameSlot =
        appointment.slotDate.getTime() === resolved.dayStart.getTime() &&
        appointment.slotStartTime.getTime() === resolved.slotStartTime.getTime();

      if (sameSlot) {
        return withPublicNumber(
          attachTimeSlot(
            await appointmentModel.findAppointmentById(appointmentId, {
              include: appointmentInclude,
            }, tx)
          )
        );
      }

      await slotAvailability.assertSlotHasCapacity(tx, {
        serviceId: appointment.serviceId,
        slotDate: resolved.dayStart,
        slotStartTime: resolved.slotStartTime,
        staffCount: resolved.staffCount,
      });

      await appointmentModel.updateAppointment(
        appointmentId,
        {
          slotDate: resolved.dayStart,
          slotStartTime: resolved.slotStartTime,
          slotEndTime: resolved.slotEndTime,
          status: APPOINTMENT_STATUS.PENDING,
        },
        {},
        tx
      );

      return withPublicNumber(
        attachTimeSlot(
          await appointmentModel.findAppointmentById(appointmentId, {
            include: appointmentInclude,
          }, tx)
        )
      );
    }, BOOKING_TRANSACTION_OPTIONS);
  }

  async cancelAppointmentById(appointmentId, phone) {
    const normalizedPhone = requireNormalizedPhone(phone);

    return runTransaction(async (tx) => {
      const appointment = await appointmentModel.findAppointmentById(appointmentId, {
        include: {
          group: { include: { resident: true } },
        },
      }, tx);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      assertPhoneMatchesResident(appointment.group.resident.phone, normalizedPhone);

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Appointment is already cancelled');
      }

      if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
        throw new Error('Only pending appointments can be cancelled');
      }

      await appointmentModel.updateAppointment(
        appointmentId,
        { status: APPOINTMENT_STATUS.CANCELLED },
        {},
        tx
      );

      return { id: appointmentId, status: APPOINTMENT_STATUS.CANCELLED };
    }, READ_TRANSACTION_OPTIONS);
  }

  async assertStaffCanAccessAppointment(staffUserId, appointmentId) {
    const appointment = await appointmentModel.findAppointmentById(appointmentId, {
      select: { id: true, serviceId: true },
    });

    if (!appointment) {
      const err = new Error('Appointment not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const assignment = await userModel.findStaffAssignment(staffUserId, appointment.serviceId);

    if (!assignment) {
      const err = new Error('You are not authorized to access this appointment');
      err.code = 'FORBIDDEN';
      throw err;
    }

    return appointment;
  }

  async getStaffAppointmentDetail(staffUserId, appointmentId) {
    await this.assertStaffCanAccessAppointment(staffUserId, appointmentId);

    const apt = await appointmentModel.findAppointmentById(appointmentId, {
      include: appointmentInclude,
    });

    const flat = withPublicNumber(attachTimeSlot(apt));
    const { formResponses: rawResponses } = await formSubmissionService.loadSubmissionByAppointmentId(
      appointmentId,
      { includeInactiveFields: true }
    );
    const uploadedFileRows = await formSubmissionService.loadUploadedFilesForAppointment(appointmentId);
    const { formResponses, uploadedFiles } = formSubmissionService.formatStaffFormPayload(
      rawResponses,
      uploadedFileRows
    );

    if (flat.documentUrl && !uploadedFiles.some((f) => f.fileUrl === flat.documentUrl)) {
      const fileName = formSubmissionService.fileNameFromUrl(flat.documentUrl);
      uploadedFiles.push({
        fieldLabel: 'Appointment document',
        fileUrl: flat.documentUrl,
        fileName,
      });
    }

    const resident = flat.resident
      ? {
          id: flat.resident.id,
          fullName: flat.resident.fullName,
          phone: flat.resident.phone,
          gender: flat.resident.gender,
          kebeleId: flat.resident.kebeleId ?? null,
          houseNumber: flat.resident.houseNumber ?? null,
          documentUrl: flat.resident.documentUrl ?? null,
        }
      : null;

    const service = flat.service
      ? {
          id: flat.service.id,
          name: flat.service.name,
          description: flat.service.description,
          department: flat.service.department
            ? { id: flat.service.department.id, name: flat.service.department.name }
            : null,
        }
      : null;

    const appointment = {
      id: flat.id,
      appointmentNumber: flat.appointmentNumber,
      status: flat.status,
      slotDate: flat.slotDate,
      slotStartTime: flat.slotStartTime,
      slotEndTime: flat.slotEndTime,
      timeSlot: flat.timeSlot,
      documentUrl: flat.documentUrl,
      createdAt: flat.createdAt,
      updatedAt: flat.updatedAt,
    };

    return {
      appointment,
      resident,
      service,
      formResponses,
      uploadedFiles,
    };
  }

  async updateAppointmentStatus(appointmentId, status, staffUserId = null) {
    if (staffUserId != null) {
      await this.assertStaffCanAccessAppointment(staffUserId, appointmentId);
    } else {
      const appointment = await appointmentModel.findAppointmentById(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }
    }

    const updated = await appointmentModel.updateAppointment(appointmentId, { status }, {
      include: appointmentInclude,
    });

    return withPublicNumber(attachTimeSlot(updated));
  }

  async getUserAppointments(residentId) {
    const rows = await appointmentModel.findManyAppointments({
      where: { group: { residentId } },
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    });
    const withSlots = attachTimeSlotMany(rows).map(withPublicNumber);
    return formSubmissionService.attachSubmissionsToMany(withSlots);
  }

  async getStaffAppointments(staffUserId, query = {}) {
    const assignments = await userModel.findStaffAssignments({ staffUserId }, {
      select: { serviceId: true },
    });
    const serviceIds = [...new Set(assignments.map((a) => a.serviceId))];

    if (serviceIds.length === 0) {
      const { page, limit } = parsePagination(query);
      return { items: [], pagination: buildPaginationMeta({ page, limit, total: 0 }) };
    }

    const where = { serviceId: { in: serviceIds } };
    const slotDateRange = resolveDateFilterRange(query);
    if (slotDateRange) {
      where.slotDate = slotDateRange;
    }
    if (query.status) {
      where.status = String(query.status).toUpperCase();
    }

    const { page, limit, skip } = parsePagination(query);

    const [total, rows] = await Promise.all([
      appointmentModel.countAppointments(where),
      appointmentModel.findManyAppointments({
        where,
        skip,
        take: limit,
        include: appointmentInclude,
        orderBy: { slotDate: 'desc' },
      }),
    ]);

    const mapped = attachTimeSlotMany(rows).map((a) => {
      const flat = withPublicNumber(a);
      delete flat.feedback;
      return flat;
    });
    const items = await formSubmissionService.attachSubmissionsToMany(mapped);

    return {
      items,
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  }

  async getAppointmentGroupBundleByNumber(appointmentNumber) {
    const group = await appointmentGroupModel.findGroupByAppointmentNumber(appointmentNumber, {
      include: {
        resident: true,
        appointments: {
          include: {
            service: { include: { department: true } },
            feedback: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!group) return null;
    return {
      ...group,
      appointments: attachTimeSlotMany(group.appointments),
    };
  }

  async getAppointmentByRef(ref, phone) {
    return this.getAppointmentByRefForResident(ref, phone);
  }

  async getAppointmentByRefForResident(ref, phone) {
    const normalizedPhone = requireNormalizedPhone(phone);

    if (isAppointmentNumberRef(ref)) {
      const group = await this.getAppointmentGroupBundleByNumber(ref.trim());
      if (!group) {
        throw new Error('Appointment not found');
      }
      assertPhoneMatchesResident(group.resident.phone, normalizedPhone);

      const items = await formSubmissionService.attachSubmissionsToMany(
        group.appointments.map((a) => attachTimeSlot({ ...a, group }))
      );
      return {
        appointmentNumber: group.appointmentNumber,
        resident: group.resident,
        items: items.map((a) => withPublicNumber(a)),
      };
    }

    const id = parseInt(ref, 10);
    if (!Number.isNaN(id)) {
      const apt = await appointmentModel.findAppointmentById(id, {
        include: appointmentInclude,
      });
      if (!apt) {
        throw new Error('Appointment not found');
      }
      assertPhoneMatchesResident(apt.group.resident.phone, normalizedPhone);

      const withResponses = await formSubmissionService.attachSubmissionToAppointment(
        attachTimeSlot(apt)
      );
      return withPublicNumber(withResponses);
    }

    throw new Error('Invalid appointment reference');
  }

  async updateAppointmentFormResponses(
    appointmentId,
    { phone },
    formResponseRows,
    fileMetaByFieldId = {}
  ) {
    const normalizedPhone = requireNormalizedPhone(phone);

    return runTransaction(async (tx) => {
      const appointment = await appointmentModel.findAppointmentById(appointmentId, {
        include: {
          group: { include: { resident: true } },
        },
      }, tx);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      assertPhoneMatchesResident(appointment.group.resident.phone, normalizedPhone);

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Cannot edit a cancelled appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
        throw new Error('Cannot edit a completed appointment');
      }

      const aptRow = await appointmentModel.findAppointmentById(appointmentId, {
        select: { serviceId: true, group: { select: { residentId: true } } },
      }, tx);

      if (formResponseRows?.length && aptRow) {
        await formSubmissionService.upsertSubmissionValues(
          tx,
          appointmentId,
          aptRow.serviceId,
          aptRow.group.residentId,
          formResponseRows,
          fileMetaByFieldId
        );
      }

      const updated = await appointmentModel.findAppointmentById(appointmentId, {
        select: appointmentCreateSelect,
      }, tx);

      const withResponses = await formSubmissionService.attachSubmissionToAppointment(updated);
      return withPublicNumber(withResponses);
    }, BOOKING_TRANSACTION_OPTIONS);
  }

  async updateFormResponsesByRef(
    appointmentRef,
    { phone, appointmentItemId },
    formResponseRows,
    fileMetaByFieldId = {}
  ) {
    if (isAppointmentNumberRef(appointmentRef)) {
      const group = await appointmentGroupModel.findGroupByAppointmentNumber(appointmentRef.trim(), {
        include: {
          appointments: {
            where: { status: APPOINTMENT_STATUS.PENDING },
          },
        },
      });
      if (!group) throw new Error('Appointment not found');
      let line = group.appointments[0];
      if (appointmentItemId != null) {
        line = group.appointments.find((a) => a.id === Number(appointmentItemId));
      }
      if (!line) throw new Error('No editable appointment line found');
      return this.updateAppointmentFormResponses(line.id, { phone }, formResponseRows, fileMetaByFieldId);
    }

    const id = parseInt(appointmentRef, 10);
    if (!Number.isNaN(id)) {
      return this.updateAppointmentFormResponses(id, { phone }, formResponseRows, fileMetaByFieldId);
    }
    throw new Error('Invalid appointment reference');
  }

  async cancelByAppointmentNumber(appointmentNumber, phone, appointmentItemId) {
    const normalizedPhone = requireNormalizedPhone(phone);

    if (appointmentItemId != null) {
      const apt = await appointmentModel.findFirstAppointment(
        {
          id: Number(appointmentItemId),
          group: { appointmentNumber },
        },
        {
          include: {
            group: { include: { resident: true } },
          },
        }
      );
      if (!apt) {
        throw new Error('Appointment not found');
      }
      assertPhoneMatchesResident(apt.group.resident.phone, normalizedPhone);
      return this.cancelAppointmentById(apt.id, normalizedPhone);
    }
    return this.cancelAppointmentGroupByNumber(appointmentNumber, normalizedPhone);
  }

  async cancelAppointmentGroupByNumber(appointmentNumber, phone) {
    const normalizedPhone = requireNormalizedPhone(phone);
    return runTransaction(async (tx) => {
      const group = await appointmentGroupModel.findGroupByAppointmentNumber(appointmentNumber, {
        include: {
          resident: true,
          appointments: {
            where: { status: APPOINTMENT_STATUS.PENDING },
          },
        },
      }, tx);

      if (!group) {
        throw new Error('Appointment not found');
      }

      assertPhoneMatchesResident(group.resident.phone, normalizedPhone);

      for (const apt of group.appointments) {
        await appointmentModel.updateAppointment(
          apt.id,
          { status: APPOINTMENT_STATUS.CANCELLED },
          {},
          tx
        );
      }

      return { appointmentNumber, cancelled: group.appointments.length };
    }, READ_TRANSACTION_OPTIONS);
  }

  async rescheduleByAppointmentNumber(appointmentNumber, { phone, slotDate, slotStart, appointmentItemId }) {
    const normalizedPhone = requireNormalizedPhone(phone);
    const group = await appointmentGroupModel.findGroupByAppointmentNumber(appointmentNumber, {
      include: {
        resident: true,
        appointments: {
          where: { status: APPOINTMENT_STATUS.PENDING },
        },
      },
    });

    if (!group) {
      throw new Error('Appointment not found');
    }

    assertPhoneMatchesResident(group.resident.phone, normalizedPhone);

    let line = group.appointments[0];
    if (appointmentItemId != null) {
      line = group.appointments.find((a) => a.id === Number(appointmentItemId));
    }
    if (!line) {
      throw new Error('No pending appointment line found for this reference');
    }

    if (group.appointments.length > 1 && appointmentItemId == null) {
      throw new Error('appointmentItemId is required when the booking has multiple active services');
    }

    return this.rescheduleAppointment(line.id, {
      phone: normalizedPhone,
      slotDate,
      slotStart,
    });
  }

  async addServiceToBooking(appointmentNumber, { phone, serviceId, slotDate, slotStart, documentUrl }) {
    const normalizedPhone = requireNormalizedPhone(phone);
    const serviceIdNum = Number(serviceId);
    const resolved = await slotAvailability.resolveBookableSlot(serviceIdNum, slotDate, slotStart);

    const group = await appointmentGroupModel.findGroupByAppointmentNumber(appointmentNumber, {
      include: {
        resident: true,
        appointments: {
          where: { status: APPOINTMENT_STATUS.PENDING },
        },
      },
    });

    if (!group) {
      throw new Error('Appointment not found');
    }

    assertPhoneMatchesResident(group.resident.phone, normalizedPhone);

    const already = group.appointments.some((a) => a.serviceId === serviceIdNum);
    if (already) {
      throw new Error('This service is already part of the booking');
    }

    const earliest = group.appointments
      .map((a) => a.slotDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    if (earliest) {
      assertMoreThanOneDayBeforeSlot(earliest);
    }

    return runTransaction(async (tx) => {
      await slotAvailability.assertSlotHasCapacity(tx, {
        serviceId: serviceIdNum,
        slotDate: resolved.dayStart,
        slotStartTime: resolved.slotStartTime,
        staffCount: resolved.staffCount,
      });

      const appointment = await appointmentModel.createAppointment(
        {
          groupId: group.id,
          serviceId: serviceIdNum,
          slotDate: resolved.dayStart,
          slotStartTime: resolved.slotStartTime,
          slotEndTime: resolved.slotEndTime,
          ...(documentUrl != null && documentUrl !== ''
            ? { documentUrl }
            : {}),
        },
        { select: appointmentCreateSelect },
        tx
      );

      return withPublicNumber(appointment);
    }, BOOKING_TRANSACTION_OPTIONS);
  }

  async getUserAppointmentsByPhone(phone) {
    const normalizedPhone = requireNormalizedPhone(phone);
    const resident = await residentModel.findResidentByPhone(normalizedPhone);
    if (!resident) {
      return [];
    }
    return this.getUserAppointments(resident.id);
  }

  async getAppointmentLineByNumberAndItem(appointmentNumber, appointmentItemId) {
    return appointmentModel.findFirstAppointment(
      {
        id: Number(appointmentItemId),
        group: { appointmentNumber },
      },
      {
        include: { service: true, group: { include: { resident: true } } },
      }
    );
  }

  async getAppointmentByIdWithGroup(id) {
    return appointmentModel.findAppointmentById(id, {
      include: { service: true, group: { include: { resident: true } } },
    });
  }

  async getAppointmentServiceId(id) {
    return appointmentModel.findAppointmentById(id, {
      select: { id: true, serviceId: true },
    });
  }

  async getAdminStats() {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
      rescheduledAppointments,
      todayAppointments,
      thisMonthAppointments,
    ] = await Promise.all([
      appointmentModel.countAppointments(),
      appointmentModel.countAppointments({ status: APPOINTMENT_STATUS.PENDING }),
      appointmentModel.countAppointments({ status: APPOINTMENT_STATUS.COMPLETED }),
      appointmentModel.countAppointments({ status: APPOINTMENT_STATUS.CANCELLED }),
      appointmentModel.countAppointments({ status: APPOINTMENT_STATUS.RESCHEDULED }),
      appointmentModel.countAppointments({
        slotDate: { gte: startToday, lte: endToday },
        status: { not: APPOINTMENT_STATUS.CANCELLED },
      }),
      appointmentModel.countAppointments({
        createdAt: { gte: startMonth, lte: endMonth },
      }),
    ]);

    return {
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
      rescheduledAppointments,
      todayAppointments,
      thisMonthAppointments,
    };
  }

  async listAdminAppointments(filters = {}) {
    const { page, limit, skip } = parsePagination(filters);
    const where = buildAdminWhere(filters);

    const [total, rows] = await Promise.all([
      appointmentModel.countAppointments(where),
      appointmentModel.findManyAppointments({
        where,
        skip,
        take: limit,
        orderBy: [{ slotDate: 'desc' }, { createdAt: 'desc' }],
        include: appointmentInclude,
      }),
    ]);

    return {
      items: rows.map(mapAdminListRow),
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  }

  async getAdminAppointmentDetail(appointmentId) {
    const apt = await appointmentModel.findAppointmentById(Number(appointmentId), {
      include: appointmentInclude,
    });

    if (!apt) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }

    const flat = attachTimeSlot(apt);
    const { formResponses: rawResponses } = await formSubmissionService.loadSubmissionByAppointmentId(
      apt.id,
      { includeInactiveFields: true }
    );
    const uploadedFileRows = await formSubmissionService.loadUploadedFilesForAppointment(apt.id);
    const { formResponses, uploadedFiles } = formSubmissionService.formatStaffFormPayload(
      rawResponses,
      uploadedFileRows
    );

    if (flat.documentUrl && !uploadedFiles.some((f) => f.fileUrl === flat.documentUrl)) {
      uploadedFiles.push({
        fieldLabel: 'Appointment document',
        fileUrl: flat.documentUrl,
        fileName: formSubmissionService.fileNameFromUrl(flat.documentUrl),
      });
    }

    const groupHistory = await appointmentModel.findManyAppointments({
      where: { groupId: apt.groupId },
      include: appointmentInclude,
      orderBy: { createdAt: 'asc' },
    });

    return {
      appointment: {
        id: flat.id,
        appointmentNumber: flat.group?.appointmentNumber,
        status: flat.status,
        slotDate: flat.slotDate,
        slotStartTime: flat.slotStartTime,
        slotEndTime: flat.slotEndTime,
        timeSlot: flat.timeSlot,
        documentUrl: flat.documentUrl,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt,
      },
      resident: flat.group?.resident
        ? {
            id: flat.group.resident.id,
            fullName: flat.group.resident.fullName,
            phone: flat.group.resident.phone,
            gender: flat.group.resident.gender,
            kebeleId: flat.group.resident.kebeleId,
            houseNumber: flat.group.resident.houseNumber,
            documentUrl: flat.group.resident.documentUrl,
          }
        : null,
      service: flat.service
        ? {
            id: flat.service.id,
            name: flat.service.name,
            description: flat.service.description,
            department: flat.service.department
              ? { id: flat.service.department.id, name: flat.service.department.name }
              : null,
          }
        : null,
      formResponses,
      uploadedFiles,
      feedback: flat.feedback
        ? {
            rating: flat.feedback.rating,
            comment: flat.feedback.comment,
            createdAt: flat.feedback.createdAt,
          }
        : null,
      groupHistory: attachTimeSlotMany(groupHistory).map((row) => ({
        id: row.id,
        serviceName: row.service?.name,
        status: row.status,
        timeSlot: row.timeSlot,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    };
  }

  async getDashboardStats() {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const departmentModel = require('../models/department.model');
    const serviceModel = require('../models/service.model');

    const [
      totalDepartments,
      totalServices,
      totalStaff,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      todayAppointments,
    ] = await Promise.all([
      departmentModel.countDepartments(),
      serviceModel.countServices(),
      userModel.countStaff({ role: 'STAFF' }),
      appointmentModel.countAppointments(),
      appointmentModel.countAppointments({ status: APPOINTMENT_STATUS.PENDING }),
      appointmentModel.countAppointments({ status: APPOINTMENT_STATUS.COMPLETED }),
      appointmentModel.countAppointments({
        status: { not: APPOINTMENT_STATUS.CANCELLED },
        slotDate: { gte: startToday, lte: endToday },
      }),
    ]);

    const recentRows = await appointmentModel.findManyAppointments({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        group: {
          include: {
            resident: { select: { fullName: true, phone: true } },
          },
        },
        service: {
          select: {
            name: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    const recentAppointments = recentRows.map((apt) => ({
      id: apt.id,
      appointmentNumber: apt.group.appointmentNumber,
      status: apt.status,
      resident: apt.group.resident,
      service: apt.service,
      timeSlot: {
        date: apt.slotDate,
        startTime: apt.slotStartTime,
        endTime: apt.slotEndTime,
      },
    }));

    const appointmentsByDepartment = await departmentModel.getDepartments({
      include: {
        services: {
          include: {
            appointments: { select: { id: true } },
          },
        },
      },
    });

    const departmentStats = appointmentsByDepartment.map((dept) => ({
      department: dept.name,
      services: dept.services.length,
      appointments: dept.services.reduce(
        (sum, service) => sum + service.appointments.length,
        0
      ),
    }));

    return {
      overview: {
        totalDepartments,
        totalServices,
        totalStaff,
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        todayAppointments,
      },
      recentAppointments,
      departmentStats,
    };
  }
}

module.exports = new AppointmentService();
