const feedbackService = require('../../services/feedback.service');
const { successResponse, paginatedSuccess, errorResponse } = require('../../utils/response');

class AdminFeedbackController {
  async listFeedback(req, res) {
    try {
      const { items, pagination } = await feedbackService.listAdminFeedback(req.query);
      paginatedSuccess(res, 'Feedback retrieved successfully', items, pagination);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await feedbackService.getAdminFeedbackStats(req.query);
      successResponse(res, 'Feedback statistics retrieved successfully', stats);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve feedback statistics', 500);
    }
  }

  async getReporting(req, res) {
    try {
      const report = await feedbackService.getReporting();
      successResponse(res, 'Feedback reporting retrieved successfully', report);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve feedback reporting', 500);
    }
  }

  async getFeedbackDetail(req, res) {
    try {
      const detail = await feedbackService.getAdminFeedbackDetail(req.params.id);
      successResponse(res, 'Feedback retrieved successfully', detail);
    } catch (error) {
      if (error.statusCode === 404) {
        return errorResponse(res, error.message, 404);
      }
      errorResponse(res, 'Failed to retrieve feedback', 500);
    }
  }
}

module.exports = new AdminFeedbackController();
