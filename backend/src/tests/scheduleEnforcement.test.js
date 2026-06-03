const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCalendarDay, toPrismaDateOnly } = require('../utils/dateRange');
const { parseDateParam } = require('../utils/generateSlots');
const { closedReasonMessage } = require('../utils/scheduleErrors');

describe('schedule override enforcement', () => {
  it('aligns resident YMD with Prisma override lookup key', () => {
    const ymd = '2026-07-01';
    const normalized = normalizeCalendarDay(ymd);
    assert.ok(normalized);
    assert.equal(normalized.ymd, ymd);
    assert.equal(normalized.prismaDate.getTime(), toPrismaDateOnly(ymd).getTime());
  });

  it('aligns parseDateParam output with override key (timezone-safe)', () => {
    const localDay = parseDateParam('2026-06-20');
    const normalized = normalizeCalendarDay(localDay);
    assert.ok(normalized);
    assert.equal(normalized.ymd, '2026-06-20');
    assert.equal(
      normalized.prismaDate.getTime(),
      toPrismaDateOnly('2026-06-20').getTime()
    );
  });

  it('maps closed reasons to resident-facing errors', () => {
    assert.equal(closedReasonMessage('office_closed'), 'Office is closed on this date.');
    assert.equal(
      closedReasonMessage('service_disabled'),
      'This service is unavailable on the selected date.'
    );
  });
});
