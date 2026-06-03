const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MS_24_HOURS, evaluateRescheduleEligibility } = require('../utils/rescheduleEligibility');

describe('reschedule eligibility (24 hours before start)', () => {
  it('allows when more than 24 hours remain (25h example)', () => {
    const now = new Date(2026, 5, 10, 10, 0, 0);
    const appointment = {
      slotDate: new Date(2026, 5, 11),
      slotStartTime: new Date(2026, 5, 11, 11, 0, 0),
    };
    const result = evaluateRescheduleEligibility(appointment, now);
    assert.equal(result.allowed, true);
    assert.ok(result.diffMs > MS_24_HOURS);
    assert.ok(Math.abs(result.diffHours - 25) < 0.01);
  });

  it('rejects when 24 hours or less remain (23h example)', () => {
    const now = new Date(2026, 5, 10, 10, 0, 0);
    const appointment = {
      slotDate: new Date(2026, 5, 11),
      slotStartTime: new Date(2026, 5, 11, 9, 0, 0),
    };
    const result = evaluateRescheduleEligibility(appointment, now);
    assert.equal(result.allowed, false);
    assert.ok(result.diffMs <= MS_24_HOURS);
    assert.ok(Math.abs(result.diffHours - 23) < 0.01);
  });

  it('rejects exactly 24 hours before start', () => {
    const now = new Date(2026, 5, 10, 10, 0, 0);
    const appointment = {
      slotStartTime: new Date(2026, 5, 11, 10, 0, 0),
    };
    const result = evaluateRescheduleEligibility(appointment, now);
    assert.equal(result.allowed, false);
    assert.equal(result.diffMs, MS_24_HOURS);
  });

  it('allows next-day appointment when more than 24h remain (not calendar-day only)', () => {
    const now = new Date(2026, 5, 11, 8, 0, 0);
    const appointment = {
      slotStartTime: new Date(2026, 5, 12, 10, 0, 0),
    };
    const result = evaluateRescheduleEligibility(appointment, now);
    assert.equal(result.allowed, true);
    assert.ok(result.diffHours > 24);
  });

  it('uses slotStartTime even when slotDate is one day earlier (storage drift)', () => {
    const now = new Date(2026, 5, 3, 8, 40, 0);
    const appointment = {
      slotDate: new Date(Date.UTC(2026, 5, 3)),
      slotStartTime: new Date(2026, 5, 4, 8, 0, 0),
      timeSlot: {
        date: new Date(Date.UTC(2026, 5, 3)),
        startTime: new Date(2026, 5, 4, 8, 0, 0),
      },
    };
    const result = evaluateRescheduleEligibility(appointment, now);
    assert.equal(result.allowed, false);
    assert.ok(result.diffHours < 24);
    assert.ok(result.diffHours > 23);
  });

  it('does not treat slotDate midnight as appointment start', () => {
    const now = new Date(2026, 5, 3, 10, 0, 0);
    const appointment = {
      slotDate: new Date(Date.UTC(2026, 5, 10)),
      slotStartTime: new Date(2026, 5, 10, 14, 0, 0),
    };
    const result = evaluateRescheduleEligibility(appointment, now);
    assert.equal(result.allowed, true);
    assert.ok(result.diffHours > 24);
  });
});
