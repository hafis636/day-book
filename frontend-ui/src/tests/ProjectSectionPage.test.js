import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProjectSectionPage from '../pages/users/builders/ProjectSectionPage'

let mockSession

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => ({ data: mockSession }),
  useGetProjectQuery: () => ({
    data: {
      project: {
        id: 'project-1',
        name: 'Test Project',
        project_type: 'Residential',
        status: 'Active',
      },
    },
    isLoading: false,
    isError: false,
  }),
}))

jest.mock('../pages/users/builders/sections/payments/PaymentsPage', () => ({
  __esModule: true,
  default: ({ canAddPayment }) => (
    <div>{canAddPayment ? 'Payments with add access' : 'Payments view only'}</div>
  ),
}))

jest.mock('../pages/users/builders/sections/expenses/ExpenditurePage', () => ({
  __esModule: true,
  default: ({ canAddExpense }) => (
    <div>{canAddExpense ? 'Expenses with add access' : 'Expenses view only'}</div>
  ),
}))

const renderSection = (section) =>
  render(
    <MemoryRouter initialEntries={[`/manage-projects/project-1/${section}`]}>
      <Routes>
        <Route
          path="/manage-projects/:projectId/:section"
          element={<ProjectSectionPage />}
        />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  mockSession = {
    user: {
      permissions: {
        PROJECT_RIGHT_MENU: true,
      },
    },
  }
})

test.each([
  ['payments', 'VIEW_PAYMENTS'],
  ['expenditure', 'VIEW_EXPENSES'],
])('blocks direct access to %s without %s permission', (section) => {
  renderSection(section)

  expect(
    screen.getByRole('heading', {
      name: /you don’t have permission to view this page/i,
    })
  ).toBeInTheDocument()
  expect(screen.queryByText(/view only/)).not.toBeInTheDocument()
})

test('allows viewing payments without granting add permission', () => {
  mockSession.user.permissions.VIEW_PAYMENTS = true
  renderSection('payments')

  expect(screen.getByText('Payments view only')).toBeInTheDocument()
})

test('passes add permission separately from expense view permission', () => {
  mockSession.user.permissions.VIEW_EXPENSES = true
  mockSession.user.permissions.ADD_EXPENSES = true
  renderSection('expenditure')

  expect(screen.getByText('Expenses with add access')).toBeInTheDocument()
})
