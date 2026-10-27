import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/dashboard'

const mockGetCurrentSessionQuery = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => mockGetCurrentSessionQuery(),
}))

const renderDashboard = (userPlan) => {
  mockGetCurrentSessionQuery.mockReturnValue({
    data: {
      user: {
        first_name: 'Taylor',
        last_name: 'Day',
        email: 'taylor@example.com',
        user_plan: userPlan,
      },
    },
  })

  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

test.each(['BASIC', 'silver'])('shows a plans link for the %s plan', (userPlan) => {
  renderDashboard(userPlan)

  expect(screen.getByRole('complementary', { name: 'Plan information' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /view plans/i })).toHaveAttribute('href', '/plans')
})

test('does not show the plans banner for other plans', () => {
  renderDashboard('GOLD')

  expect(screen.queryByRole('complementary', { name: 'Plan information' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /view plans/i })).not.toBeInTheDocument()
})
