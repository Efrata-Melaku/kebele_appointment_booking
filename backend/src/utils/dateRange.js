/**
 * Local-calendar date helpers for Prisma @db.Date and DateTime filters.
 * Avoids `new Date('YYYY-MM-DD')` UTC midnight off-by-one issues.
 */

function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) {
    return null;
  }
  return date;
}

/**
 * Calendar date for Prisma @db.Date — always UTC midnight of the Y-M-D the user picked.
 * Never use bare `new Date()` for override keys.
 */
function toPrismaDateOnly(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const parsed = parseYmd(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  return null;
}

/**
 * Normalize any booking/override date input to a single calendar day.
 * Uses the Y-M-D the user selected (local calendar), aligned with Prisma @db.Date keys.
 */
function normalizeCalendarDay(dateInput) {
  if (dateInput == null || dateInput === '') return null;

  let ymd = null;
  if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    const exact = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (exact) ymd = `${exact[1]}-${exact[2]}-${exact[3]}`;
    else {
      const prefix = /^(\d{4}-\d{2}-\d{2})/.exec(s);
      if (prefix) ymd = prefix[1];
    }
  }

  if (!ymd && dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    const d = startOfLocalDay(dateInput);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    ymd = `${d.getFullYear()}-${mo}-${day}`;
  }

  if (!ymd) return null;
  const dayStart = parseYmd(ymd);
  const prismaDate = toPrismaDateOnly(ymd);
  if (!dayStart || !prismaDate) return null;
  return { ymd, dayStart, prismaDate };
}

/** Format a stored @db.Date or YMD string as YYYY-MM-DD (UTC calendar day). */
function formatDateOnlyYmd(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : toPrismaDateOnly(value);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfLocalWeek(date = new Date()) {
  const d = startOfLocalDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfLocalWeek(date = new Date()) {
  const start = startOfLocalWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfLocalDay(end);
}

function startOfLocalMonth(date = new Date()) {
  return startOfLocalDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfLocalMonth(date = new Date()) {
  return endOfLocalDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function startOfLocalYear(date = new Date()) {
  return startOfLocalDay(new Date(date.getFullYear(), 0, 1));
}

function endOfLocalYear(date = new Date()) {
  return endOfLocalDay(new Date(date.getFullYear(), 11, 31));
}

/**
 * Build a Prisma-compatible range for slotDate / createdAt filters.
 * @param {object} filters
 * @param {'slotDate'|'createdAt'} fieldKey - only used for documentation; returns { gte, lte }
 */
function resolveDateFilterRange(filters = {}) {
  const preset = filters.datePreset;

  if (preset === 'today') {
    const now = new Date();
    return { gte: startOfLocalDay(now), lte: endOfLocalDay(now) };
  }

  if (preset === 'week') {
    return { gte: startOfLocalWeek(), lte: endOfLocalWeek() };
  }

  if (preset === 'month') {
    return { gte: startOfLocalMonth(), lte: endOfLocalMonth() };
  }

  if (preset === 'year') {
    return { gte: startOfLocalYear(), lte: endOfLocalYear() };
  }

  if (filters.slotDate) {
    const d = parseYmd(filters.slotDate);
    if (!d) return null;
    return { gte: startOfLocalDay(d), lte: endOfLocalDay(d) };
  }

  if (filters.dateFrom || filters.dateTo) {
    const range = {};
    if (filters.dateFrom) {
      const from = parseYmd(filters.dateFrom);
      if (from) range.gte = startOfLocalDay(from);
    }
    if (filters.dateTo) {
      const to = parseYmd(filters.dateTo);
      if (to) range.lte = endOfLocalDay(to);
    }
    if (Object.keys(range).length) return range;
  }

  return null;
}

/**
 * Human-readable label for the active report filter.
 */
function describeDateFilter(filters = {}) {
  const preset = filters.datePreset;
  if (preset === 'today') return 'Today';
  if (preset === 'week') return 'This week';
  if (preset === 'month') return 'This month';
  if (preset === 'year') return 'This year';
  if (filters.dateFrom && filters.dateTo) return `${filters.dateFrom} – ${filters.dateTo}`;
  if (filters.dateFrom) return `From ${filters.dateFrom}`;
  if (filters.dateTo) return `Until ${filters.dateTo}`;
  return 'All time';
}

module.exports = {
  parseYmd,
  toPrismaDateOnly,
  formatDateOnlyYmd,
  normalizeCalendarDay,
  startOfLocalDay,
  endOfLocalDay,
  startOfLocalWeek,
  endOfLocalWeek,
  startOfLocalMonth,
  endOfLocalMonth,
  startOfLocalYear,
  endOfLocalYear,
  resolveDateFilterRange,
  describeDateFilter,
};
