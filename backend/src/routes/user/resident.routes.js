const express = require('express');
const residentController = require('../../controllers/user/resident.controller');
const residentAppointmentController = require('../../controllers/user/residentAppointment.controller');
const residentFeedbackController = require('../../controllers/user/residentFeedback.controller');
const validate = require('../../middleware/validate.middleware');
const { uploadDynamicFiles, handleUploadError } = require('../../middleware/upload.middleware');
const {
  myAppointmentsQuerySchema,
  editAppointmentQuerySchema,
  updateAppointmentFormResponsesSchema,
  residentCreateFeedbackSchema,
  residentUpdateFeedbackSchema,
  residentFeedbackQuerySchema,
} = require('../../utils/validators');

const router = express.Router();

router.get(
  '/my-appointments',
  validate.validateQuery(myAppointmentsQuerySchema),
  residentController.getMyAppointments
);

router.get(
  '/appointments/:appointmentNumber/edit',
  validate.validateQuery(editAppointmentQuerySchema),
  residentAppointmentController.getAppointmentForEdit
);

router.put(
  '/appointments/:appointmentNumber',
  uploadDynamicFiles(),
  handleUploadError,
  validate(updateAppointmentFormResponsesSchema),
  residentAppointmentController.updateAppointment
);

router.post(
  '/feedback',
  validate(residentCreateFeedbackSchema),
  residentFeedbackController.createFeedback
);

router.get(
  '/feedback/:appointmentId',
  validate.validateQuery(residentFeedbackQuerySchema),
  residentFeedbackController.getFeedback
);

router.put(
  '/feedback/:appointmentId',
  validate(residentUpdateFeedbackSchema),
  residentFeedbackController.updateFeedback
);

module.exports = router;
