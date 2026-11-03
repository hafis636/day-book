import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

let mockCreateProjectPayment
let mockIsSaving
let mockProjectPayments

jest.mock('../redux/services/users/usersApi', () => ({
  useCreateProjectPaymentMutation: () => [
    mockCreateProjectPayment,
    { isLoading: mockIsSaving },
  ],
  useGetProjectPaymentsQuery: () => ({
    data: mockProjectPayments,
    isLoading: false,
    isError: false,
  }),
}))

import PaymentsPage from '../pages/users/builders/sections/payments/PaymentsPage'

beforeEach(() => {
  mockIsSaving = false
  mockProjectPayments = { payments: [] }
  mockCreateProjectPayment = jest.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ payment: { id: 'transaction-1' } }),
  })
})

test('opens the payment form and submits a valid project transaction', async () => {
  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Add Payment' }))
  const dialog = screen.getByRole('dialog', { name: 'Add a payment' })
  expect(within(dialog).getByLabelText(/Title/)).toBeRequired()
  expect(within(dialog).getByLabelText(/Amount \(INR\)/)).toHaveAttribute('min', '0.01')
  expect(within(dialog).getByLabelText(/Transaction date/)).toHaveAttribute('type', 'date')
  expect(within(dialog).getByLabelText(/Payment method/)).toBeRequired()
  const statusField = within(dialog).getByLabelText(/Status/)
  expect(statusField).toBeRequired()
  expect(statusField).toHaveValue('advance')
  expect(Array.from(statusField.options).map((option) => option.value)).toEqual([
    'advance',
    'partially_paid',
    'completed',
  ])

  await userEvent.type(within(dialog).getByLabelText(/Title/), 'Materials payment')
  await userEvent.type(within(dialog).getByLabelText(/Amount \(INR\)/), '125.50')
  await userEvent.selectOptions(within(dialog).getByLabelText(/Payment method/), 'upi')
  await userEvent.selectOptions(within(dialog).getByLabelText(/Status/), 'completed')
  await userEvent.type(within(dialog).getByLabelText(/Party name/), 'Supplier')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }))

  await waitFor(() => {
    expect(mockCreateProjectPayment).toHaveBeenCalledWith({
      projectId: 'project-1',
      title: 'Materials payment',
      amount: 125.5,
      transaction_date: null,
      description: '',
      category: '',
      party_name: 'Supplier',
      payment_method: 'upi',
      reference_number: '',
      status: 'completed',
    })
  })
  expect(screen.queryByRole('dialog', { name: 'Add a payment' })).not.toBeInTheDocument()
})

test('shows API validation errors and keeps the payment form open', async () => {
  mockCreateProjectPayment.mockReturnValue({
    unwrap: () => Promise.reject({ data: { error: 'Payment amount must be greater than 0' } }),
  })

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )
  await userEvent.click(screen.getByRole('button', { name: 'Add Payment' }))
  await userEvent.type(screen.getByLabelText(/Title/), 'Materials payment')
  await userEvent.type(screen.getByLabelText(/Amount \(INR\)/), '10')
  await userEvent.selectOptions(screen.getByLabelText(/Payment method/), 'cash')
  await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Payment amount must be greater than 0'
  )
  expect(screen.getByRole('dialog', { name: 'Add a payment' })).toBeInTheDocument()
})

test('displays saved transactions returned by the payments API', () => {
  mockProjectPayments = {
    payments: [{
      id: 'transaction-1',
      title: 'Materials payment',
      party_name: 'Supplier',
      transaction_date: '2026-11-03',
      payment_method: 'bank_transfer',
      reference_number: 'NEFT-123',
      status: 'partially_paid',
      amount: '125.50',
    }],
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.getAllByText('Materials payment').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Supplier').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Partially paid').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Bank Transfer').length).toBeGreaterThan(0)
})
