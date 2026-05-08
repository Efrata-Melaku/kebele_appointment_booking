const express = require('express');
const timeSlotController = require('../../controllers/admin/timeslot.controller');
const validate = require('../../middleware/validate.middleware');
const { generateTimeSlotsSchema } = require('../../utils/validators');

const router = express.Router();

// POST /api/admin/timeslots/generate
router.post('/generate', validate(generateTimeSlotsSchema), timeSlotController.generateTimeSlots);

// GET /api/admin/timeslots
router.get('/', timeSlotController.getTimeSlots);

// GET /api/admin/timeslots/:id
router.get('/:id', timeSlotController.getTimeSlotById);

// DELETE /api/admin/timeslots/:id
router.delete('/:id', timeSlotController.deleteTimeSlot);

module.exports = router;