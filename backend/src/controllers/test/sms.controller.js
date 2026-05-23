/**
 * Development/test endpoints for SMS — disabled in production.
 */
const smsService = require('../../services/sms.service');
const reminderService = require('../../services/reminder.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { validateEthiopianPhone } = require('../../utils/phone');

function samplePayload(overrides = {}) {
  return {
    phone: '+251912345678',
    appointmentNumber: 'APP-2026-00001',
    serviceName: 'Birth Certificate',
    date: '2026-06-20',
    time: '10:00',
    ...overrides,
  };
}

class SmsTestController {
  /** POST /api/test/sms — send a custom or default test message */
  async sendTestSms(req, res) {
    try {
      const { phone, message } = req.body;
      if (!phone) {
        return errorResponse(res, 'phone is required', 400);
      }
      if (!validateEthiopianPhone(phone)) {
        return errorResponse(res, 'Please enter a valid Ethiopian phone number.', 400);
      }

      const text =
        message ||
        'Kebele Appointment System: This is a test SMS from Africa\'s Talking.';

      const result = await smsService.sendSMS(phone, text);
      if (!result.success) {
        return res.status(502).json({
          success: false,
          message: result.message,
          data: result,
        });
      }

      successResponse(res, 'SMS sent successfully', result);
    } catch (error) {
      errorResponse(res, error.message || 'SMS test failed', 500);
    }
  }

  /** POST /api/test/reminder — run tomorrow reminder job */
  async runReminderJob(req, res) {
    try {
      const summary = await reminderService.sendTomorrowReminders();
      successResponse(res, 'Reminder job completed', summary);
    } catch (error) {
      errorResponse(res, error.message || 'Reminder job failed', 500);
    }
  }

  /** POST /api/test/cancel — send sample cancellation SMS */
  async sendTestCancel(req, res) {
    try {
      const data = samplePayload(req.body);
      if (!validateEthiopianPhone(data.phone)) {
        return errorResponse(res, 'Please enter a valid Ethiopian phone number.', 400);
      }
      const result = await smsService.sendAppointmentCancellation(data);
      if (!result.success) {
        return res.status(502).json({ success: false, message: result.message, data: result });
      }
      successResponse(res, 'Cancellation SMS sent successfully', result);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to send cancellation SMS', 500);
    }
  }

  /** POST /api/test/reschedule — send sample reschedule SMS */
  async sendTestReschedule(req, res) {
    try {
      const data = samplePayload({
        date: '2026-06-22',
        time: '11:00',
        ...req.body,
      });
      if (!validateEthiopianPhone(data.phone)) {
        return errorResponse(res, 'Please enter a valid Ethiopian phone number.', 400);
      }
      const result = await smsService.sendAppointmentReschedule(data);
      if (!result.success) {
        return res.status(502).json({ success: false, message: result.message, data: result });
      }
      successResponse(res, 'Reschedule SMS sent successfully', result);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to send reschedule SMS', 500);
    }
  }

  /** POST /api/test/confirm — send sample confirmation SMS */
  async sendTestConfirm(req, res) {
    try {
      const data = samplePayload(req.body);
      if (!validateEthiopianPhone(data.phone)) {
        return errorResponse(res, 'Please enter a valid Ethiopian phone number.', 400);
      }
      const result = await smsService.sendAppointmentConfirmation(data);
      if (!result.success) {
        return res.status(502).json({ success: false, message: result.message, data: result });
      }
      successResponse(res, 'Confirmation SMS sent successfully', result);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to send confirmation SMS', 500);
    }
  }
}

module.exports = new SmsTestController();
