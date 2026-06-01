const nodemailer = require('nodemailer');
const env = require('./env');

let transporter = null;

function isEmailConfigured() {
  return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

function logMissingEmailConfig() {
  const missing = [];
  if (!env.EMAIL_HOST) missing.push('EMAIL_HOST');
  if (!env.EMAIL_USER) missing.push('EMAIL_USER');
  if (!env.EMAIL_PASSWORD) missing.push('EMAIL_PASSWORD');
  if (missing.length) {
    console.warn(`[email] SMTP not configured — missing in .env: ${missing.join(', ')}`);
  }
}

async function verifyEmailConnection() {
  if (!isEmailConfigured()) {
    logMissingEmailConfig();
    return false;
  }
  const t = getTransporter();
  await t.verify();
  return true;
}

module.exports = {
  isEmailConfigured,
  getTransporter,
  verifyEmailConnection,
};
