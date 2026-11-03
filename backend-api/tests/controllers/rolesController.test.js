const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const rolesService = require('../../src/services/rolesService');
const {
  createAdminRole,
  getAdminRoles,
  updateAdminRole,
} = require('../../src/controllers/rolesController');

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

test('returns the administrator role list', async (t) => {
  const originalGetRoles = rolesService.getAdminRoles;
  rolesService.getAdminRoles = async () => [{ id: 'role-1', role_name: 'Editor', role_code: 'EDITOR' }];
  t.after(() => {
    rolesService.getAdminRoles = originalGetRoles;
  });

  const response = createResponse();
  await getAdminRoles({}, response);
  assert.deepEqual(response.body, [
    { id: 'role-1', role_name: 'Editor', role_code: 'EDITOR' },
  ]);
});

test('validates and persists role details and a generated role code', async (t) => {
  const originalCreateRole = rolesService.createAdminRole;
  let createArgs;
  rolesService.createAdminRole = async (...args) => {
    createArgs = args;
    return {
      id: 'role-2',
      role_name: args[0],
      role_code: args[1],
      description: args[2],
      is_active: args[3],
    };
  };
  t.after(() => {
    rolesService.createAdminRole = originalCreateRole;
  });

  const invalidResponse = createResponse();
  await createAdminRole({ body: { role_name: '!!!' } }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(createArgs, undefined);

  const response = createResponse();
  await createAdminRole(
    {
      body: {
        role_name: '  Project Manager  ',
        description: '  Oversees projects  ',
        is_active: false,
      },
    },
    response
  );
  assert.equal(response.statusCode, 201);
  assert.deepEqual(createArgs, [
    'Project Manager',
    'PROJECT_MANAGER',
    'Oversees projects',
    false,
  ]);
  assert.deepEqual(response.body.role, {
    id: 'role-2',
    role_name: 'Project Manager',
    role_code: 'PROJECT_MANAGER',
    description: 'Oversees projects',
    is_active: false,
  });
});

test('defaults omitted role details to an empty description and active status', async (t) => {
  const originalCreateRole = rolesService.createAdminRole;
  let createArgs;
  rolesService.createAdminRole = async (...args) => {
    createArgs = args;
    return { id: 'role-3', role_name: args[0], role_code: args[1] };
  };
  t.after(() => {
    rolesService.createAdminRole = originalCreateRole;
  });

  const response = createResponse();
  await createAdminRole({ body: { role_name: 'Editor' } }, response);
  assert.deepEqual(createArgs, ['Editor', 'EDITOR', '', true]);
  assert.equal(response.statusCode, 201);
});

test('rejects invalid role detail types before persistence', async (t) => {
  const originalCreateRole = rolesService.createAdminRole;
  rolesService.createAdminRole = async () => {
    assert.fail('invalid role details must not be persisted');
  };
  t.after(() => {
    rolesService.createAdminRole = originalCreateRole;
  });

  for (const body of [
    { role_name: 'Editor', description: 5 },
    { role_name: 'Editor', is_active: 'false' },
  ]) {
    const response = createResponse();
    await createAdminRole({ body }, response);
    assert.equal(response.statusCode, 400);
  }
});

test('returns a conflict for a duplicate role', async (t) => {
  const originalCreateRole = rolesService.createAdminRole;
  rolesService.createAdminRole = async () => null;
  t.after(() => {
    rolesService.createAdminRole = originalCreateRole;
  });

  const response = createResponse();
  await createAdminRole({ body: { role_name: 'Editor' } }, response);
  assert.equal(response.statusCode, 409);
  assert.match(response.body.error, /already exists/i);
});

test('updates only editable fields and preserves the generated role code', async (t) => {
  const originalUpdateRole = rolesService.updateAdminRole;
  let updateArgs;
  rolesService.updateAdminRole = async (...args) => {
    updateArgs = args;
    return {
      id: args[0],
      role_name: args[1].role_name,
      role_code: 'STORED_CODE',
      description: args[1].description,
      is_active: args[1].is_active,
    };
  };
  t.after(() => {
    rolesService.updateAdminRole = originalUpdateRole;
  });

  const response = createResponse();
  await updateAdminRole(
    {
      params: { roleId: 'uuid-role-id' },
      body: {
        role_name: '  Project Lead ',
        description: '  Leads delivery ',
        is_active: false,
      },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(updateArgs, [
    'uuid-role-id',
    {
      role_name: 'Project Lead',
      description: 'Leads delivery',
      is_active: false,
    },
  ]);
  assert.equal(response.body.role.role_code, 'STORED_CODE');
});

test('rejects attempts to provide a role code during an update', async (t) => {
  const originalUpdateRole = rolesService.updateAdminRole;
  rolesService.updateAdminRole = async () => {
    assert.fail('invalid role updates must not be persisted');
  };
  t.after(() => {
    rolesService.updateAdminRole = originalUpdateRole;
  });

  const response = createResponse();
  await updateAdminRole(
    {
      params: { roleId: 'role-1' },
      body: { role_name: 'Editor', role_code: 'CHANGED' },
    },
    response
  );
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /cannot be changed/i);
});

test('returns not found and conflict responses for role updates', async (t) => {
  const originalUpdateRole = rolesService.updateAdminRole;
  t.after(() => {
    rolesService.updateAdminRole = originalUpdateRole;
  });

  rolesService.updateAdminRole = async () => null;
  const notFoundResponse = createResponse();
  await updateAdminRole(
    { params: { roleId: 'missing' }, body: { description: 'Updated' } },
    notFoundResponse
  );
  assert.equal(notFoundResponse.statusCode, 404);

  rolesService.updateAdminRole = async () => {
    const error = new Error('Duplicate role name');
    error.code = 'ROLE_NAME_CONFLICT';
    throw error;
  };
  const conflictResponse = createResponse();
  await updateAdminRole(
    { params: { roleId: 'role-1' }, body: { role_name: 'Editor' } },
    conflictResponse
  );
  assert.equal(conflictResponse.statusCode, 409);
  assert.match(conflictResponse.body.error, /already exists/i);

  rolesService.updateAdminRole = async () => {
    const error = new Error('Unique constraint violation');
    error.code = '23505';
    throw error;
  };
  const databaseConflictResponse = createResponse();
  await updateAdminRole(
    { params: { roleId: 'role-1' }, body: { role_name: 'Editor' } },
    databaseConflictResponse
  );
  assert.equal(databaseConflictResponse.statusCode, 409);
  assert.match(databaseConflictResponse.body.error, /already exists/i);
});
