import { createElement, useRef } from 'react'
import DocumentPreviewModalView from './DocumentPreviewModalView'
import useDocumentPreview from './useDocumentPreview'

const DocumentPreviewModal = ({ document, onClose }) => {
  const preview = useDocumentPreview(document)
  const titleRef = useRef(null)
  return createElement(DocumentPreviewModalView, {
    document,
    onClose,
    titleRef,
    ...preview,
  })
}

export default DocumentPreviewModal
