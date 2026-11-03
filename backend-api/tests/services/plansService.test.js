const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../../src/config/db');
const plansService = require('../../src/services/plansService');

test('lists active customer plans while excluding the ADMIN plan identity', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return { rows: [{ plan_code: 'BASIC', is_active: true }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const plans = await plansService.getActivePlans();
  assert.deepEqual(plans, [{ plan_code: 'BASIC', is_active: true }]);
  assert.match(statement.sql, /WHERE is_active = TRUE\s+AND UPPER\(TRIM\(plan_code\)\) <> 'ADMIN'/);
  assert.match(statement.sql, /ORDER BY monthly_price ASC, plan_name ASC/);
  assert.deepEqual(statement.params, undefined);
});

test('lists all customer plans while excluding the ADMIN plan identity', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return { rows: [{ plan_code: 'BASIC', is_active: false }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const plans = await plansService.getAllCustomerPlans();
  assert.deepEqual(plans, [{ plan_code: 'BASIC', is_active: false }]);
  assert.match(statement.sql, /UPPER\(TRIM\(plan_code\)\) <> 'ADMIN'/);
  assert.match(statement.sql, /ORDER BY monthly_price ASC, plan_name ASC/);
  assert.deepEqual(statement.params, undefined);
});

test('selects only an active non-admin plan for the specified user', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return { rows: [{ user_plan: 'SILVER' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const userPlan = await plansService.selectCustomerPlan('user-id', 'silver');
  assert.equal(userPlan, 'SILVER');
  assert.match(statement.sql, /SET user_plan = p\.plan_code/);
  assert.match(statement.sql, /UPPER\(TRIM\(p\.plan_code\)\) <> 'ADMIN'/);
  assert.match(statement.sql, /p\.is_active = TRUE/);
  assert.deepEqual(statement.params, ['user-id', 'silver']);
});

test('updates only editable fields and excludes ADMIN in the parameterized query', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return { rows: [{ plan_code: 'BASIC', plan_name: 'Basic Plus' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const plan = {
    plan_name: ' Basic Plus ',
    description: 'Updated description',
    monthly_price: 249,
    yearly_price: 2499,
    is_active: false,
  };
  const updated = await plansService.updateCustomerPlan('BASIC', plan);

  assert.equal(updated.plan_name, 'Basic Plus');
  assert.match(statement.sql, /UPPER\(TRIM\(plan_code\)\) <> 'ADMIN'/);
  assert.match(statement.sql, /RETURNING plan_code/);
  assert.deepEqual(statement.params, [
    'BASIC',
    'Basic Plus',
    'Updated description',
    249,
    2499,
    false,
  ]);
  assert.doesNotMatch(statement.sql, /plan_code\s*=/i);
});
