const adminAppointmentService = require('../../services/adminAppointment.service');
const { successResponse, errorResponse } = require('../../utils/response');

class AdminAppointmentController {
  async getStats(req, res) {
    try {
      const stats = await adminAppointmentService.getStats();
      successResponse(res, 'Appointment statistics retrieved successfully', stats);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointment statistics', 500);
    }
  }

  async listAppointments(req, res) {
    try {
      const result = await adminAppointmentService.listAppointments(req.query);
      successResponse(res, 'Appointments retrieved successfully', result);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointments', 500);
    }
  }

  async getAppointmentDetail(req, res) {
    try {
      const detail = await adminAppointmentService.getAppointmentDetail(req.params.id);
      successResponse(res, 'Appointment retrieved successfully', detail);
    } catch (error) {
      if (error.statusCode === 404) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to retrieve appointment', 500);
    }
  }
}

module.exports = new AdminAppointmentController();
