import { useEffect, useState } from 'react'
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

const useDocumentPreview = (document) => {
  const [wordPreview, setWordPreview] = useState({ status: 'loading', text: '' })
  const fileName = getFileName(document.file_path)
  const previewType = getPreviewType(fileName)

  useEffect(() => {
    const abortController = new AbortController()

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
    }
  }, [document.file_path, previewType])

  return { previewType, wordPreview }
}

export default useDocumentPreview
