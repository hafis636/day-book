import React, { useState } from 'react'
import { useCreateProjectMutation } from '../../../redux/services/users/usersApi'

const projectTypes = [
  'Residential House',
  'Villa',
  'Apartment',
  'Commercial Building',
  'Office',
  'Shop',
  'Hospital',
  'School',
  'Industrial',
  'Other',
]

const projectStatuses = ['In discussion', 'Planning', 'Ongoing', 'Completed']
const maxImageSize = 5 * 1024 * 1024
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

const inputClasses =
  'mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'

const FieldLabel = ({ htmlFor, children, required = false, optional = false }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
    {children}
    {required && (
      <span aria-hidden="true" className="ml-1 text-blue-700">
        *
      </span>
    )}
    {optional && (
      <span className="ml-1.5 font-normal text-slate-500">(optional)</span>
    )}
  </label>
)

const AddProjects = () => {
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const [imageErrors, setImageErrors] = useState({})
  const [createProject, { isLoading }] = useCreateProjectMutation()
  const [imageInputVersions, setImageInputVersions] = useState({
    coverImage: 0,
    otherImages: 0,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity() || Object.keys(imageErrors).length) {
      form.reportValidity()
      return
    }

    setSubmissionMessage('')
    setSubmissionError('')
    const formValues = new FormData(form)
    const requestData = new FormData()
    const projectFields = {
      projectName: 'name',
      description: 'description',
      projectType: 'project_type',
      status: 'status',
      startDate: 'start_date',
      expectedCompletionDate: 'expected_completion_date',
      actualCompletionDate: 'actual_completion_date',
      address: 'address',
      projectInfo: 'project_info',
    }
    Object.entries(projectFields).forEach(([formField, apiField]) => {
      requestData.append(apiField, formValues.get(formField) || '')
    })

    const coverImage = form.elements.namedItem('coverImage').files[0]
    if (coverImage?.name) requestData.append('coverImage', coverImage)
    Array.from(form.elements.namedItem('otherImages').files).forEach((image) => {
      if (image?.name) requestData.append('otherImages', image)
    })

    try {
      await createProject(requestData).unwrap()
      setSubmissionMessage('Project created successfully.')
      form.reset()
      setImageErrors({})
      setImageInputVersions((versions) => ({
        coverImage: versions.coverImage + 1,
        otherImages: versions.otherImages + 1,
      }))
    } catch (error) {
      setSubmissionError(
        error?.data?.error || 'Unable to create the project. Please try again.'
      )
    }
  }

  const clearSubmissionMessage = () => {
    if (submissionMessage) setSubmissionMessage('')
    if (submissionError) setSubmissionError('')
  }

  const validateImages = (fieldName) => (event) => {
    clearSubmissionMessage()
    const selectedFiles = Array.from(event.target.files)
    const nonImageFile = selectedFiles.find((file) => !supportedImageTypes.has(file.type))
    const oversizedFile = selectedFiles.find((file) => file.size > maxImageSize)

    if (nonImageFile || oversizedFile) {
      event.target.value = ''
      setImageInputVersions((versions) => ({
        ...versions,
        [fieldName]: versions[fieldName] + 1,
      }))
      setImageErrors((errors) => ({
        ...errors,
        [fieldName]: nonImageFile
          ? `${nonImageFile.name} is not a supported image file. Choose an image file.`
          : `${oversizedFile.name} exceeds the 5 MB per-file limit. Remove it and choose a smaller image.`,
      }))
      return
    }

    setImageErrors((errors) => {
      const nextErrors = { ...errors }
      delete nextErrors[fieldName]
      return nextErrors
    })
  }

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <header className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
          Project setup
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Add Projects
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Add the key details for a project. Fields marked with an asterisk are
          required.
        </p>
      </header>

      <form className="space-y-7 px-6 py-7 sm:px-8" onSubmit={handleSubmit}>
        <fieldset className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Project details
          </legend>
          <div>
            <FieldLabel htmlFor="project-name" required>
              Project name
            </FieldLabel>
            <input
              className={inputClasses}
              id="project-name"
              name="projectName"
              type="text"
              autoComplete="off"
              placeholder="e.g. Riverside Apartment"
              required
              onChange={clearSubmissionMessage}
            />
          </div>
          <div>
            <FieldLabel htmlFor="description" optional>
              Description
            </FieldLabel>
            <textarea
              className={`${inputClasses} min-h-24 resize-y`}
              id="description"
              name="description"
              rows="3"
              placeholder="A short overview of the project"
              onChange={clearSubmissionMessage}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="project-type" required>
                Project type
              </FieldLabel>
              <select
                className={inputClasses}
                id="project-type"
                name="projectType"
                defaultValue=""
                required
                onChange={clearSubmissionMessage}
              >
                <option value="" disabled>
                  Choose a project type
                </option>
                {projectTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="status" optional>
                Status
              </FieldLabel>
              <select
                className={inputClasses}
                id="status"
                name="status"
                defaultValue=""
                onChange={clearSubmissionMessage}
              >
                <option value="">Select a status</option>
                {projectStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Project dates
            <span className="ml-1.5 font-normal text-slate-500">(optional)</span>
          </legend>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="start-date">Start date</FieldLabel>
              <input
                className={inputClasses}
                id="start-date"
                name="startDate"
                type="date"
                onChange={clearSubmissionMessage}
              />
            </div>
            <div>
              <FieldLabel htmlFor="expected-completion-date">
                Expected completion date
              </FieldLabel>
              <input
                className={inputClasses}
                id="expected-completion-date"
                name="expectedCompletionDate"
                type="date"
                onChange={clearSubmissionMessage}
              />
            </div>
            <div>
              <FieldLabel htmlFor="actual-completion-date">
                Actual completion date
              </FieldLabel>
              <input
                className={inputClasses}
                id="actual-completion-date"
                name="actualCompletionDate"
                type="date"
                onChange={clearSubmissionMessage}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Location and notes
          </legend>
          <div>
            <FieldLabel htmlFor="address" optional>
              Address
            </FieldLabel>
            <textarea
              className={`${inputClasses} min-h-20 resize-y`}
              id="address"
              name="address"
              rows="2"
              placeholder="Project site address"
              onChange={clearSubmissionMessage}
            />
          </div>

          <div>
            <FieldLabel htmlFor="project-info" optional>
              Project info
            </FieldLabel>
            <textarea
              className={`${inputClasses} min-h-24 resize-y`}
              id="project-info"
              name="projectInfo"
              rows="3"
              placeholder="Additional notes or information"
              onChange={clearSubmissionMessage}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Project images
            <span className="ml-1.5 font-normal text-slate-500">(optional)</span>
          </legend>
          <p className="mt-1 text-sm text-slate-600">
            Choose JPEG, PNG, GIF, or WebP images up to 5 MB each. You can add up to
            20 other images.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cover-image" optional>
                Cover image
              </FieldLabel>
              <input
                className={inputClasses}
                id="cover-image"
                key={imageInputVersions.coverImage}
                name="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                aria-invalid={Boolean(imageErrors.coverImage)}
                aria-describedby={imageErrors.coverImage ? 'cover-image-error' : undefined}
                onChange={validateImages('coverImage')}
              />
              {imageErrors.coverImage && (
                <p
                  className="mt-2 text-sm text-red-700"
                  id="cover-image-error"
                  role="alert"
                >
                  {imageErrors.coverImage}
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="other-images" optional>
                Other images
              </FieldLabel>
              <input
                className={inputClasses}
                id="other-images"
                key={imageInputVersions.otherImages}
                name="otherImages"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                aria-invalid={Boolean(imageErrors.otherImages)}
                aria-describedby={imageErrors.otherImages ? 'other-images-error' : undefined}
                onChange={validateImages('otherImages')}
              />
              {imageErrors.otherImages && (
                <p
                  className="mt-2 text-sm text-red-700"
                  id="other-images-error"
                  role="alert"
                >
                  {imageErrors.otherImages}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Project details and selected images will be saved when you create the project.
          </p>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 active:bg-blue-900"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Saving project...' : 'Create project'}
          </button>
        </div>

        {submissionError && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {submissionError}
          </p>
        )}
        {submissionMessage && (
          <p
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
            role="status"
          >
            {submissionMessage}
          </p>
        )}
      </form>
    </section>
  )
}

export default AddProjects
