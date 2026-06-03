const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergeEffectiveSchedule } = require('../utils/scheduleMerge');
const { generateSlotIntervals, buildWorkWindows } = require('../utils/generateSlots');
const { parseYmd } = require('../utils/dateRange');

const template = {
  workStart: '08:00',
  workEnd: '17:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
};

describe('mergeEffectiveSchedule', () => {
  it('uses office custom work hours without inheriting template lunch', () => {
    const officeOv = {
      isClosed: false,
      workStart: '08:00',
      workEnd: '10:00',
      lunchStart: null,
      lunchEnd: null,
    };
    const merged = mergeEffectiveSchedule(template, officeOv, null);
    assert.equal(merged.workStart, '08:00');
    assert.equal(merged.workEnd, '10:00');
    assert.equal(merged.hasLunch, false);
    assert.equal(merged.workLayer, 'office');
  });

  it('service override wins over office for work hours', () => {
    const officeOv = {
      isClosed: false,
      workStart: '08:00',
      workEnd: '17:00',
      lunchStart: null,
      lunchEnd: null,
    };
    const svcOv = {
      serviceDisabled: false,
      workStart: '09:00',
      workEnd: '11:00',
      lunchStart: null,
      lunchEnd: null,
    };
    const merged = mergeEffectiveSchedule(template, officeOv, svcOv);
    assert.equal(merged.workStart, '09:00');
    assert.equal(merged.workEnd, '11:00');
    assert.equal(merged.hasLunch, false);
    assert.equal(merged.workLayer, 'service');
  });
});

describe('slot generation with custom hours', () => {
  it('does not generate slots after custom workEnd when lunch is disabled', () => {
    const dayStart = parseYmd('2026-08-15');
    const windows = buildWorkWindows(dayStart, '08:00', '10:00', '12:00', '13:00', {
      hasLunch: false,
    });
    assert.equal(windows.length, 1);
    assert.equal(windows[0].end.getHours(), 10);

    const slots = generateSlotIntervals({
      dayStart,
      workStart: '08:00',
      workEnd: '10:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      hasLunch: false,
      durationMinutes: 30,
    });

    assert.ok(slots.length > 0);
    for (const s of slots) {
      assert.ok(s.end <= '10:00', `slot ${s.start}-${s.end} exceeds workEnd`);
    }
    const last = slots[slots.length - 1];
    assert.equal(last.end, '10:00');
  });
});
