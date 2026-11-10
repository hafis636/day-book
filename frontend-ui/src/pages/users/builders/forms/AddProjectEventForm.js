import { useRef, useState } from 'react'
import Modal from '../../../../components/common/Modal'
import {
  PROJECT_EVENT_PRIORITIES,
  PROJECT_EVENT_STATUSES,
  PROJECT_EVENT_TYPES,
  PROJECT_PHASES,
} from '../constants'

const inputClasses =
  'mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'

const formatOptionLabel = (value) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())

const FieldLabel = ({ htmlFor, children, required = false }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
    {children}
    {required && (
      <span aria-hidden="true" className="ml-1 text-blue-700">
        *
      </span>
    )}
  </label>
)

const AddProjectEventForm = ({
  onClose,
  onAddEvent,
  initialStartDate = '',
  initialEndDate = '',
  minDate = '',
  maxDate = '',
}) => {
  const titleRef = useRef(null)
  const [files, setFiles] = useState([])
  const [submissionError, setSubmissionError] = useState('')

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.currentTarget.files || [])
    setFiles((currentFiles) => {
      const nextFiles = [...currentFiles]
      selectedFiles.forEach((file) => {
        const alreadySelected = nextFiles.some(
          (existingFile) =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified
        )
        if (!alreadySelected) nextFiles.push(file)
      })
      return nextFiles
    })
    event.currentTarget.value = ''
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitEvent = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (isSubmitting) return
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const formData = new FormData(form)
    const startDate = formData.get('startDate')
    const endDate = formData.get('endDate')
    if (endDate < startDate) {
      setSubmissionError('End date must be on or after the start date.')
      return
    }

    setSubmissionError('')
    setIsSubmitting(true)
    try {
      await onAddEvent({
        id: `event-${Date.now()}`,
        title: formData.get('title').trim(),
        description: formData.get('description').trim(),
        type: formData.get('type'),
        phase: formData.get('phase'),
        startDate,
        endDate,
        status: formData.get('status'),
        priority: formData.get('priority'),
        files,
      })
      onClose()
    } catch (error) {
      setSubmissionError(
        error?.data?.error || 'Unable to save the event. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      ariaLabelledBy="project-event-modal-title"
      ariaDescribedBy="project-event-modal-description"
      isDismissible={!isSubmitting}
      initialFocusRef={titleRef}
      onClose={onClose}
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Project progress
          </p>
          <h2
            id="project-event-modal-title"
            className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            tabIndex="-1"
          >
            Add event
          </h2>
          <p
            id="project-event-modal-description"
            className="mt-1.5 max-w-xl text-sm leading-5 text-slate-600"
          >
            Record an event for this project.
          </p>
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          aria-label="Close add event form"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <form className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7" onSubmit={submitEvent}>
        {submissionError && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
            role="alert"
          >
            {submissionError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="project-event-title" required>
              Title
            </FieldLabel>
            <input
              ref={titleRef}
              className={inputClasses}
              id="project-event-title"
              name="title"
              type="text"
              autoComplete="off"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="project-event-description">Description</FieldLabel>
            <textarea
              className={`${inputClasses} min-h-24 resize-y`}
              id="project-event-description"
              name="description"
              rows="3"
            />
          </div>
          <div>
            <FieldLabel htmlFor="project-event-type" required>
              Type
            </FieldLabel>
            <select className={inputClasses} id="project-event-type" name="type" required defaultValue="">
              <option value="" disabled>
                Select a type
              </option>
              {PROJECT_EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatOptionLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="project-event-phase" required>
              Project phase
            </FieldLabel>
            <select className={inputClasses} id="project-event-phase" name="phase" required defaultValue="">
              <option value="" disabled>
                Select a phase
              </option>
              {PROJECT_PHASES.map((phase) => (
                <option key={phase} value={phase}>
                  {formatOptionLabel(phase)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="project-event-start-date" required>
              Start date
            </FieldLabel>
            <input
              className={inputClasses}
              id="project-event-start-date"
              name="startDate"
              type="date"
              defaultValue={initialStartDate}
              min={minDate}
              max={maxDate}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="project-event-end-date" required>
              End date
            </FieldLabel>
            <input
              className={inputClasses}
              id="project-event-end-date"
              name="endDate"
              type="date"
              defaultValue={initialEndDate}
              min={minDate}
              max={maxDate}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="project-event-status" required>
              Status
            </FieldLabel>
            <select className={inputClasses} id="project-event-status" name="status" required defaultValue="">
              <option value="" disabled>
                Select a status
              </option>
              {PROJECT_EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatOptionLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="project-event-priority">Priority</FieldLabel>
            <select
              className={inputClasses}
              id="project-event-priority"
              name="priority"
              defaultValue="LOW"
            >
              {PROJECT_EVENT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {formatOptionLabel(priority)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="project-event-documents">Documents</FieldLabel>
            <input
              className={`${inputClasses} file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100`}
              id="project-event-documents"
              name="documents"
              type="file"
              multiple
              onChange={addFiles}
            />
            {files.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {files.map((file) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 break-all font-medium text-slate-700">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        setFiles((currentFiles) =>
                          currentFiles.filter(
                            (currentFile) =>
                              currentFile.name !== file.name ||
                              currentFile.size !== file.size ||
                              currentFile.lastModified !== file.lastModified
                          )
                        )
                      }
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {isSubmitting ? 'Saving…' : 'Add event'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

export default AddProjectEventForm
