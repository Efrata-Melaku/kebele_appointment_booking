const scheduleModel = require('../models/schedule.model');
const { getOrCreateDefaultTemplate } = require('./overrideChecker.service');
const { NotFoundError, ValidationError } = require('../utils/AppError');
const { toPrismaDateOnly, formatDateOnlyYmd } = require('../utils/dateRange');

function parseDateInput(value) {
  const day = toPrismaDateOnly(value);
  if (!day) throw new ValidationError('Invalid date');
  return day;
}

function serializeOfficeOverride(row) {
  if (!row) return row;
  return {
    ...row,
    date: formatDateOnlyYmd(row.date) ?? row.date,
  };
}

class ScheduleService {
  async getTemplate() {
    return getOrCreateDefaultTemplate();
  }

  async updateTemplate(body) {
    const current = await getOrCreateDefaultTemplate();
    const data = body;
    try {
      return await scheduleModel.updateWorkScheduleTemplate(current.id, {
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
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Template not found');
      }
      throw err;
    }
  }

  async listOfficeOverrides() {
    const rows = await scheduleModel.findOfficeOverrides({ orderBy: { date: 'asc' } });
    return rows.map(serializeOfficeOverride);
  }

  async upsertOfficeOverride(body) {
    const { date, isClosed, workStart, workEnd, lunchStart, lunchEnd } = body;
    const day = parseDateInput(date);
    const row = await scheduleModel.upsertOfficeOverride(
      { date: day },
      {
        date: day,
        isClosed: !!isClosed,
        workStart: workStart || null,
        workEnd: workEnd || null,
        lunchStart: lunchStart || null,
        lunchEnd: lunchEnd || null,
      },
      {
        isClosed: !!isClosed,
        workStart: workStart || null,
        workEnd: workEnd || null,
        lunchStart: lunchStart || null,
        lunchEnd: lunchEnd || null,
      }
    );
    return serializeOfficeOverride(row);
  }

  async deleteOfficeOverride(dateInput) {
    const day = parseDateInput(dateInput);
    try {
      await scheduleModel.deleteOfficeOverride({ date: day });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Override not found');
      }
      throw err;
    }
  }

  async listServiceOverrides(serviceId) {
    const where = serviceId ? { serviceId: Number(serviceId) } : {};
    return scheduleModel.findServiceOverrides({
      where,
      include: { service: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { serviceId: 'asc' }],
    });
  }

  async upsertServiceOverride(body) {
    const { date, serviceId, serviceDisabled, workStart, workEnd, lunchStart, lunchEnd } = body;
    const day = parseDateInput(date);
    const sid = Number(serviceId);
    return scheduleModel.upsertServiceOverride(
      { date_serviceId: { date: day, serviceId: sid } },
      {
        date: day,
        serviceId: sid,
        serviceDisabled: !!serviceDisabled,
        workStart: workStart || null,
        workEnd: workEnd || null,
        lunchStart: lunchStart || null,
        lunchEnd: lunchEnd || null,
      },
      {
        serviceDisabled: !!serviceDisabled,
        workStart: workStart || null,
        workEnd: workEnd || null,
        lunchStart: lunchStart || null,
        lunchEnd: lunchEnd || null,
      }
    );
  }

  async deleteServiceOverride(dateInput, serviceId) {
    const day = parseDateInput(dateInput);
    try {
      await scheduleModel.deleteServiceOverride({
        date_serviceId: { date: day, serviceId: Number(serviceId) },
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Override not found');
      }
      throw err;
    }
  }
}

module.exports = new ScheduleService();
