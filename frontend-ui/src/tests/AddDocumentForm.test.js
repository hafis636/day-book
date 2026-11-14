import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

let mockUploadProjectDocuments
let mockDeleteProjectDocument
let mockUpdateProjectDocument
let mockAddReviewComment
let mockProjectDocuments = { documents: [] }
let mockIsUploadLoading = false
let mockIsUpdateLoading = false
let mockDocumentPermissions = { ADD_DOCUMENT: true, REVIEW_DOCUMENT: true }
let mockSessionUser = {
  permissions: mockDocumentPermissions,
  first_name: 'Taylor',
  last_name: 'Day',
}

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => ({
    data: { user: mockSessionUser },
  }),
  useUploadProjectDocumentsMutation: () => [
    mockUploadProjectDocuments,
    { isLoading: mockIsUploadLoading },
  ],
  useDeleteProjectDocumentMutation: () => [
    mockDeleteProjectDocument,
    { isLoading: false },
  ],
  useUpdateProjectDocumentMutation: () => [
    mockUpdateProjectDocument,
    { isLoading: mockIsUpdateLoading },
  ],
  useAddProjectDocumentReviewCommentMutation: () => [
    mockAddReviewComment,
    { isLoading: false },
  ],
}))

import AddDocumentForm from '../pages/users/builders/forms/AddDocumentForm'
import DocumentsPageComponent from '../pages/users/builders/sections/documents/DocumentsPage'

const DocumentsPage = (props) => (
  <DocumentsPageComponent
    project={{ documents: mockProjectDocuments.documents }}
    {...props}
  />
)

beforeEach(() => {
  mockUploadProjectDocuments = jest.fn()
  mockDeleteProjectDocument = jest.fn()
  mockUpdateProjectDocument = jest.fn()
  mockAddReviewComment = jest.fn()
  mockProjectDocuments = { documents: [] }
  mockIsUploadLoading = false
  mockIsUpdateLoading = false
  mockDocumentPermissions = { ADD_DOCUMENT: true, REVIEW_DOCUMENT: true }
  mockSessionUser = {
    permissions: mockDocumentPermissions,
    first_name: 'Taylor',
    last_name: 'Day',
  }
})

test('adds review comments from the expanded document review section', async () => {
  const savedComments = [
    { comment: 'Check the scale.', added: 'Taylor Day', added_on: '2026-11-02T10:00:00.000Z' },
    { comment: 'Please revise sheet two.', added: 'Taylor Day', added_on: '2026-11-02T10:05:00.000Z' },
  ]
  const document = {
    id: 'document-1',
    file_path: '/plan.pdf',
    title: 'Plan',
    review_status: 'PENDING',
    review_comments: [
      { comment: 'Check the scale.', added: 'Taylor Day', added_on: '2026-11-02T10:00:00.000Z' },
    ],
  }
  mockProjectDocuments = { documents: [document] }
  mockAddReviewComment.mockReturnValue({
    unwrap: () => Promise.resolve({ review_comments: savedComments }),
  })

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Review Plan' }))
  expect(screen.getByRole('region', { name: 'Review comments for Plan' })).toBeInTheDocument()
  expect(screen.getByText('Check the scale.')).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Add a comment'), 'Please revise sheet two.')
  await userEvent.click(screen.getByRole('button', { name: 'Save comment' }))

  await waitFor(() => expect(mockAddReviewComment).toHaveBeenCalledWith({
    projectId: 'project-1',
    documentId: 'document-1',
    comment: 'Please revise sheet two.',
  }))
  expect(screen.getByRole('region', { name: 'Review comments for Plan' })).toBeInTheDocument()
  expect(screen.getByText('Please revise sheet two.')).toBeInTheDocument()
  expect(screen.getByLabelText('Add a comment')).toHaveValue('')
})

