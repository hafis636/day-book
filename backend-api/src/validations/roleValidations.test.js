const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createRoleCode,
  validateRoleCreation,
  validateRoleUpdate,
} = require('./roleValidations');

test('derives uppercase underscore role codes deterministically', () => {
  assert.equal(createRoleCode('  Project   Manager '), 'PROJECT_MANAGER');
  assert.equal(createRoleCode('Support-team'), 'SUPPORT_TEAM');
});

test('validates role names and protects the administrator role identity', () => {
  assert.equal(validateRoleCreation({ role_name: '   ' }), 'Role name is required');
  assert.match(validateRoleCreation({ role_name: '!@#$' }), /at least one letter or number/i);
  assert.match(validateRoleCreation({ role_name: 'a'.repeat(51) }), /50 characters or fewer/i);
  assert.match(validateRoleCreation({ role_name: 'Admin!' }), /administrator role is reserved/i);
  assert.equal(validateRoleCreation({ role_name: 'Project Manager' }), null);
});

test('validates supplied description and active status types', () => {
  assert.equal(
    validateRoleCreation({ role_name: 'Editor', description: 123 }),
    'Role description must be a string'
  );
  assert.equal(
    validateRoleCreation({ role_name: 'Editor', is_active: 'false' }),
    'Role active status must be a boolean'
  );
  assert.equal(
    validateRoleCreation({ role_name: 'Editor', description: '', is_active: false }),
    null
  );
});

test('validates editable role fields and rejects role-code updates', () => {
  assert.equal(validateRoleUpdate({ description: ' Updated ' }), null);
  assert.equal(validateRoleUpdate({ is_active: false }), null);
  assert.equal(
    validateRoleUpdate({ role_name: '!!!' }),
    'Role name must include at least one letter or number'
  );
  assert.equal(validateRoleUpdate({}), 'At least one role field must be provided');
  assert.equal(
    validateRoleUpdate({ role_name: 'Editor', role_code: 'OTHER' }),
    'Role code cannot be changed'
  );
  assert.equal(
    validateRoleUpdate({ role_name: 'Editor', permission: 'admin' }),
    'Unexpected role field: permission'
  );
});
