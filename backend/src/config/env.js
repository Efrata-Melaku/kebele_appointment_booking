const dotenv = require('dotenv');

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn('[env] JWT_SECRET is not set. Admin and staff JWT authentication requires it.');
}

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_API_URL: process.env.SMS_API_URL,
};

module.exports = env;