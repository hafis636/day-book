import {
  createElement,
  useCallback,
  useState,
} from 'react'
import {
  useDeleteProjectDocumentMutation,
  useAddProjectDocumentReviewCommentMutation,
  useGetCurrentSessionQuery,
} from '../../../../../redux/services/users/usersApi'
import DocumentsPageView from './DocumentsPageView'
import { API_BASE_URL } from '../../../../../config/api'
import { hasPermission } from '../../../../../utils/permissions'

const DocumentsPage = ({ project, projectId }) => {
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [previewDocument, setPreviewDocument] = useState(null)
  const [reviewingDocument, setReviewingDocument] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [deletingDocument, setDeletingDocument] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloadingDocumentId, setDownloadingDocumentId] = useState(null)
  const { data: session } = useGetCurrentSessionQuery()
  const canAddDocument = hasPermission(session?.user?.permissions, 'ADD_DOCUMENT')
  const canReviewDocument = hasPermission(session?.user?.permissions, 'REVIEW_DOCUMENT')
  const documents = Array.isArray(project?.documents) ? project.documents : []
  const isLoading = false
  const isError = false
  const [deleteProjectDocument, { isLoading: isDeletingDocument }] =
    useDeleteProjectDocumentMutation()
  const [addReviewComment, { isLoading: isSavingReviewComment }] =
    useAddProjectDocumentReviewCommentMutation()
  const closeDocumentForm = useCallback(() => {
    setIsDocumentFormOpen(false)
    setEditingDocument(null)
  }, [])
  const closeDocumentPreview = useCallback(() => setPreviewDocument(null), [])
  const closeReviewDialog = useCallback(() => {
    setReviewingDocument(null)
    setReviewComment('')
    setReviewError('')
  }, [])
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

  const handleSaveReviewComment = async (comment) => {
    if (!canReviewDocument || !reviewingDocument || !comment) return

    setReviewError('')
    try {
      const result = await addReviewComment({
        projectId,
        documentId: reviewingDocument.id,
        comment,
      }).unwrap()
      setReviewingDocument((current) =>
        current?.id === reviewingDocument.id
          ? { ...current, review_comments: result.review_comments }
          : current
      )
      return true
    } catch (error) {
      setReviewError(error?.data?.error || 'Unable to save the review comment. Please try again.')
      return false
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

  const toggleReviewDocument = (document) => {
    setReviewError('')
    setReviewComment('')
    setReviewingDocument((current) =>
      current?.id === document.id ? null : document
    )
  }

  const handleReviewCommentSubmit = async (event) => {
    event.preventDefault()
    const saved = await handleSaveReviewComment(reviewComment.trim())
    if (saved) setReviewComment('')
  }

  return createElement(DocumentsPageView, {
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
    onOpenDocumentForm: () => setIsDocumentFormOpen(true),
    onEditDocument: setEditingDocument,
    onOpenPreview: setPreviewDocument,
    onToggleReviewDocument: toggleReviewDocument,
    onDownloadDocument: handleDownloadDocument,
    onRequestDelete: (document) => {
      setDeleteError('')
      setDeletingDocument(document)
    },
    onCloseDocumentForm: closeDocumentForm,
    onClosePreview: closeDocumentPreview,
    onCloseReview: closeReviewDialog,
    onCloseDeleteConfirmation: closeDeleteConfirmation,
    onDeleteDocument: handleDeleteDocument,
    onChangeReviewComment: (event) => setReviewComment(event.target.value),
    onSubmitReviewComment: handleReviewCommentSubmit,
  })
}

export default DocumentsPage
