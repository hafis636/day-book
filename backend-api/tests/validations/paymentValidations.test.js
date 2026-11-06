const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePayment } = require('../../src/validations/paymentValidations');

const validPayment = {
  title: 'Materials payment',
  amount: '125.50',
  transaction_date: '2026-11-03',
  category: 'Materials',
  party_name: 'Supplier',
  payment_method: 'bank_transfer',
  reference_number: 'NEFT-123',
  status: 'partially_paid',
};

test('validates and normalizes a payment', () => {
  const result = validatePayment({
    ...validPayment,
    title: '  Materials payment  ',
    description: '  First installment  ',
  });

  assert.deepEqual(result, {
    value: {
      type: 'income',
      title: 'Materials payment',
      description: 'First installment',
      amount: 125.5,
      transaction_date: '2026-11-03',
      category: 'Materials',
      party_name: 'Supplier',
      payment_method: 'bank_transfer',
      reference_number: 'NEFT-123',
      status: 'partially_paid',
    },
  });
});

test('accepts expense transactions and rejects unsupported transaction types', () => {
  assert.equal(validatePayment({ ...validPayment, type: 'expense' }).value.type, 'expense');
  assert.match(
    validatePayment({ ...validPayment, type: 'refund' }).error,
    /valid transaction type/i
  );
  assert.match(
    validatePayment({ ...validPayment, type: null }).error,
    /valid transaction type/i
  );
});

test('requires a title, positive amount, supported method, and supported status', () => {
  for (const invalidPayment of [
    { ...validPayment, title: ' ' },
    { ...validPayment, amount: 0 },
    { ...validPayment, amount: 'not-a-number' },
    { ...validPayment, payment_method: 'wire' },
    { ...validPayment, status: 'cancelled' },
  ]) {
    assert.ok(validatePayment(invalidPayment).error);
  }
});

test('rejects invalid transaction and due dates and non-text optional fields', () => {
  assert.match(
    validatePayment({ ...validPayment, transaction_date: '2026-02-30' }).error,
    /valid transaction date/i
  );
  assert.match(
    validatePayment({
      ...validPayment,
      status: 'pending',
      transaction_date: '2026-02-30',
    }).error,
    /valid due date/i
  );
  assert.match(
    validatePayment({ ...validPayment, party_name: 42 }).error,
    /invalid party name/i
  );
});