test('closing the review section clears its comment and collapses the section', async () => {
  mockProjectDocuments = {
    documents: [{
      id: 'document-1',
      file_path: '/plan.pdf',
      title: 'Plan',
      review_status: 'PENDING',
    }],
  }

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Review Plan' }))
  const commentField = screen.getByLabelText('Add a comment')
  await userEvent.type(commentField, 'Discard this comment.')
  await userEvent.click(screen.getByRole('button', { name: 'Close review for Plan' }))

  expect(screen.queryByRole('region', { name: 'Review comments for Plan' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Review Plan' })).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(screen.getByRole('button', { name: 'Review Plan' }))

  expect(screen.getByLabelText('Add a comment')).toHaveValue('')
})

test('hides the Review action without REVIEW_DOCUMENT permission', () => {
  mockDocumentPermissions = { ADD_DOCUMENT: true, REVIEW_DOCUMENT: false }
  mockSessionUser = {
    permissions: mockDocumentPermissions,
    first_name: 'Taylor',
    last_name: 'Day',
  }
  mockProjectDocuments = {
    documents: [{
      id: 'document-1',
      file_path: '/plan.pdf',
      title: 'Plan',
      review_status: 'PENDING',
    }],
  }

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.queryByRole('button', { name: 'Review Plan' })).not.toBeInTheDocument()
})

test('hides the Add Document action without ADD_DOCUMENT permission', () => {
  mockDocumentPermissions = { ADD_DOCUMENT: false }
  mockSessionUser = {
    permissions: mockDocumentPermissions,
    first_name: 'Taylor',
    last_name: 'Day',
  }
  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.queryByRole('button', { name: 'Add Document' })).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Add a document' })).not.toBeInTheDocument()
  expect(screen.getByText('Documents shared with this project will appear here.')).toBeInTheDocument()
})

test('keeps focus on Save while a document update is in progress', async () => {
  const document = {
    id: 'document-1',
    file_path: 'https://storage.example/plan.pdf',
    title: 'Plan',
    file_type: 'Drawings & Designs',
    review_status: 'PENDING',
  }
  mockUpdateProjectDocument.mockReturnValue({
    unwrap: () => new Promise(() => {}),
  })
  const onClose = jest.fn()
  const form = <AddDocumentForm projectId="project-1" document={document} onClose={onClose} />
  const { rerender } = render(form)
  const saveButton = screen.getByRole('button', { name: 'Save' })

  await userEvent.click(saveButton)
  expect(saveButton).toHaveFocus()

  mockIsUpdateLoading = true
  rerender(
    <AddDocumentForm projectId="project-1" document={document} onClose={onClose} />
  )
  expect(saveButton).toHaveFocus()
  expect(saveButton).toHaveAttribute('aria-disabled', 'true')
})

test('cancelling the delete dialog does not call the API and Delete confirms deletion', async () => {
  mockProjectDocuments = {
    documents: [
      {
        id: 'draft-1',
        file_path: 'https://storage.example/draft.pdf',
        title: 'Draft drawing',
        file_type: 'Drawings & Designs',
        review_status: 'DRAFT',
      },
      {
        id: 'approved-1',
        file_path: 'https://storage.example/approved.pdf',
        title: 'Approved drawing',
        file_type: 'Drawings & Designs',
        review_status: 'APPROVED',
      },
    ],
  }
  mockDeleteProjectDocument.mockReturnValue({
    unwrap: () => Promise.resolve({ success: true }),
  })
  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.getByRole('button', { name: 'Delete Draft drawing' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete Approved drawing' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Delete Draft drawing' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(
    '“Draft drawing” and its uploaded file will be permanently deleted.'
  )
  expect(screen.getAllByRole('button')).toEqual(
    expect.arrayContaining([
      screen.getByRole('button', { name: 'Cancel' }),
      screen.getByRole('button', { name: 'Delete' }),
    ])
  )
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockDeleteProjectDocument).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'Delete Draft drawing' }))
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(mockDeleteProjectDocument).toHaveBeenCalledWith({
    projectId: 'project-1',
    documentId: 'draft-1',
  })
})

