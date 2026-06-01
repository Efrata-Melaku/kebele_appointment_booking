const env = require('../config/env');
const { getTransporter, isEmailConfigured } = require('../config/email.config');
const {
  buildConfirmationHtml,
  buildUpdateHtml,
  buildCancellationHtml,
  buildReminderHtml,
} = require('../templates/appointmentConfirmation');

function normalizeRecipient(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

async function sendEmail(to, subject, html) {
  const recipient = normalizeRecipient(to);
  if (!recipient) {
    return { success: false, skipped: true, message: 'Invalid or missing email address' };
  }

  if (!isEmailConfigured()) {
    console.warn(
      '[email] Skipped send — set EMAIL_USER and EMAIL_PASSWORD in backend/.env (save the file), then restart the server'
    );
    return { success: false, skipped: true, message: 'Email service not configured' };
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: env.EMAIL_FROM || env.EMAIL_USER,
      to: recipient,
      subject,
      html,
    });
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    };
  } catch (error) {
    console.error('[email] Send failed:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to send email',
    };
  }
}

async function sendAppointmentConfirmationEmail(data) {
  const html = buildConfirmationHtml(data);
  return sendEmail(data.email, 'Appointment Confirmation', html);
}

async function sendAppointmentUpdateEmail(data) {
  const html = buildUpdateHtml(data);
  return sendEmail(data.email, 'Appointment Updated', html);
}

async function sendAppointmentCancellationEmail(data) {
  const html = buildCancellationHtml(data);
  return sendEmail(data.email, 'Appointment Cancelled', html);
}

async function sendAppointmentReminderEmail(data) {
  const html = buildReminderHtml(data);
  return sendEmail(data.email, 'Appointment Reminder', html);
}

module.exports = {
  sendEmail,
  sendAppointmentConfirmationEmail,
  sendAppointmentUpdateEmail,
  sendAppointmentCancellationEmail,
  sendAppointmentReminderEmail,
  normalizeRecipient,
};
