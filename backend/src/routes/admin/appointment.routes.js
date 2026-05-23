const express = require('express');
const adminAppointmentController = require('../../controllers/admin/appointment.controller');
const validate = require('../../middleware/validate.middleware');
const { adminAppointmentsQuerySchema } = require('../../utils/validators');

const router = express.Router();

router.get('/stats', adminAppointmentController.getStats);

router.get(
  '/',
  validate.validateQuery(adminAppointmentsQuerySchema),
  adminAppointmentController.listAppointments
);

router.get('/:id', adminAppointmentController.getAppointmentDetail);

module.exports = router;
