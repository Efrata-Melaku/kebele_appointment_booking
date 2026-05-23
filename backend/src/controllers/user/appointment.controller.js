const prisma = require('../../prisma/client');
const appointmentService = require('../../services/appointment.service');
const smsService = require('../../services/sms.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { isAppointmentNumberRef } = require('../../utils/appointmentRef');
const dynamicFormService = require('../../services/dynamicForm.service');
const formResponseService = require('../../services/formResponse.service');
const { parseDynamicFormPayload } = require('../../utils/parseDynamicFormPayload');
const {
  processMultipartFiles,
  mergePreuploadedFileMeta,
} = require('../../utils/fileUpload.utils');
const { attachTimeSlot } = require('../../utils/appointmentSlot');

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
      let fileUrlsByFieldId = {};
      let fileMetaByFieldId = {};

      const files = Array.isArray(req.files) ? req.files : [];
      try {
        const processed = await processMultipartFiles(files);
        documentUrl = processed.documentUrl;
        fileUrlsByFieldId = processed.fileUrlsByFieldId;
        fileMetaByFieldId = processed.fileMetaByFieldId;
      } catch (uploadErr) {
        return errorResponse(res, uploadErr.message || 'File upload failed', 400);
      }

      let dynamicValues = {};
      try {
        dynamicValues = parseDynamicFormPayload(appointmentData);
      } catch (e) {
        return errorResponse(res, e.message || 'responses must be valid JSON', 400);
      }

      const merged = mergePreuploadedFileMeta(dynamicValues, fileUrlsByFieldId, fileMetaByFieldId);
      fileUrlsByFieldId = merged.fileUrlsByFieldId;
      fileMetaByFieldId = merged.fileMetaByFieldId;

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
        formResponseRows,
        fileMetaByFieldId
      );

      try {
        await smsService.sendAppointmentConfirmation(
          appointment.resident.phone,
          appointment.appointmentNumber,
          appointment.service?.name,
          appointment.timeSlot.date,
          appointment.timeSlot.startTime
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
      console.error('[createAppointment]', error);
      const message =
        process.env.NODE_ENV !== 'production' && error.message
          ? error.message
          : 'Failed to create appointment';
      errorResponse(res, message, 500);
    }
  }

  async getUserAppointments(req, res) {
    try {
      const { phone, appointmentNumber } = req.query;

      if (appointmentNumber) {
        const data = await appointmentService.getAppointmentByRefForResident(
          appointmentNumber,
          phone
        );
        return successResponse(res, 'Appointment retrieved successfully', data);
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
      const { phone } = req.query;
      const data = await appointmentService.getAppointmentByRef(appointmentRef, phone);
      successResponse(res, 'Appointment retrieved successfully', data);
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
        try {
          await smsService.sendAppointmentUpdate(
            appointment.resident?.phone || phone,
            appointment.appointmentNumber,
            appointment.service?.name,
            appointment.timeSlot?.date,
            appointment.timeSlot?.startTime
          );
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
        }
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

      try {
        await smsService.sendAppointmentUpdate(
          appointment.resident?.phone || phone,
          appointment.appointmentNumber,
          appointment.service?.name,
          appointment.timeSlot?.date,
          appointment.timeSlot?.startTime
        );
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
      }

      successResponse(res, 'Appointment rescheduled successfully', appointment);
    } catch (error) {
      if (error.statusCode === 400) {
        return errorResponse(res, error.message, 400);
      }
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

      let cancelledAppointment = null;

      if (isAppointmentNumberRef(appointmentRef)) {
        if (appointmentItemId != null && appointmentItemId !== '') {
          const apt = await prisma.appointment.findFirst({
            where: {
              id: parseInt(String(appointmentItemId), 10),
              group: { appointmentNumber: appointmentRef.trim() },
            },
            include: { service: true, group: { include: { resident: true } } },
          });
          if (apt) {
            const mapped = attachTimeSlot(apt);
            cancelledAppointment = {
              appointmentNumber: apt.group.appointmentNumber,
              resident: apt.group.resident,
              service: apt.service,
              timeSlot: mapped.timeSlot,
            };
          }
        }
        await appointmentService.cancelByAppointmentNumber(
          appointmentRef.trim(),
          phone,
          appointmentItemId != null && appointmentItemId !== ''
            ? parseInt(String(appointmentItemId), 10)
            : undefined
        );
      } else {
        const id = parseInt(appointmentRef, 10);
        const apt = await prisma.appointment.findUnique({
          where: { id },
          include: { service: true, group: { include: { resident: true } } },
        });
        if (apt) {
          cancelledAppointment = {
            appointmentNumber: apt.group.appointmentNumber,
            resident: apt.group.resident,
            service: apt.service,
            timeSlot: {
              date: apt.slotDate,
              startTime: apt.slotStartTime,
            },
          };
        }
        await appointmentService.cancelAppointmentById(id, phone);
      }

      if (cancelledAppointment) {
        try {
          await smsService.sendAppointmentCancellation(
            cancelledAppointment.resident?.phone || phone,
            cancelledAppointment.appointmentNumber,
            cancelledAppointment.service?.name,
            cancelledAppointment.timeSlot?.date,
            cancelledAppointment.timeSlot?.startTime
          );
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
        }
      }

      successResponse(res, 'Appointment cancelled successfully');
    } catch (error) {
      if (error.statusCode === 400) {
        return errorResponse(res, error.message, 400);
      }
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
        const { processMultipartFiles: processFiles } = require('../../utils/fileUpload.utils');
        const processed = await processFiles([req.file]);
        documentUrl = processed.documentUrl;
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
      let fileUrlsByFieldId = {};
      let fileMetaByFieldId = {};
      try {
        const processed = await processMultipartFiles(files);
        fileUrlsByFieldId = processed.fileUrlsByFieldId;
        fileMetaByFieldId = processed.fileMetaByFieldId;
      } catch (uploadErr) {
        return errorResponse(res, uploadErr.message || 'File upload failed', 400);
      }

      const merged = mergePreuploadedFileMeta(dynamicValues, fileUrlsByFieldId, fileMetaByFieldId);
      fileUrlsByFieldId = merged.fileUrlsByFieldId;
      fileMetaByFieldId = merged.fileMetaByFieldId;

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
        formResponseRows,
        fileMetaByFieldId
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
