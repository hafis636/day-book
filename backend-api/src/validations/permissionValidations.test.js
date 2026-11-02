const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validatePermissionCreation,
  validatePermissionUpdate,
} = require('./permissionValidations');

const validPermission = {
  permission_key: 'PROJECT_READ',
  role_ids: ['role-1'],
  plan_ids: ['BASIC'],
};

test('accepts uppercase permission keys and string assignment arrays', () => {
  assert.equal(validatePermissionCreation(validPermission), null);
});

test('rejects invalid permission keys and malformed assignments', () => {
  for (const permissionKey of ['project_read', 'PROJECT-READ', 'PROJECT1', '', ' PROJECT_READ ']) {
    assert.match(
      validatePermissionCreation({ ...validPermission, permission_key: permissionKey }),
      /Permission key/
    );
  }
  for (const role_ids of ['role-1', [1], ['']]) {
    assert.match(
      validatePermissionCreation({ ...validPermission, role_ids }),
      /role_ids/
    );
  }
});

test('requires at least one role and one plan', () => {
  assert.equal(
    validatePermissionCreation({ ...validPermission, role_ids: [] }),
    'At least one role must be selected'
  );
  assert.equal(
    validatePermissionCreation({ ...validPermission, plan_ids: [] }),
    'At least one plan must be selected'
  );
});

test('validates optional description and active status types', () => {
  assert.match(
    validatePermissionCreation({ ...validPermission, description: 4 }),
    /Description/
  );
  assert.match(
    validatePermissionCreation({ ...validPermission, is_active: 'true' }),
    /boolean/
  );
});

test('accepts complete updates without a permission key', () => {
  assert.equal(validatePermissionUpdate({
    role_ids: ['role-1'],
    plan_ids: ['BASIC'],
    description: 'Updated permission',
    is_active: false,
  }), null);
});

test('rejects attempts to change the key and unexpected or incomplete update fields', () => {
  assert.equal(
    validatePermissionUpdate({
      permission_key: 'PROJECT_WRITE',
      role_ids: ['role-1'],
      plan_ids: ['BASIC'],
      description: '',
      is_active: true,
    }),
    'Permission key cannot be changed'
  );
  assert.match(validatePermissionUpdate({ role_ids: ['role-1'], unexpected: true }), /Unexpected permission field/);
  assert.match(validatePermissionUpdate({ role_ids: ['role-1'] }), /plan_ids is required/);
});

test('requires non-empty role and plan arrays and typed mutable values on update', () => {
  assert.equal(
    validatePermissionUpdate({
      role_ids: [],
      plan_ids: ['BASIC'],
      description: '',
      is_active: true,
    }),
    'At least one role must be selected'
  );
  assert.equal(
    validatePermissionUpdate({
      role_ids: ['role-1'],
      plan_ids: [],
      description: '',
      is_active: true,
    }),
    'At least one plan must be selected'
  );
  assert.match(validatePermissionUpdate({
    role_ids: ['role-1'],
    plan_ids: ['BASIC'],
    description: 1,
    is_active: true,
  }), /Description must be a string/);
  assert.match(validatePermissionUpdate({
    role_ids: ['role-1'],
    plan_ids: ['BASIC'],
    description: '',
    is_active: 'true',
  }), /boolean/);
});
