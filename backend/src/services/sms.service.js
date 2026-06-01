/**
 * SMS notifications via Africa's Talking.
 * All outbound messages use normalized Ethiopian numbers (+251…).
 */
const env = require('../config/env');
const { getSmsClient, isConfigured } = require('../config/africastalking');
const { normalizePhone, validateEthiopianPhone, PHONE_ERROR } = require('../utils/phone');

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDisplayDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput ?? '');
  return d.toISOString().slice(0, 10);
}

function formatDisplayTime(timeInput) {
  if (!timeInput) return '';
  const raw = timeInput instanceof Date ? timeInput.toISOString() : String(timeInput);
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.slice(11, 16) || raw.slice(0, 5);
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
}

function buildConfirmationMessage({ appointmentNumber, serviceName, date, time }) {
  return `Your appointment has been confirmed.

Appointment Number:
${appointmentNumber}

Service:
${serviceName || 'Kebele Service'}

Date:
${formatDisplayDate(date)}

Time:
${formatDisplayTime(time)}`;
}

function buildReminderMessage({ appointmentNumber, serviceName, date, time }) {
  return `Reminder:

You have an appointment tomorrow.

Appointment Number:
${appointmentNumber}

Service:
${serviceName || 'Kebele Service'}

Date:
${formatDisplayDate(date)}

Time:
${formatDisplayTime(time)}`;
}

function buildCancellationMessage({ appointmentNumber, serviceName }) {
  return `Your appointment has been cancelled.

Appointment Number:
${appointmentNumber}

Service:
${serviceName || 'Kebele Service'}`;
}

function buildRescheduleMessage({ appointmentNumber, serviceName, date, time }) {
  return `Your appointment has been rescheduled.

Appointment Number:
${appointmentNumber}

Service:
${serviceName || 'Kebele Service'}

New Date:
${formatDisplayDate(date)}

New Time:
${formatDisplayTime(time)}`;
}

function buildCompletedMessage({ appointmentNumber, serviceName, date, time }) {
  return `Your appointment ${appointmentNumber} has been marked as Completed.

Service: ${serviceName || 'Kebele Service'}
Date: ${formatDisplayDate(date)}
Time: ${formatDisplayTime(time)}`;
}

