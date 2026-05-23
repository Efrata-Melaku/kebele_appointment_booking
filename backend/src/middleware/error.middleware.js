const { AppError } = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof AppError) {
    const body = {
      success: false,
      message: err.message,
      error: err.message,
    };
    if (err.details) {
      body.details = err.details;
    }
    return res.status(err.statusCode).json(body);
  }

  let error = { ...err };
  error.message = err.message;

  if (err.code === 'P2002') {
    const target = err.meta?.target;
    const message = Array.isArray(target)
      ? `Duplicate value for: ${target.join(', ')}`
      : 'Duplicate record';
    error = { message, statusCode: 400 };
  }

  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  if (err.code === 11000) {
    error = { message: 'Duplicate field value entered', statusCode: 400 };
  }

  if (err.name === 'ValidationError' && err.errors) {
    error = {
      message: Object.values(err.errors)
        .map((val) => val.message)
        .join(', '),
      statusCode: 400,
    };
  }

  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  }

  if (err.code === 'P2025') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
