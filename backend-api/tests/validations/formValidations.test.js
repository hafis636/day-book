const test = require('node:test');
const assert = require('node:assert/strict');
const { REGISTER_VALIDATION } = require('../../src/validations/formValidations');

const validRegistration = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  mobile: '1234567890',
  password: 'Password1!',
};

test('accepts a UUID role ID during registration', () => {
  assert.equal(
    REGISTER_VALIDATION({ ...validRegistration, roleId: '550e8400-e29b-41d4-a716-446655440000' }),
    null
  );
});

test('rejects non-UUID role IDs during registration', () => {
  assert.equal(
    REGISTER_VALIDATION({ ...validRegistration, roleId: '123' }),
    'A valid role is required'
  );
  assert.equal(
    REGISTER_VALIDATION({ ...validRegistration, roleId: 123 }),
    'A valid role is required'
  );
});
