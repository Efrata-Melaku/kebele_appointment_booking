const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { toPrismaDateOnly, formatDateOnlyYmd } = require('../utils/dateRange');

describe('office schedule override dates', () => {
  it('stores the selected YMD as UTC date-only (not today)', () => {
    const selected = '2026-07-01';
    const stored = toPrismaDateOnly(selected);
    assert.equal(formatDateOnlyYmd(stored), '2026-07-01');
    assert.notEqual(formatDateOnlyYmd(stored), formatDateOnlyYmd(new Date()));
  });

  it('matches lookup key for resident-selected date string', () => {
    const adminSelected = '2026-06-20';
    const residentSelected = '2026-06-20';
    assert.equal(
      toPrismaDateOnly(adminSelected).getTime(),
      toPrismaDateOnly(residentSelected).getTime()
    );
  });

  it('formats API date without shifting the calendar day', () => {
    const stored = toPrismaDateOnly('2026-06-25');
    assert.equal(formatDateOnlyYmd(stored), '2026-06-25');
  });
});
