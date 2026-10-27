import { act, fireEvent, render, screen, within } from '@testing-library/react'
import AddProjectForm from '../pages/dashboard/engineer/forms/AddProjectForm'

const mockCreateProject = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useCreateProjectMutation: () => [mockCreateProject, { isLoading: false }],
}))

beforeEach(() => {
  URL.createObjectURL.mockClear()
  mockCreateProject.mockReset()
  mockCreateProject.mockReturnValue({
    unwrap: () => Promise.resolve({ project: { id: 'project-1' } }),
  })
})

test('renders required project fields and optional project details', () => {
  render(<AddProjectForm />)

  expect(screen.getByRole('heading', { name: 'Add Project' })).toBeInTheDocument()
  const projectFormCard = screen.getByRole('heading', { name: 'Add Project' }).closest('section')
  expect(projectFormCard).toHaveClass('w-full')
  expect(projectFormCard).not.toHaveClass('max-w-4xl')
  expect(projectFormCard).not.toHaveClass('mx-auto')
  expect(screen.getByLabelText(/^Project Name/)).toBeRequired()
  expect(screen.getByLabelText(/^Project Type/)).toBeRequired()
  expect(screen.getByLabelText(/^Description/)).not.toBeRequired()
  expect(screen.getByLabelText(/^Status/)).not.toBeRequired()
  expect(screen.getByLabelText('Start Date')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('Expected Completion Date')).toHaveAttribute(
    'type',
    'date'
  )
  expect(screen.getByLabelText('Actual Completion Date')).toHaveAttribute(
    'type',
    'date'
  )
  expect(screen.getByLabelText(/^Address/)).toBeInTheDocument()
  expect(screen.getByLabelText(/^Project Info/)).toBeInTheDocument()
  expect(screen.getByLabelText(/^Cover Image/)).toHaveAttribute(
    'accept',
    'image/jpeg,image/png,image/gif,image/webp'
  )
  expect(screen.getByLabelText(/^Cover Image/)).not.toBeRequired()
  expect(screen.getByLabelText(/^Other Images/)).toHaveAttribute('multiple')
  expect(screen.getByLabelText(/^Other Images/)).not.toBeRequired()
  expect(screen.getByText(/up to 10 other images/i)).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Project Details' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: /Project Dates/ })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Location And Notes' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: /Project Images/ })).toBeInTheDocument()
})

test('provides the specified project type and status options', () => {
  render(<AddProjectForm />)

  const projectTypeOptions = within(screen.getByLabelText(/^Project Type/))
    .getAllByRole('option')
    .map((option) => option.textContent)
  expect(projectTypeOptions).toEqual([
    'Choose a Project Type',
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
    'Select a Status',
    'In Discussion',
    'Planning',
    'Ongoing',
    'Completed',
  ])
  expect(
    within(screen.getByLabelText(/^Status/)).getByRole('option', {
      name: 'In Discussion',
    })
  ).toHaveValue('In discussion')
})

test('submits valid project data to the API and reports success', async () => {
  render(<AddProjectForm />)
  const form = screen
    .getByRole('button', { name: 'Create Project' })
    .closest('form')

  fireEvent.submit(form)
  expect(mockCreateProject).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText(/^Project Name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project Type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Status/), {
    target: { value: 'In discussion' },
  })
  fireEvent.submit(form)

  expect(mockCreateProject).toHaveBeenCalledTimes(1)
  const requestData = mockCreateProject.mock.calls[0][0]
  expect(requestData.get('name')).toBe('Riverside Apartment')
  expect(requestData.get('project_type')).toBe('Apartment')
  expect(requestData.get('status')).toBe('In discussion')
  expect(await screen.findByRole('status')).toHaveTextContent('Project created successfully.')
})

test('sends the selected images and project fields as multipart form data', async () => {
  render(<AddProjectForm />)
  const coverImage = new File(['cover'], 'cover.png', { type: 'image/png' })
  const otherImage = new File(['detail'], 'detail.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText(/^Project Name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project Type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.change(screen.getByLabelText('Start Date'), {
    target: { value: '2026-10-01' },
  })
  fireEvent.change(screen.getByLabelText(/^Cover Image/), {
    target: { files: [coverImage] },
  })
  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [otherImage] },
  })

  await act(async () => {
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create Project' }).closest('form')
    )
  })

  const requestData = mockCreateProject.mock.calls[0][0]
  expect(requestData.get('start_date')).toBe('2026-10-01')
  expect(requestData.get('coverImage')).toBe(coverImage)
  expect(requestData.getAll('otherImages')).toEqual([otherImage])
  expect(await screen.findByRole('status')).toHaveTextContent('Project created successfully.')
})

