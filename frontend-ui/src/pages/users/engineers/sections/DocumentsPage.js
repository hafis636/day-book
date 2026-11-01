import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useDeleteProjectDocumentMutation,
  useGetProjectDocumentsQuery,
} from '../../../../redux/services/users/usersApi'
import AddDocumentForm from '../forms/AddDocumentForm'
import DocumentPreviewModal from './DocumentPreviewModal'
import ProjectSectionLayout from './ProjectSectionLayout'
import { API_BASE_URL } from '../../../../config/api'

const reviewStatusBadgeStyles = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  PENDING: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  'UNDER REVIEW': 'bg-blue-100 text-blue-800 ring-blue-600/20',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  'CHANGES REQUESTED': 'bg-orange-100 text-orange-800 ring-orange-600/20',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800 ring-orange-600/20',
  RESUBMITTED: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  APPROVED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  REJECTED: 'bg-red-100 text-red-800 ring-red-600/20',
  ARCHIVED: 'bg-slate-200 text-slate-600 ring-slate-600/20',
}

const DocumentActionIcon = ({ action }) => {
  const paths = {
    open: (
      <>
        <path d="M2.25 12s3.25-6 9.75-6 9.75 6 9.75 6-3.25 6-9.75 6-9.75-6-9.75-6Z" />
        <circle cx="12" cy="12" r="2.75" />
      </>
    ),
    download: (
      <>
        <path d="M12 3.75v10.5m0 0 4-4m-4 4-4-4" />
        <path d="M4.5 15.75v3h15v-3" />
      </>
    ),
    edit: (
      <>
        <path d="m14.25 5.25 4.5 4.5M4.5 19.5l4.25-.9L19.2 8.15a1.77 1.77 0 0 0-2.5-2.5L6.25 16.1l-1.75 3.4Z" />
      </>
    ),
    delete: (
      <>
        <path d="M4.5 7.5h15m-13.5 0 .75 12h10.5l.75-12M9 7.5V4.75h6V7.5m-4.5 3v5.25m3-5.25v5.25" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[action]}
    </svg>
  )
}

const DeleteConfirmationDialog = ({ document, error, isDeleting, onCancel, onDelete }) => {
  const dialogRef = useRef(null)
  const cancelButtonRef = useRef(null)

  useEffect(() => {
    const previouslyFocusedElement = window.document.activeElement
    const previousBodyOverflow = window.document.body.style.overflow
    window.document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeleting) {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll('button:not([disabled])') || []
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        if (event.shiftKey && window.document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        } else if (!event.shiftKey && window.document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    window.document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown)
      window.document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus()
    }
  }, [isDeleting, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby="delete-document-title"
        aria-describedby="delete-document-description"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10"
        role="dialog"
      >
        <h2 id="delete-document-title" className="text-lg font-bold text-slate-900">
          Delete document?
        </h2>
        <p id="delete-document-description" className="mt-2 text-sm leading-6 text-slate-600">
          “{document.title}” and its uploaded file will be permanently deleted. This cannot be undone.
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <footer className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            disabled={isDeleting}
            onClick={onDelete}
            type="button"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </footer>
      </section>
    </div>
  )
}

