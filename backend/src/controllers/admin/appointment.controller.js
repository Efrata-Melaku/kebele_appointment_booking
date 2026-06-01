const appointmentService = require('../../services/appointment.service');
const { successResponse, paginatedSuccess, errorResponse } = require('../../utils/response');

class AdminAppointmentController {
  async getStats(req, res) {
    try {
      const stats = await appointmentService.getAdminStats();
      successResponse(res, 'Appointment statistics retrieved successfully', stats);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointment statistics', 500);
    }
  }

  async listAppointments(req, res) {
    try {
      const { items, pagination } = await appointmentService.listAdminAppointments(req.query);
      paginatedSuccess(res, 'Appointments retrieved successfully', items, pagination);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointments', 500);
    }
  }

  async getAppointmentDetail(req, res) {
    try {
      const detail = await appointmentService.getAdminAppointmentDetail(req.params.id);
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
