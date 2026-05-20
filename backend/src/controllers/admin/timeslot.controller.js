const slotAvailability = require('../../services/slotAvailability.service');
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * Admin preview of dynamically computed slots (no database rows created).
 */
class TimeSlotController {
  async previewSlots(req, res) {
    try {
      const { serviceId, date } = req.query;
      if (!serviceId || !date) {
        return errorResponse(res, 'serviceId and date query parameters are required', 400);
      }

      const slots = await slotAvailability.getAvailableSlotsForServiceDate(serviceId, date);
      successResponse(res, 'Slots preview retrieved successfully', slots);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to preview slots', 400);
    }
  }
}

module.exports = new TimeSlotController();
