import { useCallback, useState } from 'react'
import { useGetProjectDocumentsQuery } from '../../../../redux/services/users/usersApi'
import AddDocumentForm from '../forms/AddDocumentForm'
import ProjectSectionLayout from './ProjectSectionLayout'

const DocumentsPage = ({ projectId }) => {
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false)
  const { data, isLoading, isError } = useGetProjectDocumentsQuery(projectId)
  const documents = data?.documents || []
  const closeDocumentForm = useCallback(() => setIsDocumentFormOpen(false), [])
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
        {isLoading ? (
          <p className="mt-6 text-sm text-slate-600" role="status">Loading documents…</p>
        ) : isError ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            Unable to load project documents. Please try again.
          </p>
        ) : documents.length ? (
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {documents.map((document) => (
              <li key={document.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">{document.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {document.file_type}
                    {document.reference_number ? ` · ${document.reference_number}` : ''}
                    {document.document_date ? ` · ${document.document_date.slice(0, 10)}` : ''}
                  </p>
                  {document.description && (
                    <p className="mt-1 text-sm text-slate-500">{document.description}</p>
                  )}
                </div>
                <a
                  href={document.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Open file
                </a>
              </li>
            ))}
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
    </>
  )
}

export default DocumentsPage
