const OFFICE_CLOSED_MESSAGE = 'Office is closed on this date.';
const SERVICE_UNAVAILABLE_MESSAGE = 'This service is unavailable on the selected date.';
const NO_SLOTS_MESSAGE = 'No appointment slots are available for this date.';
const INVALID_SLOT_MESSAGE = 'Invalid time slot for this date';

const SCHEDULE_CLIENT_ERRORS = new Set([
  OFFICE_CLOSED_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  NO_SLOTS_MESSAGE,
  INVALID_SLOT_MESSAGE,
  'Time slot is fully booked',
  'Invalid date',
  'Service not found',
]);

function isScheduleClientError(message) {
  return typeof message === 'string' && SCHEDULE_CLIENT_ERRORS.has(message);
}

function closedReasonMessage(reason) {
  if (reason === 'office_closed') return OFFICE_CLOSED_MESSAGE;
  if (reason === 'service_disabled') return SERVICE_UNAVAILABLE_MESSAGE;
  return NO_SLOTS_MESSAGE;
}

module.exports = {
  OFFICE_CLOSED_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  NO_SLOTS_MESSAGE,
  INVALID_SLOT_MESSAGE,
  SCHEDULE_CLIENT_ERRORS,
  isScheduleClientError,
  closedReasonMessage,
};
