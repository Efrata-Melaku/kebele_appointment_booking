const appointmentService = require('../../services/appointment.service');
const { successResponse, errorResponse } = require('../../utils/response');

class ResidentController {
  async getMyAppointments(req, res) {
    try {
      const phone = req.query.phone;
      const appointmentNumber = req.query.appointmentNumber?.trim();

      if (!phone && !appointmentNumber) {
        return errorResponse(res, 'Phone number or appointment number is required', 400);
      }

      if (appointmentNumber) {
        const data = await appointmentService.getAppointmentByRefForResident(
          appointmentNumber,
          phone
        );
        return successResponse(res, 'Appointment retrieved successfully', data);
      }

      const appointments = await appointmentService.getUserAppointmentsByPhone(phone);
      successResponse(res, 'Appointments retrieved successfully', appointments);
    } catch (error) {
      if (error.statusCode === 400) {
        return errorResponse(res, error.message, 400);
      }
      if (
        error.statusCode === 403 ||
        error.message.includes('Verification failed')
      ) {
        return errorResponse(res, error.message, 403);
      }
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to retrieve appointments', 500);
    }
  }
}

module.exports = new ResidentController();
