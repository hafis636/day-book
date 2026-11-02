import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RolesPermissionsPage from '../pages/users/admin/roles-permissions'

const mockGetAdminRolesQuery = jest.fn()
const mockGetAdminPermissionsQuery = jest.fn()
const mockGetAdminPlansQuery = jest.fn()
const mockCreateAdminRole = jest.fn()
const mockUpdateAdminRole = jest.fn()
const mockCreateAdminPermission = jest.fn()
const mockUpdateAdminPermission = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetAdminRolesQuery: () => mockGetAdminRolesQuery(),
  useGetAdminPermissionsQuery: (...args) => mockGetAdminPermissionsQuery(...args),
  useGetAdminPlansQuery: (...args) => mockGetAdminPlansQuery(...args),
  useCreateAdminRoleMutation: () => [mockCreateAdminRole, { isLoading: false }],
  useUpdateAdminRoleMutation: () => [mockUpdateAdminRole, { isLoading: false }],
  useCreateAdminPermissionMutation: () => [mockCreateAdminPermission, { isLoading: false }],
  useUpdateAdminPermissionMutation: () => [mockUpdateAdminPermission, { isLoading: false }],
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
  mockGetAdminPermissionsQuery.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockGetAdminPlansQuery.mockReturnValue({
    data: {
      plans: [
        { plan_code: 'BASIC', plan_name: 'Basic' },
        { plan_code: 'PRO', plan_name: 'Professional' },
      ],
    },
  })
  mockCreateAdminRole.mockReset()
  mockUpdateAdminRole.mockReset()
  mockCreateAdminPermission.mockReset()
  mockUpdateAdminPermission.mockReset()
  mockCreateAdminRole.mockReturnValue({ unwrap: () => Promise.resolve({}) })
  mockUpdateAdminRole.mockReturnValue({ unwrap: () => Promise.resolve({}) })
  mockCreateAdminPermission.mockReturnValue({ unwrap: () => Promise.resolve({}) })
  mockUpdateAdminPermission.mockReturnValue({ unwrap: () => Promise.resolve({}) })
})

test('shows configured roles and keeps permissions in its own tab panel', () => {
  render(<RolesPermissionsPage />)

  expect(screen.getByRole('heading', { name: 'Roles & Permissions' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: 'Permissions' })).toHaveAttribute(
    'aria-selected',
    'false'
  )
  expect(screen.getByRole('tabpanel', { name: 'Roles' })).not.toHaveAttribute('hidden')
  expect(document.getElementById('permissions-panel')).toHaveAttribute('hidden')
  expect(
    screen.getByRole('table', {
      name: 'Configured roles, descriptions, status, role codes, and actions',
    })
  ).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Project Manager PROJECT_MANAGER/ })).toBeInTheDocument()
  expect(screen.getByText('System access')).toBeInTheDocument()
  expect(screen.getByText('No description')).toBeInTheDocument()
  expect(screen.getByText('Inactive')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))

  expect(screen.getByRole('tab', { name: 'Permissions' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  expect(screen.getByRole('tabpanel', { name: 'Permissions' })).not.toHaveAttribute('hidden')
  expect(screen.getByText('No permissions yet')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add permission' })).toBeInTheDocument()
})

test('lists permission assignments using the roles and plans catalog labels', () => {
  mockGetAdminPermissionsQuery.mockReturnValue({
    data: [{
      id: 'perm-1',
      permission_key: 'PROJECT_READ',
      role_ids: ['role-2'],
      plan_ids: ['BASIC'],
      description: 'Read project details',
      is_active: true,
    }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))

  expect(screen.getByRole('row', { name: /PROJECT_READ Project Manager Basic Read project details Active/ })).toBeInTheDocument()
})

test('shows permission loading and retryable error states', () => {
  mockGetAdminPermissionsQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })
  const { rerender } = render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  expect(screen.getByRole('status', { name: 'Loading permissions' })).toBeInTheDocument()

  const refetch = jest.fn()
  mockGetAdminPermissionsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch,
  })
  rerender(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()
})

test('shows catalog loading status and disables permission submission until both load', () => {
  mockGetAdminRolesQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })
  mockGetAdminPlansQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })

  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))

  expect(screen.getByText('Loading roles…')).toBeInTheDocument()
  expect(screen.getByText('Loading plans…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save permission' })).toBeDisabled()
})

