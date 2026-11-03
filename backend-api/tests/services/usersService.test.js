const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.DATABASE_URL ||= 'postgres://localhost:5432/test';

const { pool } = require('../../src/config/db');
const { authenticateUser, registerUser, getRoles, roleIdExists } = require('../../src/services/usersService');

test('authenticates with the user role and its active status', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return {
      rows: [{
        id: 'user-id',
        password_hash: await bcrypt.hash('Password1!', 1),
        role: 'ENGINEERS',
        role_is_active: false,
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const user = await authenticateUser(' ADA@EXAMPLE.COM ', 'Password1!');

  assert.deepEqual(user, {
    id: 'user-id',
    role: 'ENGINEERS',
    roleIsActive: false,
  });
  assert.match(statement.sql, /INNER JOIN "daybook-dev-db"\.roles AS r ON r\.id = u\.role_id/);
  assert.match(statement.sql, /r\.is_active AS role_is_active/);
  assert.deepEqual(statement.params, ['ada@example.com']);
});

test('lists only active roles for registration', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return {
      rows: [{ id: 'active-role', role_name: 'Engineers', role_code: 'ENGINEERS' }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const roles = await getRoles();

  assert.deepEqual(roles, [
    { id: 'active-role', role_name: 'Engineers', role_code: 'ENGINEERS' },
  ]);
  assert.match(statement.sql, /WHERE is_active = TRUE/);
  assert.deepEqual(statement.params, []);
});

test('rejects inactive roles during registration role validation', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return { rows: [{ exists: false }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  assert.equal(await roleIdExists('inactive-role'), false);
  assert.match(statement.sql, /id = \$1 AND is_active = TRUE/);
  assert.deepEqual(statement.params, ['inactive-role']);
});

test('assigns ADMIN or BASIC plan according to the registered role code', async () => {
  const calls = [];
  pool.connect = async () => ({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('RETURNING id')) return { rows: [{ id: 'user-id' }] };
      if (sql.includes('SELECT u.id')) {
        return {
          rows: [{
            id: 'user-id',
            role: 'ENGINEERS',
            role_name: 'Engineers',
          }],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  });

  const result = await registerUser({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    mobile: '1234567890',
    password: 'Password1!',
    roleId: '550e8400-e29b-41d4-a716-446655440000',
  });

  const planUpdate = calls.find(({ sql }) => sql.includes('SET user_plan'));
  assert.match(planUpdate.sql, /WHEN UPPER\(r\.role_code\) = 'ADMIN' THEN 'ADMIN'/);
  assert.match(planUpdate.sql, /ELSE 'BASIC'/);
  assert.deepEqual(planUpdate.params, ['user-id']);
  assert.deepEqual(result, {
    id: 'user-id',
    role: 'ENGINEERS',
    role_name: 'Engineers',
  });
  assert.equal(calls.at(-1).sql, 'COMMIT');
});
