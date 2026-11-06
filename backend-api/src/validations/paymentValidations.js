const PAYMENT_METHODS = new Set([
  'cash',
  'bank_transfer',
  'upi',
  'cheque',
  'card',
  'other',
]);

const PAYMENT_STATUSES = new Set([
  'pending',
  'overdue',
  'advance',
  'partially_paid',
  'completed',
])

const TRANSACTION_TYPES = new Set(['income', 'expense'])

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const optionalText = (payment, field, maxLength) => {
  const value = payment[field];
  if (value !== undefined && value !== null && typeof value !== 'string') {
    return { error: `Invalid ${field.replaceAll('_', ' ')}` };
  }
  const normalized = typeof value === 'string' ? value.trim() || null : null;
  if (normalized && normalized.length > maxLength) {
    return { error: `${field.replaceAll('_', ' ')} cannot exceed ${maxLength} characters` };
  }
  return { value: normalized };
};

const validatePayment = (body) => {
  const payment = body || {};
  const type =
    payment.type === undefined
      ? 'income'
      : typeof payment.type === 'string'
        ? payment.type.trim().toLowerCase()
        : '';
  const status =
    typeof payment.status === 'string' ? payment.status.trim().toLowerCase() : '';
  if (!TRANSACTION_TYPES.has(type)) {
    return { error: 'A valid transaction type is required' };
  }

  const title = typeof payment.title === 'string' ? payment.title.trim() : '';
  if (!title) return { error: 'Payment title is required' };
  if (title.length > 255) {
    return { error: 'Payment title cannot exceed 255 characters' };
  }

  const amount =
    typeof payment.amount === 'number' || typeof payment.amount === 'string'
      ? Number(payment.amount)
      : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Payment amount must be greater than 0' };
  }

  if (!PAYMENT_STATUSES.has(status)) {
    return { error: 'A valid payment status is required' };
  }

  const isPendingOrOverdue = ['pending', 'overdue'].includes(status);
  if (!isPendingOrOverdue && !PAYMENT_METHODS.has(payment.payment_method)) {
    return { error: 'A valid payment method is required' };
  }

  const transactionDate = payment.transaction_date || null;
  if (
    transactionDate !== null &&
    (typeof transactionDate !== 'string' || !isValidDate(transactionDate))
  ) {
    return {
      error: `Enter a valid ${isPendingOrOverdue ? 'due' : 'transaction'} date`,
    };
  }

  const description = optionalText(payment, 'description', 5000);
  if (description.error) return description;
  const category = optionalText(payment, 'category', 100);
  if (category.error) return category;
  const partyName = optionalText(payment, 'party_name', 255);
  if (partyName.error) return partyName;
  if (!partyName.value) return { error: 'Party name is required' };
  const referenceNumber = isPendingOrOverdue
    ? { value: null }
    : optionalText(payment, 'reference_number', 255);
  if (referenceNumber.error) return referenceNumber;

  return {
    value: {
      type,
      title,
      description: description.value,
      amount,
      transaction_date: transactionDate,
      category: category.value,
      party_name: partyName.value,
      payment_method: isPendingOrOverdue ? null : payment.payment_method,
      reference_number: referenceNumber.value,
      status,
    },
  };
};

module.exports = { validatePayment };
