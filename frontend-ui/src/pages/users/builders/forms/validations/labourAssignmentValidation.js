const isValidDateValue = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const validateLabourAssignment = (
  values,
  isApplicationUserRequested,
  projectStartDate,
  projectExpectedCompletionDate
) => {
  const errors = {}
  const addError = (field, message) => {
    errors[field] = [...(errors[field] || []), message]
  }
  const labourName = values.labourName.trim()
  const mobileNumber = values.mobileNumber.trim()
  const email = values.email.trim()
  const startDate = values.startDate
  const expectedEndDate = values.expectedEndDate
  const rate = values.rate.trim()
  const estimatedQuantity = values.estimatedQuantity.trim()

  if (!labourName) addError('labourName', 'Enter a labour name.')

  if (!mobileNumber) {
    addError('mobileNumber', 'Enter a mobile number.')
  } else if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    addError('mobileNumber', 'Enter a valid 10-digit mobile number.')
  }

  if (isApplicationUserRequested && !email) {
    addError('email', 'Enter an email address to add this person as an application user.')
  } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError('email', 'Enter a valid email address.')
  }

  if (!startDate) {
    addError('startDate', 'Select a start date.')
  } else if (!isValidDateValue(startDate)) {
    addError('startDate', 'Enter a valid start date.')
  } else if (projectStartDate && startDate > projectStartDate) {
    addError('startDate', 'Start date must be on or before the project start date.')
  }

  if (expectedEndDate && !isValidDateValue(expectedEndDate)) {
    addError('expectedEndDate', 'Enter a valid expected end date.')
  } else if (
    expectedEndDate &&
    isValidDateValue(expectedEndDate) &&
    isValidDateValue(startDate) &&
    expectedEndDate < startDate
  ) {
    addError(
      'expectedEndDate',
      'Expected end date must be on or after the start date.'
    )
  }
  if (
    expectedEndDate &&
    isValidDateValue(expectedEndDate) &&
    projectExpectedCompletionDate &&
    expectedEndDate > projectExpectedCompletionDate
  ) {
    addError(
      'expectedEndDate',
      'Expected end date must be on or before the project expected completion date.'
    )
  }

  if (!rate) {
    addError('rate', 'Enter a rate.')
  } else if (!Number.isFinite(Number(rate)) || Number(rate) < 0) {
    addError('rate', 'Enter a rate greater than or equal to zero.')
  }

  if (!values.rateUnit) addError('rateUnit', 'Select a rate unit.')

  if (!estimatedQuantity) {
    addError('estimatedQuantity', 'Enter an estimated quantity.')
  } else if (
    !Number.isFinite(Number(estimatedQuantity)) ||
    Number(estimatedQuantity) <= 0
  ) {
    addError('estimatedQuantity', 'Enter a quantity greater than zero.')
  }

  return errors
}
