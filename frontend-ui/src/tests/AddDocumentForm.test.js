import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

let mockUploadProjectDocuments
let mockProjectDocuments = { documents: [] }

jest.mock('../redux/services/users/usersApi', () => ({
  useUploadProjectDocumentsMutation: () => [
    mockUploadProjectDocuments,
    { isLoading: false },
  ],
  useGetProjectDocumentsQuery: () => ({
    data: mockProjectDocuments,
    isLoading: false,
    isError: false,
  }),
}))

import AddDocumentForm from '../pages/dashboard/engineer/forms/AddDocumentForm'
import DocumentsPage from '../pages/dashboard/engineer/sections/DocumentsPage'

beforeEach(() => {
  mockUploadProjectDocuments = jest.fn()
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
    'Superseded',
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

  fireEvent.change(screen.getByLabelText(/^Document title/), {
    target: { value: 'Structural drawings' },
  })
  await userEvent.selectOptions(
    screen.getByLabelText(/^Document category/),
    'Drawings & Designs'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Select at least one file to upload.'
  )
  expect(mockUploadProjectDocuments).not.toHaveBeenCalled()
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
  const file = new File(['drawing'], 'drawing.pdf', { type: 'application/pdf' })
  await userEvent.upload(screen.getByLabelText('Files'), file)
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(mockUploadProjectDocuments).toHaveBeenCalledTimes(1)
  const request = mockUploadProjectDocuments.mock.calls[0][0]
  expect(request.projectId).toBe('project-1')
  expect(request.formData.get('title')).toBe('Structural drawings')
  expect(request.formData.get('category')).toBe('Drawings & Designs')
  expect(request.formData.getAll('files')).toHaveLength(1)
  expect(request.formData.getAll('files')[0].name).toBe('drawing.pdf')
})

test('shows saved document details in the project documents section', () => {
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
  expect(screen.getByRole('link', { name: 'Open file' })).toHaveAttribute(
    'href',
    'https://storage.example/document.pdf'
  )
})
