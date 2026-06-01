const appointmentService = require('../../services/appointment.service');
const { successResponse, errorResponse } = require('../../utils/response');

class DashboardController {
  async getDashboardStats(req, res) {
    try {
      const stats = await appointmentService.getDashboardStats();
      successResponse(res, 'Dashboard stats retrieved successfully', stats);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve dashboard stats', 500);
    }
  }
}

module.exports = new DashboardController();
