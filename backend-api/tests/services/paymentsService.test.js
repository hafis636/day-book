const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../../src/config/db');
const paymentsService = require('../../src/services/paymentsService');

test('stores a pending payment due date only when the user owns the project', async (t) => {
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
    transaction_date: '2026-11-10',
    category: null,
    party_name: 'Supplier',
    payment_method: null,
    reference_number: null,
    status: 'pending',
  };
  const result = await paymentsService.createProjectPaymentForUser(
    'user-1',
    'project-1',
    payment
  );

  assert.equal(result.created_by, 'user-1');
  assert.match(calls[0].sql, /INSERT INTO "daybook-dev-db"\.project_transactions/);
  assert.match(calls[0].sql, /SELECT p\.id, \$3/);
  assert.match(calls[0].sql, /p\.engineer_id = \$1 AND p\.id = \$2/);
  assert.deepEqual(calls[0].params, [
    'user-1',
    'project-1',
    'income',
    'Materials payment',
    null,
    125.5,
    '2026-11-10',
    null,
    'Supplier',
    null,
    null,
    'pending',
  ]);
});

test('stores an expense transaction using the existing project transaction table', async (t) => {
  const originalQuery = pool.query;
  let call;
  pool.query = async (sql, params) => {
    call = { sql, params };
    return { rows: [{ id: 'expense-1', type: params[2] }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await paymentsService.createProjectPaymentForUser(
    'user-1',
    'project-1',
    {
      type: 'expense',
      title: 'Materials purchase',
      description: null,
      amount: 125.5,
      transaction_date: '2026-11-06',
      category: 'Materials',
      party_name: 'Supplier',
      payment_method: 'cash',
      reference_number: null,
      status: 'completed',
    }
  );

  assert.equal(result.type, 'expense');
  assert.match(call.sql, /INSERT INTO "daybook-dev-db"\.project_transactions/);
  assert.deepEqual(call.params.slice(0, 4), [
    'user-1',
    'project-1',
    'expense',
    'Materials purchase',
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

test('updates only the selected payment on a project owned by the user', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ id: 'payment-1', party_name: 'Supplier' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const payment = {
    title: 'Updated payment',
    description: null,
    amount: 300,
    transaction_date: '2026-11-10',
    category: null,
    party_name: 'Supplier',
    payment_method: null,
    reference_number: null,
    status: 'pending',
  };
  const result = await paymentsService.updateProjectPaymentForUser(
    'user-1',
    'project-1',
    'payment-1',
    payment
  );

  assert.equal(result.party_name, 'Supplier');
  assert.match(calls[0].sql, /UPDATE "daybook-dev-db"\.project_transactions AS t/);
  assert.match(calls[0].sql, /p\.engineer_id = \$1 AND p\.id = \$2 AND t\.id = \$3/);
  assert.deepEqual(calls[0].params, [
    'user-1',
    'project-1',
    'payment-1',
    'Updated payment',
    null,
    300,
    '2026-11-10',
    null,
    'Supplier',
    null,
    null,
    'pending',
  ]);
});

test('deletes only the selected payment on a project owned by the user', async (t) => {
  const originalQuery = pool.query;
  let call;
  pool.query = async (sql, params) => {
    call = { sql, params };
    return { rows: [{ id: 'payment-1' }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await paymentsService.deleteProjectPaymentForUser(
    'user-1',
    'project-1',
    'payment-1'
  );

  assert.deepEqual(result, { id: 'payment-1' });
  assert.match(call.sql, /DELETE FROM "daybook-dev-db"\.project_transactions AS t/);
  assert.match(call.sql, /p\.engineer_id = \$1 AND p\.id = \$2 AND t\.id = \$3/);
  assert.deepEqual(call.params, ['user-1', 'project-1', 'payment-1']);
});
