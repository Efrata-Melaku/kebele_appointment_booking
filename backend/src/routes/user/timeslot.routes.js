const express = require('express');
const slotGeneratorService = require('../../services/slotGenerator.service');
const { successResponse, errorResponse } = require('../../utils/response');

const router = express.Router();

/**
 * Legacy path — returns dynamically computed slots (same shape as /appointments/available-slots).
 * GET /api/user/timeslots/:serviceId/:date
 */
router.get('/:serviceId/:date', async (req, res) => {
  try {
    const { serviceId, date } = req.params;
    const slots = await slotGeneratorService.getAvailableSlots(serviceId, date);
    successResponse(res, 'Available time slots retrieved successfully', slots);
  } catch (error) {
    errorResponse(res, error.message || 'Failed to retrieve time slots', 400);
  }
});

module.exports = router;
