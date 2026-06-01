const appointmentService = require('../../services/appointment.service');
const smsService = require('../../services/sms.service');
const appointmentEmailService = require('../../services/appointmentEmail.service');
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

      let smsResult = { success: true, message: 'SMS sent successfully' };
      try {
        smsResult = await smsService.sendAppointmentConfirmation({
          phone: appointment.resident?.phone,
          appointmentNumber: appointment.appointmentNumber,
          serviceName: appointment.service?.name,
          date: appointment.timeSlot?.date ?? appointment.slotDate,
          time: appointment.timeSlot?.startTime ?? appointment.slotStartTime,
        });
      } catch (smsError) {
        console.error('[sms] Confirmation failed:', smsError);
        smsResult = { success: false, message: 'SMS failed' };
      }

      let emailResult = { success: false, skipped: true, message: 'Email not sent' };
      try {
        emailResult = await appointmentEmailService.sendConfirmationForAppointment({
          id: appointment.id,
          status: appointment.status,
          slotDate: appointment.slotDate,
          slotStartTime: appointment.slotStartTime,
          slotEndTime: appointment.slotEndTime,
          timeSlot: appointment.timeSlot,
          group: {
            appointmentNumber: appointment.appointmentNumber,
            resident: appointment.resident,
          },
          service: appointment.service,
        });
      } catch (emailError) {
        console.error('[email] Confirmation failed:', emailError);
        emailResult = { success: false, message: 'Email failed' };
      }

      const responseMessage =
        smsResult.success && (emailResult.success || emailResult.skipped)
          ? 'Appointment created successfully'
          : 'Appointment created successfully. Some notifications could not be delivered.';

      successResponse(
        res,
        responseMessage,
        { ...appointment, sms: smsResult, email: emailResult },
        201
      );
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

      const appointments = await appointmentService.getUserAppointmentsByPhone(phone);

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
          await smsService.sendAppointmentReschedule({
            phone: appointment.resident?.phone || phone,
            appointmentNumber: appointment.appointmentNumber,
            serviceName: appointment.service?.name,
            date: appointment.timeSlot?.date ?? appointment.slotDate,
            time: appointment.timeSlot?.startTime ?? appointment.slotStartTime,
          });
        } catch (smsError) {
          console.error('[sms] Reschedule notification failed:', smsError);
        }
        try {
          await appointmentEmailService.sendUpdateForAppointment(appointment);
        } catch (emailError) {
          console.error('[email] Reschedule notification failed:', emailError);
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
        await smsService.sendAppointmentReschedule({
          phone: appointment.resident?.phone || phone,
          appointmentNumber: appointment.appointmentNumber,
          serviceName: appointment.service?.name,
          date: appointment.timeSlot?.date ?? appointment.slotDate,
          time: appointment.timeSlot?.startTime ?? appointment.slotStartTime,
        });
      } catch (smsError) {
        console.error('[sms] Reschedule notification failed:', smsError);
      }
      try {
        await appointmentEmailService.sendUpdateForAppointment(appointment);
      } catch (emailError) {
        console.error('[email] Reschedule notification failed:', emailError);
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
          const apt = await appointmentService.getAppointmentLineByNumberAndItem(
            appointmentRef.trim(),
            parseInt(String(appointmentItemId), 10)
          );
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
        const apt = await appointmentService.getAppointmentByIdWithGroup(id);
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
          await smsService.sendAppointmentCancellation({
            phone: cancelledAppointment.resident?.phone || phone,
            appointmentNumber: cancelledAppointment.appointmentNumber,
            serviceName: cancelledAppointment.service?.name,
          });
        } catch (smsError) {
          console.error('[sms] Cancellation notification failed:', smsError);
        }
        try {
          await appointmentEmailService.sendCancellationForAppointment(cancelledAppointment);
        } catch (emailError) {
          console.error('[email] Cancellation notification failed:', emailError);
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

  async resendConfirmationEmail(req, res) {
    try {
      const { appointmentRef } = req.params;
      const { phone, appointmentItemId } = req.body;

      const emailResult = await appointmentEmailService.resendConfirmationByRef(
        appointmentRef,
        phone,
        appointmentItemId != null ? Number(appointmentItemId) : undefined
      );

      if (emailResult.success) {
        return successResponse(res, 'Confirmation email sent successfully', emailResult);
      }
      if (emailResult.skipped) {
        return errorResponse(res, emailResult.message || 'Email could not be sent', 400);
      }
      return errorResponse(res, emailResult.message || 'Failed to send confirmation email', 502);
    } catch (error) {
      if (error.statusCode === 404 || error.message?.includes('not found')) {
        return errorResponse(res, error.message, 404);
      }
      if (
        error.statusCode === 403 ||
        error.message?.includes('Verification failed')
      ) {
        return errorResponse(res, error.message, 403);
      }
      console.error('[resendConfirmationEmail]', error);
      errorResponse(res, 'Failed to resend confirmation email', 500);
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

      const apt = await appointmentService.getAppointmentServiceId(appointmentId);
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
