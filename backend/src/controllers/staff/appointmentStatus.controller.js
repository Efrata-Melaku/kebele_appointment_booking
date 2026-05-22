const appointmentService = require('../../services/appointment.service');
const { APPOINTMENT_STATUS } = require('../../config/constants');
const { successResponse, errorResponse } = require('../../utils/response');

function mapServiceError(res, error, fallbackMessage) {
  if (error.code === 'NOT_FOUND' || error.message?.includes('not found')) {
    return errorResponse(res, error.message || 'Appointment not found', 404);
  }
  if (error.code === 'FORBIDDEN') {
    return errorResponse(res, error.message, 403);
  }
  return errorResponse(res, fallbackMessage, 500);
}

class AppointmentStatusController {
  async getAppointments(req, res) {
    try {
      const appointments = await appointmentService.getStaffAppointments(req.user.id);

      successResponse(res, 'Appointments retrieved successfully', appointments);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointments', 500);
    }
  }

  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const prismaStatus =
        ({
          pending: APPOINTMENT_STATUS.PENDING,
          completed: APPOINTMENT_STATUS.COMPLETED,
          rescheduled: APPOINTMENT_STATUS.RESCHEDULED,
          not_served: APPOINTMENT_STATUS.NOT_SERVED,
        }[String(status).trim().toLowerCase()]);

      if (!prismaStatus) {
        return errorResponse(res, 'Invalid status value', 400);
      }

      const appointment = await appointmentService.updateAppointmentStatus(
        parseInt(id, 10),
        prismaStatus,
        req.user.id
      );

      successResponse(res, 'Appointment status updated successfully', appointment);
    } catch (error) {
      return mapServiceError(res, error, 'Failed to update appointment status');
    }
  }

  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;
      const detail = await appointmentService.getStaffAppointmentDetail(
        req.user.id,
        parseInt(id, 10)
      );

      successResponse(res, 'Appointment retrieved successfully', detail);
    } catch (error) {
      return mapServiceError(res, error, 'Failed to retrieve appointment');
    }
  }
}

module.exports = new AppointmentStatusController();
