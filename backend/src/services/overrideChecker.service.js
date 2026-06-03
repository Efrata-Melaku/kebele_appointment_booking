const scheduleModel = require('../models/schedule.model');
const { normalizeCalendarDay } = require('../utils/dateRange');
const { mergeEffectiveSchedule, logScheduleDebug } = require('../utils/scheduleMerge');

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

async function getOfficeOverrideForDate(dateInput) {
  const day = normalizeCalendarDay(dateInput);
  if (!day) return null;
  return scheduleModel.findOfficeOverrideByDate(day.prismaDate);
}

async function getServiceOverrideForDate(serviceId, dateInput) {
  const day = normalizeCalendarDay(dateInput);
  if (!day) return null;
  return scheduleModel.findServiceOverrideByDate(day.prismaDate, serviceId);
}

/**
 * Resolve effective hours for a service on a calendar day.
 * Priority: ServiceScheduleOverride > OfficeScheduleOverride > WorkScheduleTemplate
 * @returns {{ closed: true, reason: string } | { closed: false, dayStart, prismaDate, workStart, workEnd, lunchStart, lunchEnd, hasLunch, sources }}
 */
async function resolveDaySchedule(serviceId, dateInput) {
  const normalized = normalizeCalendarDay(dateInput);
  if (!normalized) {
    return { closed: true, reason: 'invalid_date' };
  }

  const { dayStart, prismaDate, ymd } = normalized;
  const template = await getOrCreateDefaultTemplate();

  if (!weekdayFlag(template, dayStart)) {
    return { closed: true, reason: 'non_working_day' };
  }

  const officeOv = await scheduleModel.findOfficeOverrideByDate(prismaDate);
  if (officeOv?.isClosed) {
    return { closed: true, reason: 'office_closed' };
  }

  const svcOv = await scheduleModel.findServiceOverrideByDate(prismaDate, Number(serviceId));
  if (svcOv?.serviceDisabled) {
    return { closed: true, reason: 'service_disabled' };
  }

  const merged = mergeEffectiveSchedule(template, officeOv, svcOv);

  logScheduleDebug({
    ymd,
    serviceId: Number(serviceId),
    template: {
      workStart: template.workStart,
      workEnd: template.workEnd,
      lunchStart: template.lunchStart,
      lunchEnd: template.lunchEnd,
    },
    officeOverride: officeOv
      ? {
          isClosed: officeOv.isClosed,
          workStart: officeOv.workStart,
          workEnd: officeOv.workEnd,
          lunchStart: officeOv.lunchStart,
          lunchEnd: officeOv.lunchEnd,
        }
      : null,
    serviceOverride: svcOv
      ? {
          serviceDisabled: svcOv.serviceDisabled,
          workStart: svcOv.workStart,
          workEnd: svcOv.workEnd,
          lunchStart: svcOv.lunchStart,
          lunchEnd: svcOv.lunchEnd,
        }
      : null,
    effective: {
      workStart: merged.workStart,
      workEnd: merged.workEnd,
      hasLunch: merged.hasLunch,
      lunchStart: merged.hasLunch ? merged.lunchStart : null,
      lunchEnd: merged.hasLunch ? merged.lunchEnd : null,
      workLayer: merged.workLayer,
      lunchLayer: merged.lunchLayer,
    },
  });

  return {
    closed: false,
    dayStart,
    prismaDate,
    workStart: merged.workStart,
    workEnd: merged.workEnd,
    hasLunch: merged.hasLunch,
    lunchStart: merged.lunchStart,
    lunchEnd: merged.lunchEnd,
    sources: {
      workLayer: merged.workLayer,
      lunchLayer: merged.lunchLayer,
    },
  };
}

module.exports = {
  getOrCreateDefaultTemplate,
  resolveDaySchedule,
  getOfficeOverrideForDate,
  getServiceOverrideForDate,
};
