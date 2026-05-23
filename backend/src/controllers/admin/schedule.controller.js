const scheduleService = require('../../services/schedule.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { AppError } = require('../../utils/AppError');

class ScheduleController {
  async getTemplate(req, res) {
    try {
      const template = await scheduleService.getTemplate();
      successResponse(res, 'Work schedule template', template);
    } catch (error) {
      errorResponse(res, error.message || 'Failed to load template', 500);
    }
  }

  async updateTemplate(req, res) {
    try {
      const template = await scheduleService.updateTemplate(req.body);
      successResponse(res, 'Template updated', template);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, error.message || 'Failed to update template', 500);
    }
  }

  async listOfficeOverrides(req, res) {
    try {
      const rows = await scheduleService.listOfficeOverrides();
      successResponse(res, 'Office overrides', rows);
    } catch (error) {
      errorResponse(res, 'Failed to list overrides', 500);
    }
  }

  async upsertOfficeOverride(req, res) {
    try {
      const row = await scheduleService.upsertOfficeOverride(req.body);
      successResponse(res, 'Office override saved', row, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, error.message || 'Failed to save override', 400);
    }
  }

  async deleteOfficeOverride(req, res) {
    try {
      await scheduleService.deleteOfficeOverride(req.params.date);
      successResponse(res, 'Office override deleted');
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to delete override', 500);
    }
  }

  async listServiceOverrides(req, res) {
    try {
      const rows = await scheduleService.listServiceOverrides(req.query.serviceId);
      successResponse(res, 'Service overrides', rows);
    } catch (error) {
      errorResponse(res, 'Failed to list service overrides', 500);
    }
  }

  async upsertServiceOverride(req, res) {
    try {
      const row = await scheduleService.upsertServiceOverride(req.body);
      successResponse(res, 'Service override saved', row, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, error.message || 'Failed to save service override', 400);
    }
  }

  async deleteServiceOverride(req, res) {
    try {
      await scheduleService.deleteServiceOverride(req.params.date, req.params.serviceId);
      successResponse(res, 'Service override deleted');
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to delete override', 500);
    }
  }
}

module.exports = new ScheduleController();
