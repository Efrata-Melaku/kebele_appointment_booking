const serviceService = require('../../services/service.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { AppError } = require('../../utils/AppError');

class BookingController {
  async listServices(req, res) {
    try {
      const catalog = await serviceService.getPublicCatalog();
      successResponse(res, 'Services catalog retrieved successfully', catalog);
    } catch (error) {
      errorResponse(res, 'Failed to load services', 500);
    }
  }

  async getServiceDetail(req, res) {
    try {
      const serviceId = parseInt(req.params.serviceId, 10);
      const service = await serviceService.getPublicServiceDetail(serviceId);
      successResponse(res, 'Service detail retrieved successfully', service);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to load service', 500);
    }
  }
}

module.exports = new BookingController();
