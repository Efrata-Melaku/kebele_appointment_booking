const residentService = require('../../services/resident.service');
const { paginatedSuccess, errorResponse } = require('../../utils/response');

class AdminResidentController {
  async listResidents(req, res) {
    try {
      const { items, pagination } = await residentService.listResidents(req.query);
      paginatedSuccess(res, 'Residents retrieved successfully', items, pagination);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve residents', 500);
    }
  }
}

module.exports = new AdminResidentController();
