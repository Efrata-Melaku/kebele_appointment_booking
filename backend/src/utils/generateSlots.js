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
 * When hasLunch is false, only use workStart–workEnd (never extend to template lunch).
 */
function buildWorkWindows(dayStart, workStart, workEnd, lunchStart, lunchEnd, options = {}) {
  const ws = atLocalDate(dayStart, workStart);
  const we = atLocalDate(dayStart, workEnd);

  if (ws >= we) return [];

  if (options.hasLunch === false) {
    return [{ start: ws, end: we }];
  }

  const ls = atLocalDate(dayStart, lunchStart);
  const le = atLocalDate(dayStart, lunchEnd);

  if (ls >= le || ls >= we || le <= ws) {
    return [{ start: ws, end: we }];
  }

  const windows = [];
  if (ws < ls) {
    windows.push({ start: ws, end: ls });
  }
  if (le < we) {
    windows.push({ start: le, end: we });
  }
  if (windows.length === 0) {
    return [{ start: ws, end: we }];
  }
  return windows;
}

/**
 * Generate slot intervals for one day from resolved schedule hours.
 * @returns {{ start: string, end: string, startAt: Date, endAt: Date }[]}
 */
function filterIntervalsToWorkHours(intervals, dayStart, workStart, workEnd) {
  const ws = atLocalDate(dayStart, workStart);
  const we = atLocalDate(dayStart, workEnd);
  return intervals.filter((slot) => slot.startAt >= ws && slot.endAt <= we);
}

function generateSlotIntervals({
  dayStart,
  workStart,
  workEnd,
  lunchStart,
  lunchEnd,
  durationMinutes,
  hasLunch = true,
}) {
  const windows = buildWorkWindows(dayStart, workStart, workEnd, lunchStart, lunchEnd, {
    hasLunch,
  });
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

  return filterIntervalsToWorkHours(out, dayStart, workStart, workEnd);
}

/**
 * Attach capacity from booking counts.
 */
function applyCapacityToSlots(intervals, bookedByStartKey, staffCount) {
  const cap = Math.max(0, staffCount);
  return intervals.map((slot) => {
    const booked = bookedByStartKey.get(slot.start) || 0;
    const remaining = Math.max(0, cap - booked);
    const isAvailable = cap > 0 && booked < cap;
    return {
      start: slot.start,
      end: slot.end,
      available: isAvailable,
      remainingCapacity: remaining,
      bookedCount: booked,
      maxCapacity: cap,
    };
  });
}

/** Resident-facing API: only bookable slots, no capacity fields. */
function toResidentSlotList(slotsWithCapacity) {
  return slotsWithCapacity
    .filter((s) => s.available)
    .map((s, index) => ({
      id: index + 1,
      startTime: s.start,
      endTime: s.end,
    }));
}

/** Admin/staff preview: full capacity metadata. */
function toAdminSlotList(slotsWithCapacity) {
  return slotsWithCapacity.map((s, index) => ({
    id: index + 1,
    start: s.start,
    end: s.end,
    startTime: s.start,
    endTime: s.end,
    available: s.available,
    remainingCapacity: s.remainingCapacity,
    bookedCount: s.bookedCount,
    maxCapacity: s.maxCapacity,
  }));
}

function slotStartKey(date) {
  return formatTime(date);
}

module.exports = {
  calendarDateOnly,
  parseDateParam,
  atLocalDate,
  buildWorkWindows,
  filterIntervalsToWorkHours,
  generateSlotIntervals,
  applyCapacityToSlots,
  toResidentSlotList,
  toAdminSlotList,
  slotStartKey,
};
