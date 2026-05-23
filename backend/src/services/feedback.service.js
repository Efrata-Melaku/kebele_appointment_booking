const prisma = require('../prisma/client');
const { APPOINTMENT_STATUS } = require('../config/constants');
const {
  assertPhoneMatchesResident,
  requireNormalizedPhone,
} = require('../utils/ethiopianPhone');

/** Admin-facing shape — no resident or appointment identifiers. */
function mapAnonymousAdminFeedback(fb) {
  return {
    id: fb.id,
    rating: fb.rating,
    comment: fb.comment,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  };
}

/** Resident-facing shape — no PII stored on Feedback itself. */
function mapResidentFeedback(fb) {
  return {
    id: fb.id,
    rating: fb.rating,
    comment: fb.comment,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  };
}

async function loadAppointmentForResident(appointmentId, phone) {
  const normalizedPhone = requireNormalizedPhone(phone);
  const appointment = await prisma.appointment.findUnique({
    where: { id: Number(appointmentId) },
    include: {
      feedback: true,
      group: { include: { resident: true } },
    },
  });

  if (!appointment) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }

  assertPhoneMatchesResident(appointment.group.resident.phone, normalizedPhone);
  return { appointment, normalizedPhone };
}

function assertCanSubmitFeedback(appointment) {
  if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
    const err = new Error('Cannot submit feedback for a cancelled appointment');
    err.statusCode = 400;
    throw err;
  }
  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
    const err = new Error('Feedback is only available after your appointment is completed');
    err.statusCode = 400;
    throw err;
  }
}

class FeedbackService {
  async createResidentFeedback({ phone, appointmentId, rating, comment }) {
    const { appointment } = await loadAppointmentForResident(appointmentId, phone);
    assertCanSubmitFeedback(appointment);

    if (appointment.feedbackId) {
      const err = new Error('Feedback already exists for this appointment');
      err.statusCode = 400;
      throw err;
    }

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.feedback.create({
        data: {
          rating: Number(rating),
          comment: comment?.trim() || null,
        },
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { feedbackId: created.id },
      });

      return created;
    });

    return mapResidentFeedback(feedback);
  }

  async getResidentFeedback(appointmentId, phone) {
    const { appointment } = await loadAppointmentForResident(appointmentId, phone);
    if (!appointment.feedback) {
      const err = new Error('Feedback not found');
      err.statusCode = 404;
      throw err;
    }
    return mapResidentFeedback(appointment.feedback);
  }

  async updateResidentFeedback(appointmentId, phone, { rating, comment }) {
    const { appointment } = await loadAppointmentForResident(appointmentId, phone);
    assertCanSubmitFeedback(appointment);

    if (!appointment.feedbackId || !appointment.feedback) {
      const err = new Error('Feedback not found');
      err.statusCode = 404;
      throw err;
    }

    const feedback = await prisma.feedback.update({
      where: { id: appointment.feedbackId },
      data: {
        ...(rating != null ? { rating: Number(rating) } : {}),
        ...(comment !== undefined ? { comment: comment?.trim() || null } : {}),
      },
    });

    return mapResidentFeedback(feedback);
  }

  /** Internal filter for admin — uses appointment join but never exposes resident data. */
  buildAdminWhere(filters) {
    const where = {};
    const appointmentFilter = {};

    if (filters.departmentId) {
      appointmentFilter.service = { departmentId: Number(filters.departmentId) };
    }
    if (filters.serviceId) {
      appointmentFilter.service = {
        ...(appointmentFilter.service || {}),
        id: Number(filters.serviceId),
      };
    }
    if (filters.rating) {
      where.rating = Number(filters.rating);
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (Object.keys(appointmentFilter).length) {
      where.appointment = { is: appointmentFilter };
    }
    return where;
  }

  async listAdminFeedback(filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const where = this.buildAdminWhere(filters);

    const [total, rows] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      items: rows.map(mapAnonymousAdminFeedback),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getAdminFeedbackStats(filters = {}) {
    const where = this.buildAdminWhere(filters);
    const rows = await prisma.feedback.findMany({
      where,
      select: { rating: true },
    });

    const totalCount = rows.length;
    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const r of rows) {
      const rating = r.rating;
      if (rating >= 1 && rating <= 5) {
        starCounts[rating] += 1;
        sum += rating;
      }
    }

    return {
      totalCount,
      averageRating: totalCount ? Math.round((sum / totalCount) * 10) / 10 : 0,
      starCounts,
    };
  }

  async getAdminFeedbackDetail(feedbackId) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: Number(feedbackId) },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!feedback) {
      const err = new Error('Feedback not found');
      err.statusCode = 404;
      throw err;
    }

    return mapAnonymousAdminFeedback(feedback);
  }

  async getReporting() {
    const rows = await prisma.feedback.findMany({
      where: { rating: { gte: 1, lte: 5 } },
      select: {
        rating: true,
        appointment: {
          select: {
            service: {
              select: {
                id: true,
                name: true,
                departmentId: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const byService = new Map();
    const byDepartment = new Map();

    for (const fb of rows) {
      const service = fb.appointment?.service;
      if (!service) continue;

      const svcKey = service.id;
      if (!byService.has(svcKey)) {
        byService.set(svcKey, {
          serviceName: service.name,
          departmentName: service.department?.name,
          total: 0,
          sum: 0,
        });
      }
      const svc = byService.get(svcKey);
      svc.total += 1;
      svc.sum += fb.rating;

      const deptKey = service.departmentId;
      if (!byDepartment.has(deptKey)) {
        byDepartment.set(deptKey, {
          departmentName: service.department?.name,
          total: 0,
          sum: 0,
        });
      }
      const dept = byDepartment.get(deptKey);
      dept.total += 1;
      dept.sum += fb.rating;
    }

    const serviceRatings = [...byService.values()].map((s) => ({
      serviceName: s.serviceName,
      departmentName: s.departmentName,
      total: s.total,
      averageRating: Math.round((s.sum / s.total) * 10) / 10,
    }));

    const departmentRatings = [...byDepartment.values()].map((d) => ({
      departmentName: d.departmentName,
      total: d.total,
      averageRating: Math.round((d.sum / d.total) * 10) / 10,
    }));

    serviceRatings.sort((a, b) => b.averageRating - a.averageRating);

    return {
      highestRatedServices: serviceRatings.slice(0, 5),
      lowestRatedServices: [...serviceRatings].sort((a, b) => a.averageRating - b.averageRating).slice(0, 5),
      averageRatingPerService: serviceRatings,
      averageRatingPerDepartment: departmentRatings,
    };
  }
}

module.exports = new FeedbackService();
