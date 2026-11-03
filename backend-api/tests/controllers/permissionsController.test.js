const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const permissionsService = require('../../src/services/permissionsService');
const {
  createAdminPermission,
  getAdminPermissions,
  updateAdminPermission,
} = require('../../src/controllers/permissionsController');

const createResponse = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('returns permission rows from the protected GET handler', async (t) => {
  const originalGetPermissions = permissionsService.getAdminPermissions;
  permissionsService.getAdminPermissions = async () => [{ permission_key: 'PROJECT_READ' }];
  t.after(() => {
    permissionsService.getAdminPermissions = originalGetPermissions;
  });

  const response = createResponse();
  await getAdminPermissions({}, response);
  assert.deepEqual(response.body, [{ permission_key: 'PROJECT_READ' }]);
});

test('validates and creates permissions with trimmed optional values', async (t) => {
  const originalCreatePermission = permissionsService.createAdminPermission;
  let createArgs;
  permissionsService.createAdminPermission = async (args) => {
    createArgs = args;
    return { id: 'perm-1', permission_key: args.permissionKey };
  };
  t.after(() => {
    permissionsService.createAdminPermission = originalCreatePermission;
  });

  const invalid = createResponse();
  await createAdminPermission({ body: { permission_key: 'lowercase', role_ids: [], plan_ids: [] } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(createArgs, undefined);

  const response = createResponse();
  await createAdminPermission({
    body: {
      permission_key: 'PROJECT_READ',
      role_ids: ['role-1'],
      plan_ids: ['BASIC'],
      description: '  Reads projects ',
      is_active: false,
    },
  }, response);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(createArgs, {
    permissionKey: 'PROJECT_READ',
    roleIds: ['role-1'],
    planCodes: ['BASIC'],
    description: 'Reads projects',
    isActive: false,
  });
});

test('rejects permission creation when either assignment list is empty', async (t) => {
  const originalCreatePermission = permissionsService.createAdminPermission;
  let createCalls = 0;
  permissionsService.createAdminPermission = async () => {
    createCalls += 1;
    return null;
  };
  t.after(() => {
    permissionsService.createAdminPermission = originalCreatePermission;
  });

  for (const [body, expectedError] of [
    [
      { permission_key: 'PROJECT_READ', role_ids: [], plan_ids: ['BASIC'] },
      'At least one role must be selected',
    ],
    [
      { permission_key: 'PROJECT_READ', role_ids: ['role-1'], plan_ids: [] },
      'At least one plan must be selected',
    ],
  ]) {
    const response = createResponse();
    await createAdminPermission({ body }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error, expectedError);
  }
  assert.equal(createCalls, 0);
});

test('returns conflicts and rejects unavailable assignments', async (t) => {
  const originalCreatePermission = permissionsService.createAdminPermission;
  t.after(() => {
    permissionsService.createAdminPermission = originalCreatePermission;
  });
  const body = { permission_key: 'PROJECT_READ', role_ids: ['role-1'], plan_ids: ['BASIC'] };

  permissionsService.createAdminPermission = async () => null;
  const duplicate = createResponse();
  await createAdminPermission({ body }, duplicate);
  assert.equal(duplicate.statusCode, 409);

  permissionsService.createAdminPermission = async () => {
    const error = new Error('One or more selected roles are invalid or unavailable');
    error.code = 'INVALID_ROLE_ASSIGNMENT';
    throw error;
  };
  const invalidRole = createResponse();
  await createAdminPermission({ body }, invalidRole);
  assert.equal(invalidRole.statusCode, 400);
});

test('updates mutable fields only and returns the persisted permission', async (t) => {
  const originalUpdatePermission = permissionsService.updateAdminPermission;
  let updateArgs;
  permissionsService.updateAdminPermission = async (permissionId, updates) => {
    updateArgs = { permissionId, ...updates };
    return {
      id: permissionId,
      permission_key: 'PROJECT_READ',
      role_ids: updates.roleIds,
      plan_ids: updates.planCodes,
      description: updates.description,
      is_active: updates.isActive,
    };
  };
  t.after(() => {
    permissionsService.updateAdminPermission = originalUpdatePermission;
  });

  const response = createResponse();
  await updateAdminPermission({
    params: { permissionId: '00042' },
    body: {
      role_ids: ['role-2'],
      plan_ids: ['PRO'],
      description: '  Updated access ',
      is_active: false,
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(updateArgs, {
    permissionId: '00042',
    roleIds: ['role-2'],
    planCodes: ['PRO'],
    description: 'Updated access',
    isActive: false,
  });
  assert.equal(response.body.permission.permission_key, 'PROJECT_READ');
});

test('rejects key-change attempts and returns 404 for missing permissions', async (t) => {
  const originalUpdatePermission = permissionsService.updateAdminPermission;
  let updateCalls = 0;
  permissionsService.updateAdminPermission = async () => {
    updateCalls += 1;
    return null;
  };
  t.after(() => {
    permissionsService.updateAdminPermission = originalUpdatePermission;
  });

  const invalid = createResponse();
  await updateAdminPermission({
    params: { permissionId: '42' },
    body: {
      permission_key: 'PROJECT_WRITE',
      role_ids: ['role-1'],
      plan_ids: ['BASIC'],
      description: '',
      is_active: true,
    },
  }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.error, 'Permission key cannot be changed');
  assert.equal(updateCalls, 0);

  const missing = createResponse();
  await updateAdminPermission({
    params: { permissionId: 'not-found' },
    body: {
      role_ids: ['role-1'],
      plan_ids: ['BASIC'],
      description: '',
      is_active: true,
    },
  }, missing);
  assert.equal(missing.statusCode, 404);
});
