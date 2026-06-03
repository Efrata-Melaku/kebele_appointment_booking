const { parseTime } = require('./time.utils');

function hasTimeValue(value) {
  return value != null && String(value).trim() !== '';
}

function overrideHasWorkHours(row) {
  return row && hasTimeValue(row.workStart) && hasTimeValue(row.workEnd);
}

function overrideHasLunch(row) {
  return row && hasTimeValue(row.lunchStart) && hasTimeValue(row.lunchEnd);
}

/**
 * Merge schedule layers: ServiceScheduleOverride > OfficeScheduleOverride > WorkScheduleTemplate.
 * Custom work hours without lunch fields => no lunch break (do not inherit template lunch).
 */
function mergeEffectiveSchedule(template, officeOv, svcOv) {
  const svcActive = svcOv && !svcOv.serviceDisabled;
  const officeActive = officeOv && !officeOv.isClosed;

  let workStart = template.workStart;
  let workEnd = template.workEnd;
  let workLayer = 'template';

  if (svcActive && overrideHasWorkHours(svcOv)) {
    workStart = svcOv.workStart;
    workEnd = svcOv.workEnd;
    workLayer = 'service';
  } else if (officeActive && overrideHasWorkHours(officeOv)) {
    workStart = officeOv.workStart;
    workEnd = officeOv.workEnd;
    workLayer = 'office';
  }

  let hasLunch = true;
  let lunchStart = template.lunchStart;
  let lunchEnd = template.lunchEnd;
  let lunchLayer = 'template';

  if (svcActive) {
    if (overrideHasLunch(svcOv)) {
      hasLunch = true;
      lunchStart = svcOv.lunchStart;
      lunchEnd = svcOv.lunchEnd;
      lunchLayer = 'service';
    } else if (overrideHasWorkHours(svcOv)) {
      hasLunch = false;
      lunchLayer = 'service';
    } else if (officeActive && overrideHasLunch(officeOv)) {
      hasLunch = true;
      lunchStart = officeOv.lunchStart;
      lunchEnd = officeOv.lunchEnd;
      lunchLayer = 'office';
    } else if (officeActive && overrideHasWorkHours(officeOv)) {
      hasLunch = false;
      lunchLayer = 'office';
    }
  } else if (officeActive) {
    if (overrideHasLunch(officeOv)) {
      hasLunch = true;
      lunchStart = officeOv.lunchStart;
      lunchEnd = officeOv.lunchEnd;
      lunchLayer = 'office';
    } else if (overrideHasWorkHours(officeOv)) {
      hasLunch = false;
      lunchLayer = 'office';
    }
  }

  if (hasLunch && !lunchBreakInsideWork(workStart, workEnd, lunchStart, lunchEnd)) {
    hasLunch = false;
    lunchLayer = `${lunchLayer}+no-overlap`;
  }

  return {
    workStart,
    workEnd,
    hasLunch,
    lunchStart,
    lunchEnd,
    workLayer,
    lunchLayer,
  };
}

/** Lunch must lie strictly inside work window to split slots. */
function lunchBreakInsideWork(workStart, workEnd, lunchStart, lunchEnd) {
  const ws = parseTime(workStart);
  const we = parseTime(workEnd);
  const ls = parseTime(lunchStart);
  const le = parseTime(lunchEnd);
  return ws < ls && ls < le && le < we;
}

function logScheduleDebug(context) {
  if (process.env.SCHEDULE_DEBUG !== '1') return;
  console.debug('[schedule]', JSON.stringify(context, null, 2));
}

module.exports = {
  mergeEffectiveSchedule,
  overrideHasWorkHours,
  overrideHasLunch,
  lunchBreakInsideWork,
  logScheduleDebug,
};
