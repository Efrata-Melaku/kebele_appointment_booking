const feedbackService = require('../../services/feedback.service');
const { successResponse, errorResponse } = require('../../utils/response');

class ResidentFeedbackController {
  async createFeedback(req, res) {
    try {
      const { phone, appointmentId, rating, comment } = req.body;
      const feedback = await feedbackService.createResidentFeedback({
        phone,
        appointmentId,
        rating,
        comment,
      });
      successResponse(res, 'Feedback submitted successfully', feedback, 201);
    } catch (error) {
      if (error.statusCode === 400) {
        return errorResponse(res, error.message, 400);
      }
      if (error.statusCode === 403) {
        return errorResponse(res, error.message, 403);
      }
      if (error.statusCode === 404) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to submit feedback', 500);
    }
  }

  async getFeedback(req, res) {
    try {
      const { appointmentId } = req.params;
      const { phone } = req.query;
      const feedback = await feedbackService.getResidentFeedback(appointmentId, phone);
      successResponse(res, 'Feedback retrieved successfully', feedback);
    } catch (error) {
      if (error.statusCode === 400) {
        return errorResponse(res, error.message, 400);
      }
      if (error.statusCode === 403) {
        return errorResponse(res, error.message, 403);
      }
      if (error.statusCode === 404) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }

  async updateFeedback(req, res) {
    try {
      const { appointmentId } = req.params;
      const { phone, rating, comment } = req.body;
      const feedback = await feedbackService.updateResidentFeedback(appointmentId, phone, {
        rating,
        comment,
      });
      successResponse(res, 'Feedback updated successfully', feedback);
    } catch (error) {
      if (error.statusCode === 400) {
        return errorResponse(res, error.message, 400);
      }
      if (error.statusCode === 403) {
        return errorResponse(res, error.message, 403);
      }
      if (error.statusCode === 404) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to update feedback', 500);
    }
  }
}

module.exports = new ResidentFeedbackController();
