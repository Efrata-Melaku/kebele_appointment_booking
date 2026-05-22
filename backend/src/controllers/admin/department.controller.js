const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');

class DepartmentController {
  async createDepartment(req, res) {
    try {
      const { name } = req.body;

      // Check if department already exists
      const existingDepartment = await prisma.department.findUnique({
        where: { name },
      });

      if (existingDepartment) {
        return errorResponse(res, 'Department already exists', 400);
      }

      const department = await prisma.department.create({
        data: { name },
      });

      successResponse(res, 'Department created successfully', department, 201);
    } catch (error) {
      errorResponse(res, 'Failed to create department', 500);
    }
  }

  async duplicateCheck(req, res) {
    try {
      const name = String(req.query.name || '').trim();
      if (name.length < 2) {
        return successResponse(res, 'OK', { exists: false, checking: false });
      }
      const existing = await prisma.department.findFirst({
        where: { name },
      });
      successResponse(res, 'OK', { exists: Boolean(existing) });
    } catch (error) {
      errorResponse(res, 'Check failed', 500);
    }
  }

  async getDepartments(req, res) {
    try {
      const departments = await prisma.department.findMany({
        include: {
          services: {
            include: {
              _count: {
                select: { appointments: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      successResponse(res, 'Departments retrieved successfully', departments);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve departments', 500);
    }
  }

  async getDepartmentById(req, res) {
    try {
      const { id } = req.params;

      const department = await prisma.department.findUnique({
        where: { id: parseInt(id) },
        include: {
          services: {
            include: {
              _count: {
                select: { appointments: true },
              },
            },
          },
        },
      });

      if (!department) {
        return errorResponse(res, 'Department not found', 404);
      }

      successResponse(res, 'Department retrieved successfully', department);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve department', 500);
    }
  }

  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const trimmedName = String(name).trim();
      const deptId = parseInt(id, 10);

      const existingDepartment = await prisma.department.findFirst({
        where: {
          name: trimmedName,
          NOT: { id: deptId },
        },
      });

      if (existingDepartment) {
        return errorResponse(res, 'Department already exists', 400);
      }

      const department = await prisma.department.update({
        where: { id: deptId },
        data: { name: trimmedName },
      });

      successResponse(res, 'Department updated successfully', department);
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Department not found', 404);
      }
      if (error.code === 'P2002') {
        return errorResponse(res, 'Department already exists', 400);
      }
      errorResponse(res, 'Failed to update department', 500);
    }
  }

  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;

      await prisma.department.delete({
        where: { id: parseInt(id) },
      });

      successResponse(res, 'Department deleted successfully');
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Department not found', 404);
      }
      errorResponse(res, 'Failed to delete department', 500);
    }
  }
}

module.exports = new DepartmentController();