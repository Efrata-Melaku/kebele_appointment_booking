const { generateTimeSlots, parseTime, formatTime } = require('./time.utils');

function calendarDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDateParam(dateInput) {
  if (!dateInput) return null;
  const s = String(dateInput).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return calendarDateOnly(d);
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return calendarDateOnly(d);
}

function atLocalDate(baseDate, timeStr) {
  const d = calendarDateOnly(baseDate);
  const t = parseTime(timeStr);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d;
}

/**
 * Split work day around lunch into one or two windows.
 */
function buildWorkWindows(dayStart, workStart, workEnd, lunchStart, lunchEnd) {
  const ws = atLocalDate(dayStart, workStart);
  const we = atLocalDate(dayStart, workEnd);
  const ls = atLocalDate(dayStart, lunchStart);
  const le = atLocalDate(dayStart, lunchEnd);

  const windows = [];
  if (ws < ls) {
    windows.push({ start: ws, end: ls });
  }
  if (le < we) {
    windows.push({ start: le, end: we });
  }
  return windows;
}

/**
 * Generate slot intervals for one day from resolved schedule hours.
 * @returns {{ start: string, end: string, startAt: Date, endAt: Date }[]}
 */
function generateSlotIntervals({ dayStart, workStart, workEnd, lunchStart, lunchEnd, durationMinutes }) {
  const windows = buildWorkWindows(dayStart, workStart, workEnd, lunchStart, lunchEnd);
  const out = [];

  for (const w of windows) {
    const chunks = generateTimeSlots(w.start, w.end, durationMinutes);
    for (const chunk of chunks) {
      out.push({
        start: formatTime(chunk.start),
        end: formatTime(chunk.end),
        startAt: chunk.start,
        endAt: chunk.end,
      });
    }
  }

  return out;
}

/**
 * Attach capacity from booking counts.
 */
function applyCapacityToSlots(intervals, bookedByStartKey, staffCount) {
  const cap = Math.max(0, staffCount);
  return intervals.map((slot) => {
    const booked = bookedByStartKey.get(slot.start) || 0;
    const remaining = Math.max(0, cap - booked);
    return {
      start: slot.start,
      end: slot.end,
      available: cap > 0 && remaining > 0,
      remainingCapacity: remaining,
    };
  });
}

function slotStartKey(date) {
  return formatTime(date);
}

module.exports = {
  calendarDateOnly,
  parseDateParam,
  atLocalDate,
  buildWorkWindows,
  generateSlotIntervals,
  applyCapacityToSlots,
  slotStartKey,
};
