const bcrypt = require('bcrypt');
const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');
const { USER_ROLES } = require('../../config/constants');
const { recalculateStaffCountForService } = require('../../services/serviceStaffCount.service');

class StaffController {
  async registerStaff(req, res) {
    try {
      const { name, email, password, phone, departmentId, serviceIds } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return errorResponse(res, 'User already exists with this email', 400);
      }

      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return errorResponse(res, 'Department not found', 404);
      }

      const uniqueServiceIds = [...new Set(serviceIds)];

      const services = await prisma.service.findMany({
        where: { id: { in: uniqueServiceIds } },
      });
      if (services.length !== uniqueServiceIds.length) {
        return errorResponse(res, 'One or more services were not found', 400);
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const staff = await prisma.user.create({
        data: {
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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          departmentId: true,
          isActive: true,
          createdAt: true,
          staffServiceAssignments: {
            include: {
              service: { select: { id: true, name: true } },
            },
          },
        },
      });

      for (const sid of uniqueServiceIds) {
        await recalculateStaffCountForService(sid);
      }

      successResponse(res, 'Staff registered successfully', staff, 201);
    } catch (error) {
      errorResponse(res, 'Staff registration failed', 500);
    }
  }

  async getStaff(req, res) {
    try {
      const staff = await prisma.user.findMany({
        where: { role: USER_ROLES.STAFF },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          departmentId: true,
          isActive: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
          staffServiceAssignments: {
            include: {
              service: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      successResponse(res, 'Staff retrieved successfully', staff);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve staff', 500);
    }
  }

  async getStaffById(req, res) {
    try {
      const { id } = req.params;

      const staff = await prisma.user.findFirst({
        where: {
          id: parseInt(id, 10),
          role: USER_ROLES.STAFF,
        },
        select: {
          id: true,
          name: true,
          email: true,
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
        },
      });

      if (!staff) {
        return errorResponse(res, 'Staff member not found', 404);
      }

      successResponse(res, 'Staff member retrieved successfully', staff);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve staff member', 500);
    }
  }

  async updateStaff(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, password, departmentId, serviceIds, isActive } = req.body;

      const existing = await prisma.user.findFirst({
        where: { id: parseInt(id, 10), role: USER_ROLES.STAFF },
      });

      if (!existing) {
        return errorResponse(res, 'Staff member not found', 404);
      }

      if (email && email !== existing.email) {
        const clash = await prisma.user.findUnique({ where: { email } });
        if (clash) {
          return errorResponse(res, 'Email already in use', 400);
        }
      }

      if (departmentId !== undefined && departmentId !== null) {
        const department = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!department) {
          return errorResponse(res, 'Department not found', 404);
        }
      }

      if (Array.isArray(serviceIds)) {
        const uniqueServiceIds = [...new Set(serviceIds)];
        const services = await prisma.service.findMany({
          where: { id: { in: uniqueServiceIds } },
        });
        if (services.length !== uniqueServiceIds.length) {
          return errorResponse(res, 'One or more services were not found', 400);
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
        const oldLinks = await prisma.staffServiceAssignment.findMany({
          where: { staffUserId: existing.id },
          select: { serviceId: true },
        });
        const oldSids = oldLinks.map((l) => l.serviceId);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existing.id },
            data,
          });

          await tx.staffServiceAssignment.deleteMany({ where: { staffUserId: existing.id } });
          if (uniqueServiceIds.length > 0) {
            await tx.staffServiceAssignment.createMany({
              data: uniqueServiceIds.map((serviceId) => ({
                staffUserId: existing.id,
                serviceId,
              })),
            });
          }
        });

        const toRecalc = new Set(oldSids);
        uniqueServiceIds.forEach((sid) => toRecalc.add(sid));
        for (const sid of toRecalc) {
          await recalculateStaffCountForService(sid);
        }
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data,
        });
      }

      const updatedStaff = await prisma.user.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          departmentId: true,
          isActive: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
          staffServiceAssignments: {
            include: {
              service: { select: { id: true, name: true } },
            },
          },
        },
      });

      successResponse(res, 'Staff member updated successfully', updatedStaff);
    } catch (error) {
      errorResponse(res, 'Failed to update staff member', 500);
    }
  }

  async deleteStaff(req, res) {
    try {
      const { id } = req.params;
      const staffId = parseInt(id, 10);

      const links = await prisma.staffServiceAssignment.findMany({
        where: { staffUserId: staffId },
        select: { serviceId: true },
      });

      const deleted = await prisma.user.deleteMany({
        where: {
          id: staffId,
          role: USER_ROLES.STAFF,
        },
      });

      if (deleted.count === 0) {
        return errorResponse(res, 'Staff member not found', 404);
      }

      const sids = [...new Set(links.map((l) => l.serviceId))];
      for (const sid of sids) {
        await recalculateStaffCountForService(sid);
      }

      successResponse(res, 'Staff member deleted successfully');
    } catch (error) {
      errorResponse(res, 'Failed to delete staff member', 500);
    }
  }
}

module.exports = new StaffController();
