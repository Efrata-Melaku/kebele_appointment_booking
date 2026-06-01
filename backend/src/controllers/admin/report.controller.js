const { successResponse, errorResponse } = require('../../utils/response');
const reportService = require('../../services/report.service');

class ReportController {
  /** GET /api/admin/reports */
  async getReports(req, res) {
    try {
      const report = await reportService.getFullReport(req.query);
      successResponse(res, 'Reports retrieved successfully', report);
    } catch (error) {
      console.error('[reports]', error);
      errorResponse(res, error.message || 'Failed to retrieve reports', 500);
    }
  }
}

module.exports = new ReportController();
