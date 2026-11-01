import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'

const getFileName = (filePath) => {
  const url = new URL(filePath, window.location.href)
  return url.pathname.split('/').pop() || ''
}

const getPreviewType = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'docx'
  if (['doc', 'docm'].includes(extension)) return 'word'
  return 'unsupported'
}

const DocumentPreviewModal = ({ document, onClose }) => {
  const titleRef = useRef(null)
  const [wordPreview, setWordPreview] = useState({ status: 'loading', text: '' })
  const fileName = getFileName(document.file_path)
  const previewType = getPreviewType(fileName)

  useEffect(() => {
    const previouslyFocusedElement = window.document.activeElement
    const previousBodyOverflow = window.document.body.style.overflow
    const abortController = new AbortController()
    window.document.body.style.overflow = 'hidden'
    titleRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = Array.from(
          window.document.querySelectorAll(
            '[data-document-preview-modal] button:not([disabled]), [data-document-preview-modal] a[href], [data-document-preview-modal] [tabindex="-1"]'
          )
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

    window.document.addEventListener('keydown', handleKeyDown)

    if (previewType === 'docx') {
      const loadWordDocument = async () => {
        try {
          const response = await fetch(document.file_path, { signal: abortController.signal })
          if (!response.ok) throw new Error(`Document request failed with status ${response.status}`)
          const { value } = await mammoth.extractRawText({
            arrayBuffer: await response.arrayBuffer(),
          })
          setWordPreview({ status: 'ready', text: value })
        } catch {
          if (!abortController.signal.aborted) {
            setWordPreview({ status: 'error', text: '' })
          }
        }
      }

      loadWordDocument()
    }

    return () => {
      abortController.abort()
      window.document.removeEventListener('keydown', handleKeyDown)
      window.document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus()
    }
  }, [document.file_path, onClose, previewType])

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={handleBackdropClick}
    >
      <section
        aria-labelledby="document-preview-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:max-h-[calc(100vh-3rem)]"
        data-document-preview-modal
        role="dialog"
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
      </section>
    </div>
  )
}

export default DocumentPreviewModal
