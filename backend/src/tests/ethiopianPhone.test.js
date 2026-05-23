const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  phonesMatch,
  ETHIOPIAN_PHONE_ERROR,
} = require('../utils/ethiopianPhone');

describe('Ethiopian phone validation', () => {
  it('normalizes local 09 format', () => {
    assert.equal(normalizeEthiopianPhone('0912345678'), '+251912345678');
  });

  it('normalizes local 07 format', () => {
    assert.equal(normalizeEthiopianPhone('0712345678'), '+251712345678');
  });

  it('keeps +251 format', () => {
    assert.equal(normalizeEthiopianPhone('+251912345678'), '+251912345678');
  });

  it('normalizes 251 without plus', () => {
    assert.equal(normalizeEthiopianPhone('251912345678'), '+251912345678');
  });

  it('rejects invalid numbers', () => {
    assert.equal(normalizeEthiopianPhone('123456'), null);
    assert.equal(normalizeEthiopianPhone('5555555'), null);
    assert.equal(normalizeEthiopianPhone('+123456'), null);
    assert.equal(normalizeEthiopianPhone('0044123456'), null);
    assert.equal(normalizeEthiopianPhone('abc123'), null);
  });

  it('validates accepted formats', () => {
    assert.equal(isValidEthiopianPhone('0912345678'), true);
    assert.equal(isValidEthiopianPhone('+251712345678'), true);
    assert.equal(isValidEthiopianPhone('251912345678'), true);
  });

  it('matches equivalent formats', () => {
    assert.equal(phonesMatch('0912345678', '+251912345678'), true);
    assert.equal(phonesMatch('+251912345678', '+251911111111'), false);
  });

  it('exposes user-facing error message', () => {
    assert.equal(ETHIOPIAN_PHONE_ERROR, 'Please enter a valid Ethiopian phone number.');
  });
});
