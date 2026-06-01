const authService = require('../../services/auth.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { AppError } = require('../../utils/AppError');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      successResponse(res, 'Login successful', result);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      if (error.statusCode === 503) {
        return errorResponse(res, error.message, 503);
      }
      errorResponse(res, 'Login failed', 500);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      successResponse(res, 'Profile retrieved successfully', user);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      errorResponse(res, 'Failed to retrieve profile', 500);
    }
  }
}

module.exports = new AuthController();
