const prisma = require('../../prisma/client');
const appointmentService = require('../../services/appointment.service');
const smsService = require('../../services/sms.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { isAppointmentNumberRef } = require('../../utils/appointmentRef');
const dynamicFormService = require('../../services/dynamicForm.service');
const formResponseService = require('../../services/formResponse.service');
const {
  parseDynamicFormPayload,
  collectFileUrlsByFieldId,
} = require('../../utils/parseDynamicFormPayload');

class AppointmentController {
  async getAvailableSlots(req, res) {
    try {
      const { serviceId, date } = req.query;
      const slots = await appointmentService.getAvailableSlots(serviceId, date);
      successResponse(res, 'Available slots retrieved successfully', slots);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Invalid date')) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to retrieve available slots', 500);
    }
  }

  /**
   * Booking path DB work is dominated by appointmentService.createAppointment (transaction).
   * Dynamic form validation uses a single scoped query in dynamicForm.service (see comments there).
   */
  async createAppointment(req, res) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[createAppointment] validated body', {
          fullName: req.body?.fullName,
          phone: req.body?.phone ? '[set]' : req.body?.phone,
          gender: req.body?.gender,
          serviceId: req.body?.serviceId,
          slotDate: req.body?.slotDate,
          slotStart: req.body?.slotStart,
          responsesLen:
            typeof req.body?.responses === 'string' ? req.body.responses.length : 0,
        });
      }

      const appointmentData = { ...req.body };
      if (appointmentData.serviceId != null) {
        appointmentData.serviceId = Number(appointmentData.serviceId);
      }
      let documentUrl = null;

      const files = Array.isArray(req.files) ? req.files : [];
      for (const f of files) {
        if (f.fieldname === 'document') {
          documentUrl = `/uploads/documents/${f.filename}`;
          break;
        }
      }

      let dynamicValues = {};
      try {
        dynamicValues = parseDynamicFormPayload(appointmentData);
      } catch (e) {
        return errorResponse(res, e.message || 'responses must be valid JSON', 400);
      }

      const fileUrlsByFieldId = collectFileUrlsByFieldId(files);

      let formResponseRows = null;
      try {
        formResponseRows = await dynamicFormService.validateAndBuildResponseRows(
          Number(appointmentData.serviceId),
          dynamicValues,
          fileUrlsByFieldId
        );
      } catch (e) {
        if (e.code === 'DYNAMIC_FORM_VALIDATION') {
          return res.status(400).json({
            success: false,
            error: 'Form validation failed',
            details: e.details,
          });
        }
        throw e;
      }

      const appointment = await appointmentService.createAppointment(
        appointmentData,
        documentUrl,
        formResponseRows
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
      if (error.message.includes('Form validation') || error.code === 'DYNAMIC_FORM_VALIDATION') {
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

  async getAppointmentByRef(req, res) {
    try {
      const { appointmentRef } = req.params;
      const data = await appointmentService.getAppointmentByRef(appointmentRef);
      successResponse(res, 'Appointment retrieved successfully', data);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to retrieve appointment', 500);
    }
  }

  async rescheduleAppointmentByRef(req, res) {
    try {
      const { appointmentRef } = req.params;
      const { phone, slotDate, slotStart, appointmentItemId } = req.body;

      if (isAppointmentNumberRef(appointmentRef)) {
        const appointment = await appointmentService.rescheduleByAppointmentNumber(
          appointmentRef.trim(),
          {
            phone,
            slotDate,
            slotStart,
            appointmentItemId:
              appointmentItemId != null ? parseInt(appointmentItemId, 10) : undefined,
          }
        );
        return successResponse(res, 'Appointment rescheduled successfully', appointment);
      }

      const appointment = await appointmentService.rescheduleAppointment(
        parseInt(appointmentRef, 10),
        {
          phone,
          slotDate,
          slotStart,
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
        error.message.includes('Cannot reschedule') ||
        error.message.includes('more than one full day') ||
        error.message.includes('appointmentItemId')
      ) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to reschedule appointment', 500);
    }
  }

  async cancelAppointmentByRef(req, res) {
    try {
      const { appointmentRef } = req.params;
      const { phone, appointmentItemId } = req.query;

      if (isAppointmentNumberRef(appointmentRef)) {
        await appointmentService.cancelByAppointmentNumber(
          appointmentRef.trim(),
          phone,
          appointmentItemId != null && appointmentItemId !== ''
            ? parseInt(String(appointmentItemId), 10)
            : undefined
        );
        return successResponse(res, 'Appointment cancelled successfully');
      }

      await appointmentService.cancelAppointmentById(parseInt(appointmentRef, 10), phone);

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

  async addServiceToBooking(req, res) {
    try {
      const { appointmentRef } = req.params;
      if (!isAppointmentNumberRef(appointmentRef)) {
        return errorResponse(res, 'Use the appointment reference number (APP-…)', 400);
      }

      let documentUrl = null;
      if (req.file) {
        documentUrl = `/uploads/documents/${req.file.filename}`;
      }

      const { phone, serviceId, slotDate, slotStart } = req.body;

      const appointment = await appointmentService.addServiceToBooking(appointmentRef.trim(), {
        phone,
        serviceId: parseInt(serviceId, 10),
        slotDate,
        slotStart,
        documentUrl,
      });

      successResponse(res, 'Service added to booking', appointment, 201);
    } catch (error) {
      if (error.message.includes('not found')) {
        return errorResponse(res, error.message, 404);
      }
      if (
        error.message.includes('Verification failed') ||
        error.message.includes('fully booked') ||
        error.message.includes('does not belong') ||
        error.message.includes('already part') ||
        error.message.includes('more than one full day')
      ) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to add service', 500);
    }
  }

  async updateAppointmentFormResponses(req, res) {
    try {
      const { appointmentRef } = req.params;
      const { phone, appointmentItemId } = req.body;

      let dynamicValues = {};
      try {
        dynamicValues = parseDynamicFormPayload(req.body);
      } catch (e) {
        return errorResponse(res, e.message || 'responses must be valid JSON', 400);
      }

      const files = Array.isArray(req.files) ? req.files : [];
      const fileUrlsByFieldId = collectFileUrlsByFieldId(files);

      let appointmentId;
      if (isAppointmentNumberRef(appointmentRef)) {
        const bundle = await appointmentService.getAppointmentByRef(appointmentRef.trim());
        const items = bundle.items || [bundle];
        let line = items[0];
        if (appointmentItemId != null) {
          line = items.find((a) => a.id === Number(appointmentItemId));
        }
        if (!line) return errorResponse(res, 'Appointment line not found', 404);
        appointmentId = line.id;
      } else {
        appointmentId = parseInt(appointmentRef, 10);
      }

      const apt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, serviceId: true },
      });
      if (!apt) return errorResponse(res, 'Appointment not found', 404);

      const existing = await formResponseService.loadResponsesForAppointment(appointmentId);
      const existingByFieldId = {};
      for (const r of existing) {
        existingByFieldId[r.formFieldId] = r.value;
      }

      const formResponseRows = await dynamicFormService.validateUpdateResponseRows(
        apt.serviceId,
        dynamicValues,
        fileUrlsByFieldId,
        existingByFieldId
      );

      const updated = await appointmentService.updateFormResponsesByRef(
        appointmentRef,
        {
          phone,
          appointmentItemId:
            appointmentItemId != null ? parseInt(appointmentItemId, 10) : undefined,
        },
        formResponseRows
      );

      successResponse(res, 'Form responses updated successfully', updated);
    } catch (error) {
      if (error.code === 'DYNAMIC_FORM_VALIDATION') {
        return res.status(400).json({
          success: false,
          error: 'Form validation failed',
          details: error.details,
        });
      }
      if (
        error.message.includes('not found') ||
        error.message.includes('Verification failed') ||
        error.message.includes('Cannot edit')
      ) {
        return errorResponse(res, error.message, 400);
      }
      errorResponse(res, 'Failed to update form responses', 500);
    }
  }
}

module.exports = new AppointmentController();
