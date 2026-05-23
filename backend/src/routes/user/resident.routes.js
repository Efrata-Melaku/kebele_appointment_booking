const express = require('express');
const residentController = require('../../controllers/user/resident.controller');
const residentFeedbackController = require('../../controllers/user/residentFeedback.controller');
const validate = require('../../middleware/validate.middleware');
const {
  myAppointmentsQuerySchema,
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
