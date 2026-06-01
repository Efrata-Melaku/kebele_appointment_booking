const express = require('express');
const timeSlotController = require('../../controllers/admin/timeslot.controller');

const router = express.Router();

// GET /api/admin/timeslots/preview?serviceId=1&date=2026-05-10
router.get('/preview', timeSlotController.previewSlots);

module.exports = router;
