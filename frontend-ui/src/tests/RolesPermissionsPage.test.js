import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RolesPermissionsPage from '../pages/users/admin/roles-permissions'

const mockGetAdminRolesQuery = jest.fn()
const mockCreateAdminRole = jest.fn()
const mockUpdateAdminRole = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetAdminRolesQuery: () => mockGetAdminRolesQuery(),
  useCreateAdminRoleMutation: () => [mockCreateAdminRole, { isLoading: false }],
  useUpdateAdminRoleMutation: () => [mockUpdateAdminRole, { isLoading: false }],
}))

const roles = [
  {
    id: 'role-1',
    role_name: 'Administrator',
    role_code: 'ADMIN',
    description: 'System access',
    is_active: true,
  },
  {
    id: 'role-2',
    role_name: 'Project Manager',
    role_code: 'PROJECT_MANAGER',
    description: '',
    is_active: false,
  },
]

beforeEach(() => {
  mockGetAdminRolesQuery.mockReturnValue({
    data: roles,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockCreateAdminRole.mockReset()
  mockUpdateAdminRole.mockReset()
  mockCreateAdminRole.mockReturnValue({ unwrap: () => Promise.resolve({}) })
  mockUpdateAdminRole.mockReturnValue({ unwrap: () => Promise.resolve({}) })
})

test('shows configured roles and clearly labels permissions as coming soon', () => {
  render(<RolesPermissionsPage />)

  expect(screen.getByRole('heading', { name: 'Roles & Permissions' })).toBeInTheDocument()
  expect(
    screen.getByRole('table', {
      name: 'Configured roles, descriptions, status, role codes, and actions',
    })
  ).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Project Manager PROJECT_MANAGER/ })).toBeInTheDocument()
  expect(screen.getByText('System access')).toBeInTheDocument()
  expect(screen.getByText('No description')).toBeInTheDocument()
  expect(screen.getByText('Inactive')).toBeInTheDocument()
  expect(screen.getByText('Coming soon')).toBeInTheDocument()
  expect(screen.getByText(/No permissions are configured or enforced here/i)).toBeInTheDocument()
})

test('creates a role from the dialog and closes it on success', async () => {
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Add role' }))

  expect(screen.getByRole('dialog', { name: 'Add a role' })).toBeInTheDocument()
  const nameInput = screen.getByRole('textbox', { name: /Role name/ })
  fireEvent.change(nameInput, { target: { value: ' Site  Supervisor ' } })
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: '  Oversees project sites  ' },
  })
  expect(screen.getByRole('checkbox', { name: /Active/ })).toBeChecked()
  expect(screen.getByText('SITE_SUPERVISOR')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

  await waitFor(() => {
    expect(mockCreateAdminRole).toHaveBeenCalledWith({
      role_name: 'Site  Supervisor',
      description: 'Oversees project sites',
      is_active: true,
    })
  })
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

test('allows creating an inactive role with an empty description', async () => {
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Add role' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Role name/ }), {
    target: { value: 'Auditor' },
  })
  fireEvent.click(screen.getByRole('checkbox', { name: /Active/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

  await waitFor(() => {
    expect(mockCreateAdminRole).toHaveBeenCalledWith({
      role_name: 'Auditor',
      description: '',
      is_active: false,
    })
  })
})

test('edits role details without exposing or changing the generated role code', async () => {
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Project Manager' }))

  expect(screen.getByRole('dialog', { name: 'Edit role' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: /Role name/ })).toHaveValue('Project Manager')
  expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('')
  expect(screen.getByRole('checkbox', { name: /Active/ })).not.toBeChecked()
  expect(screen.getByText('Immutable role code')).toBeInTheDocument()
  expect(screen.getAllByText('PROJECT_MANAGER')).toHaveLength(2)
  expect(screen.getByText(/cannot be changed/i)).toBeInTheDocument()

  fireEvent.change(screen.getByRole('textbox', { name: /Role name/ }), {
    target: { value: 'Program Manager' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: 'Coordinates programs' },
  })
  fireEvent.click(screen.getByRole('checkbox', { name: /Active/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  await waitFor(() => {
    expect(mockUpdateAdminRole).toHaveBeenCalledWith({
      roleId: 'role-2',
      role_name: 'Program Manager',
      description: 'Coordinates programs',
      is_active: true,
    })
  })
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

test('keeps the edit dialog open and surfaces update errors', async () => {
  mockUpdateAdminRole.mockReturnValueOnce({
    unwrap: () => Promise.reject({ data: { error: 'A role with this name already exists' } }),
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Project Manager' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A role with this name already exists'
  )
  expect(screen.getByRole('dialog', { name: 'Edit role' })).toBeInTheDocument()
})

test('surfaces API errors without closing the dialog', async () => {
  mockCreateAdminRole.mockReturnValueOnce({
    unwrap: () => Promise.reject({ data: { error: 'A role with this name already exists' } }),
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Add role' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Role name/ }), {
    target: { value: 'Editor' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A role with this name already exists'
  )
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('shows loading, retryable error, and empty role states', () => {
  mockGetAdminRolesQuery.mockReturnValueOnce({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })
  const { rerender } = render(<RolesPermissionsPage />)
  expect(screen.getByRole('status', { name: 'Loading roles' })).toBeInTheDocument()

  const refetch = jest.fn()
  mockGetAdminRolesQuery.mockReturnValueOnce({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch,
  })
  rerender(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()

  mockGetAdminRolesQuery.mockReturnValueOnce({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  rerender(<RolesPermissionsPage />)
  expect(screen.getByText('No roles yet')).toBeInTheDocument()
})
