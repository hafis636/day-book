import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ManagePlansPage from '../pages/users/admin/plans/modify-plans'

const mockGetAdminPlansQuery = jest.fn()
const mockUpdateAdminPlan = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetAdminPlansQuery: () => mockGetAdminPlansQuery(),
  useUpdateAdminPlanMutation: () => [mockUpdateAdminPlan, { isLoading: false }],
}))

const plans = [
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
    is_active: false,
  },
]

beforeEach(() => {
  mockGetAdminPlansQuery.mockReturnValue({
    data: { plans },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  mockUpdateAdminPlan.mockReset()
  mockUpdateAdminPlan.mockReturnValue({ unwrap: () => Promise.resolve() })
})

test('lists inactive plans and opens a labelled inline editor', () => {
  render(<ManagePlansPage />)

  expect(screen.getByRole('heading', { name: 'Modify plans' })).toBeInTheDocument()
  expect(screen.getByText('Inactive')).toBeInTheDocument()
  expect(screen.getByText('For growing teams.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Edit Basic' }))
  expect(screen.getByRole('textbox', { name: 'Plan name' })).toHaveValue('Basic')
  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
    'For getting started.'
  )
  expect(screen.getByRole('spinbutton', { name: 'Monthly price (₹)' })).toHaveValue(199)
  expect(screen.getByRole('checkbox', { name: 'Active plan' })).toBeChecked()
})

test('cancel discards draft changes without calling the API', () => {
  render(<ManagePlansPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Basic' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Plan name' }), {
    target: { value: 'Changed name' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

  expect(screen.getByRole('heading', { name: 'Basic' })).toBeInTheDocument()
  expect(screen.queryByText('Changed name')).not.toBeInTheDocument()
  expect(mockUpdateAdminPlan).not.toHaveBeenCalled()
})

test('saves edited plan fields and surfaces save failures', async () => {
  mockUpdateAdminPlan.mockReturnValueOnce({
    unwrap: () => Promise.resolve(),
  })
  const { rerender } = render(<ManagePlansPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Basic' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Plan name' }), {
    target: { value: 'Basic Plus' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  await waitFor(() => {
    expect(mockUpdateAdminPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        planCode: 'BASIC',
        plan_name: 'Basic Plus',
        monthly_price: 199,
        yearly_price: 1999,
        is_active: true,
      })
    )
  })
  await waitFor(() => expect(screen.queryByText('Editing Basic')).not.toBeInTheDocument())

  mockUpdateAdminPlan.mockReturnValueOnce({
    unwrap: () => Promise.reject({ data: { error: 'Price is invalid' } }),
  })
  rerender(<ManagePlansPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Basic' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Price is invalid')
})

test('shows loading, retryable error, and empty states', () => {
  mockGetAdminPlansQuery.mockReturnValueOnce({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: jest.fn(),
  })
  const { rerender } = render(<ManagePlansPage />)
  expect(screen.getByRole('status', { name: 'Loading plans' })).toBeInTheDocument()

  const refetch = jest.fn()
  mockGetAdminPlansQuery.mockReturnValueOnce({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch,
  })
  rerender(<ManagePlansPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()

  mockGetAdminPlansQuery.mockReturnValueOnce({
    data: { plans: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })
  rerender(<ManagePlansPage />)
  expect(screen.getByText('No customer plans to manage')).toBeInTheDocument()
})
