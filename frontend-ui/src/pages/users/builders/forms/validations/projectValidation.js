export const MAX_PROJECT_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_OTHER_PROJECT_IMAGES = 10
export const SUPPORTED_PROJECT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const isValidDateValue = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const validateProject = (values) => {
  const errors = {}
  const projectName = String(values.projectName || '').trim()
  const projectType = String(values.projectType || '').trim()

  if (!projectName) errors.projectName = 'Enter a project name.'
  if (!projectType) errors.projectType = 'Select a project type.'

  const dateFields = ['startDate', 'expectedCompletionDate', 'actualCompletionDate']
  dateFields.forEach((field) => {
    if (values[field] && !isValidDateValue(values[field])) {
      errors[field] = 'Enter a valid date.'
    }
  })

  return errors
}

export const validateProjectImages = ({
  fieldName,
  selectedFiles,
  otherImageCount,
}) => {
  const unsupportedFile = selectedFiles.find(
    (file) => !SUPPORTED_PROJECT_IMAGE_TYPES.has(file.type)
  )
  const oversizedFile = selectedFiles.find(
    (file) => file.size > MAX_PROJECT_IMAGE_SIZE
  )
  const exceedsImageLimit =
    fieldName === 'otherImages' &&
    otherImageCount + selectedFiles.length > MAX_OTHER_PROJECT_IMAGES

  if (unsupportedFile) {
    return `${unsupportedFile.name} is not a supported image file. Choose an image file.`
  }
  if (oversizedFile) {
    return `${oversizedFile.name} exceeds the 5 MB per-file limit. Remove it and choose a smaller image.`
  }
  if (exceedsImageLimit) {
    return 'A maximum of 10 other images can be added to a project.'
  }
  return ''
}
