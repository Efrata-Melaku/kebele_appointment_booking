const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const env = require('../config/env');
const { UnauthorizedError } = require('../utils/AppError');

class AuthService {
  async login(email, password) {
    if (!env.JWT_SECRET) {
      const err = new Error('Server authentication is not configured');
      err.statusCode = 503;
      throw err;
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getProfile(userId) {
    const user = await userModel.findUserById(userId, {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user;
  }
}

module.exports = new AuthService();
