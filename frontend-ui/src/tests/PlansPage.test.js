import { fireEvent, render, screen } from '@testing-library/react'
import PlansPage from '../pages/plans'

const mockGetPlansQuery = jest.fn()
const mockGetCurrentSessionQuery = jest.fn()
const mockSelectPlan = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetPlansQuery: () => mockGetPlansQuery(),
  useGetCurrentSessionQuery: () => mockGetCurrentSessionQuery(),
  useSelectPlanMutation: () => [mockSelectPlan, { isLoading: false, error: null }],
}))

beforeEach(() => {
  mockGetCurrentSessionQuery.mockReturnValue({
    data: { user: { user_plan: 'SILVER' } },
  })
  mockGetPlansQuery.mockReturnValue({
    data: {
      plans: [
        {
          plan_code: 'BASIC',
          plan_name: 'Basic',
          description: 'For getting started.',
          monthly_price: 199,
          yearly_price: 1999,
          is_active: true,
        },
        {
          plan_code: 'SILVER',
          plan_name: 'Silver',
          description: 'For growing teams.',
          monthly_price: 499,
          yearly_price: 4999,
          is_active: true,
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
})

test('shows both billing prices for active plans and identifies the current plan', () => {
  render(<PlansPage />)

  expect(screen.getByRole('heading', { name: 'Choose what works for you.' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Basic' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Silver' })).toBeInTheDocument()
  expect(screen.getByText('Current plan')).toBeInTheDocument()
  expect(screen.getByText('₹199')).toBeInTheDocument()
  expect(screen.getByText('₹1,999')).toBeInTheDocument()
  expect(screen.getByText('₹499')).toBeInTheDocument()
  expect(screen.getByText('₹4,999')).toBeInTheDocument()
  expect(screen.getAllByText('Per month')).toHaveLength(2)
  expect(screen.getAllByText('Per year')).toHaveLength(2)
  expect(screen.queryByRole('group', { name: 'Billing period' })).not.toBeInTheDocument()
})

test('marks the current plan selected and lets the user select another plan', () => {
  render(<PlansPage />)

  expect(screen.getByRole('button', { name: 'Selected' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Select plan' }))

  expect(mockSelectPlan).toHaveBeenCalledWith('BASIC')
})

test('provides loading, error, and empty states', () => {
  mockGetPlansQuery.mockReturnValueOnce({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })
  const { rerender } = render(<PlansPage />)
  expect(screen.getByRole('status', { name: 'Loading plans' })).toBeInTheDocument()

  mockGetPlansQuery.mockReturnValueOnce({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: jest.fn(),
  })
  rerender(<PlansPage />)
  expect(screen.getByRole('alert')).toHaveTextContent(/plans couldn’t be loaded/i)

  mockGetPlansQuery.mockReturnValueOnce({
    data: { plans: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  rerender(<PlansPage />)
  expect(screen.getByText(/no plans are available right now/i)).toBeInTheDocument()
})
