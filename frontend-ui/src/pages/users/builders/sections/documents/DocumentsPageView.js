import AddDocumentForm from '../../forms/AddDocumentForm'
import DocumentPreviewModal from './DocumentPreviewModal'
import ProjectSectionLayout from '../ProjectSectionLayout'
import Modal from '../../../../../components/common/Modal'

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
      <path d="m14.25 5.25 4.5 4.5M4.5 19.5l4.25-.9L19.2 8.15a1.77 1.77 0 0 0-2.5-2.5L6.25 16.1l-1.75 3.4Z" />
    ),
    delete: (
      <path d="M4.5 7.5h15m-13.5 0 .75 12h10.5l.75-12M9 7.5V4.75h6V7.5m-4.5 3v5.25m3-5.25v5.25" />
    ),
    review: (
      <>
        <path d="M4.5 5.25h15v11.25H9l-4.5 3v-14.25Z" />
        <path d="M8 9h8m-8 3.5h5" />
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

const DeleteConfirmationDialog = ({
  document,
  error,
  isDeleting,
  onCancel,
  onDelete,
}) => (
    <Modal
      ariaLabelledBy="delete-document-title"
      ariaDescribedBy="delete-document-description"
      isDismissible={!isDeleting}
      onClose={onCancel}
      overlayClassName="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"
      panelClassName="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10"
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
    </Modal>
  )

const ReviewDocumentPanel = ({
  document,
  comment,
  error,
  isSaving,
  onChangeComment,
  onClose,
  onSubmitComment,
}) => {
  const comments = Array.isArray(document.review_comments) ? document.review_comments : []

  return (
    <section
      aria-label={`Review comments for ${document.title}`}
      className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <header className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-900">
          Review {document.title}
        </h3>
        <button
          type="button"
          aria-label={`Close review for ${document.title}`}
          onClick={onClose}
          disabled={isSaving}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-60"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className="mt-4 max-h-60 space-y-3 overflow-y-auto">
        {comments.length ? comments.map((entry, index) => (
          <article key={`${entry.added_on}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="whitespace-pre-wrap text-sm text-slate-800">{entry.comment}</p>
            <p className="mt-2 text-xs text-slate-500">
              {entry.added}
              {entry.added_on && ` · ${new Date(entry.added_on).toLocaleString()}`}
            </p>
          </article>
        )) : (
          <p className="text-sm text-slate-600">No review comments yet.</p>
        )}
      </div>
      <form className="mt-5" onSubmit={onSubmitComment}>
        <label htmlFor={`document-review-comment-${document.id}`} className="block text-sm font-semibold text-slate-700">
          Add a comment
        </label>
        <textarea
          id={`document-review-comment-${document.id}`}
          value={comment}
          onChange={onChangeComment}
          rows={4}
          maxLength={5000}
          required
          className="mt-2 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        />
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>
        )}
        <footer className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !comment.trim()}
            className="min-h-10 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save comment'}
          </button>
        </footer>
      </form>
    </section>
  )
}

const DocumentsPageView = ({
  projectId,
  isDocumentFormOpen,
  editingDocument,
  previewDocument,
  reviewingDocument,
  reviewComment,
  reviewError,
  deletingDocument,
  deleteError,
  downloadError,
  downloadingDocumentId,
  isLoading,
  isError,
  isDeletingDocument,
  isSavingReviewComment,
  canAddDocument,
  canReviewDocument,
  documents,
  onOpenDocumentForm,
  onEditDocument,
  onOpenPreview,
  onToggleReviewDocument,
  onDownloadDocument,
  onRequestDelete,
  onCloseDocumentForm,
  onClosePreview,
  onCloseReview,
  onCloseDeleteConfirmation,
  onDeleteDocument,
  onChangeReviewComment,
  onSubmitReviewComment,
}) => {
  const addDocumentButton = canAddDocument ? (
    <button
      type="button"
      onClick={onOpenDocumentForm}
      className="inline-flex min-h-10 items-center gap-2 self-end rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:self-auto"
    >
      <span aria-hidden="true" className="text-lg leading-none">+</span>
      Add Document
    </button>
  ) : null

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
                <li key={document.id} className="p-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      {canReviewDocument && (
                        <button
                          type="button"
                          aria-label={`Review ${document.title}`}
                          title="Review document"
                          aria-expanded={reviewingDocument?.id === document.id}
                          onClick={() => onToggleReviewDocument(document)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                        >
                          <DocumentActionIcon action="review" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Open ${document.title}`}
                        title="Open preview"
                        onClick={() => onOpenPreview(document)}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                      >
                        <DocumentActionIcon action="open" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Download ${document.title}`}
                        title="Download file"
                        disabled={downloadingDocumentId === document.id}
                        onClick={() => onDownloadDocument(document)}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-50"
                      >
                        <DocumentActionIcon action="download" />
                      </button>
                      {!isReviewStatusLocked && (
                        <button
                          type="button"
                          aria-label={`Edit ${document.title}`}
                          title="Edit document"
                          onClick={() => onEditDocument(document)}
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
                          onClick={() => onRequestDelete(document)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-red-700 transition hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <DocumentActionIcon action="delete" />
                        </button>
                      )}
                    </div>
                  </div>
                  {reviewingDocument?.id === document.id && (
                    <ReviewDocumentPanel
                      document={reviewingDocument}
                      comment={reviewComment}
                      error={reviewError}
                      isSaving={isSavingReviewComment}
                      onClose={onCloseReview}
                      onChangeComment={onChangeReviewComment}
                      onSubmitComment={onSubmitReviewComment}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-5 sm:p-7">
            <p className="text-base font-semibold text-slate-900">No documents to display</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {canAddDocument
                ? 'Upload project files with Add Document. Saved documents will appear here.'
                : 'Documents shared with this project will appear here.'}
            </p>
          </div>
        )}
      </ProjectSectionLayout>
      {isDocumentFormOpen && canAddDocument && (
        <AddDocumentForm projectId={projectId} onClose={onCloseDocumentForm} />
      )}
      {editingDocument && (
        <AddDocumentForm
          projectId={projectId}
          document={editingDocument}
          onClose={onCloseDocumentForm}
        />
      )}
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={onClosePreview}
        />
      )}
      {deletingDocument && (
        <DeleteConfirmationDialog
          document={deletingDocument}
          error={deleteError}
          isDeleting={isDeletingDocument}
          onCancel={onCloseDeleteConfirmation}
          onDelete={onDeleteDocument}
        />
      )}
    </>
  )
}

export default DocumentsPageView
