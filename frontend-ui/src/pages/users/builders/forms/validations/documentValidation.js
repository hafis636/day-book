export const MAX_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024

const isValidDateValue = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const validateDocument = (values, files, isEditing) => {
  const errors = {}
  const title = String(values.title || '').trim()
  const category = String(values.category || '').trim()

  if (!title) errors.title = 'Enter a document title.'
  if (!category) errors.category = 'Select a document category.'
  if (values.date && !isValidDateValue(values.date)) {
    errors.date = 'Enter a valid document date.'
  }
  if (!isEditing && !files.length) {
    errors.files = 'Select at least one file to upload.'
  } else if (files.some((file) => file.size > MAX_DOCUMENT_FILE_SIZE)) {
    errors.files = 'Each document file must be 20 MB or smaller.'
  }

  return errors
}
