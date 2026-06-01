const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

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
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880, // 5MB
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'kebele/documents',
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_API_URL: process.env.SMS_API_URL,
  AT_API_KEY: process.env.AT_API_KEY,
  AT_USERNAME: process.env.AT_USERNAME || 'sandbox',
  /** Optional sender ID / short code (Africa's Talking approved sender) */
  AT_SENDER_ID: process.env.AT_SENDER_ID || '',
  EMAIL_HOST: process.env.EMAIL_HOST?.trim() || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_USER: process.env.EMAIL_USER?.trim(),
  /** Gmail app passwords are 16 chars; spaces in .env are stripped if pasted with groups */
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD?.replace(/\s/g, '') || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM?.trim(),
};

module.exports = env;