function buildNotServedMessage({ appointmentNumber, serviceName, date, time }) {
  return `Your appointment ${appointmentNumber} has been marked as Not Served.

Service: ${serviceName || 'Kebele Service'}
Date: ${formatDisplayDate(date)}
Time: ${formatDisplayTime(time)}`;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function logSmsAttempt({ phone, message, status, detail }) {
  const entry = {
    phone,
    messagePreview: message?.slice(0, 80) + (message?.length > 80 ? '…' : ''),
    timestamp: new Date().toISOString(),
    status,
    ...(detail ? { detail } : {}),
  };
  if (status === 'failed') {
    console.error('[sms]', JSON.stringify(entry));
  } else {
    console.log('[sms]', JSON.stringify(entry));
  }
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

/**
 * Send a raw SMS to one Ethiopian number.
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<{ success: boolean, message: string, to?: string, provider?: object }>}
 */
async function sendSMS(phone, message) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    logSmsAttempt({
      phone: String(phone),
      message,
      status: 'skipped',
      detail: PHONE_ERROR,
    });
    return { success: false, message: PHONE_ERROR, skipped: true };
  }

  if (!isConfigured()) {
    logSmsAttempt({
      phone: normalized,
      message,
      status: 'logged_only',
      detail: 'Africa\'s Talking not configured (AT_API_KEY / AT_USERNAME)',
    });
    return {
      success: true,
      message: 'SMS logged (Africa\'s Talking not configured)',
      to: normalized,
      loggedOnly: true,
    };
  }

  try {
    const sms = getSmsClient();
    const payload = {
      to: [normalized],
      message,
    };
    if (env.AT_SENDER_ID) {
      payload.from = env.AT_SENDER_ID;
    }

    const providerResponse = await sms.send(payload);

    logSmsAttempt({
      phone: normalized,
      message,
      status: 'sent',
      detail: providerResponse,
    });

    return {
      success: true,
      message: 'SMS sent successfully',
      to: normalized,
      provider: providerResponse,
    };
  } catch (error) {
    logSmsAttempt({
      phone: normalized,
      message,
      status: 'failed',
      detail: error.message || String(error),
    });
    return {
      success: false,
      message: 'SMS failed',
      to: normalized,
      error: error.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Typed templates
// ---------------------------------------------------------------------------

/**
 * @param {{ phone: string, appointmentNumber: string, serviceName?: string, date: *, time: * }} data
 */
async function sendAppointmentConfirmation(data) {
  const { phone, appointmentNumber, serviceName, date, time } = data || {};
  if (!validateEthiopianPhone(phone)) {
    return { success: false, message: PHONE_ERROR, skipped: true };
  }
  const message = buildConfirmationMessage({ appointmentNumber, serviceName, date, time });
  return sendSMS(phone, message);
}

/**
 * @param {{ phone: string, appointmentNumber: string, serviceName?: string, date: *, time: * }} data
 */
async function sendAppointmentReminder(data) {
  const { phone, appointmentNumber, serviceName, date, time } = data || {};
  if (!validateEthiopianPhone(phone)) {
    return { success: false, message: PHONE_ERROR, skipped: true };
  }
  const message = buildReminderMessage({ appointmentNumber, serviceName, date, time });
  return sendSMS(phone, message);
}

/**
 * @param {{ phone: string, appointmentNumber: string, serviceName?: string }} data
 */
async function sendAppointmentCancellation(data) {
  const { phone, appointmentNumber, serviceName } = data || {};
  if (!validateEthiopianPhone(phone)) {
    return { success: false, message: PHONE_ERROR, skipped: true };
  }
  const message = buildCancellationMessage({ appointmentNumber, serviceName });
  return sendSMS(phone, message);
}

/**
 * @param {{ phone: string, appointmentNumber: string, serviceName?: string, date: *, time: * }} data
 */
async function sendAppointmentReschedule(data) {
  const { phone, appointmentNumber, serviceName, date, time } = data || {};
  if (!validateEthiopianPhone(phone)) {
    return { success: false, message: PHONE_ERROR, skipped: true };
  }
  const message = buildRescheduleMessage({ appointmentNumber, serviceName, date, time });
  return sendSMS(phone, message);
}

async function sendAppointmentCompleted(data) {
  const { phone, appointmentNumber, serviceName, date, time } = data || {};
  if (!validateEthiopianPhone(phone)) {
    return { success: false, message: PHONE_ERROR, skipped: true };
  }
  const message = buildCompletedMessage({ appointmentNumber, serviceName, date, time });
  return sendSMS(phone, message);
}

async function sendAppointmentNotServed(data) {
  const { phone, appointmentNumber, serviceName, date, time } = data || {};
  if (!validateEthiopianPhone(phone)) {
    return { success: false, message: PHONE_ERROR, skipped: true };
  }
  const message = buildNotServedMessage({ appointmentNumber, serviceName, date, time });
  return sendSMS(phone, message);
}

/** @deprecated Use sendAppointmentReschedule */
async function sendAppointmentUpdate(phone, appointmentNumber, serviceName, date, time) {
  return sendAppointmentReschedule({
    phone,
    appointmentNumber,
    serviceName,
    date,
    time,
  });
}

/** Legacy positional API — delegates to sendAppointmentConfirmation */
async function sendToEthiopianNumber(phone, message) {
  return sendSMS(phone, message);
}

module.exports = {
  sendSMS,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentCancellation,
  sendAppointmentReschedule,
  sendAppointmentCompleted,
  sendAppointmentNotServed,
  sendAppointmentUpdate,
  sendToEthiopianNumber,
  buildConfirmationMessage,
  buildReminderMessage,
  buildCancellationMessage,
  buildRescheduleMessage,
  buildCompletedMessage,
  buildNotServedMessage,
  formatDisplayDate,
  formatDisplayTime,
};
