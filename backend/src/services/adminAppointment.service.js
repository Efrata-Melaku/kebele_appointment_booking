const prisma = require('../prisma/client');
const { APPOINTMENT_STATUS } = require('../config/constants');
const { attachTimeSlot, attachTimeSlotMany } = require('../utils/appointmentSlot');
const { normalizeEthiopianPhone } = require('../utils/ethiopianPhone');
const formSubmissionService = require('./formSubmission.service');

const appointmentInclude = {
  group: { include: { resident: true } },
  service: { include: { department: true } },
  feedback: true,
};

function mapListRow(apt) {
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

function buildWhere(filters) {
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
  if (filters.dateFrom || filters.dateTo) {
    where.slotDate = {};
    if (filters.dateFrom) {
      where.slotDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.slotDate.lte = end;
    }
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

class AdminAppointmentService {
  async getStats() {
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
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.PENDING } }),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.COMPLETED } }),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.CANCELLED } }),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.RESCHEDULED } }),
      prisma.appointment.count({
        where: {
          slotDate: { gte: startToday, lte: endToday },
          status: { not: APPOINTMENT_STATUS.CANCELLED },
        },
      }),
      prisma.appointment.count({
        where: {
          createdAt: { gte: startMonth, lte: endMonth },
        },
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

  async listAppointments(filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const where = buildWhere(filters);

    const [total, rows] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: appointmentInclude,
      }),
    ]);

    return {
      items: rows.map(mapListRow),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getAppointmentDetail(appointmentId) {
    const apt = await prisma.appointment.findUnique({
      where: { id: Number(appointmentId) },
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

    const groupHistory = await prisma.appointment.findMany({
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
}

module.exports = new AdminAppointmentService();
