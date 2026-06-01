const ETHIOPIAN_PHONE_ERROR = 'Please enter a valid Ethiopian phone number.';

/**
 * Normalize Ethiopian mobile numbers to E.164 +2519XXXXXXXX / +2517XXXXXXXX.
 * @param {string} input
 * @returns {string|null}
 */
function normalizeEthiopianPhone(input) {
  if (input == null || typeof input !== 'string') return null;

  let s = input.trim().replace(/[\s\-().]/g, '');
  if (!s) return null;

  if (/[a-z]/i.test(s)) return null;

  if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (s.startsWith('251')) {
    const rest = s.slice(3);
    if (/^[97]\d{8}$/.test(rest)) {
      return `+251${rest}`;
    }
    return null;
  }

  if (s.startsWith('0')) {
    s = s.slice(1);
  }

  if (/^[97]\d{8}$/.test(s)) {
    return `+251${s}`;
  }

  return null;
}

function isValidEthiopianPhone(input) {
  return normalizeEthiopianPhone(input) !== null;
}

/** Compare stored vs provided phone (handles legacy non-normalized DB values). */
function phonesMatch(storedPhone, providedPhone) {
  const a = normalizeEthiopianPhone(storedPhone) || String(storedPhone || '').trim();
  const b = normalizeEthiopianPhone(providedPhone) || String(providedPhone || '').trim();
  return a === b && a.length > 0;
}

function requireNormalizedPhone(input) {
  const normalized = normalizeEthiopianPhone(input);
  if (!normalized) {
    const err = new Error(ETHIOPIAN_PHONE_ERROR);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function assertPhoneMatchesResident(storedPhone, providedPhone) {
  const normalized = requireNormalizedPhone(providedPhone);
  if (!phonesMatch(storedPhone, normalized)) {
    const err = new Error('Verification failed for this appointment');
    err.statusCode = 403;
    throw err;
  }
  return normalized;
}

module.exports = {
  ETHIOPIAN_PHONE_ERROR,
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  phonesMatch,
  requireNormalizedPhone,
  assertPhoneMatchesResident,
};
