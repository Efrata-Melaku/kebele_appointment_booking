const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const env = require('../config/env');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await userModel.findUserById(decoded.id, {
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No user found with this token',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route',
    });
  }
};

module.exports = protect;
