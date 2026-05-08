const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma/client');
const env = require('../../config/env');
const { successResponse, errorResponse } = require('../../utils/response');

class AuthController {
  async login(req, res) {
    try {
      if (!env.JWT_SECRET) {
        return errorResponse(res, 'Server authentication is not configured', 503);
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      successResponse(res, 'Login successful', {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      errorResponse(res, 'Login failed', 500);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      successResponse(res, 'Profile retrieved successfully', user);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve profile', 500);
    }
  }
}

module.exports = new AuthController();
