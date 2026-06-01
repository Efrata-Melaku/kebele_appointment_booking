const serviceService = require('../../services/service.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { AppError } = require('../../utils/AppError');

class ServiceController {
  async createService(req, res) {
    try {
      const { name, description, durationInMinutes, requiredDocuments, departmentId } = req.body;
      const service = await serviceService.createService({
        name,
        description,
        durationInMinutes,
        requiredDocuments,
        departmentId,
        staffCount: 0,
      });
      successResponse(res, 'Service created successfully', service, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      if (error.code === 'P2002') {
        return errorResponse(
          res,
          'A service with this name already exists in the selected department',
          400
        );
      }
      errorResponse(res, 'Failed to create service', 500);
    }
  }

  async getServices(req, res) {
    try {
      const services = await serviceService.getAdminServices();
      successResponse(res, 'Services retrieved successfully', services);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve services', 500);
    }
  }

  async getServicePickerOptions(req, res) {
    try {
      const options = await serviceService.getServicePickerOptions();
      successResponse(res, 'Service options retrieved successfully', options);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve service options', 500);
    }
  }

  async getServiceById(req, res) {
    try {
      const service = await serviceService.getServiceDetailWithFields(req.params.id);
      successResponse(res, 'Service retrieved successfully', service);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to retrieve service', 500);
    }
  }

  async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, description, durationInMinutes, requiredDocuments, departmentId } = req.body;
      const service = await serviceService.updateService(id, {
        name,
        description,
        durationInMinutes,
        requiredDocuments,
        departmentId,
      });
      successResponse(res, 'Service updated successfully', service);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to update service', 500);
    }
  }

  async deleteService(req, res) {
    try {
      await serviceService.deleteService(req.params.id);
      successResponse(res, 'Service deleted successfully');
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      console.error('[deleteService]', error);
      errorResponse(res, 'Failed to delete service', 500);
    }
  }

  async getServicesByDepartment(req, res) {
    try {
      const services = await serviceService.getServicesByDepartment(req.params.departmentId);
      successResponse(res, 'Services retrieved successfully', services);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve services', 500);
    }
  }

  async duplicateServiceCheck(req, res) {
    try {
      const departmentId = parseInt(String(req.query.departmentId), 10);
      const name = String(req.query.name || '').trim();
      if (!departmentId || !name) {
        return errorResponse(res, 'departmentId and name are required', 400);
      }
      const result = await serviceService.checkDuplicateService(departmentId, name);
      successResponse(res, 'OK', result);
    } catch (error) {
      errorResponse(res, 'Check failed', 500);
    }
  }

  async getUserServiceFormFields(req, res) {
    try {
      const serviceId = parseInt(req.params.serviceId, 10);
      const data = await serviceService.getUserFormFields(serviceId);
      successResponse(res, 'Form fields retrieved successfully', data);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to retrieve form fields', 500);
    }
  }
}

module.exports = new ServiceController();
