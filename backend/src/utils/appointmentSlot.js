const { slotDateFromSlotStartTime } = require('./dateRange');

/**
 * Map stored slot columns to legacy `timeSlot` shape for API consumers.
 * Display date follows slotStartTime (not raw slotDate) so UI matches the real start instant.
 */
function attachTimeSlot(appointment) {
  if (!appointment) return appointment;
  const { slotDate, slotStartTime, slotEndTime, ...rest } = appointment;
  const displayDate =
    slotStartTime != null ? slotDateFromSlotStartTime(slotStartTime) ?? slotDate : slotDate;
  return {
    ...rest,
    slotDate,
    slotStartTime,
    slotEndTime,
    timeSlot: slotStartTime
      ? {
          date: displayDate ?? slotDate,
          startTime: slotStartTime,
          endTime: slotEndTime,
        }
      : slotDate
        ? {
            date: slotDate,
            startTime: slotStartTime,
            endTime: slotEndTime,
          }
        : undefined,
  };
}

function attachTimeSlotMany(rows) {
  return rows.map(attachTimeSlot);
}

module.exports = {
  attachTimeSlot,
  attachTimeSlotMany,
};
