/**
 * Daily appointment reminder job — sends SMS for tomorrow's bookings.
 */
const appointmentModel = require('../models/appointment.model');
const smsService = require('./sms.service');
const { APPOINTMENT_STATUS } = require('../config/constants');
const { attachTimeSlot } = require('../utils/appointmentSlot');

const REMINDER_ELIGIBLE_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.RESCHEDULED,
];

/**
 * Start of calendar day in local server time (UTC midnight on that date).
 */
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Find appointments scheduled tomorrow, send reminder SMS, mark reminderSent.
 * Skips cancelled/completed and already-reminded rows.
 *
 * @returns {Promise<{ sent: number, failed: number, skipped: number, total: number }>}
 */
async function sendTomorrowReminders() {
  const tomorrow = startOfDay(addDays(new Date(), 1));

  const rows = await appointmentModel.findAppointmentsNeedingReminderForDay(
    tomorrow,
    REMINDER_ELIGIBLE_STATUSES
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const flat = attachTimeSlot(row);
    const phone = row.group?.resident?.phone;
    const appointmentNumber = row.group?.appointmentNumber;

    if (!phone || !appointmentNumber) {
      skipped += 1;
      continue;
    }

    const result = await smsService.sendAppointmentReminder({
      phone,
      appointmentNumber,
      serviceName: row.service?.name,
      date: flat.slotDate,
      time: flat.slotStartTime,
    });

    if (result.skipped) {
      skipped += 1;
      continue;
    }

    if (result.success) {
      await appointmentModel.markReminderSent(row.id);
      sent += 1;
    } else {
      failed += 1;
    }
  }

  const summary = {
    total: rows.length,
    sent,
    failed,
    skipped,
    reminderDate: tomorrow.toISOString().slice(0, 10),
  };

  console.log('[reminder] Job finished', summary);
  return summary;
}

module.exports = {
  sendTomorrowReminders,
  startOfDay,
  addDays,
};