const DocumentsPage = ({ projectId }) => {
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [previewDocument, setPreviewDocument] = useState(null)
  const [deletingDocument, setDeletingDocument] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloadingDocumentId, setDownloadingDocumentId] = useState(null)
  const { data, isLoading, isError } = useGetProjectDocumentsQuery(projectId)
  const documents = data?.documents || []
  const [deleteProjectDocument, { isLoading: isDeletingDocument }] =
    useDeleteProjectDocumentMutation()
  const closeDocumentForm = useCallback(() => {
    setIsDocumentFormOpen(false)
    setEditingDocument(null)
  }, [])
  const closeDocumentPreview = useCallback(() => setPreviewDocument(null), [])
  const closeDeleteConfirmation = useCallback(() => {
    setDeletingDocument(null)
    setDeleteError('')
  }, [])
  const handleDeleteDocument = async () => {
    if (!deletingDocument) return

    setDeleteError('')
    try {
      await deleteProjectDocument({
        projectId,
        documentId: deletingDocument.id,
      }).unwrap()
      closeDeleteConfirmation()
    } catch (error) {
      setDeleteError(
        error?.data?.error || 'Unable to delete the document. Please try again.'
      )
    }
  }
  const handleDownloadDocument = async (document) => {
    setDownloadError('')
    setDownloadingDocumentId(document.id)

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/documents/${document.id}/download`,
        { credentials: 'include' }
      )
      if (!response.ok) {
        throw new Error('Unable to download the document. Please try again.')
      }

      const filePath = new URL(document.file_path, window.location.href).pathname
      const extension = filePath.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] || ''
      const title = document.title || 'document'
      const filename = extension && title.toLowerCase().endsWith(extension.toLowerCase())
        ? title
        : `${title}${extension}`
      const objectUrl = window.URL.createObjectURL(await response.blob())
      const downloadLink = window.document.createElement('a')
      downloadLink.href = objectUrl
      downloadLink.download = filename
      downloadLink.style.display = 'none'
      window.document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)
    } catch (error) {
      setDownloadError(
        error?.message || 'Unable to download the document. Please try again.'
      )
    } finally {
      setDownloadingDocumentId(null)
    }
  }
  const addDocumentButton = (
    <button
      type="button"
      onClick={() => setIsDocumentFormOpen(true)}
      className="inline-flex min-h-10 items-center gap-2 self-end rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:self-auto"
    >
      <span aria-hidden="true" className="text-lg leading-none">+</span>
      Add Document
    </button>
  )

  return (
    <>
      <ProjectSectionLayout title="Documents" action={addDocumentButton}>
        {downloadError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {downloadError}
          </p>
        )}
        {deleteError && !deletingDocument && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {deleteError}
          </p>
        )}
        {isLoading ? (
          <p className="mt-6 text-sm text-slate-600" role="status">Loading documents…</p>
        ) : isError ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            Unable to load project documents. Please try again.
          </p>
        ) : documents.length ? (
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {documents.map((document) => {
              const reviewStatus = document.review_status || 'Draft'
              const normalizedReviewStatus = reviewStatus.toUpperCase()
              const isDraft = normalizedReviewStatus === 'DRAFT'
              const isReviewStatusLocked = ['APPROVED', 'REJECTED', 'ARCHIVED'].includes(normalizedReviewStatus)
              const reviewStatusLabel = reviewStatus
                .replace(/_/g, ' ')
                .toLowerCase()
                .replace(/\b\w/g, (letter) => letter.toUpperCase())
              const badgeStyles =
                reviewStatusBadgeStyles[normalizedReviewStatus] ||
                'bg-slate-100 text-slate-700 ring-slate-600/20'
              return (
                <li key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold text-slate-900">{document.title}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeStyles}`}
                      >
                        {reviewStatusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {document.file_type}
                      {document.reference_number ? ` · ${document.reference_number}` : ''}
                      {document.document_date ? ` · ${document.document_date.slice(0, 10)}` : ''}
                    </p>
                    {document.description && (
                      <p className="mt-1 text-sm text-slate-500">{document.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Open ${document.title}`}
                      title="Open preview"
                      onClick={() => setPreviewDocument(document)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                    >
                      <DocumentActionIcon action="open" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Download ${document.title}`}
                      title="Download file"
                      disabled={downloadingDocumentId === document.id}
                      onClick={() => handleDownloadDocument(document)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-50"
                    >
                      <DocumentActionIcon action="download" />
                    </button>
                    {!isReviewStatusLocked && (
                      <button
                        type="button"
                        aria-label={`Edit ${document.title}`}
                        title="Edit document"
                        onClick={() => setEditingDocument(document)}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                      >
                        <DocumentActionIcon action="edit" />
                      </button>
                    )}
                    {isDraft && (
                      <button
                        type="button"
                        aria-label={`Delete ${document.title}`}
                        title="Delete document"
                        disabled={isDeletingDocument}
                        onClick={() => {
                          setDeleteError('')
                          setDeletingDocument(document)
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg text-red-700 transition hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <DocumentActionIcon action="delete" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-5 sm:p-7">
            <p className="text-base font-semibold text-slate-900">No documents to display</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload project files with Add Document. Saved documents will appear here.
            </p>
          </div>
        )}
      </ProjectSectionLayout>
      {isDocumentFormOpen && (
        <AddDocumentForm projectId={projectId} onClose={closeDocumentForm} />
      )}
      {editingDocument && (
        <AddDocumentForm
          projectId={projectId}
          document={editingDocument}
          onClose={closeDocumentForm}
        />
      )}
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={closeDocumentPreview}
        />
      )}
      {deletingDocument && (
        <DeleteConfirmationDialog
          document={deletingDocument}
          error={deleteError}
          isDeleting={isDeletingDocument}
          onCancel={closeDeleteConfirmation}
          onDelete={handleDeleteDocument}
        />
      )}
    </>
  )
}

export default DocumentsPage
