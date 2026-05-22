const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/client');
const generateAppointmentNumber = require('../utils/generateAppointmentNumber');
const { isAppointmentNumberRef } = require('../utils/appointmentRef');
const { APPOINTMENT_STATUS } = require('../config/constants');
const { attachTimeSlot, attachTimeSlotMany } = require('../utils/appointmentSlot');
const slotAvailability = require('./slotAvailability.service');
const formSubmissionService = require('./formSubmission.service');
const dynamicFormService = require('./dynamicForm.service');

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

class AppointmentService {
  async getAvailableSlots(serviceId, date) {
    return slotAvailability.getAvailableSlotsForServiceDate(serviceId, date);
  }

  async createAppointment(
    appointmentData,
    documentUrl = null,
    formResponseRows = null,
    fileMetaByFieldId = {}
  ) {
    const { fullName, phone, gender } = appointmentData;
    const { serviceId, slotDate, slotStart } = parseBookingSlot(appointmentData);

    const resolved = await slotAvailability.resolveBookableSlot(serviceId, slotDate, slotStart);

    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const appointmentNumber = generateAppointmentNumber();
      try {
        return await prisma.$transaction(async (tx) => {
          await slotAvailability.assertSlotHasCapacity(tx, {
            serviceId: resolved.service.id,
            slotDate: resolved.dayStart,
            slotStartTime: resolved.slotStartTime,
            staffCount: resolved.staffCount,
          });

          const resident = await tx.resident.upsert({
            where: { phone },
            create: {
              fullName,
              phone,
              gender,
              documentUrl: documentUrl != null && documentUrl !== '' ? documentUrl : null,
            },
            update: {
              fullName,
              gender,
              ...(documentUrl != null && documentUrl !== '' ? { documentUrl } : {}),
            },
            select: { id: true },
          });

          const group = await tx.appointmentGroup.create({
            data: {
              appointmentNumber,
              residentId: resident.id,
            },
            select: { id: true },
          });

          const appointment = await tx.appointment.create({
            data: {
              groupId: group.id,
              serviceId: resolved.service.id,
              slotDate: resolved.dayStart,
              slotStartTime: resolved.slotStartTime,
              slotEndTime: resolved.slotEndTime,
              ...(documentUrl != null && documentUrl !== ''
                ? { documentUrl }
                : {}),
            },
            select: appointmentCreateSelect,
          });

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

    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          group: { include: { resident: true } },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.group.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }

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
            await tx.appointment.findUnique({
              where: { id: appointmentId },
              include: appointmentInclude,
            })
          )
        );
      }

