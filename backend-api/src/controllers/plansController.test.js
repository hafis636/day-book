const test = require('node:test');
const assert = require('node:assert/strict');
const plansService = require('../services/plansService');
const { selectPlan } = require('./plansController');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('updates the authenticated user to the selected plan', async (t) => {
  const updateUserPlan = t.mock.method(
    plansService,
    'updateUserPlan',
    async () => ({ user_plan: 'SILVER' })
  );
  const response = createResponse();

  await selectPlan(
    {
      authenticatedUser: { id: 42 },
      params: { planCode: 'SILVER' },
    },
    response
  );

  assert.deepEqual(updateUserPlan.mock.calls[0].arguments, [42, 'SILVER']);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { user_plan: 'SILVER' });
});

test('returns not found when the selected plan is unavailable', async (t) => {
  t.mock.method(plansService, 'updateUserPlan', async () => null);
  const response = createResponse();

  await selectPlan(
    {
      authenticatedUser: { id: 42 },
      params: { planCode: 'INACTIVE' },
    },
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { error: 'Active plan not found' });
});