test('previews newly selected images and uploads only the remaining files on submit', async () => {
  render(<AddProjectForm />)
  const coverImage = new File(['cover'], 'temporary-cover.png', { type: 'image/png' })
  const retainedImage = new File(['detail'], 'retained-detail.jpg', {
    type: 'image/jpeg',
  })
  const removedImage = new File(['removed'], 'removed-detail.jpg', {
    type: 'image/jpeg',
  })

  fireEvent.change(screen.getByLabelText(/^Cover Image/), {
    target: { files: [coverImage] },
  })
  fireEvent.change(screen.getByLabelText(/^Cover Image/), {
    target: {
      files: [new File(['replacement'], 'replacement-cover.png', { type: 'image/png' })],
    },
  })
  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [retainedImage] },
  })
  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [removedImage] },
  })

  expect(URL.createObjectURL).toHaveBeenCalled()
  expect(screen.queryByRole('img', { name: 'temporary-cover.png' })).not.toBeInTheDocument()
  expect(
    await screen.findByRole('img', { name: 'replacement-cover.png' })
  ).toBeInTheDocument()
  expect(await screen.findByRole('img', { name: 'retained-detail.jpg' })).toBeInTheDocument()
  expect(await screen.findByRole('img', { name: 'removed-detail.jpg' })).toBeInTheDocument()
  expect(mockCreateProject).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Remove removed-detail.jpg' })).toHaveAttribute(
    'title',
    'Remove'
  )

  fireEvent.click(screen.getByRole('button', { name: 'Remove removed-detail.jpg' }))
  expect(screen.queryByRole('img', { name: 'removed-detail.jpg' })).not.toBeInTheDocument()
  expect(mockCreateProject).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText(/^Project Name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project Type/), {
    target: { value: 'Apartment' },
  })
  await act(async () => {
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create Project' }).closest('form')
    )
  })

  const requestData = mockCreateProject.mock.calls[0][0]
  expect(requestData.get('coverImage').name).toBe('replacement-cover.png')
  expect(requestData.getAll('otherImages')).toEqual([retainedImage])
})

test('rejects oversized cover and other images and blocks submission', () => {
  render(<AddProjectForm />)
  const coverInput = screen.getByLabelText(/^Cover Image/)
  const otherImagesInput = screen.getByLabelText(/^Other Images/)
  const oversizedImage = new File(
    [new Uint8Array(5 * 1024 * 1024 + 1)],
    'large.png',
    { type: 'image/png' }
  )

  fireEvent.change(coverInput, { target: { files: [oversizedImage] } })
  expect(screen.getByRole('alert')).toHaveTextContent(
    'large.png exceeds the 5 MB per-file limit'
  )
  const resetCoverInput = screen.getByLabelText(/^Cover Image/)
  expect(resetCoverInput).toHaveAttribute('aria-invalid', 'true')
  expect(resetCoverInput.files).toHaveLength(0)

  fireEvent.change(otherImagesInput, { target: { files: [oversizedImage] } })
  expect(screen.getAllByRole('alert')).toHaveLength(2)
  expect(screen.getByLabelText(/^Other Images/).files).toHaveLength(0)

  fireEvent.change(screen.getByLabelText(/^Project Name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project Type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.submit(
    screen.getByRole('button', { name: 'Create Project' }).closest('form')
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('accepts images at the 5 MB limit and supports multiple other images', () => {
  render(<AddProjectForm />)
  const coverInput = screen.getByLabelText(/^Cover Image/)
  const otherImagesInput = screen.getByLabelText(/^Other Images/)
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
  render(<AddProjectForm />)
  const otherImagesInput = screen.getByLabelText(/^Other Images/)
  const validImage = new File(['image'], 'valid.png', { type: 'image/png' })
  const nonImageFile = new File(['text'], 'notes.txt', { type: 'text/plain' })

  fireEvent.change(otherImagesInput, {
    target: { files: [validImage, nonImageFile] },
  })

  expect(screen.getByRole('alert')).toHaveTextContent(
    'notes.txt is not a supported image file'
  )
  expect(screen.getByLabelText(/^Other Images/)).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(screen.getByLabelText(/^Other Images/).files).toHaveLength(0)

  fireEvent.change(screen.getByLabelText(/^Project Name/), {
    target: { value: 'Riverside Apartment' },
  })
  fireEvent.change(screen.getByLabelText(/^Project Type/), {
    target: { value: 'Apartment' },
  })
  fireEvent.submit(
    screen.getByRole('button', { name: 'Create Project' }).closest('form')
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [validImage] },
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.submit(
    screen.getByRole('button', { name: 'Create Project' }).closest('form')
  )
  expect(mockCreateProject).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('status')).toHaveTextContent('Project created successfully.')
})

test('adds other images across selections and disables selection at ten images', () => {
  const existingImages = Array.from({ length: 8 }, (_, index) => ({
    image_url: `https://example.com/image-${index}.jpg`,
    title: `Existing ${index + 1}`,
    is_cover: false,
  }))
  render(<AddProjectForm existingImages={existingImages} />)
  const firstNewImage = new File(['first'], 'first.jpg', { type: 'image/jpeg' })
  const secondNewImage = new File(['second'], 'second.jpg', { type: 'image/jpeg' })
  const thirdNewImage = new File(['third'], 'third.jpg', { type: 'image/jpeg' })

  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [firstNewImage] },
  })
  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [secondNewImage] },
  })

  expect(screen.getByRole('img', { name: 'first.jpg' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'second.jpg' })).toBeInTheDocument()
  expect(screen.getByLabelText(/^Other Images/)).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: 'Remove Existing 1' }))
  expect(screen.getByLabelText(/^Other Images/)).toBeEnabled()
  fireEvent.change(screen.getByLabelText(/^Other Images/), {
    target: { files: [thirdNewImage] },
  })
  expect(screen.getByRole('img', { name: 'third.jpg' })).toBeInTheDocument()
  expect(screen.getByLabelText(/^Other Images/)).toBeDisabled()
})
