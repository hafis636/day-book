const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const plansService = require('../services/plansService');
const { selectPlan, updateAdminPlan } = require('./plansController');

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

const validPlan = {
  plan_name: 'Basic Plus',
  description: 'For getting started.',
  monthly_price: 249,
  yearly_price: 2499,
  is_active: true,
};

test('selects an active plan for the authenticated user', async (t) => {
  const originalSelect = plansService.selectCustomerPlan;
  let selectArgs;
  plansService.selectCustomerPlan = async (...args) => {
    selectArgs = args;
    return 'SILVER';
  };
  t.after(() => {
    plansService.selectCustomerPlan = originalSelect;
  });

  const response = createResponse();
  await selectPlan(
    { params: { planCode: 'silver' }, authenticatedUser: { id: 'user-id' } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(selectArgs, ['user-id', 'silver']);
  assert.deepEqual(response.body, { user_plan: 'SILVER' });
});

test('rejects invalid and unavailable plan selections', async (t) => {
  const originalSelect = plansService.selectCustomerPlan;
  plansService.selectCustomerPlan = async () => null;
  t.after(() => {
    plansService.selectCustomerPlan = originalSelect;
  });

  const invalidResponse = createResponse();
  await selectPlan({ params: { planCode: ' ' }, authenticatedUser: { id: 'user-id' } }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);

  const unavailableResponse = createResponse();
  await selectPlan(
    { params: { planCode: 'ADMIN' }, authenticatedUser: { id: 'user-id' } },
    unavailableResponse
  );
  assert.equal(unavailableResponse.statusCode, 404);
});

test('rejects attempts to modify the ADMIN plan before persistence', async (t) => {
  const originalUpdate = plansService.updateCustomerPlan;
  plansService.updateCustomerPlan = async () => {
    assert.fail('the admin plan must never reach persistence');
  };
  t.after(() => {
    plansService.updateCustomerPlan = originalUpdate;
  });

  const response = createResponse();
  await updateAdminPlan(
    { params: { planCode: 'admin' }, body: validPlan },
    response
  );

  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /admin plan cannot be modified/i);
});

test('validates input and persists an allowed customer plan update', async (t) => {
  const originalUpdate = plansService.updateCustomerPlan;
  let updateArgs;
  plansService.updateCustomerPlan = async (...args) => {
    updateArgs = args;
    return { plan_code: args[0], ...args[1] };
  };
  t.after(() => {
    plansService.updateCustomerPlan = originalUpdate;
  });

  const invalidResponse = createResponse();
  await updateAdminPlan(
    { params: { planCode: 'BASIC' }, body: { ...validPlan, is_active: 'yes' } },
    invalidResponse
  );
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(updateArgs, undefined);

  const response = createResponse();
  await updateAdminPlan(
    { params: { planCode: 'BASIC' }, body: validPlan },
    response
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(updateArgs, ['BASIC', validPlan]);
  assert.equal(response.body.plan.plan_code, 'BASIC');
});
