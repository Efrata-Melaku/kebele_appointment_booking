/**
 * Ethiopian phone helpers for SMS and resident flows.
 * Accepts: 0912345678, 251912345678, +251912345678
 * Normalizes to: +251912345678
 */
const {
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  ETHIOPIAN_PHONE_ERROR,
} = require('./ethiopianPhone');

/** @returns {boolean} */
function validateEthiopianPhone(phone) {
  return isValidEthiopianPhone(phone);
}

/**
 * @param {string} phone
 * @returns {string|null} E.164 +251… or null if invalid
 */
function normalizePhone(phone) {
  return normalizeEthiopianPhone(phone);
}

module.exports = {
  validateEthiopianPhone,
  normalizePhone,
  PHONE_ERROR: ETHIOPIAN_PHONE_ERROR,
  ETHIOPIAN_PHONE_ERROR,
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
};
