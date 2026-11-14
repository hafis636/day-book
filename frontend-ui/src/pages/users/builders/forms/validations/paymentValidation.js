const isValidDateValue = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const validatePayment = (values) => {
  const errors = {}
  const title = String(values.title || '').trim()
  const amount = String(values.amount ?? '').trim()
  const partyName = String(values.party_name || '').trim()
  const status = String(values.status || '')
  const requiresPaymentMethod = !['pending', 'overdue'].includes(status)
  const parsedAmount = Number(amount)

  if (!title) errors.title = 'Enter a title.'
  else if (title.length > 255) errors.title = 'Title must be 255 characters or fewer.'

  if (!amount) {
    errors.amount = 'Enter an amount.'
  } else if (
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(amount) ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount < 0.01 ||
    Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) >= 1e-8
  ) {
    errors.amount = 'Enter an amount of at least 0.01 with no more than two decimal places.'
  }

  if (!status) errors.status = 'Select a status.'
  if (requiresPaymentMethod && !String(values.payment_method || '').trim()) {
    errors.payment_method = 'Select a payment method.'
  }
  if (values.transaction_date && !isValidDateValue(values.transaction_date)) {
    errors.transaction_date = 'Enter a valid date.'
  }

  if (!partyName) errors.party_name = 'Enter a party name.'
  else if (partyName.length > 255) {
    errors.party_name = 'Party name must be 255 characters or fewer.'
  }
  if (String(values.category || '').length > 100) {
    errors.category = 'Category must be 100 characters or fewer.'
  }
  if (String(values.reference_number || '').length > 255) {
    errors.reference_number = 'Reference number must be 255 characters or fewer.'
  }
  if (String(values.description || '').length > 5000) {
    errors.description = 'Description must be 5000 characters or fewer.'
  }

  return errors
}