test('hides edit actions for approved, rejected, and archived documents', () => {
  mockProjectDocuments = {
    documents: ['APPROVED', 'REJECTED', 'ARCHIVED', 'PENDING'].map((status) => ({
      id: status,
      file_path: `https://storage.example/${status.toLowerCase()}.pdf`,
      title: `${status} document`,
      file_type: 'Drawings & Designs',
      review_status: status,
    })),
  }

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.queryByRole('button', { name: 'Edit APPROVED document' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit REJECTED document' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit ARCHIVED document' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Edit PENDING document' })).toBeInTheDocument()
})

test('shows review status badges with distinct colors in the document list', () => {
  mockProjectDocuments = {
    documents: [
      { id: 'draft', file_path: '/draft.pdf', title: 'Draft file', review_status: 'DRAFT' },
      { id: 'review', file_path: '/review.pdf', title: 'Review file', review_status: 'UNDER_REVIEW' },
      { id: 'approved', file_path: '/approved.pdf', title: 'Approved file', review_status: 'APPROVED' },
      { id: 'rejected', file_path: '/rejected.pdf', title: 'Rejected file', review_status: 'REJECTED' },
    ],
  }

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.getByText('Draft')).toHaveClass('bg-slate-100')
  expect(screen.getByText('Under Review')).toHaveClass('bg-blue-100')
  expect(screen.getByText('Approved')).toHaveClass('bg-emerald-100')
  expect(screen.getByText('Rejected')).toHaveClass('bg-red-100')
})

test('provides the specified document category, review status, and visibility options', () => {
  render(<AddDocumentForm onClose={jest.fn()} />)

  const categoryOptions = within(screen.getByLabelText(/^Document category/))
    .getAllByRole('option')
    .map((option) => option.textContent)
  expect(categoryOptions).toEqual([
    'Select a category',
    'Legal & Approvals',
    'Drawings & Designs',
    'Contract & Commercial',
    'Quality & Testing',
    'Safety & Compliance',
    'Site Progress & Reports',
    'Other',
  ])

  const reviewStatusOptions = within(screen.getByLabelText(/^Review status/))
    .getAllByRole('option')
    .map((option) => option.textContent)
  expect(reviewStatusOptions).toEqual([
    'Select a review status',
    'Draft',
    'Pending',
    'Under Review',
    'Changes Requested',
    'Resubmitted',
    'Approved',
    'Rejected',
    'Archived',
  ])

  const visibilityOptions = within(screen.getByLabelText(/^Visibility/))
    .getAllByRole('option')
    .map((option) => option.textContent)
  expect(visibilityOptions).toEqual([
    'Select visibility',
    'Private',
    'Project Team',
    'Project Owner',
    'Engineer Only',
    'Owner & Engineer',
    'All Project Members',
    'Public',
  ])
})

test('requires at least one file before uploading', async () => {
  render(<AddDocumentForm projectId="project-1" onClose={jest.fn()} />)
  const filesInput = screen.getByLabelText('Files')

  fireEvent.change(screen.getByLabelText(/^Document title/), {
    target: { value: 'Structural drawings' },
  })
  await userEvent.selectOptions(
    screen.getByLabelText(/^Document category/),
    'Drawings & Designs'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText('Select at least one file to upload.')).toHaveAttribute(
    'role',
    'alert'
  )
  expect(
    screen.getByText(
      'There are items that require your attention!!'
    )
  ).toHaveAttribute('role', 'alert')
  expect(mockUploadProjectDocuments).not.toHaveBeenCalled()

  expect(filesInput).toHaveClass('aria-invalid:border-red-500')
  await userEvent.upload(
    filesInput,
    new File(['drawing'], 'drawing.pdf', { type: 'application/pdf' })
  )
  expect(filesInput).toHaveAttribute('aria-invalid', 'false')
})

test('keeps the form open and displays the API error when upload fails', async () => {
  const onClose = jest.fn()
  mockUploadProjectDocuments.mockReturnValue({
    unwrap: () => Promise.reject({ data: { error: 'Storage is unavailable' } }),
  })
  render(<AddDocumentForm projectId="project-1" onClose={onClose} />)

  fireEvent.change(screen.getByLabelText(/^Document title/), {
    target: { value: 'Structural drawings' },
  })
  await userEvent.selectOptions(
    screen.getByLabelText(/^Document category/),
    'Drawings & Designs'
  )
  const file = new File(['drawing'], 'drawing.pdf', { type: 'application/pdf' })
  await userEvent.upload(screen.getByLabelText('Files'), file)
  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  })

  expect(await screen.findByRole('alert')).toHaveTextContent('Storage is unavailable')
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('uploads the document fields and closes the form after success', async () => {
  const onClose = jest.fn()
  mockUploadProjectDocuments.mockReturnValue({
    unwrap: () => Promise.resolve({ documents: [] }),
  })
  render(<AddDocumentForm projectId="project-1" onClose={onClose} />)

  fireEvent.change(screen.getByLabelText(/^Document title/), {
    target: { value: 'Structural drawings' },
  })
  await userEvent.selectOptions(
    screen.getByLabelText(/^Document category/),
    'Drawings & Designs'
  )
  await userEvent.selectOptions(
    screen.getByLabelText(/^Review status/),
    'Under Review'
  )
  const file = new File(['drawing'], 'drawing.pdf', { type: 'application/pdf' })
  await userEvent.upload(screen.getByLabelText('Files'), file)
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(mockUploadProjectDocuments).toHaveBeenCalledTimes(1)
  const request = mockUploadProjectDocuments.mock.calls[0][0]
  expect(request.projectId).toBe('project-1')
  expect(request.formData.get('title')).toBe('Structural drawings')
  expect(request.formData.get('category')).toBe('Drawings & Designs')
  expect(request.formData.get('reviewStatus')).toBe('UNDER REVIEW')
  expect(request.formData.getAll('files')).toHaveLength(1)
  expect(request.formData.getAll('files')[0].name).toBe('drawing.pdf')
})

test('edits an unlocked review status and uploads an optional replacement file', async () => {
  const document = {
    id: 'approved-1',
    file_path: 'https://storage.example/approved.pdf',
    title: 'Pending drawing',
    description: 'Current plan',
    file_type: 'Drawings & Designs',
    reference_number: 'D-014',
    review_status: 'PENDING',
    visibility: 'PROJECT_TEAM',
    document_date: '2026-10-25',
  }
  mockProjectDocuments = { documents: [document] }
  mockUpdateProjectDocument.mockReturnValue({
    unwrap: () => Promise.resolve({ document }),
  })

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Edit Pending drawing' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Document title/)).toHaveValue('Pending drawing')
  expect(screen.getByLabelText(/^Document description/)).toHaveValue('Current plan')
  const reviewStatus = screen.getByLabelText(/^Review status/)
  expect(reviewStatus).toHaveValue('Pending')
  expect(reviewStatus).toBeEnabled()
  expect(within(reviewStatus).queryByRole('option', { name: 'Draft' })).not.toBeInTheDocument()
  expect(screen.getByLabelText(/^Visibility/)).toHaveValue('Project Team')

  fireEvent.change(screen.getByLabelText(/^Document title/), {
    target: { value: 'Revised pending drawing' },
  })
  const replacement = new File(['new drawing'], 'revised.pdf', { type: 'application/pdf' })
  await userEvent.upload(screen.getByLabelText(/^Replace file/), replacement)
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(mockUpdateProjectDocument).toHaveBeenCalledTimes(1))
  const request = mockUpdateProjectDocument.mock.calls[0][0]
  expect(request).toMatchObject({ projectId: 'project-1', documentId: 'approved-1' })
  expect(request.formData.get('title')).toBe('Revised pending drawing')
  expect(request.formData.get('category')).toBe('Drawings & Designs')
  expect(request.formData.get('reviewStatus')).toBe('PENDING')
  expect(request.formData.getAll('files')).toHaveLength(1)
  expect(request.formData.getAll('files')[0].name).toBe('revised.pdf')
})

