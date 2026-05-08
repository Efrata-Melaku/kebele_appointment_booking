const express = require('express');
const appointmentStatusController = require('../../controllers/staff/appointmentStatus.controller');
const validate = require('../../middleware/validate.middleware');
const { updateAppointmentStatusSchema } = require('../../utils/validators');

const router = express.Router();

// GET /api/staff/appointments
router.get('/appointments', appointmentStatusController.getAppointments);

// GET /api/staff/appointments/:id
router.get('/appointments/:id', appointmentStatusController.getAppointmentById);

// PATCH /api/staff/appointments/:id/status
router.patch('/appointments/:id/status', validate(updateAppointmentStatusSchema), appointmentStatusController.updateAppointmentStatus);

module.exports = router;