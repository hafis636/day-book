import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProtectedRoute } from '../app/SessionRoutes'

const mockGetCurrentSessionQuery = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => mockGetCurrentSessionQuery(),
}))

jest.mock('../app/AuthenticatedLayout', () => ({ children }) => (
  <div data-testid="authenticated-layout">{children}</div>
))

const renderPlansRoute = (role) => {
  mockGetCurrentSessionQuery.mockReturnValue({
    data: { user: { id: 'user-1', role } },
    isLoading: false,
    refetch: jest.fn(),
  })

  return render(
    <MemoryRouter>
      <ProtectedRoute excludedRoles={['admin']}>
        <h1>Plans</h1>
      </ProtectedRoute>
    </MemoryRouter>
  )
}

test.each(['engineer', 'shop owner', 'editor'])(
  'allows the signed-in %s role to view plans',
  (role) => {
    renderPlansRoute(role)
    expect(screen.getByRole('heading', { name: 'Plans' })).toBeInTheDocument()
  }
)

test('denies the admin role access to plans', () => {
  renderPlansRoute('admin')

  expect(screen.queryByRole('heading', { name: 'Plans' })).not.toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: /you don’t have permission to view this page/i })
  ).toBeInTheDocument()
})
