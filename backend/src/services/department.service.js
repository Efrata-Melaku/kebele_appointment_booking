const departmentModel = require('../models/department.model');
const { ConflictError, NotFoundError } = require('../utils/AppError');

class DepartmentService {
  async createDepartment(name) {
    const trimmed = String(name).trim();
    const existing = await departmentModel.findDepartmentByName(trimmed);
    if (existing) {
      throw new ConflictError('Department already exists');
    }
    return departmentModel.createDepartment({ name: trimmed });
  }

  async checkDuplicateName(name) {
    const trimmed = String(name || '').trim();
    if (trimmed.length < 2) {
      return { exists: false, checking: false };
    }
    const existing = await departmentModel.findFirstDepartmentByName(trimmed);
    return { exists: Boolean(existing) };
  }

  async getDepartments() {
    return departmentModel.getDepartments({
      include: {
        services: {
          include: {
            _count: { select: { appointments: true } },
          },
        },
      },
    });
  }

  async getDepartmentById(id) {
    const department = await departmentModel.findDepartmentById(id, {
      include: {
        services: {
          include: {
            _count: { select: { appointments: true } },
          },
        },
      },
    });
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return department;
  }

  async updateDepartment(id, name) {
    const trimmed = String(name).trim();
    const existing = await departmentModel.findFirstDepartmentByName(trimmed, id);
    if (existing) {
      throw new ConflictError('Department already exists');
    }
    try {
      return await departmentModel.updateDepartment(id, { name: trimmed });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Department not found');
      }
      if (err.code === 'P2002') {
        throw new ConflictError('Department already exists');
      }
      throw err;
    }
  }

  async deleteDepartment(id) {
    try {
      await departmentModel.deleteDepartment(id);
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Department not found');
      }
      throw err;
    }
  }

  async countDepartments() {
    return departmentModel.countDepartments();
  }

  async getDepartmentsWithAppointmentCounts() {
    return departmentModel.getDepartments({
      include: {
        services: {
          include: {
            appointments: { select: { id: true } },
          },
        },
      },
    });
  }
}

module.exports = new DepartmentService();
