const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const departmentModel = require('../models/department.model');
const serviceModel = require('../models/service.model');
const { runTransaction } = require('../models/_client');
const { USER_ROLES } = require('../config/constants');
const { recalculateStaffCountForService } = require('./serviceStaffCount.service');
const { ConflictError, NotFoundError, ValidationError } = require('../utils/AppError');

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  staffServiceAssignments: {
    include: {
      service: { select: { id: true, name: true, departmentId: true } },
    },
  },
};

class StaffService {
  async registerStaff({ name, email, password, phone, departmentId, serviceIds }) {
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('User already exists with this email');
    }

    const department = await departmentModel.findDepartmentById(departmentId);
    if (!department) {
      throw new NotFoundError('Department not found');
    }

    const uniqueServiceIds = [...new Set(serviceIds)];
    const services = await serviceModel.findManyServices({
      where: { id: { in: uniqueServiceIds } },
    });
    if (services.length !== uniqueServiceIds.length) {
      throw new ValidationError('One or more services were not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await userModel.createUser(
      {
        name,
        email,
        password: hashedPassword,
        role: USER_ROLES.STAFF,
        phone,
        departmentId,
        staffServiceAssignments: {
          create: uniqueServiceIds.map((serviceId) => ({ serviceId })),
        },
      },
      { select: staffSelect }
    );

    for (const sid of uniqueServiceIds) {
      await recalculateStaffCountForService(sid);
    }

    return staff;
  }

  async getStaff() {
    return userModel.findManyUsers({
      where: { role: USER_ROLES.STAFF },
      select: staffSelect,
      orderBy: { name: 'asc' },
    });
  }

  async getStaffById(id) {
    const staff = await userModel.findFirstUser({
      id: Number(id),
      role: USER_ROLES.STAFF,
    }, { select: staffSelect });

    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }
    return staff;
  }

  async updateStaff(id, payload) {
    const { name, email, phone, password, departmentId, serviceIds, isActive } = payload;

    const existing = await userModel.findFirstUser({
      id: Number(id),
      role: USER_ROLES.STAFF,
    });

    if (!existing) {
      throw new NotFoundError('Staff member not found');
    }

    if (email && email !== existing.email) {
      const clash = await userModel.findUserByEmail(email);
      if (clash) {
        throw new ConflictError('Email already in use');
      }
    }

    if (departmentId !== undefined && departmentId !== null) {
      const department = await departmentModel.findDepartmentById(departmentId);
      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    if (Array.isArray(serviceIds)) {
      const uniqueServiceIds = [...new Set(serviceIds)];
      const services = await serviceModel.findManyServices({
        where: { id: { in: uniqueServiceIds } },
      });
      if (services.length !== uniqueServiceIds.length) {
        throw new ValidationError('One or more services were not found');
      }
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (departmentId !== undefined) data.departmentId = departmentId;
    if (isActive !== undefined) data.isActive = !!isActive;

    if (password && String(password).length > 0) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (Array.isArray(serviceIds)) {
      const uniqueServiceIds = [...new Set(serviceIds)];
      const oldLinks = await userModel.findStaffAssignmentsByUser(existing.id);
      const oldSids = oldLinks.map((l) => l.serviceId);

      await runTransaction(async (tx) => {
        await userModel.updateUser(existing.id, data, tx);
        await userModel.deleteStaffAssignmentsForUser(existing.id, tx);
        if (uniqueServiceIds.length > 0) {
          await userModel.createManyStaffAssignments(
            uniqueServiceIds.map((serviceId) => ({
              staffUserId: existing.id,
              serviceId,
            })),
            tx
          );
        }
      });

      const toRecalc = new Set(oldSids);
      uniqueServiceIds.forEach((sid) => toRecalc.add(sid));
      for (const sid of toRecalc) {
        await recalculateStaffCountForService(sid);
      }
    } else {
      await userModel.updateUser(existing.id, data);
    }

    return userModel.findUserById(existing.id, { select: staffSelect });
  }

  async deleteStaff(id) {
    const links = await userModel.findStaffAssignments({ staffUserId: Number(id) }, {
      select: { serviceId: true },
    });

    const deleted = await userModel.deleteManyUsers({
      id: Number(id),
      role: USER_ROLES.STAFF,
    });

    if (deleted.count === 0) {
      throw new NotFoundError('Staff member not found');
    }

    const sids = [...new Set(links.map((l) => l.serviceId))];
    for (const sid of sids) {
      await recalculateStaffCountForService(sid);
    }
  }
}

module.exports = new StaffService();
