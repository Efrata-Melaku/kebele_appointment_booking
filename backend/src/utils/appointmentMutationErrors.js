const { RESCHEDULE_TOO_SOON_MESSAGE } = require('./rescheduleEligibility');
const { isScheduleClientError } = require('./scheduleErrors');

/**
 * Map resident appointment edit/reschedule errors to HTTP status + message.
 * @param {Error & { statusCode?: number; code?: string }} error
 */
function mapAppointmentMutationError(error) {
  const message = error?.message || 'Unexpected server error';
  const statusCode = error?.statusCode;

  if (statusCode && statusCode >= 400 && statusCode < 600) {
    return { status: statusCode, message };
  }

  if (error?.code === 'DYNAMIC_FORM_VALIDATION') {
    return { status: 400, message: 'Form validation failed', details: error.details };
  }

  if (message.includes('not found') || message.includes('No editable') || message.includes('No pending')) {
    return { status: 404, message };
  }

  if (message.includes('Verification failed')) {
    return { status: 403, message };
  }

  if (
    message.includes('Invalid appointment reference') ||
    message.includes('Invalid date') ||
    message.includes('slotDate and slotStart are required') ||
    message.includes('timeSlotId is no longer supported') ||
    message.includes('appointmentItemId is required') ||
    message.includes('Cannot edit') ||
    message.includes('Cannot reschedule') ||
    message === RESCHEDULE_TOO_SOON_MESSAGE
  ) {
    return { status: 400, message };
  }

  if (message.includes('fully booked')) {
    return { status: 409, message: 'Selected slot is unavailable.' };
  }

  if (isScheduleClientError(message)) {
    return { status: 400, message };
  }

  if (message.includes('Invalid slot') || message.includes('Invalid time slot')) {
    return { status: 400, message: 'Invalid slot.' };
  }

  if (error?.code === 'P2025') {
    return { status: 404, message: 'Appointment not found.' };
  }

  return { status: 500, message: 'Unable to complete this request. Please try again.' };
}

function logAppointmentMutationError(context, req, error, extra = {}) {
  console.error(`[${context}] error:`, error?.message || error);
  if (error?.stack) console.error(error.stack);
  if (process.env.APPOINTMENT_EDIT_DEBUG === '1' || process.env.RESCHEDULE_DEBUG === '1') {
    console.error(`[${context}] request`, {
      params: req?.params,
      bodyKeys: req?.body ? Object.keys(req.body) : [],
      phone: req?.body?.phone ? '[set]' : undefined,
      slotDate: req?.body?.slotDate,
      slotStart: req?.body?.slotStart,
      appointmentItemId: req?.body?.appointmentItemId,
      ...extra,
    });
    if (error?.code) console.error(`[${context}] prisma/code`, error.code);
  }
}

module.exports = {
  mapAppointmentMutationError,
  logAppointmentMutationError,
};
