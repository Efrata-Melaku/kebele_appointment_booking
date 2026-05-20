const prisma = require('../../prisma/client');
const { getOrCreateDefaultTemplate } = require('../../services/overrideChecker.service');
const { successResponse, errorResponse } = require('../../utils/response');

function parseDateInput(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

class ScheduleController {
  async getTemplate(req, res) {
    try {
      const template = await getOrCreateDefaultTemplate();
      successResponse(res, 'Work schedule template', template);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to load template', 500);
    }
  }

  async updateTemplate(req, res) {
    try {
      const current = await getOrCreateDefaultTemplate();
      const data = req.body;
      const template = await prisma.workScheduleTemplate.update({
        where: { id: current.id },
        data: {
          ...(data.mon !== undefined ? { mon: !!data.mon } : {}),
          ...(data.tue !== undefined ? { tue: !!data.tue } : {}),
          ...(data.wed !== undefined ? { wed: !!data.wed } : {}),
          ...(data.thu !== undefined ? { thu: !!data.thu } : {}),
          ...(data.fri !== undefined ? { fri: !!data.fri } : {}),
          ...(data.sat !== undefined ? { sat: !!data.sat } : {}),
          ...(data.sun !== undefined ? { sun: !!data.sun } : {}),
          ...(data.workStart ? { workStart: data.workStart } : {}),
          ...(data.workEnd ? { workEnd: data.workEnd } : {}),
          ...(data.lunchStart ? { lunchStart: data.lunchStart } : {}),
          ...(data.lunchEnd ? { lunchEnd: data.lunchEnd } : {}),
        },
      });
      successResponse(res, 'Template updated', template);
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Template not found', 404);
      }
      errorResponse(res, error.message || 'Failed to update template', 500);
    }
  }

  async listOfficeOverrides(req, res) {
    try {
      const rows = await prisma.officeScheduleOverride.findMany({
        orderBy: { date: 'asc' },
      });
      successResponse(res, 'Office overrides', rows);
    } catch (error) {
      errorResponse(res, 'Failed to list overrides', 500);
    }
  }

  async upsertOfficeOverride(req, res) {
    try {
      const { date, isClosed, workStart, workEnd, lunchStart, lunchEnd } = req.body;
      const day = parseDateInput(date);
      const row = await prisma.officeScheduleOverride.upsert({
        where: { date: day },
        create: {
          date: day,
          isClosed: !!isClosed,
          workStart: workStart || null,
          workEnd: workEnd || null,
          lunchStart: lunchStart || null,
          lunchEnd: lunchEnd || null,
        },
        update: {
          isClosed: !!isClosed,
          workStart: workStart || null,
          workEnd: workEnd || null,
          lunchStart: lunchStart || null,
          lunchEnd: lunchEnd || null,
        },
      });
      successResponse(res, 'Office override saved', row, 201);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to save override', 400);
    }
  }

  async deleteOfficeOverride(req, res) {
    try {
      const day = parseDateInput(req.params.date);
      await prisma.officeScheduleOverride.delete({
        where: { date: day },
      });
      successResponse(res, 'Office override deleted');
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Override not found', 404);
      }
      errorResponse(res, 'Failed to delete override', 500);
    }
  }

  async listServiceOverrides(req, res) {
    try {
      const { serviceId } = req.query;
      const where = serviceId ? { serviceId: parseInt(serviceId, 10) } : {};
      const rows = await prisma.serviceScheduleOverride.findMany({
        where,
        include: { service: { select: { id: true, name: true } } },
        orderBy: [{ date: 'asc' }, { serviceId: 'asc' }],
      });
      successResponse(res, 'Service overrides', rows);
    } catch (error) {
      errorResponse(res, 'Failed to list service overrides', 500);
    }
  }

  async upsertServiceOverride(req, res) {
    try {
      const { date, serviceId, serviceDisabled, workStart, workEnd, lunchStart, lunchEnd } = req.body;
      const day = parseDateInput(date);
      const sid = parseInt(serviceId, 10);
      const row = await prisma.serviceScheduleOverride.upsert({
        where: {
          date_serviceId: { date: day, serviceId: sid },
        },
        create: {
          date: day,
          serviceId: sid,
          serviceDisabled: !!serviceDisabled,
          workStart: workStart || null,
          workEnd: workEnd || null,
          lunchStart: lunchStart || null,
          lunchEnd: lunchEnd || null,
        },
        update: {
          serviceDisabled: !!serviceDisabled,
          workStart: workStart || null,
          workEnd: workEnd || null,
          lunchStart: lunchStart || null,
          lunchEnd: lunchEnd || null,
        },
        include: { service: { select: { id: true, name: true } } },
      });
      successResponse(res, 'Service override saved', row, 201);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to save service override', 400);
    }
  }

  async deleteServiceOverride(req, res) {
    try {
      const day = parseDateInput(req.params.date);
      const serviceId = parseInt(req.params.serviceId, 10);
      await prisma.serviceScheduleOverride.delete({
        where: {
          date_serviceId: { date: day, serviceId },
        },
      });
      successResponse(res, 'Service override deleted');
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Override not found', 404);
      }
      errorResponse(res, 'Failed to delete override', 500);
    }
  }
}

module.exports = new ScheduleController();