test('hides Draft while editing a non-draft unlocked status', () => {
  const document = {
    id: 'pending-1',
    file_path: 'https://storage.example/pending.pdf',
    title: 'Pending plan',
    file_type: 'Drawings & Designs',
    review_status: 'PENDING',
  }
  render(<AddDocumentForm projectId="project-1" document={document} onClose={jest.fn()} />)

  const reviewStatus = screen.getByLabelText(/^Review status/)
  expect(reviewStatus).toBeEnabled()
  expect(reviewStatus).toHaveValue('Pending')
  expect(within(reviewStatus).queryByRole('option', { name: 'Draft' })).not.toBeInTheDocument()
})

test('opens a PDF preview and keeps the original-file link out of the modal', async () => {
  mockProjectDocuments = {
    documents: [
      {
        id: 'document-1',
        file_path: 'https://storage.example/document.pdf',
        title: 'Structural drawings',
        file_type: 'Drawings & Designs',
        reference_number: 'S-001',
        document_date: '2026-10-25',
      },
    ],
  }
  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.getByText('Structural drawings')).toBeInTheDocument()
  expect(screen.getByText(/Drawings & Designs · S-001 · 2026-10-25/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Open Structural drawings' }))

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByTitle('Preview of Structural drawings')).toHaveAttribute(
    'src',
    'https://storage.example/document.pdf'
  )
  expect(screen.queryByRole('link', { name: 'Open original file' })).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('downloads the file as a blob without navigating to its storage URL', async () => {
  mockProjectDocuments = {
    documents: [
      {
        id: 'document-1',
        file_path: 'https://storage.example/document.pdf',
        title: 'Structural drawings',
        file_type: 'Drawings & Designs',
      },
    ],
  }
  const originalFetch = global.fetch
  const originalCreateObjectUrl = window.URL.createObjectURL
  const originalRevokeObjectUrl = window.URL.revokeObjectURL
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(['pdf bytes'], { type: 'application/pdf' })),
  })
  const createObjectUrlMock = jest.fn().mockReturnValue('blob:document-preview')
  const revokeObjectUrlMock = jest.fn()
  let clickedDownload
  global.fetch = fetchMock
  window.URL.createObjectURL = createObjectUrlMock
  window.URL.revokeObjectURL = revokeObjectUrlMock
  const clickSpy = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function captureDownload() {
      clickedDownload = { href: this.href, filename: this.download }
    })

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Download Structural drawings' }))
  await waitFor(() => expect(clickedDownload).toBeDefined())

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/projects\/project-1\/documents\/document-1\/download$/),
    { credentials: 'include' }
  )
  expect(clickedDownload).toEqual({
    href: 'blob:document-preview',
    filename: 'Structural drawings.pdf',
  })
  expect(clickedDownload.href).not.toContain('storage.example')

  clickSpy.mockRestore()
  global.fetch = originalFetch
  window.URL.createObjectURL = originalCreateObjectUrl
  window.URL.revokeObjectURL = originalRevokeObjectUrl
})

test('previews images and extracts readable text from Word documents', async () => {
  mockProjectDocuments = {
    documents: [
      {
        id: 'image-document',
        file_path: 'https://storage.example/site-photo.jpg',
        title: 'Site photo',
        file_type: 'Other',
      },
      {
        id: 'word-document',
        file_path: 'https://storage.example/specification.docx',
        title: 'Specification',
        file_type: 'Other',
      },
    ],
  }
  const originalFetch = global.fetch
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })
  const mammoth = require('mammoth')
  mammoth.extractRawText = jest.fn().mockResolvedValue({ value: 'Document contents' })

  render(
    <MemoryRouter>
      <DocumentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Open Site photo' }))
  expect(screen.getByRole('img', { name: 'Site photo' })).toHaveAttribute(
    'src',
    'https://storage.example/site-photo.jpg'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Close document preview' }))
  await userEvent.click(screen.getByRole('button', { name: 'Open Specification' }))
  expect(await screen.findByText('Document contents')).toBeInTheDocument()
  global.fetch = originalFetch
})
