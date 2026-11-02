const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../config/db');
const { getCurrentSession } = require('./sessionController');

test('returns only the public session fields and calculates every assigned permission', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return {
      rows: [{
        id: 'user-1',
        first_name: 'Taylor',
        last_name: 'Day',
        email: 'taylor@example.com',
        username: 'taylor',
        user_plan: 'BASIC',
        user_plan_name: 'Basic',
        role: 'ENGINEERS',
        role_name: 'Engineers',
        permissions: {
          ADD_PROJECTS: true,
          EDIT_PROJECTS: false,
        },
        expires_at: new Date('2026-11-03T00:00:00Z'),
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const response = {
    cookie() {},
    clearCookie() {},
    json(payload) {
      this.payload = payload;
      return payload;
    },
    status() {
      return this;
    },
  };
  await getCurrentSession({
    headers: { cookie: 'daybook_session=session-token' },
    get() {},
    secure: false,
  }, response);

  assert.deepEqual(response.payload, {
    user: {
      Email: 'taylor@example.com',
      first_name: 'Taylor',
      last_name: 'Day',
      role: 'Engineers',
      plan: 'Basic',
      permissions: {
        ADD_PROJECTS: true,
        EDIT_PROJECTS: false,
      },
    },
  });
  assert.match(statement.sql, /json_object_agg/);
  assert.match(statement.sql, /permission\.is_active/);
  assert.match(statement.sql, /assigned_role\.role_id = r\.id::text/);
  assert.match(statement.sql, /assigned_plan\.plan_code = u\.user_plan/);
  assert.equal(statement.params.length, 1);
});
