const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePlanUpdate } = require('../../src/validations/planValidations');

const validPlan = {
  plan_name: 'Basic Plus',
  description: 'An updated plan.',
  monthly_price: 199.99,
  yearly_price: 1999,
  is_active: false,
};

test('accepts a complete valid plan update', () => {
  assert.equal(validatePlanUpdate(validPlan), null);
});

test('rejects invalid fields and attempts to edit plan identity', () => {
  assert.match(validatePlanUpdate({ ...validPlan, monthly_price: -1 }), /Monthly price/);
  assert.match(validatePlanUpdate({ ...validPlan, yearly_price: 100.001 }), /Yearly price/);
  assert.match(validatePlanUpdate({ ...validPlan, is_active: 'false' }), /Active status/);
  assert.match(validatePlanUpdate({ ...validPlan, plan_code: 'ADMIN' }), /only name/i);
  assert.match(validatePlanUpdate({ ...validPlan, plan_name: '   ' }), /Plan name/);
});
