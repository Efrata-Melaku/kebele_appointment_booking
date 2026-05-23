const env = require('../config/env');
const {
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  ETHIOPIAN_PHONE_ERROR,
} = require('../utils/ethiopianPhone');

function formatDisplayDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return d.toISOString().slice(0, 10);
}

function formatDisplayTime(timeInput) {
  if (!timeInput) return '';
  const raw = String(timeInput);
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.slice(0, 5);
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
}

function buildMessage(kind, { appointmentNumber, serviceName, date, time }) {
  const titles = {
    confirmation: 'Kebele Appointment Confirmation',
    update: 'Kebele Appointment Update',
    cancellation: 'Kebele Appointment Cancellation',
    reminder: 'Kebele Appointment Reminder',
  };
  const title = titles[kind] || titles.confirmation;
  return `${title}

Appointment Number: ${appointmentNumber}

Service: ${serviceName || 'Kebele Service'}

Date: ${formatDisplayDate(date)}

Time: ${formatDisplayTime(time)}`;
}

class SMSService {
  async sendToEthiopianNumber(phone, message) {
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized) {
      console.warn(`[sms] Skipped — invalid Ethiopian number: ${phone}`);
      return { success: false, message: ETHIOPIAN_PHONE_ERROR, skipped: true };
    }

    console.log(`[sms] To ${normalized}:\n${message}`);

    if (!env.SMS_API_URL || !env.SMS_API_KEY) {
      return { success: true, message: 'SMS logged (provider not configured)', to: normalized };
    }

    try {
      const response = await fetch(env.SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.SMS_API_KEY}`,
        },
        body: JSON.stringify({ to: normalized, message }),
      });

      if (!response.ok) {
        throw new Error(`SMS provider returned ${response.status}`);
      }

      return { success: true, message: 'SMS sent successfully', to: normalized };
    } catch (error) {
      console.error('[sms] Send failed:', error);
      return { success: false, message: 'Failed to send SMS', to: normalized };
    }
  }

  async sendAppointmentConfirmation(phone, appointmentNumber, serviceName, date, time) {
    if (!isValidEthiopianPhone(phone)) {
      return { success: false, message: ETHIOPIAN_PHONE_ERROR, skipped: true };
    }
    const message = buildMessage('confirmation', {
      appointmentNumber,
      serviceName,
      date,
      time,
    });
    return this.sendToEthiopianNumber(phone, message);
  }

  async sendAppointmentUpdate(phone, appointmentNumber, serviceName, date, time) {
    if (!isValidEthiopianPhone(phone)) {
      return { success: false, message: ETHIOPIAN_PHONE_ERROR, skipped: true };
    }
    const message = buildMessage('update', {
      appointmentNumber,
      serviceName,
      date,
      time,
    });
    return this.sendToEthiopianNumber(phone, message);
  }

  async sendAppointmentCancellation(phone, appointmentNumber, serviceName, date, time) {
    if (!isValidEthiopianPhone(phone)) {
      return { success: false, message: ETHIOPIAN_PHONE_ERROR, skipped: true };
    }
    const message = buildMessage('cancellation', {
      appointmentNumber,
      serviceName,
      date,
      time,
    });
    return this.sendToEthiopianNumber(phone, message);
  }

  async sendAppointmentReminder(phone, appointmentNumber, serviceName, date, time) {
    if (!isValidEthiopianPhone(phone)) {
      return { success: false, message: ETHIOPIAN_PHONE_ERROR, skipped: true };
    }
    const message = buildMessage('reminder', {
      appointmentNumber,
      serviceName,
      date,
      time,
    });
    return this.sendToEthiopianNumber(phone, message);
  }
}

module.exports = new SMSService();
