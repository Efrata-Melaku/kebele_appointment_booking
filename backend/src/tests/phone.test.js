const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  validateEthiopianPhone,
  normalizePhone,
  PHONE_ERROR,
} = require('../utils/phone');

describe('phone utils', () => {
  it('normalizes local 09 format to +251', () => {
    assert.strictEqual(normalizePhone('0912345678'), '+251912345678');
  });

  it('normalizes 251 without plus', () => {
    assert.strictEqual(normalizePhone('251912345678'), '+251912345678');
  });

  it('keeps +251 format', () => {
    assert.strictEqual(normalizePhone('+251912345678'), '+251912345678');
  });

  it('rejects invalid numbers', () => {
    assert.strictEqual(normalizePhone('12345'), null);
    assert.strictEqual(validateEthiopianPhone('invalid'), false);
  });

  it('exposes standard error message', () => {
    assert.strictEqual(PHONE_ERROR, 'Please enter a valid Ethiopian phone number.');
  });
});
