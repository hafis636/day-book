import {
  PROJECT_EVENT_STATUSES,
  PROJECT_EVENT_TYPES,
  PROJECT_PHASES,
} from '../../constants'

const isValidDateValue = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const validateProjectEvent = (values, { minDate = '', maxDate = '' } = {}) => {
  const errors = {}
  const title = String(values.title || '').trim()
  const type = String(values.type || '')
  const phase = String(values.phase || '')
  const startDate = String(values.startDate || '')
  const endDate = String(values.endDate || '')
  const status = String(values.status || '')

  if (!title) errors.title = 'Enter an event title.'
  if (!PROJECT_EVENT_TYPES.includes(type)) errors.type = 'Select an event type.'
  if (!PROJECT_PHASES.includes(phase)) errors.phase = 'Select a project phase.'
  if (!PROJECT_EVENT_STATUSES.includes(status)) errors.status = 'Select an event status.'

  if (!startDate) {
    errors.startDate = 'Select a start date.'
  } else if (!isValidDateValue(startDate)) {
    errors.startDate = 'Enter a valid start date.'
  } else if (minDate && startDate < minDate) {
    errors.startDate = 'Start date must be on or after the project start date.'
  } else if (maxDate && startDate > maxDate) {
    errors.startDate = 'Start date must be on or before the project end date.'
  }

  if (!endDate) {
    errors.endDate = 'Select an end date.'
  } else if (!isValidDateValue(endDate)) {
    errors.endDate = 'Enter a valid end date.'
  } else if (minDate && endDate < minDate) {
    errors.endDate = 'End date must be on or after the project start date.'
  } else if (maxDate && endDate > maxDate) {
    errors.endDate = 'End date must be on or before the project end date.'
  } else if (
    isValidDateValue(startDate) &&
    endDate < startDate
  ) {
    errors.endDate = 'End date must be on or after the start date.'
  }

  return errors
}
