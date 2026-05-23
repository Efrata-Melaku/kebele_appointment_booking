/**
 * Slot availability — business logic for dynamic slots and capacity.
 * Data access is delegated to models via slotAvailability helpers.
 */
const slotAvailability = require('./slotAvailability.service');

module.exports = {
  getAvailableSlots: slotAvailability.getAvailableSlotsForResidents,
  getAvailableSlotsForAdmin: slotAvailability.getAvailableSlotsForAdmin,
  resolveBookableSlot: slotAvailability.resolveBookableSlot,
  assertSlotHasCapacity: slotAvailability.assertSlotHasCapacity,
  countSlotBookings: slotAvailability.countSlotBookings,
};
