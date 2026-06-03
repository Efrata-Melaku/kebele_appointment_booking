const appointmentService = require('../../services/appointment.service');
const slotAvailability = require('../../services/slotAvailability.service');
const { paginatedSuccess, errorResponse, successResponse } = require('../../utils/response');
const { isScheduleClientError } = require('../../utils/scheduleErrors');

function mapServiceError(res, error, fallbackMessage) {
  if (error.code === 'NOT_FOUND' || error.message?.includes('not found')) {
    return errorResponse(res, error.message || 'Appointment not found', 404);
  }
  if (error.code === 'FORBIDDEN') {
    return errorResponse(res, error.message, 403);
  }
  if (error.code === 'VALIDATION') {
    return errorResponse(res, error.message, 400);
  }
  if (
    isScheduleClientError(error.message) ||
    error.message?.includes('fully booked') ||
    error.message?.includes('Invalid time slot') ||
    error.message?.includes('required when status')
  ) {
    return errorResponse(res, error.message, 400);
  }
  return errorResponse(res, fallbackMessage, 500);
}

class AppointmentStatusController {
  async getAvailableSlots(req, res) {
    try {
      const { serviceId, date } = req.query;
      const slots = await slotAvailability.getAvailableSlotsForAdmin(serviceId, date);
      successResponse(res, 'Available slots retrieved successfully', slots);
    } catch (error) {
      if (isScheduleClientError(error.message)) {
        return errorResponse(res, error.message, 400);
      }
      console.error('[staff getAvailableSlots]', error);
      errorResponse(res, 'Failed to retrieve available slots', 500);
    }
  }

  async getAppointments(req, res) {
    try {
      const { items, pagination } = await appointmentService.getStaffAppointments(
        req.user.id,
        req.query
      );

      paginatedSuccess(res, 'Appointments retrieved successfully', items, pagination);
    } catch (error) {
      console.error('[staff getAppointments]', error);
      errorResponse(res, 'Failed to retrieve appointments', 500);
    }
  }

  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.updateStaffAppointmentStatus(
        req.user.id,
        parseInt(id, 10),
        req.body
      );

      successResponse(res, 'Appointment status updated successfully', appointment);
    } catch (error) {
      console.error('[staff updateAppointmentStatus]', error);
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
