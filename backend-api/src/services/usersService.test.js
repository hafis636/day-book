const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgres://localhost:5432/test';

const { pool } = require('../config/db');
const { registerUser } = require('./usersService');

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
            role: 'ENGINEER',
            role_name: 'Engineer',
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
    role: 'ENGINEER',
    role_name: 'Engineer',
  });
  assert.equal(calls.at(-1).sql, 'COMMIT');
});