test('shows retry controls for failed role and plan catalogs', () => {
  const refetchRoles = jest.fn()
  const refetchPlans = jest.fn()
  mockGetAdminRolesQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: refetchRoles,
  })
  mockGetAdminPlansQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: refetchPlans,
  })

  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))

  expect(screen.getAllByRole('alert')).toHaveLength(2)
  expect(screen.getByText('Roles couldn’t be loaded.')).toBeInTheDocument()
  expect(screen.getByText('Plans couldn’t be loaded.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save permission' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry roles' }))
  fireEvent.click(screen.getByRole('button', { name: 'Retry plans' }))
  expect(refetchRoles).toHaveBeenCalledTimes(1)
  expect(refetchPlans).toHaveBeenCalledTimes(1)
})

test('enables permission submission after both catalogs become available', () => {
  mockGetAdminRolesQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })
  mockGetAdminPlansQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })

  const { rerender } = render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))
  expect(screen.getByRole('button', { name: 'Save permission' })).toBeDisabled()

  mockGetAdminRolesQuery.mockReturnValue({
    data: roles,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockGetAdminPlansQuery.mockReturnValue({
    data: { plans: [{ plan_code: 'BASIC', plan_name: 'Basic' }] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  rerender(<RolesPermissionsPage />)

  expect(screen.getByRole('button', { name: 'Save permission' })).toBeEnabled()
})

test.each([
  ['role', 'plan'],
  ['plan', 'role'],
])('requires a selected %s before creating a permission', (missingAssignment, selectedAssignment) => {
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Permission key/ }), {
    target: { value: 'PROJECT_READ' },
  })

  const selectedChoice = screen.getByRole('checkbox', {
    name: selectedAssignment === 'role' ? /Project Manager/ : /Basic/,
  })
  fireEvent.click(selectedChoice)
  fireEvent.click(screen.getByRole('button', { name: 'Save permission' }))

  const missingSelect = document.getElementById(
    missingAssignment === 'role' ? 'permission-roles' : 'permission-plans'
  )
  const expectedError = `Select at least one ${missingAssignment}.`
  expect(screen.getByRole('alert')).toHaveTextContent(expectedError)
  expect(missingSelect).toHaveAttribute('aria-required', 'true')
  expect(missingSelect).toHaveAttribute('aria-invalid', 'true')
  expect(missingSelect.getAttribute('aria-describedby')).toContain(
    `permission-${missingAssignment === 'role' ? 'roles' : 'plans'}-error`
  )
  expect(mockCreateAdminPermission).not.toHaveBeenCalled()
})

test('creates a permission with plan codes, selected role IDs, and filtered key input', async () => {
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))

  const dialog = screen.getByRole('dialog', { name: 'Add permission' })
  const keyInput = screen.getByRole('textbox', { name: /Permission key/ })
  fireEvent.change(keyInput, { target: { value: 'project-read 2' } })
  expect(keyInput).toHaveValue('PROJECTREAD')

  expect(document.querySelector('select[multiple]')).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /Administrator/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: /Project Manager/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Basic/ }))
  expect(screen.getAllByText('Selected')).toHaveLength(2)
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: '  Read project details  ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save permission' }))

  await waitFor(() => {
    expect(mockCreateAdminPermission).toHaveBeenCalledWith({
      permission_key: 'PROJECTREAD',
      role_ids: ['role-2'],
      plan_ids: ['BASIC'],
      description: 'Read project details',
      is_active: true,
    })
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(dialog).not.toBeInTheDocument()
})

test('makes selected assignment choices visible and lets users clear them', () => {
  mockGetAdminPlansQuery.mockReturnValue({
    data: {
      plans: [
        { plan_code: 'BASIC', plan_name: 'Basic' },
        { plan_code: 'ADMIN', plan_name: 'Administrator' },
      ],
    },
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))

  const roleChoice = screen.getByRole('checkbox', { name: /Project Manager/ })
  const planChoice = screen.getByRole('checkbox', { name: /Basic/ })
  expect(screen.queryByRole('checkbox', { name: /Administrator/ })).not.toBeInTheDocument()
  expect(roleChoice).not.toBeChecked()
  expect(planChoice).not.toBeChecked()

  fireEvent.click(roleChoice)
  fireEvent.click(planChoice)
  expect(roleChoice).toBeChecked()
  expect(planChoice).toBeChecked()
  expect(screen.getAllByText('Selected')).toHaveLength(2)
  expect(screen.getByText('1 selected: Project Manager')).toBeInTheDocument()
  expect(screen.getByText('1 selected: Basic')).toBeInTheDocument()

  fireEvent.click(roleChoice)
  fireEvent.click(planChoice)
  expect(roleChoice).not.toBeChecked()
  expect(planChoice).not.toBeChecked()
  expect(screen.getAllByText('No choices selected')).toHaveLength(2)
})

