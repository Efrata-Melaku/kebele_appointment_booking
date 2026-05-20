const express = require('express');
const appointmentController = require('../../controllers/user/appointment.controller');
const { uploadDynamicFiles, uploadSingle, handleUploadError } = require('../../middleware/upload.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentQuerySchema,
  addBookingServiceSchema,
  availableSlotsQuerySchema,
  updateAppointmentFormResponsesSchema,
} = require('../../utils/validators');

const router = express.Router();

// GET /api/user/appointments/available-slots?serviceId=1&date=2026-05-10
router.get(
  '/available-slots',
  validate.validateQuery(availableSlotsQuerySchema),
  appointmentController.getAvailableSlots
);

router.post(
  '/',
  uploadDynamicFiles(),
  handleUploadError,
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);

router.get('/', appointmentController.getUserAppointments);

router.post(
  '/:appointmentRef/services',
  uploadSingle('document'),
  handleUploadError,
  validate(addBookingServiceSchema),
  appointmentController.addServiceToBooking
);

router.put(
  '/:appointmentRef/form-responses',
  uploadDynamicFiles(),
  handleUploadError,
  validate(updateAppointmentFormResponsesSchema),
  appointmentController.updateAppointmentFormResponses
);

router.get('/:appointmentRef', appointmentController.getAppointmentByRef);

router.put(
  '/:appointmentRef',
  validate(rescheduleAppointmentSchema),
  appointmentController.rescheduleAppointmentByRef
);

router.delete(
  '/:appointmentRef',
  validate.validateQuery(cancelAppointmentQuerySchema),
  appointmentController.cancelAppointmentByRef
);

module.exports = router;
