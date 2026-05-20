/**
 * Map stored slot columns to legacy `timeSlot` shape for API consumers.
 */
function attachTimeSlot(appointment) {
  if (!appointment) return appointment;
  const { slotDate, slotStartTime, slotEndTime, ...rest } = appointment;
  return {
    ...rest,
    slotDate,
    slotStartTime,
    slotEndTime,
    timeSlot: slotDate
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