test('keeps entered permission values and surfaces API errors', async () => {
  mockCreateAdminPermission.mockReturnValueOnce({
    unwrap: () => Promise.reject({ data: { error: 'A permission with this key already exists' } }),
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add permission' }))
  const keyInput = screen.getByRole('textbox', { name: /Permission key/ })
  fireEvent.change(keyInput, { target: { value: 'PROJECT_WRITE' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /Project Manager/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Basic/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save permission' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A permission with this key already exists'
  )
  expect(screen.getByRole('dialog', { name: 'Add permission' })).toBeInTheDocument()
  expect(keyInput).toHaveValue('PROJECT_WRITE')
})

test('edits a permission without sending or changing its immutable key', async () => {
  mockGetAdminRolesQuery.mockReturnValue({
    data: [
      ...roles,
      {
        id: 'role-3',
        role_name: 'Reviewer',
        role_code: 'REVIEWER',
        description: '',
        is_active: true,
      },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockGetAdminPermissionsQuery.mockReturnValue({
    data: [{
      id: 4321,
      permission_key: 'PROJECT_READ',
      role_ids: ['role-2'],
      plan_ids: ['BASIC'],
      description: 'Read project details',
      is_active: true,
    }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit PROJECT_READ' }))

  const keyInput = screen.getByRole('textbox', { name: /Permission key.*cannot be changed/ })
  expect(screen.getByRole('dialog', { name: 'Edit permission' })).toBeInTheDocument()
  expect(keyInput).toHaveValue('PROJECT_READ')
  expect(keyInput).toHaveAttribute('readonly')
  fireEvent.change(keyInput, { target: { value: 'PROJECT_WRITE' } })
  expect(keyInput).toHaveValue('PROJECT_READ')
  expect(screen.getByRole('checkbox', { name: /Project Manager/ })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: /Basic/ })).toBeChecked()

  fireEvent.click(screen.getByRole('checkbox', { name: /Project Manager/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Reviewer/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Professional/ }))
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: 'Updated project access' },
  })
  fireEvent.click(screen.getByRole('checkbox', { name: /Active/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save permission' }))

  await waitFor(() => {
    expect(mockUpdateAdminPermission).toHaveBeenCalledWith({
      permissionId: 4321,
      role_ids: ['role-3'],
      plan_ids: ['BASIC', 'PRO'],
      description: 'Updated project access',
      is_active: false,
    })
  })
  expect(mockCreateAdminPermission).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('keeps permission edit values open when the update fails', async () => {
  mockGetAdminPermissionsQuery.mockReturnValue({
    data: [{
      id: 'perm-1',
      permission_key: 'PROJECT_READ',
      role_ids: ['role-2'],
      plan_ids: ['BASIC'],
      description: 'Read project details',
      is_active: true,
    }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockUpdateAdminPermission.mockReturnValueOnce({
    unwrap: () => Promise.reject({ data: { error: 'Permission not found' } }),
  })
  render(<RolesPermissionsPage />)
  fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit PROJECT_READ' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: 'Updated description' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save permission' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Permission not found')
  expect(screen.getByRole('textbox', { name: /Permission key.*cannot be changed/ })).toHaveValue(
    'PROJECT_READ'
  )
  expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('Updated description')
})

test('supports arrow, Home, and End keyboard navigation between tabs', () => {
  render(<RolesPermissionsPage />)
  const rolesTab = screen.getByRole('tab', { name: 'Roles' })
  const permissionsTab = screen.getByRole('tab', { name: 'Permissions' })

  rolesTab.focus()
  fireEvent.keyDown(rolesTab, { key: 'ArrowRight' })
  expect(permissionsTab).toHaveAttribute('aria-selected', 'true')
  expect(document.activeElement).toBe(permissionsTab)

  fireEvent.keyDown(permissionsTab, { key: 'ArrowRight' })
  expect(rolesTab).toHaveAttribute('aria-selected', 'true')
  expect(document.activeElement).toBe(rolesTab)

  fireEvent.keyDown(rolesTab, { key: 'ArrowLeft' })
  expect(permissionsTab).toHaveAttribute('aria-selected', 'true')
  expect(document.activeElement).toBe(permissionsTab)

  fireEvent.keyDown(permissionsTab, { key: 'Home' })
  expect(rolesTab).toHaveAttribute('aria-selected', 'true')
  expect(document.activeElement).toBe(rolesTab)

  fireEvent.keyDown(rolesTab, { key: 'End' })
  expect(permissionsTab).toHaveAttribute('aria-selected', 'true')
  expect(document.activeElement).toBe(permissionsTab)
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
