import { useEffect, useRef, useState } from 'react'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
  REVIEW_STATUSES,
} from '../constants'
import { useUploadProjectDocumentsMutation } from '../../../../redux/services/users/usersApi'

const inputClasses =
  'mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'

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

const AddDocumentForm = ({ projectId, onClose }) => {
  const [files, setFiles] = useState([])
  const [submissionError, setSubmissionError] = useState('')
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const [uploadProjectDocuments, { isLoading }] = useUploadProjectDocumentsMutation()

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    titleRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isLoading) onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus()
    }
  }, [isLoading, onClose])

  const submitDocument = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    setSubmissionError('')
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    if (!files.length) {
      setSubmissionError('Select at least one file to upload.')
      return
    }

    const formData = new FormData(form)
    formData.delete('files')
    files.forEach((file) => formData.append('files', file))
    try {
      await uploadProjectDocuments({ projectId, formData }).unwrap()
      onClose()
    } catch (error) {
      setSubmissionError(
        error?.data?.error || 'Unable to upload the document. Please try again.'
      )
    }
  }

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

  const handleBackdropClick = (event) => {
    if (!isLoading && event.target === event.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={handleBackdropClick}
    >
      <section
        ref={dialogRef}
        aria-labelledby="document-modal-title"
        aria-describedby="document-modal-description"
        aria-modal="true"
        className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:max-h-[calc(100vh-3rem)]"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Project documents
            </p>
            <h2
              id="document-modal-title"
              className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              tabIndex="-1"
            >
              Add a document
            </h2>
            <p
              id="document-modal-description"
              className="mt-1.5 max-w-xl text-sm leading-5 text-slate-600"
            >
              Enter the document details and choose one or more files.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close add document form"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <form
          className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7"
          onSubmit={submitDocument}
        >
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
              <FieldLabel htmlFor="document-title" required>
                Document title
              </FieldLabel>
              <input
                ref={titleRef}
                className={inputClasses}
                id="document-title"
                name="title"
                type="text"
                autoComplete="off"
                placeholder="e.g. Ground floor structural drawings"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="document-description">Document description</FieldLabel>
              <textarea
                className={`${inputClasses} min-h-24 resize-y`}
                id="document-description"
                name="description"
                rows="3"
                placeholder="Add a brief description or context"
              />
            </div>
            <div>
              <FieldLabel htmlFor="document-category" required>
                Document category
              </FieldLabel>
              <select
                className={inputClasses}
                id="document-category"
                name="category"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="document-number">Document Number / Reference No / Version</FieldLabel>
              <input
                className={inputClasses}
                id="document-number"
                name="referenceNumber"
                type="text"
                autoComplete="off"
                placeholder="Enter a reference number"
              />
            </div>
            <div>
              <FieldLabel htmlFor="document-date">Document date</FieldLabel>
              <input
                className={inputClasses}
                id="document-date"
                name="date"
                type="date"
              />
            </div>
            <div>
              <FieldLabel htmlFor="document-review-status">Review status</FieldLabel>
              <select
                className={inputClasses}
                id="document-review-status"
                name="reviewStatus"
                defaultValue=""
              >
                <option value="">Select a review status</option>
                {REVIEW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="document-visibility">Visibility</FieldLabel>
              <select
                className={inputClasses}
                id="document-visibility"
                name="visibility"
                defaultValue=""
              >
                <option value="">Select visibility</option>
                {DOCUMENT_VISIBILITIES.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="document-files">Files</FieldLabel>
              <input
                className={`${inputClasses} file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100`}
                id="document-files"
                name="files"
                type="file"
                multiple
                onChange={addFiles}
                aria-describedby="document-files-help"
              />
              <p id="document-files-help" className="mt-1.5 text-xs leading-5 text-slate-500">
                Select one or more files. Each file can be up to 20 MB.
              </p>
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
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? 'Uploading…' : 'Save'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default AddDocumentForm
