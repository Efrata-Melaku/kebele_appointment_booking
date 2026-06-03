const appointmentService = require('../../services/appointment.service');
const appointmentController = require('./appointment.controller');
const { successResponse, errorResponse } = require('../../utils/response');
const { isAppointmentNumberRef } = require('../../utils/appointmentRef');
const {
  mapAppointmentMutationError,
  logAppointmentMutationError,
} = require('../../utils/appointmentMutationErrors');

class ResidentAppointmentController {
  async getAppointmentForEdit(req, res) {
    try {
      const { appointmentNumber } = req.params;
      const { phone, appointmentItemId } = req.query;

      if (!isAppointmentNumberRef(appointmentNumber)) {
        return errorResponse(res, 'Invalid appointment reference', 400);
      }

      const data = await appointmentService.getAppointmentForEdit(
        appointmentNumber,
        phone,
        appointmentItemId != null ? Number(appointmentItemId) : undefined
      );

      successResponse(res, 'Appointment edit data loaded', data);
    } catch (error) {
      logAppointmentMutationError('edit-load', req, error);
      const mapped = mapAppointmentMutationError(error);
      return errorResponse(res, mapped.message, mapped.status);
    }
  }

  /** PUT /api/resident/appointments/:appointmentNumber — same behavior as form-responses update */
  async updateAppointment(req, res) {
    req.params.appointmentRef = req.params.appointmentNumber;
    return appointmentController.updateAppointmentFormResponses(req, res);
  }
}

module.exports = new ResidentAppointmentController();
