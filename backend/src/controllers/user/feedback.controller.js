const feedbackService = require('../../services/feedback.service');
const { successResponse, errorResponse } = require('../../utils/response');

/** @deprecated Prefer POST /api/resident/feedback with phone verification */
class FeedbackController {
  async createFeedback(req, res) {
    try {
      const { phone, appointmentId, rating, comment } = req.body;
      if (!phone) {
        return errorResponse(res, 'Phone number is required', 400);
      }
      const feedback = await feedbackService.createResidentFeedback({
        phone,
        appointmentId,
        rating,
        comment,
      });
      successResponse(res, 'Feedback submitted successfully', feedback, 201);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to submit feedback', 500);
    }
  }

  async getFeedback(req, res) {
    try {
      const { appointmentId } = req.params;
      const { phone } = req.query;
      if (!phone) {
        return errorResponse(res, 'Phone number is required', 400);
      }
      const feedback = await feedbackService.getResidentFeedback(appointmentId, phone);
      successResponse(res, 'Feedback retrieved successfully', feedback);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }

  async updateFeedback(req, res) {
    try {
      const { appointmentId } = req.params;
      const { phone, rating, comment } = req.body;
      if (!phone) {
        return errorResponse(res, 'Phone number is required', 400);
      }
      const feedback = await feedbackService.updateResidentFeedback(appointmentId, phone, {
        rating,
        comment,
      });
      successResponse(res, 'Feedback updated successfully', feedback);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to update feedback', 500);
    }
  }

  async getAllFeedback(req, res) {
    try {
      const result = await feedbackService.listAdminFeedback(req.query);
      successResponse(res, 'Feedback retrieved successfully', result);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }
}

module.exports = new FeedbackController();
