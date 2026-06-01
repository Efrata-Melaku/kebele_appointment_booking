const slotAvailability = require('./slotAvailability.service');

/**
 * Dynamic slot engine — no database materialization.
 */
class SlotGeneratorService {
  async getAvailableSlots(serviceId, date) {
    return slotAvailability.getAvailableSlotsForResidents(serviceId, date);
  }
}

module.exports = new SlotGeneratorService();
