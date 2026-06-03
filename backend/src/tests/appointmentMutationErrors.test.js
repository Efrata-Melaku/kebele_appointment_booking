const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapAppointmentMutationError } = require('../utils/appointmentMutationErrors');
const { RESCHEDULE_TOO_SOON_MESSAGE } = require('../utils/rescheduleEligibility');

describe('mapAppointmentMutationError', () => {
  it('maps schedule closure to 400 (not 500)', () => {
    const mapped = mapAppointmentMutationError(
      new Error('This service is unavailable on the selected date.')
    );
    assert.equal(mapped.status, 400);
  });

  it('maps fully booked to 409', () => {
    const mapped = mapAppointmentMutationError(new Error('Time slot is fully booked'));
    assert.equal(mapped.status, 409);
    assert.equal(mapped.message, 'Selected slot is unavailable.');
  });

  it('maps not found to 404', () => {
    const mapped = mapAppointmentMutationError(new Error('Appointment not found'));
    assert.equal(mapped.status, 404);
  });

  it('maps reschedule window to 400', () => {
    const mapped = mapAppointmentMutationError(new Error(RESCHEDULE_TOO_SOON_MESSAGE));
    assert.equal(mapped.status, 400);
  });
});
