import { render, screen } from '@testing-library/react'
import App from '../app/App'
import { getMenuItems } from '../menus/menu_config'

const mockGetCurrentSessionQuery = jest.fn()
const mockGetAdminRolesQuery = jest.fn()
const mockLogout = jest.fn()
const mockCreateAdminRole = jest.fn()
const mockUpdateAdminRole = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => mockGetCurrentSessionQuery(),
  useGetAdminRolesQuery: () => mockGetAdminRolesQuery(),
  useCreateAdminRoleMutation: () => [mockCreateAdminRole, { isLoading: false }],
  useUpdateAdminRoleMutation: () => [mockUpdateAdminRole, { isLoading: false }],
  useLogoutMutation: () => [mockLogout, { isLoading: false }],
}))

beforeEach(() => {
  mockGetCurrentSessionQuery.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        first_name: 'Taylor',
        last_name: 'Day',
        role: 'admin',
        role_name: 'Administrator',
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  })
  mockGetAdminRolesQuery.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockLogout.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) })
  mockCreateAdminRole.mockReturnValue({ unwrap: () => Promise.resolve({}) })
  mockUpdateAdminRole.mockReturnValue({ unwrap: () => Promise.resolve({}) })
})

test('registers the Roles & Permissions page for administrators and adds its sidebar link', () => {
  window.history.pushState({}, '', '/roles-permissions')
  render(<App />)

  expect(screen.getByRole('heading', { name: 'Roles & Permissions' })).toBeInTheDocument()
  expect(getMenuItems('admin', 'left')).toContainEqual({
    label: 'Roles & Permissions',
    path: '/roles-permissions',
  })
})

test('denies non-admin users access to the page route', () => {
  mockGetCurrentSessionQuery.mockReturnValue({
    data: {
      user: { id: 'user-2', first_name: 'Jordan', role: 'engineer' },
    },
    isLoading: false,
    refetch: jest.fn(),
  })
  window.history.pushState({}, '', '/roles-permissions')
  render(<App />)

  expect(screen.queryByRole('heading', { name: 'Roles & Permissions' })).not.toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: /you don’t have permission to view this page/i })
  ).toBeInTheDocument()
})
