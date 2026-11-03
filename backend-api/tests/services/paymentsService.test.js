const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../../src/config/db');
const paymentsService = require('../../src/services/paymentsService');

test('inserts a transaction only when the authenticated user owns the project', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ id: 'transaction-1', created_by: 'user-1' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const payment = {
    title: 'Materials payment',
    description: null,
    amount: 125.5,
    transaction_date: null,
    category: null,
    party_name: null,
    payment_method: 'cash',
    reference_number: null,
    status: 'advance',
  };
  const result = await paymentsService.createProjectPaymentForUser(
    'user-1',
    'project-1',
    payment
  );

  assert.equal(result.created_by, 'user-1');
  assert.match(calls[0].sql, /INSERT INTO "daybook-dev-db"\.project_transactions/);
  assert.match(calls[0].sql, /SELECT p\.id, 'income'/);
  assert.match(calls[0].sql, /p\.engineer_id = \$1 AND p\.id = \$2/);
  assert.deepEqual(calls[0].params, [
    'user-1',
    'project-1',
    'Materials payment',
    null,
    125.5,
    null,
    null,
    null,
    'cash',
    null,
    'advance',
  ]);
});

test('lists transactions only for a project owned by the user', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return calls.length === 1
      ? { rows: [{ id: 'project-1' }] }
      : { rows: [{ id: 'transaction-1' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await paymentsService.getProjectPaymentsForUser('user-1', 'project-1');
  assert.deepEqual(result, [{ id: 'transaction-1' }]);
  assert.deepEqual(calls[0].params, ['user-1', 'project-1']);
  assert.deepEqual(calls[1].params, ['project-1']);
  assert.match(calls[1].sql, /FROM "daybook-dev-db"\.project_transactions/);
});
