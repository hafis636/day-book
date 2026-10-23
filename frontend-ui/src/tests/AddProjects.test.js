import { act, fireEvent, render, screen, within } from '@testing-library/react'
import AddProjects from '../pages/dashboard/engineer/AddProjects'

const mockCreateProject = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useCreateProjectMutation: () => [mockCreateProject, { isLoading: false }],
}))

beforeEach(() => {
  mockCreateProject.mockReset()
  mockCreateProject.mockReturnValue({
    unwrap: () => Promise.resolve({ project: { id: 'project-1' } }),
  })
})

test('renders required project fields and optional project details', () => {
  render(<AddProjects />)

  expect(screen.getByRole('heading', { name: 'Add Projects' })).toBeInTheDocument()
  expect(screen.getByLabelText(/^Project name/)).toBeRequired()
  expect(screen.getByLabelText(/^Project type/)).toBeRequired()
  expect(screen.getByLabelText(/^Description/)).not.toBeRequired()
  expect(screen.getByLabelText(/^Status/)).not.toBeRequired()
  expect(screen.getByLabelText('Start date')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('Expected completion date')).toHaveAttribute(
    'type',
    'date'
  )
  expect(screen.getByLabelText('Actual completion date')).toHaveAttribute(
    'type',
    'date'
  )
  expect(screen.getByLabelText(/^Address/)).toBeInTheDocument()
  expect(screen.getByLabelText(/^Project info/)).toBeInTheDocument()
  expect(screen.getByLabelText(/^Cover image/)).toHaveAttribute(
    'accept',
    'image/jpeg,image/png,image/gif,image/webp'
  )
  expect(screen.getByLabelText(/^Cover image/)).not.toBeRequired()
  expect(screen.getByLabelText(/^Other images/)).toHaveAttribute('multiple')
  expect(screen.getByLabelText(/^Other images/)).not.toBeRequired()
  expect(screen.getByText(/up to 10 other images/i)).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Project details' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: /Project dates/ })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Location and notes' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: /Project images/ })).toBeInTheDocument()
})

test('provides the specified project type and status options', () => {
  render(<AddProjects />)

  const projectTypeOptions = within(screen.getByLabelText(/^Project type/))
    .getAllByRole('option')
    .map((option) => option.textContent)
  expect(projectTypeOptions).toEqual([
    'Choose a project type',
    'Residential House',
    'Villa',
    'Apartment',
    'Commercial Building',
    'Office',
    'Shop',
    'Hospital',
    'School',
    'Industrial',
    'Other',
  ])

  const statusOptions = within(screen.getByLabelText(/^Status/))
    .getAllByRole('option')
    .map((option) => option.textContent)
  expect(statusOptions).toEqual([
    'Select a status',
    'In discussion',
    'Planning',
    'Ongoing',
    'Completed',
  ])
})

test('submits valid project data to the API and reports success', async () => {
  render(<AddProjects />)
  const form = screen
    .getByRole('button', { name: 'Create project' })
    .closest('form')

  fireEvent.submit(form)
  expect(mockCreateProject).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText(/^Project name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.submit(form)

  expect(mockCreateProject).toHaveBeenCalledTimes(1)
  const requestData = mockCreateProject.mock.calls[0][0]
  expect(requestData.get('name')).toBe('Riverside Apartment')
  expect(requestData.get('project_type')).toBe('Apartment')
  expect(requestData.get('status')).toBe('')
  expect(await screen.findByRole('status')).toHaveTextContent('Project created successfully.')
})

test('sends the selected images and project fields as multipart form data', async () => {
  render(<AddProjects />)
  const coverImage = new File(['cover'], 'cover.png', { type: 'image/png' })
  const otherImage = new File(['detail'], 'detail.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText(/^Project name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.change(screen.getByLabelText('Start date'), {
    target: { value: '2026-10-01' },
  })
  fireEvent.change(screen.getByLabelText(/^Cover image/), {
    target: { files: [coverImage] },
  })
  fireEvent.change(screen.getByLabelText(/^Other images/), {
    target: { files: [otherImage] },
  })

  await act(async () => {
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create project' }).closest('form')
    )
  })

  const requestData = mockCreateProject.mock.calls[0][0]
  expect(requestData.get('start_date')).toBe('2026-10-01')
  expect(requestData.get('coverImage')).toBe(coverImage)
  expect(requestData.getAll('otherImages')).toEqual([otherImage])
  expect(await screen.findByRole('status')).toHaveTextContent('Project created successfully.')
})

test('rejects oversized cover and other images and blocks submission', () => {
  render(<AddProjects />)
  const coverInput = screen.getByLabelText(/^Cover image/)
  const otherImagesInput = screen.getByLabelText(/^Other images/)
  const oversizedImage = new File(
    [new Uint8Array(5 * 1024 * 1024 + 1)],
    'large.png',
    { type: 'image/png' }
  )

  fireEvent.change(coverInput, { target: { files: [oversizedImage] } })
  expect(screen.getByRole('alert')).toHaveTextContent(
    'large.png exceeds the 5 MB per-file limit'
  )
  const resetCoverInput = screen.getByLabelText(/^Cover image/)
  expect(resetCoverInput).toHaveAttribute('aria-invalid', 'true')
  expect(resetCoverInput.files).toHaveLength(0)

  fireEvent.change(otherImagesInput, { target: { files: [oversizedImage] } })
  expect(screen.getAllByRole('alert')).toHaveLength(2)
  expect(screen.getByLabelText(/^Other images/).files).toHaveLength(0)

  fireEvent.change(screen.getByLabelText(/^Project name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.submit(
    screen.getByRole('button', { name: 'Create project' }).closest('form')
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('accepts images at the 5 MB limit and supports multiple other images', () => {
  render(<AddProjects />)
  const coverInput = screen.getByLabelText(/^Cover image/)
  const otherImagesInput = screen.getByLabelText(/^Other images/)
  const imageAtLimit = new File(
    [new Uint8Array(5 * 1024 * 1024)],
    'at-limit.png',
    { type: 'image/png' }
  )

  fireEvent.change(coverInput, { target: { files: [imageAtLimit] } })
  expect(coverInput.files).toHaveLength(1)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  fireEvent.change(otherImagesInput, {
    target: { files: [imageAtLimit, new File(['small'], 'small.jpg', { type: 'image/jpeg' })] },
  })
  expect(otherImagesInput.files).toHaveLength(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('rejects non-image files and prevents submission until valid images are selected', async () => {
  render(<AddProjects />)
  const otherImagesInput = screen.getByLabelText(/^Other images/)
  const validImage = new File(['image'], 'valid.png', { type: 'image/png' })
  const nonImageFile = new File(['text'], 'notes.txt', { type: 'text/plain' })

  fireEvent.change(otherImagesInput, {
    target: { files: [validImage, nonImageFile] },
  })

  expect(screen.getByRole('alert')).toHaveTextContent(
    'notes.txt is not a supported image file'
  )
  expect(screen.getByLabelText(/^Other images/)).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(screen.getByLabelText(/^Other images/).files).toHaveLength(0)

  fireEvent.change(screen.getByLabelText(/^Project name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.submit(
    screen.getByRole('button', { name: 'Create project' }).closest('form')
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/^Other images/), {
    target: { files: [validImage] },
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.submit(
    screen.getByRole('button', { name: 'Create project' }).closest('form')
  )
  expect(mockCreateProject).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('status')).toHaveTextContent('Project created successfully.')
})
