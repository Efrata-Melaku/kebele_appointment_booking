const staffService = require('../../services/staff.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { AppError } = require('../../utils/AppError');

class StaffController {
  async registerStaff(req, res) {
    try {
      const staff = await staffService.registerStaff(req.body);
      successResponse(res, 'Staff registered successfully', staff, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Staff registration failed', 500);
    }
  }

  async getStaff(req, res) {
    try {
      const staff = await staffService.getStaff();
      successResponse(res, 'Staff retrieved successfully', staff);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve staff', 500);
    }
  }

  async getStaffById(req, res) {
    try {
      const staff = await staffService.getStaffById(req.params.id);
      successResponse(res, 'Staff member retrieved successfully', staff);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to retrieve staff member', 500);
    }
  }

  async updateStaff(req, res) {
    try {
      const updatedStaff = await staffService.updateStaff(req.params.id, req.body);
      successResponse(res, 'Staff member updated successfully', updatedStaff);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to update staff member', 500);
    }
  }

  async deleteStaff(req, res) {
    try {
      await staffService.deleteStaff(req.params.id);
      successResponse(res, 'Staff member deleted successfully');
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to delete staff member', 500);
    }
  }
}

module.exports = new StaffController();
