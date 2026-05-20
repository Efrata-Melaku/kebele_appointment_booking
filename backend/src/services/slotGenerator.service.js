const slotAvailability = require('./slotAvailability.service');

/**
 * Dynamic slot engine — no database materialization.
 */
class SlotGeneratorService {
  async getAvailableSlots(serviceId, date) {
    return slotAvailability.getAvailableSlotsForServiceDate(serviceId, date);
  }
}

module.exports = new SlotGeneratorService();
