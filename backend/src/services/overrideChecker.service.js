const scheduleModel = require('../models/schedule.model');
const { calendarDateOnly } = require('../utils/generateSlots');

async function getOrCreateDefaultTemplate() {
  let t = await scheduleModel.findFirstWorkScheduleTemplate({ orderBy: { id: 'asc' } });
  if (!t) {
    t = await scheduleModel.createWorkScheduleTemplate({});
  }
  return t;
}

function weekdayFlag(template, d) {
  const map = [
    template.sun,
    template.mon,
    template.tue,
    template.wed,
    template.thu,
    template.fri,
    template.sat,
  ];
  return map[d.getDay()];
}

async function getOfficeOverrideForDate(date) {
  const day = calendarDateOnly(date);
  return scheduleModel.findOfficeOverrideByDate(day);
}

async function getServiceOverrideForDate(serviceId, date) {
  const day = calendarDateOnly(date);
  return scheduleModel.findServiceOverrideByDate(day, serviceId);
}

/**
 * Resolve effective hours for a service on a calendar day.
 * @returns {{ closed: true } | { closed: false, workStart, workEnd, lunchStart, lunchEnd }}
 */
async function resolveDaySchedule(serviceId, date) {
  const template = await getOrCreateDefaultTemplate();
  const dayStart = calendarDateOnly(date);

  if (!weekdayFlag(template, dayStart)) {
    return { closed: true, reason: 'non_working_day' };
  }

  const officeOv = await getOfficeOverrideForDate(dayStart);
  if (officeOv?.isClosed) {
    return { closed: true, reason: 'office_closed' };
  }

  const svcOv = await getServiceOverrideForDate(serviceId, dayStart);
  if (svcOv?.serviceDisabled) {
    return { closed: true, reason: 'service_disabled' };
  }

  let workStart = template.workStart;
  let workEnd = template.workEnd;
  let lunchStart = template.lunchStart;
  let lunchEnd = template.lunchEnd;

  if (officeOv && !officeOv.isClosed) {
    if (officeOv.workStart) workStart = officeOv.workStart;
    if (officeOv.workEnd) workEnd = officeOv.workEnd;
    if (officeOv.lunchStart) lunchStart = officeOv.lunchStart;
    if (officeOv.lunchEnd) lunchEnd = officeOv.lunchEnd;
  }

  if (svcOv && !svcOv.serviceDisabled) {
    if (svcOv.workStart) workStart = svcOv.workStart;
    if (svcOv.workEnd) workEnd = svcOv.workEnd;
    if (svcOv.lunchStart) lunchStart = svcOv.lunchStart;
    if (svcOv.lunchEnd) lunchEnd = svcOv.lunchEnd;
  }

  return {
    closed: false,
    dayStart,
    workStart,
    workEnd,
    lunchStart,
    lunchEnd,
  };
}

module.exports = {
  getOrCreateDefaultTemplate,
  resolveDaySchedule,
  getOfficeOverrideForDate,
  getServiceOverrideForDate,
};
