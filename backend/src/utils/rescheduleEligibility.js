const { combineSlotDateAndTime } = require('./dateRange');

/** Minimum lead time before appointment start for reschedule / edit. */
const MS_24_HOURS = 24 * 60 * 60 * 1000;

const RESCHEDULE_TOO_SOON_MESSAGE =
  'Rescheduling is only allowed when more than 24 hours remain before your appointment start time.';

function formatLocalDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Resolve appointment start instant — always from stored slotStartTime (never slotDate alone).
 * @param {{ slotDate?: Date | string, slotStartTime?: Date | string, timeSlot?: { startTime?: Date | string, date?: Date | string } }} appointment
 */
function appointmentStartAt(appointment) {
  const raw = appointment?.slotStartTime ?? appointment?.timeSlot?.startTime ?? null;
  if (raw == null || raw === '') {
    throw new Error('Appointment slot start time is missing');
  }

  if (typeof raw === 'string' && /^\d{1,2}:\d{2}$/.test(raw.trim())) {
    const day = appointment?.slotDate ?? appointment?.timeSlot?.date;
    const combined = combineSlotDateAndTime(day, raw.trim());
    if (combined) return combined;
  }

  const start = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Appointment slot start time is invalid');
  }
  return start;
}

function msUntilAppointmentStart(appointment, now = new Date()) {
  return appointmentStartAt(appointment).getTime() - now.getTime();
}

function logRescheduleCheck(appointment, result) {
  const tz =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'unknown';

  console.log({
    now: result.now,
    appointmentTime: result.appointmentStart,
    nowLocal: formatLocalDateTime(result.now),
    appointmentTimeLocal: formatLocalDateTime(result.appointmentStart),
    serverTimezone: tz,
    diffHours: Number(result.diffHours.toFixed(2)),
    allowed: result.allowed,
  });

  console.log('[reschedule-validation]', {
    now: result.now.toISOString(),
    appointmentTime: result.appointmentStart.toISOString(),
    nowLocal: formatLocalDateTime(result.now),
    appointmentStartLocal: formatLocalDateTime(result.appointmentStart),
    serverTimezone: tz,
    serverUtcOffsetMinutes: result.now.getTimezoneOffset(),
    slotDateStored: appointment?.slotDate ?? null,
    slotStartTimeStored: appointment?.slotStartTime ?? null,
    diffMs: result.diffMs,
    diffHours: Number(result.diffHours.toFixed(2)),
    allowed: result.allowed,
    validation: result.allowed ? 'ALLOWED' : 'REJECTED',
  });
}

/**
 * Allow when: currentTime + 24h < appointmentStart  (equivalently diffMs > 24h).
 * @returns {{ allowed: boolean, diffMs: number, diffHours: number, now: Date, appointmentStart: Date }}
 */
function evaluateRescheduleEligibility(appointment, now = new Date()) {
  const appointmentStart = appointmentStartAt(appointment);
  const diffMs = appointmentStart.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const allowed = diffMs > MS_24_HOURS;

  const result = {
    allowed,
    diffMs,
    diffHours,
    now,
    appointmentStart,
  };

  if (!allowed || process.env.RESCHEDULE_DEBUG === '1') {
    logRescheduleCheck(appointment, result);
  }

  return result;
}

function assertMoreThan24HoursBeforeAppointment(appointment) {
  const result = evaluateRescheduleEligibility(appointment);
  if (!result.allowed) {
    throw new Error(RESCHEDULE_TOO_SOON_MESSAGE);
  }
}

module.exports = {
  MS_24_HOURS,
  RESCHEDULE_TOO_SOON_MESSAGE,
  appointmentStartAt,
  msUntilAppointmentStart,
  evaluateRescheduleEligibility,
  assertMoreThan24HoursBeforeAppointment,
};
