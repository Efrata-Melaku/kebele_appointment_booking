const { generateSlotIntervals } = require('../utils/generateSlots');
const { resolveDaySchedule } = require('./overrideChecker.service');

/**
 * Returns ordered { start, end } Date pairs for one calendar day for a service, or [] if closed.
 */
async function getSlotIntervalsForServiceDate(service, date) {
  const schedule = await resolveDaySchedule(service.id, date);
  if (schedule.closed) {
    return [];
  }

  return generateSlotIntervals({
    dayStart: schedule.dayStart,
    workStart: schedule.workStart,
    workEnd: schedule.workEnd,
    lunchStart: schedule.lunchStart,
    lunchEnd: schedule.lunchEnd,
    durationMinutes: service.durationInMinutes,
  }).map((s) => ({ start: s.startAt, end: s.endAt }));
}

module.exports = {
  getSlotIntervalsForServiceDate,
};
