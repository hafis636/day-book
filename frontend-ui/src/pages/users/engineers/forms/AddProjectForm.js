import React, { useEffect, useRef, useState } from 'react'
import { useCreateProjectMutation } from '../../../../redux/services/users/usersApi'
import { ProjectBackLink } from '../ProjectWorkspaceLayout'
import { PROJECT_STATUSES, PROJECT_TYPES } from '../constants'

const capitalizeWords = (text) =>
  text.replace(/\b\w/g, (character) => character.toUpperCase())
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
      <span className="ml-1.5 font-normal text-slate-500">(Optional)</span>
    )}
  </label>
)

const ProjectInfoSection = ({ title, fields }) => {
  const availableFields = fields.filter(
    ({ value }) => value !== null && value !== undefined && String(value).trim()
  )

  if (!availableFields.length) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {availableFields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-sm font-semibold text-slate-700">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const ImageThumbnail = ({ src, alt, removeLabel, onRemove }) => (
  <div className="relative h-20 w-full overflow-hidden rounded-lg">
    <img src={src} alt={alt} className="h-full w-full object-cover" />
    {onRemove && (
      <button
        type="button"
        title="Remove"
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-950/75 text-sm leading-none text-white shadow transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <span aria-hidden="true">×</span>
      </button>
    )}
  </div>
)

const TemporaryImageThumbnail = ({ file, onRemove }) => (
  <ImageThumbnail
    src={file.previewUrl}
    alt={file.file.name}
    removeLabel={`Remove ${file.file.name}`}
    onRemove={onRemove}
  />
)

const AddProjectForm = ({
  project,
  existingImages = [],
  onSubmitProject,
  isSaving: isSavingProp,
  readOnly = false,
}) => {
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const [imageErrors, setImageErrors] = useState({})
  const [createProject, { isLoading }] = useCreateProjectMutation()
  const [imageInputVersions, setImageInputVersions] = useState({
    coverImage: 0,
    otherImages: 0,
  })
  const [removedImageUrls, setRemovedImageUrls] = useState([])
  const [coverFile, setCoverFile] = useState(null)
  const [otherFiles, setOtherFiles] = useState([])
  const previewUrls = useRef(new Set())
  const isEditing = Boolean(project)
  const isSaving = isSavingProp ?? isLoading
  const currentCover = existingImages.find((image) => image.is_cover)
  const otherExistingImages = existingImages.filter((image) => !image.is_cover)

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    []
  )

  const createFilePreview = (file) => {
    const previewUrl = URL.createObjectURL(file)
    previewUrls.current.add(previewUrl)
    return { file, previewUrl }
  }

  const revokeFilePreview = (preview) => {
    if (!preview) return
    URL.revokeObjectURL(preview.previewUrl)
    previewUrls.current.delete(preview.previewUrl)
  }

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

    if (coverFile?.file.name) requestData.append('coverImage', coverFile.file)
    otherFiles.forEach((image) => requestData.append('otherImages', image.file))
    if (removedImageUrls.length) {
      requestData.append('removeImageUrls', JSON.stringify(removedImageUrls))
    }

    try {
      if (onSubmitProject) {
        await onSubmitProject(requestData)
      } else {
        await createProject(requestData).unwrap()
      }
      if (isEditing) {
        return
      } else {
        setSubmissionMessage('Project created successfully.')
        form.reset()
        setImageErrors({})
        revokeFilePreview(coverFile)
        otherFiles.forEach(revokeFilePreview)
        setCoverFile(null)
        setOtherFiles([])
        setRemovedImageUrls([])
        setImageInputVersions((versions) => ({
          coverImage: versions.coverImage + 1,
          otherImages: versions.otherImages + 1,
        }))
      }
    } catch (error) {
      setSubmissionError(
        error?.data?.error ||
          `Unable to ${isEditing ? 'update' : 'create'} the project. Please try again.`
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
    const remainingOtherImages = otherExistingImages.filter(
      (image) => !removedImageUrls.includes(image.image_url)
    ).length
    const exceedsOtherImageLimit =
      fieldName === 'otherImages' &&
      remainingOtherImages + otherFiles.length + selectedFiles.length > 10

    if (nonImageFile || oversizedFile || exceedsOtherImageLimit) {
      event.target.value = ''
      setImageInputVersions((versions) => ({
        ...versions,
        [fieldName]: versions[fieldName] + 1,
      }))
      setImageErrors((errors) => ({
        ...errors,
        [fieldName]: nonImageFile
          ? `${nonImageFile.name} is not a supported image file. Choose an image file.`
          : oversizedFile
            ? `${oversizedFile.name} exceeds the 5 MB per-file limit. Remove it and choose a smaller image.`
            : 'A maximum of 10 other images can be added to a project.',
      }))
      return
    }

    if (fieldName === 'coverImage') {
      revokeFilePreview(coverFile)
      setCoverFile(selectedFiles[0] ? createFilePreview(selectedFiles[0]) : null)
    }
    if (fieldName === 'otherImages') {
      setOtherFiles((files) => [...files, ...selectedFiles.map(createFilePreview)])
      setImageInputVersions((versions) => ({
        ...versions,
        otherImages: versions.otherImages + 1,
      }))
    }
    setImageErrors((errors) => {
      const nextErrors = { ...errors }
      delete nextErrors[fieldName]
      return nextErrors
    })
  }

  const removeExistingImage = (imageUrl) => {
    setRemovedImageUrls((urls) => [...urls, imageUrl])
  }

  const removeCoverFile = () => {
    revokeFilePreview(coverFile)
    setCoverFile(null)
    setImageInputVersions((versions) => ({
      ...versions,
      coverImage: versions.coverImage + 1,
    }))
  }

  const removeOtherFile = (index) => {
    const removedFile = otherFiles[index]
    revokeFilePreview(removedFile)
    setOtherFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
    setImageInputVersions((versions) => ({
      ...versions,
      otherImages: versions.otherImages + 1,
    }))
  }
  const remainingOtherImageSlots =
    10 -
    otherExistingImages.filter((image) => !removedImageUrls.includes(image.image_url))
      .length -
    otherFiles.length

  const projectImages = existingImages.filter((image) => image.image_url)
  const header = (
    <header className="border-b border-slate-200 px-6 py-6 sm:px-8">
      {isEditing && <ProjectBackLink />}
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
        {readOnly ? 'Project Overview' : 'Project Setup'}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {readOnly ? project.name : isEditing ? 'Edit Project' : 'Add Project'}
      </h1>
      {!readOnly && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Add the key details for a project. Fields marked with an asterisk are required.
        </p>
      )}
    </header>
  )

  if (readOnly) {
    return (
      <section className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {header}
        <div className="space-y-6 px-6 py-7 sm:px-8">
          <ProjectInfoSection
            title="Project Details"
            fields={[
              { label: 'Description', value: project.description },
              { label: 'Project Type', value: project.project_type },
              { label: 'Status', value: project.status },
            ]}
          />
          <ProjectInfoSection
            title="Project Dates"
            fields={[
              { label: 'Start Date', value: project.start_date },
              {
                label: 'Expected Completion Date',
                value: project.expected_completion_date,
              },
              {
                label: 'Actual Completion Date',
                value: project.actual_completion_date,
              },
            ]}
          />
          <ProjectInfoSection
            title="Location And Notes"
            fields={[
              { label: 'Address', value: project.address },
              { label: 'Project Info', value: project.project_info },
            ]}
          />
          {projectImages.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <h2 className="text-sm font-semibold text-slate-800">Project Images</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {projectImages.map((image, index) => {
                  const imageTitle =
                    image.title || (image.is_cover ? 'Cover Image' : `Project image ${index + 1}`)
                  return (
                    <li key={image.image_url}>
                      <figure>
                        <img
                          src={image.image_url}
                          alt={imageTitle}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                        {image.title && (
                          <figcaption className="mt-2 break-words text-sm text-slate-600">
                            {image.title}
                          </figcaption>
                        )}
                      </figure>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {header}

      <form className="space-y-7 px-6 py-7 sm:px-8" onSubmit={handleSubmit}>
        <fieldset className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Project Details
          </legend>
          <div>
            <FieldLabel htmlFor="project-name" required>
              Project Name
            </FieldLabel>
            <input
              className={inputClasses}
              id="project-name"
              name="projectName"
              type="text"
              autoComplete="off"
              placeholder="e.g. Riverside Apartment"
              defaultValue={project?.name || ''}
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
              defaultValue={project?.description || ''}
              onChange={clearSubmissionMessage}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="project-type" required>
                Project Type
              </FieldLabel>
              <select
                className={inputClasses}
                id="project-type"
                name="projectType"
                defaultValue={project?.project_type || ''}
                required
                onChange={clearSubmissionMessage}
              >
                <option value="" disabled>
                  Choose a Project Type
                </option>
                {PROJECT_TYPES.map((type) => (
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
                defaultValue={project?.status || ''}
                onChange={clearSubmissionMessage}
              >
                <option value="">Select a Status</option>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {capitalizeWords(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Project Dates
            <span className="ml-1.5 font-normal text-slate-500">(Optional)</span>
          </legend>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="start-date">Start Date</FieldLabel>
              <input
                className={inputClasses}
                id="start-date"
                name="startDate"
                type="date"
                defaultValue={project?.start_date || ''}
                onChange={clearSubmissionMessage}
              />
            </div>
            <div>
              <FieldLabel htmlFor="expected-completion-date">
                Expected Completion Date
              </FieldLabel>
              <input
                className={inputClasses}
                id="expected-completion-date"
                name="expectedCompletionDate"
                type="date"
                defaultValue={project?.expected_completion_date || ''}
                onChange={clearSubmissionMessage}
              />
            </div>
            <div>
              <FieldLabel htmlFor="actual-completion-date">
                Actual Completion Date
              </FieldLabel>
              <input
                className={inputClasses}
                id="actual-completion-date"
                name="actualCompletionDate"
                type="date"
                defaultValue={project?.actual_completion_date || ''}
                onChange={clearSubmissionMessage}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Location And Notes
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
              defaultValue={project?.address || ''}
              onChange={clearSubmissionMessage}
            />
          </div>

          <div>
            <FieldLabel htmlFor="project-info" optional>
              Project Info
            </FieldLabel>
            <textarea
              className={`${inputClasses} min-h-24 resize-y`}
              id="project-info"
              name="projectInfo"
              rows="3"
              placeholder="Additional notes or information"
              defaultValue={project?.project_info || ''}
              onChange={clearSubmissionMessage}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            Project Images
            <span className="ml-1.5 font-normal text-slate-500">(Optional)</span>
          </legend>
          <p className="mt-1 text-sm text-slate-600">
            Choose JPEG, PNG, GIF, or WebP images up to 5 MB each. You can add up to
            10 other images.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cover-image" optional>
                Cover Image
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
              <div className="mt-3 grid grid-cols-3 gap-2">
                {!coverFile &&
                  currentCover &&
                  !removedImageUrls.includes(currentCover.image_url) && (
                    <ImageThumbnail
                      src={currentCover.image_url}
                      alt="Current cover"
                      removeLabel="Remove current cover"
                      onRemove={() => removeExistingImage(currentCover.image_url)}
                    />
                  )}
                {coverFile && (
                  <TemporaryImageThumbnail
                    file={coverFile}
                    onRemove={removeCoverFile}
                  />
                )}
              </div>
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
                Other Images
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
                disabled={remainingOtherImageSlots <= 0}
                onChange={validateImages('otherImages')}
              />
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {otherExistingImages.map((image) =>
                  removedImageUrls.includes(image.image_url) ? null : (
                    <li key={image.image_url}>
                      <ImageThumbnail
                        src={image.image_url}
                        alt={image.title || 'Project image'}
                        removeLabel={`Remove ${image.title || 'project image'}`}
                        onRemove={() => removeExistingImage(image.image_url)}
                      />
                    </li>
                  )
                )}
                {otherFiles.map((file, index) => (
                <li key={`${file.file.name}-${file.file.size}-${file.file.lastModified}-${index}`}>
                    <TemporaryImageThumbnail
                      file={file}
                      onRemove={() => removeOtherFile(index)}
                    />
                  </li>
                ))}
              </ul>
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

        {!readOnly && (
          <div className="flex flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Project details and selected images will be saved when you submit the form.
            </p>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 active:bg-blue-900"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving Project...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Project'}
            </button>
          </div>
        )}

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

export default AddProjectForm
