const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../config/db');
const rolesService = require('./rolesService');

test('lists roles with descriptions and active status', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return {
      rows: [{
        id: 'role-1',
        role_name: 'Engineers',
        role_code: 'ENGINEERS',
        description: 'Builds software',
        is_active: true,
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const roles = await rolesService.getAdminRoles();
  assert.equal(roles[0].role_name, 'Engineers');
  assert.equal(roles[0].description, 'Builds software');
  assert.equal(roles[0].is_active, true);
  assert.match(statement.sql, /SELECT id, role_name, role_code, description, is_active/);
  assert.doesNotMatch(statement.sql, /permission/i);
  assert.equal(statement.params, undefined);
});

test('inserts role details and avoids existing names or codes', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return {
      rows: [{
        id: 'role-2',
        role_name: params[0],
        role_code: params[1],
        description: params[2],
        is_active: params[3],
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const role = await rolesService.createAdminRole(
    'Project Manager',
    'PROJECT_MANAGER',
    'Oversees projects',
    false
  );
  assert.equal(role.id, 'role-2');
  assert.equal(role.description, 'Oversees projects');
  assert.equal(role.is_active, false);
  assert.match(
    statement.sql,
    /INSERT INTO "daybook-dev-db"\.roles \(role_name, role_code, description, is_active\)/
  );
  assert.match(statement.sql, /SELECT \$1::text, \$2::text, \$3::text, \$4::boolean/);
  assert.match(statement.sql, /WHERE NOT EXISTS/);
  assert.match(statement.sql, /RETURNING id, role_name, role_code, description, is_active/);
  assert.deepEqual(statement.params, [
    'Project Manager',
    'PROJECT_MANAGER',
    'Oversees projects',
    false,
  ]);
});

test('uses defaults when optional role details are omitted', async (t) => {
  const originalQuery = pool.query;
  let params;
  pool.query = async (sql, queryParams) => {
    params = queryParams;
    return { rows: [] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await rolesService.createAdminRole('Editor', 'EDITOR');
  assert.deepEqual(params, ['Editor', 'EDITOR', '', true]);
});

test('updates only mutable role columns using the database-native ID value', async (t) => {
  const originalQuery = pool.query;
  let statement;
  let params;
  pool.query = async (sql, queryParams) => {
    statement = sql;
    params = queryParams;
    return {
      rows: [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        role_name: 'Program Manager',
        role_code: 'STORED_CODE',
        description: 'Coordinates programs',
        is_active: false,
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const role = await rolesService.updateAdminRole(
    '550e8400-e29b-41d4-a716-446655440000',
    {
      role_name: 'Program Manager',
      description: 'Coordinates programs',
      is_active: false,
    }
  );

  assert.equal(role.role_code, 'STORED_CODE');
  assert.match(statement, /UPDATE "daybook-dev-db"\.roles AS target_role/);
  assert.match(statement, /SET role_name = \$2::text, description = \$3::text, is_active = \$4::boolean/);
  assert.match(statement, /target_role\.id = \$1/);
  assert.match(statement, /UPPER\(TRIM\(duplicate_role\.role_name::text\)\)/);
  assert.match(statement, /RETURNING id, role_name, role_code, description, is_active/);
  assert.doesNotMatch(statement, /SET[^]*role_code\s*=/i);
  assert.deepEqual(params, [
    '550e8400-e29b-41d4-a716-446655440000',
    'Program Manager',
    'Coordinates programs',
    false,
  ]);
});

test('updates only supplied fields and returns null for a missing ID', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await rolesService.updateAdminRole('non-integer-role-id', {
    description: 'Updated',
  });

  assert.equal(result, null);
  assert.match(calls[0].sql, /SET description = \$2::text/);
  assert.doesNotMatch(calls[0].sql, /NOT EXISTS/);
  assert.deepEqual(calls[0].params, ['non-integer-role-id', 'Updated']);
  assert.equal(calls.length, 2);
  assert.match(calls[1].sql, /WHERE id = \$1/);
  assert.deepEqual(calls[1].params, ['non-integer-role-id']);
});

test('reports a duplicate case-insensitive role name separately from a missing role', async (t) => {
  const originalQuery = pool.query;
  let callCount = 0;
  pool.query = async () => {
    callCount += 1;
    return callCount === 1 ? { rows: [] } : { rows: [{ id: 'role-1' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await assert.rejects(
    rolesService.updateAdminRole('role-1', { role_name: 'editor' }),
    { code: 'ROLE_NAME_CONFLICT' }
  );
  assert.equal(callCount, 2);
});
