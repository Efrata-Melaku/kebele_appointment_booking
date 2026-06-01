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
