const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');
const { USER_ROLES } = require('../../config/constants');

class StaffController {
  async registerStaff(req, res) {
    try {
      const { name, email, password, phone } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return errorResponse(res, 'User already exists with this email', 400);
      }

      // Hash password (handled in auth controller, but keeping here for completeness)
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create staff user
      const staff = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: USER_ROLES.STAFF,
          phone,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

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
          createdAt: true,
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
          id: parseInt(id),
          role: USER_ROLES.STAFF,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
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
      const { name, email, phone } = req.body;

      const staff = await prisma.user.updateMany({
        where: {
          id: parseInt(id),
          role: USER_ROLES.STAFF,
        },
        data: {
          name,
          email,
          phone,
        },
      });

      if (staff.count === 0) {
        return errorResponse(res, 'Staff member not found', 404);
      }

      // Get updated staff
      const updatedStaff = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
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

      const staff = await prisma.user.deleteMany({
        where: {
          id: parseInt(id),
          role: USER_ROLES.STAFF,
        },
      });

      if (staff.count === 0) {
        return errorResponse(res, 'Staff member not found', 404);
      }

      successResponse(res, 'Staff member deleted successfully');
    } catch (error) {
      errorResponse(res, 'Failed to delete staff member', 500);
    }
  }
}

module.exports = new StaffController();