      await slotAvailability.assertSlotHasCapacity(tx, {
        serviceId: appointment.serviceId,
        slotDate: resolved.dayStart,
        slotStartTime: resolved.slotStartTime,
        staffCount: resolved.staffCount,
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          slotDate: resolved.dayStart,
          slotStartTime: resolved.slotStartTime,
          slotEndTime: resolved.slotEndTime,
          status: APPOINTMENT_STATUS.PENDING,
        },
      });

      return withPublicNumber(
        attachTimeSlot(
          await tx.appointment.findUnique({
            where: { id: appointmentId },
            include: appointmentInclude,
          })
        )
      );
    }, BOOKING_TRANSACTION_OPTIONS);
  }

  async cancelAppointmentById(appointmentId, phone) {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          group: { include: { resident: true } },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.group.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Appointment is already cancelled');
      }

      if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
        throw new Error('Only pending appointments can be cancelled');
      }

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: APPOINTMENT_STATUS.CANCELLED },
      });

      return { id: appointmentId, status: APPOINTMENT_STATUS.CANCELLED };
    }, READ_TRANSACTION_OPTIONS);
  }

  async assertStaffCanAccessAppointment(staffUserId, appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, serviceId: true },
    });

    if (!appointment) {
      const err = new Error('Appointment not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const assignment = await prisma.staffServiceAssignment.findUnique({
      where: {
        staffUserId_serviceId: {
          staffUserId,
          serviceId: appointment.serviceId,
        },
      },
    });

    if (!assignment) {
      const err = new Error('You are not authorized to access this appointment');
      err.code = 'FORBIDDEN';
      throw err;
    }

    return appointment;
  }

  async getStaffAppointmentDetail(staffUserId, appointmentId) {
    await this.assertStaffCanAccessAppointment(staffUserId, appointmentId);

    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
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
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      if (!appointment) {
        throw new Error('Appointment not found');
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: appointmentInclude,
    });

    return withPublicNumber(attachTimeSlot(updated));
  }

  async getUserAppointments(residentId) {
    const rows = await prisma.appointment.findMany({
      where: { group: { residentId } },
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    });
    const withSlots = attachTimeSlotMany(rows).map(withPublicNumber);
    return formSubmissionService.attachSubmissionsToMany(withSlots);
  }

  async getStaffAppointments(staffUserId) {
    const assignments = await prisma.staffServiceAssignment.findMany({
      where: { staffUserId },
      select: { serviceId: true },
    });
    const serviceIds = [...new Set(assignments.map((a) => a.serviceId))];

    if (serviceIds.length === 0) {
      return [];
    }

    const rows = await prisma.appointment.findMany({
      where: {
        serviceId: { in: serviceIds },
      },
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    });
    const mapped = attachTimeSlotMany(rows).map((a) => {
      const flat = withPublicNumber(a);
      delete flat.feedback;
      return flat;
    });
    return formSubmissionService.attachSubmissionsToMany(mapped);
  }

  async getAppointmentGroupBundleByNumber(appointmentNumber) {
    const group = await prisma.appointmentGroup.findUnique({
      where: { appointmentNumber },
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

  async getAppointmentByRef(ref) {
    if (isAppointmentNumberRef(ref)) {
      const group = await this.getAppointmentGroupBundleByNumber(ref.trim());
      if (!group) {
        throw new Error('Appointment not found');
      }
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
      const apt = await prisma.appointment.findUnique({
        where: { id },
        include: appointmentInclude,
      });
      if (!apt) {
        throw new Error('Appointment not found');
      }
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
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          group: { include: { resident: true } },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.group.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        throw new Error('Cannot edit a cancelled appointment');
      }

      if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
        throw new Error('Cannot edit a completed appointment');
      }

      const aptRow = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { serviceId: true, group: { select: { residentId: true } } },
      });

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

      const updated = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: appointmentCreateSelect,
      });

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
      const group = await prisma.appointmentGroup.findUnique({
        where: { appointmentNumber: appointmentRef.trim() },
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
    if (appointmentItemId != null) {
      const apt = await prisma.appointment.findFirst({
        where: {
          id: Number(appointmentItemId),
          group: { appointmentNumber },
        },
        include: {
          group: { include: { resident: true } },
        },
      });
      if (!apt) {
        throw new Error('Appointment not found');
      }
      if (apt.group.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }
      return this.cancelAppointmentById(apt.id, phone);
    }
    return this.cancelAppointmentGroupByNumber(appointmentNumber, phone);
  }

  async cancelAppointmentGroupByNumber(appointmentNumber, phone) {
    return prisma.$transaction(async (tx) => {
      const group = await tx.appointmentGroup.findUnique({
        where: { appointmentNumber },
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

      if (group.resident.phone !== phone) {
        throw new Error('Verification failed for this appointment');
      }

      for (const apt of group.appointments) {
        await tx.appointment.update({
          where: { id: apt.id },
          data: { status: APPOINTMENT_STATUS.CANCELLED },
        });
      }

      return { appointmentNumber, cancelled: group.appointments.length };
    }, READ_TRANSACTION_OPTIONS);
  }

  async rescheduleByAppointmentNumber(appointmentNumber, { phone, slotDate, slotStart, appointmentItemId }) {
    const group = await prisma.appointmentGroup.findUnique({
      where: { appointmentNumber },
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

    if (group.resident.phone !== phone) {
      throw new Error('Verification failed for this appointment');
    }

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

    return this.rescheduleAppointment(line.id, { phone, slotDate, slotStart });
  }

  async addServiceToBooking(appointmentNumber, { phone, serviceId, slotDate, slotStart, documentUrl }) {
    const serviceIdNum = Number(serviceId);
    const resolved = await slotAvailability.resolveBookableSlot(serviceIdNum, slotDate, slotStart);

    const group = await prisma.appointmentGroup.findUnique({
      where: { appointmentNumber },
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

    if (group.resident.phone !== phone) {
      throw new Error('Verification failed for this appointment');
    }

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

    return prisma.$transaction(async (tx) => {
      await slotAvailability.assertSlotHasCapacity(tx, {
        serviceId: serviceIdNum,
        slotDate: resolved.dayStart,
        slotStartTime: resolved.slotStartTime,
        staffCount: resolved.staffCount,
      });

      const appointment = await tx.appointment.create({
        data: {
          groupId: group.id,
          serviceId: serviceIdNum,
          slotDate: resolved.dayStart,
          slotStartTime: resolved.slotStartTime,
          slotEndTime: resolved.slotEndTime,
          ...(documentUrl != null && documentUrl !== ''
            ? { documentUrl }
            : {}),
        },
        select: appointmentCreateSelect,
      });

      return withPublicNumber(appointment);
    }, BOOKING_TRANSACTION_OPTIONS);
  }
}

module.exports = new AppointmentService();
