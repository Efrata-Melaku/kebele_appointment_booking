const prisma = require('../../prisma/client');
const appointmentService = require('../../services/appointment.service');
const { APPOINTMENT_STATUS } = require('../../config/constants');
const { successResponse, errorResponse } = require('../../utils/response');
const { attachTimeSlot } = require('../../utils/appointmentSlot');

function flattenAppointment(apt) {
  if (!apt) return apt;
  return {
    ...apt,
    appointmentNumber: apt.group?.appointmentNumber,
    resident: apt.group?.resident,
  };
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
        prismaStatus
      );

      successResponse(res, 'Appointment status updated successfully', appointment);
    } catch (error) {
      if (error.message.includes('not found')) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to update appointment status', 500);
    }
  }

  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          group: { include: { resident: true } },
          service: {
            include: {
              department: true,
            },
          },
          feedback: true,
        },
      });

      if (!appointment) {
        return errorResponse(res, 'Appointment not found', 404);
      }

      successResponse(
        res,
        'Appointment retrieved successfully',
        attachTimeSlot(flattenAppointment(appointment))
      );
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointment', 500);
    }
  }
}

module.exports = new AppointmentStatusController();
