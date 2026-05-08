const prisma = require('../../prisma/client');
const appointmentService = require('../../services/appointment.service');
const smsService = require('../../services/sms.service');
const { successResponse, errorResponse } = require('../../utils/response');

class AppointmentController {
  async createAppointment(req, res) {
    try {
      const appointmentData = req.body;
      let documentUrl = null;

      if (req.file) {
        documentUrl = `/uploads/documents/${req.file.filename}`;
      }

      const appointment = await appointmentService.createAppointment(
        appointmentData,
        documentUrl
      );

      try {
        await smsService.sendAppointmentConfirmation(
          appointment.resident.phone,
          appointment.appointmentNumber,
          appointment.timeSlot.date.toDateString(),
          appointment.timeSlot.startTime.toTimeString().slice(0, 5)
        );
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
      }

      successResponse(res, 'Appointment created successfully', appointment, 201);
    } catch (error) {
      if (
        error.message.includes('not available') ||
        error.message.includes('fully booked') ||
        error.message.includes('does not belong')
      ) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to create appointment', 500);
    }
  }

  async getUserAppointments(req, res) {
    try {
      const { phone } = req.query;

      if (!phone) {
        return errorResponse(res, 'Phone number is required', 400);
      }

      const resident = await prisma.resident.findUnique({
        where: { phone },
      });

      if (!resident) {
        return successResponse(res, 'No appointments found', []);
      }

      const appointments = await appointmentService.getUserAppointments(resident.id);

      successResponse(res, 'Appointments retrieved successfully', appointments);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointments', 500);
    }
  }

  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          resident: true,
          service: {
            include: {
              department: true,
            },
          },
          timeSlot: true,
          feedback: true,
        },
      });

      if (!appointment) {
        return errorResponse(res, 'Appointment not found', 404);
      }

      successResponse(res, 'Appointment retrieved successfully', appointment);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve appointment', 500);
    }
  }

  async rescheduleAppointment(req, res) {
    try {
      const { id } = req.params;
      const { phone, timeSlotId } = req.body;

      const appointment = await appointmentService.rescheduleAppointment(
        parseInt(id, 10),
        {
          phone,
          timeSlotId: parseInt(timeSlotId, 10),
        }
      );

      successResponse(res, 'Appointment rescheduled successfully', appointment);
    } catch (error) {
      if (error.message.includes('not found')) {
        return errorResponse(res, error.message, 404);
      }
      if (
        error.message.includes('fully booked') ||
        error.message.includes('Invalid slot') ||
        error.message.includes('Verification failed') ||
        error.message.includes('Cannot reschedule')
      ) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to reschedule appointment', 500);
    }
  }

  async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { phone } = req.query;

      await appointmentService.cancelAppointmentById(parseInt(id, 10), phone);

      successResponse(res, 'Appointment cancelled successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return errorResponse(res, error.message, 404);
      }
      if (
        error.message.includes('Verification failed') ||
        error.message.includes('already cancelled') ||
        error.message.includes('Only pending appointments')
      ) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to cancel appointment', 500);
    }
  }
}

module.exports = new AppointmentController();
