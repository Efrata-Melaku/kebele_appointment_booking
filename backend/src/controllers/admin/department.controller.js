const departmentService = require('../../services/department.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { AppError } = require('../../utils/AppError');

class DepartmentController {
  async createDepartment(req, res) {
    try {
      const { name } = req.body;
      const department = await departmentService.createDepartment(name);
      successResponse(res, 'Department created successfully', department, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to create department', 500);
    }
  }

  async duplicateCheck(req, res) {
    try {
      const result = await departmentService.checkDuplicateName(req.query.name);
      successResponse(res, 'OK', result);
    } catch (error) {
      errorResponse(res, 'Check failed', 500);
    }
  }

  async getDepartments(req, res) {
    try {
      const departments = await departmentService.getDepartments();
      successResponse(res, 'Departments retrieved successfully', departments);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve departments', 500);
    }
  }

  async getDepartmentById(req, res) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      successResponse(res, 'Department retrieved successfully', department);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to retrieve department', 500);
    }
  }

  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const department = await departmentService.updateDepartment(id, name);
      successResponse(res, 'Department updated successfully', department);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to update department', 500);
    }
  }

  async deleteDepartment(req, res) {
    try {
      await departmentService.deleteDepartment(req.params.id);
      successResponse(res, 'Department deleted successfully');
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to delete department', 500);
    }
  }
}

module.exports = new DepartmentController();
