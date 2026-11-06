const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePayment } = require('./paymentValidations');

const payment = {
  title: 'Milestone payment',
  amount: 100,
  party_name: 'Supplier',
  payment_method: 'cash',
  transaction_date: '2026-11-04',
  reference_number: 'REF-123',
  status: 'advance',
};

test('allows pending and overdue payments without method, date, or reference', () => {
  for (const status of ['pending', 'overdue']) {
    const result = validatePayment({
      ...payment,
      status,
      payment_method: null,
      transaction_date: null,
      reference_number: null,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.value.status, status);
    assert.equal(result.value.payment_method, null);
    assert.equal(result.value.transaction_date, null);
    assert.equal(result.value.reference_number, null);
  }
});

test('normalizes the pending status before checking whether a payment method is needed', () => {
  const result = validatePayment({
    ...payment,
    status: ' Pending ',
    payment_method: null,
    transaction_date: null,
    reference_number: null,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.status, 'pending');
  assert.equal(result.value.payment_method, null);
});

test('preserves a valid due date and clears method and reference on pending and overdue payments', () => {
  for (const status of ['pending', 'overdue']) {
    const result = validatePayment({
      ...payment,
      status,
      transaction_date: '2026-11-10',
    });

    assert.equal(result.error, undefined);
    assert.equal(result.value.payment_method, null);
    assert.equal(result.value.transaction_date, '2026-11-10');
    assert.equal(result.value.reference_number, null);
  }
});

test('rejects invalid due dates for pending and overdue payments', () => {
  for (const status of ['pending', 'overdue']) {
    const result = validatePayment({
      ...payment,
      status,
      transaction_date: '2026-02-30',
    });

    assert.match(result.error, /valid due date/i);
  }
});

test('continues requiring a valid payment method for paid statuses', () => {
  const result = validatePayment({
    ...payment,
    status: 'completed',
    payment_method: null,
  });
  assert.match(result.error, /payment method is required/i);
});

test('requires a non-blank party name', () => {
  for (const party_name of [undefined, null, '', '   ']) {
    assert.equal(
      validatePayment({ ...payment, party_name }).error,
      'Party name is required'
    );
  }
});
