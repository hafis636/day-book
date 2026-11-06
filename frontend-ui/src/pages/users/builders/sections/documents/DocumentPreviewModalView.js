import Modal from '../../../../../components/common/Modal'

const DocumentPreviewModalView = ({
  document,
  onClose,
  titleRef,
  previewType,
  wordPreview,
}) => (
  <Modal
    ariaLabelledBy="document-preview-title"
    initialFocusRef={titleRef}
    onClose={onClose}
    overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6"
    panelClassName="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:max-h-[calc(100vh-3rem)]"
  >
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Document preview
          </p>
          <h2
            className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
            id="document-preview-title"
            ref={titleRef}
            tabIndex="-1"
          >
            {document.title}
          </h2>
        </div>
        <button
          aria-label="Close document preview"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">
        {previewType === 'image' ? (
          <div className="grid min-h-full place-items-center">
            <img
              alt={document.title}
              className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-sm"
              src={document.file_path}
            />
          </div>
        ) : previewType === 'pdf' ? (
          <iframe
            className="h-[65vh] min-h-96 w-full rounded-lg border border-slate-200 bg-white"
            src={document.file_path}
            title={`Preview of ${document.title}`}
          />
        ) : previewType === 'docx' ? (
          wordPreview.status === 'loading' ? (
            <p className="rounded-lg bg-white p-6 text-sm text-slate-600" role="status">
              Loading Word document…
            </p>
          ) : wordPreview.status === 'error' ? (
            <p className="rounded-lg bg-white p-6 text-sm text-red-800" role="alert">
              Unable to preview this Word document. Use the row actions to open or download the original file.
            </p>
          ) : (
            <article className="mx-auto min-h-full max-w-3xl whitespace-pre-wrap rounded-lg bg-white p-6 text-sm leading-7 text-slate-800 shadow-sm sm:p-10">
              {wordPreview.text || 'This document contains no readable text.'}
            </article>
          )
        ) : (
          <p className="rounded-lg bg-white p-6 text-sm text-slate-600">
            {previewType === 'word'
              ? 'This Word format cannot be previewed in the browser. Use the row actions to open or download the original file.'
              : 'This file type cannot be previewed in the browser. Use the row actions to open or download the original file.'}
          </p>
        )}
      </div>
  </Modal>
)

export default DocumentPreviewModalView
