const express = require('express');
const appointmentController = require('../../controllers/user/appointment.controller');
const { uploadSingle, handleUploadError } = require('../../middleware/upload.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentQuerySchema,
} = require('../../utils/validators');

const router = express.Router();

// POST /api/user/appointments
router.post(
  '/',
  uploadSingle('document'),
  handleUploadError,
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);

// GET /api/user/appointments
router.get('/', appointmentController.getUserAppointments);

// GET /api/user/appointments/:id
router.get('/:id', appointmentController.getAppointmentById);

// PUT /api/user/appointments/:id — reschedule to another available slot (same service)
router.put(
  '/:id',
  validate(rescheduleAppointmentSchema),
  appointmentController.rescheduleAppointment
);

// DELETE /api/user/appointments/:id — cancel booking (requires ?phone=)
router.delete(
  '/:id',
  validate.validateQuery(cancelAppointmentQuerySchema),
  appointmentController.cancelAppointment
);

module.exports = router;
