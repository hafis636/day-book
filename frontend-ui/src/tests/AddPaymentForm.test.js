import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

let mockCreateProjectPayment
let mockUpdateProjectPayment
let mockDeleteProjectPayment
let mockIsSaving
let mockProjectPayments
let mockGeneratePaymentBill

jest.mock('../pages/users/builders/sections/payments/generatePaymentBill', () => ({
  __esModule: true,
  default: (...args) => mockGeneratePaymentBill(...args),
}))

jest.mock('../redux/services/users/usersApi', () => ({
  useCreateProjectPaymentMutation: () => [
    mockCreateProjectPayment,
    { isLoading: mockIsSaving },
  ],
  useUpdateProjectPaymentMutation: () => [
    mockUpdateProjectPayment,
    { isLoading: false },
  ],
  useDeleteProjectPaymentMutation: () => [
    mockDeleteProjectPayment,
    { isLoading: false },
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
  mockUpdateProjectPayment = jest.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ payment: { id: 'transaction-1' } }),
  })
  mockDeleteProjectPayment = jest.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ id: 'transaction-1' }),
  })
  mockGeneratePaymentBill = jest.fn()
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
  expect(within(dialog).getByLabelText(/Party name/)).toBeRequired()
  const statusField = within(dialog).getByLabelText(/Status/)
  expect(statusField).toBeRequired()
  expect(statusField).toHaveValue('advance')
  expect(Array.from(statusField.options).map((option) => option.value)).toEqual([
    'pending',
    'overdue',
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
      type: 'income',
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
  await userEvent.type(screen.getByLabelText(/Party name/), 'Supplier')
  await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Payment amount must be greater than 0'
  )
  expect(screen.getByRole('dialog', { name: 'Add a payment' })).toBeInTheDocument()
})

test.each(['pending', 'overdue'])(
  'uses a due date and hides payment method and reference for %s payments',
  async (status) => {
    render(
      <MemoryRouter>
        <PaymentsPage projectId="project-1" />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add Payment' }))

    const dialog = screen.getByRole('dialog', { name: 'Add a payment' })
    await userEvent.type(within(dialog).getByLabelText(/Title/), 'Awaiting payment')
    await userEvent.type(within(dialog).getByLabelText(/Amount \(INR\)/), '100')
    await userEvent.type(within(dialog).getByLabelText(/Party name/), 'Supplier')
    await userEvent.selectOptions(within(dialog).getByLabelText(/Status/), status)
    const dueDateField = within(dialog).getByLabelText(/Due date/)

    expect(within(dialog).queryByLabelText(/Payment method/)).not.toBeInTheDocument()
    expect(dueDateField).toHaveAttribute('type', 'date')
    expect(within(dialog).queryByLabelText(/Reference number/)).not.toBeInTheDocument()
    await userEvent.type(dueDateField, '2026-11-10')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }))
    await waitFor(() => {
      expect(mockCreateProjectPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          title: 'Awaiting payment',
          amount: 100,
          party_name: 'Supplier',
          transaction_date: '2026-11-10',
          payment_method: null,
          reference_number: null,
          status,
        })
      )
    })
  }
)

test('displays saved transactions returned by the payments API', () => {
  mockProjectPayments = {
    payments: [{
      id: 'transaction-1',
      type: 'income',
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

test('calculates the payment summary from project income transactions', () => {
  mockProjectPayments = {
    payments: [
      { id: '1', type: 'income', status: 'completed', amount: '1000' },
      { id: '2', type: 'income', status: 'partially_paid', amount: '2000' },
      { id: '3', type: 'income', status: 'advance', amount: '500' },
      { id: '4', type: 'income', status: 'pending', amount: '1500' },
      { id: '5', type: 'income', status: 'overdue', amount: '500' },
      { id: '6', type: 'expense', status: 'completed', amount: '10000' },
    ],
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  const summary = screen.getByRole('region', { name: 'Payment summary' })
  expect(summary).toHaveTextContent('₹3,500')
  expect(summary).toHaveTextContent('₹1,500')
  expect(summary).toHaveTextContent('₹500')
  expect(summary).toHaveTextContent('64%')
})

test('shows collections, payment sources, and outstanding payments from project data', () => {
  const now = new Date()
  const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10)
  const previousMonthDate = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-10`
  mockProjectPayments = {
    payments: [
      {
        id: 'current-bank',
        type: 'income',
        title: 'Current bank receipt',
        status: 'completed',
        amount: '1200',
        transaction_date: currentMonthDate,
        payment_method: 'bank_transfer',
      },
      {
        id: 'previous-upi',
        type: 'income',
        title: 'Previous UPI receipt',
        status: 'advance',
        amount: '800',
        transaction_date: previousMonthDate,
        payment_method: 'upi',
      },
      {
        id: 'pending-payment',
        type: 'income',
        title: 'Steel delivery invoice',
        status: 'pending',
        amount: '500',
        party_name: 'Steel Works',
        transaction_date: '2026-11-06',
      },
      {
        id: 'overdue-payment',
        type: 'income',
        title: 'Concrete invoice',
        status: 'overdue',
        amount: '300',
        party_name: 'Concrete Supplier',
      },
      {
        id: 'expense',
        type: 'expense',
        title: 'Expense excluded from collections',
        status: 'completed',
        amount: '9000',
        transaction_date: currentMonthDate,
        payment_method: 'cash',
      },
    ],
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  const currentMonthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(now)
  const chart = screen.getByRole('img', { name: /Monthly collections:/ })
  expect(chart.getAttribute('aria-label')).toContain(
    `${currentMonthLabel} ₹1,200`
  )

  const sources = screen.getByRole('img', { name: /Payment source shares:/ })
  expect(sources.getAttribute('aria-label')).toContain('Bank Transfer 60%')
  expect(sources.getAttribute('aria-label')).toContain('Upi 40%')

  const outstanding = screen.getByRole('region', {
    name: 'Pending & overdue payments',
  })
  expect(outstanding).toHaveTextContent('2 payments need attention')
  expect(outstanding).toHaveTextContent('Steel Works')
  expect(outstanding).toHaveTextContent('Steel delivery invoice')
  expect(outstanding).toHaveTextContent('Due 06 Nov 2026')
  expect(outstanding).toHaveTextContent('Concrete Supplier')
  expect(outstanding).toHaveTextContent('Due date not recorded')
  expect(outstanding).not.toHaveTextContent('Expense excluded from collections')
})

test('sorts all transactions and paginates with selectable page sizes', async () => {
  const statuses = [
    'completed',
    'pending',
    'overdue',
    'partially_paid',
    'advance',
    'completed',
    'pending',
    'completed',
    'overdue',
    'completed',
    'partially_paid',
    'advance',
  ]
  mockProjectPayments = {
    payments: statuses.map((status, index) => ({
      id: `transaction-${index + 1}`,
      type: 'income',
      title: `Payment ${index + 1}`,
      party_name: 'Supplier',
      amount: String((index + 1) * 100),
      status,
      transaction_date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    })),
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.getByRole('heading', { name: 'All transactions' })).toBeInTheDocument()
  const transactionsTable = screen.getByRole('table')
  const getVisibleRows = () => within(transactionsTable).getAllByRole('row').slice(1)
  expect(getVisibleRows()).toHaveLength(10)
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 12')
  expect(screen.getByText('Showing 1–10 of 12 transactions')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(getVisibleRows()).toHaveLength(2)
  expect(getVisibleRows()[1]).toHaveTextContent('Payment 1')

  await userEvent.click(screen.getByRole('button', { name: 'Sort by amount descending' }))
  expect(getVisibleRows()).toHaveLength(10)
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 12')
  expect(screen.getByText('Showing 1–10 of 12 transactions')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Sort by amount ascending' }))
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 1')

  await userEvent.click(screen.getByRole('button', { name: 'Sort by status ascending' }))
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 9')
  expect(getVisibleRows()[0]).toHaveTextContent('Overdue')
  await userEvent.click(screen.getByRole('button', { name: 'Sort by status descending' }))
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 10')
  expect(getVisibleRows()[0]).toHaveTextContent('Completed')

  await userEvent.selectOptions(screen.getByLabelText('Transactions per page'), '25')
  expect(getVisibleRows()).toHaveLength(12)
  expect(screen.getByText('Showing 1–12 of 12 transactions')).toBeInTheDocument()

  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by date / due date descending' })
  )
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 12')
  expect(transactionsTable.querySelector('th[aria-sort="descending"]')).toHaveTextContent(
    'Date / due date'
  )

  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by date / due date ascending' })
  )
  expect(getVisibleRows()[0]).toHaveTextContent('Payment 1')
  expect(transactionsTable.querySelector('th[aria-sort="ascending"]')).toHaveTextContent(
    'Date / due date'
  )
})

test('edits an existing payment', async () => {
  mockProjectPayments = {
    payments: [{
      id: 'transaction-1',
      type: 'income',
      title: 'Materials payment',
      amount: '250',
      status: 'completed',
      party_name: 'Supplier',
      payment_method: 'cash',
      transaction_date: '2026-11-03',
    }],
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByRole('button', { name: 'Edit payment Materials payment' }))
  const dialog = screen.getByRole('dialog', { name: 'Edit payment' })
  expect(within(dialog).getByRole('heading', { name: 'Edit payment' })).toBeInTheDocument()
  expect(within(dialog).getByLabelText(/Title/)).toHaveValue('Materials payment')
  expect(within(dialog).getByLabelText(/Party name/)).toHaveValue('Supplier')
  expect(within(dialog).getByLabelText(/Amount \(INR\)/)).toHaveValue(250)

  await userEvent.clear(within(dialog).getByLabelText(/Amount \(INR\)/))
  await userEvent.type(within(dialog).getByLabelText(/Amount \(INR\)/), '300')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Update payment' }))

  await waitFor(() => {
    expect(mockUpdateProjectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        paymentId: 'transaction-1',
        title: 'Materials payment',
        amount: 300,
        party_name: 'Supplier',
        payment_method: 'cash',
        status: 'completed',
      })
    )
  })
})

test('deletes a payment after confirmation and generates a bill for paid payments', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
  mockProjectPayments = {
    payments: [{
      id: 'transaction-1',
      type: 'income',
      title: 'Materials payment',
      amount: '1250.5',
      status: 'completed',
      party_name: 'Supplier',
      payment_method: 'bank_transfer',
      transaction_date: '2026-11-03',
    }],
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  const billButton = screen.getByRole('button', {
    name: 'Generate bill for Materials payment',
  })
  const actionGroup = billButton.closest('[data-row-actions]')
  expect(
    within(actionGroup).getAllByRole('button').map((button) =>
      button.getAttribute('aria-label')
    )
  ).toEqual([
    'Generate bill for Materials payment',
    'Edit payment Materials payment',
    'Delete payment Materials payment',
  ])
  expect(actionGroup).toHaveClass(
    'opacity-0',
    'absolute',
    'right-0',
    'group-hover:opacity-100',
    'group-focus-within:opacity-100'
  )
  expect(actionGroup.closest('tr')).toHaveClass('group')
  expect(
    screen.queryByRole('columnheader', { name: 'Actions' })
  ).not.toBeInTheDocument()

  await userEvent.click(billButton)
  expect(mockGeneratePaymentBill).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'transaction-1',
      amount: 1250.5,
      date: '03 Nov 2026',
      method: 'Bank Transfer',
      payerName: 'Supplier',
    })
  )
  expect(screen.queryByRole('button', { name: /Generate bill/ })).toBeInTheDocument()

  await userEvent.click(
    screen.getByRole('button', { name: 'Delete payment Materials payment' })
  )
  expect(confirmSpy).toHaveBeenCalled()
  await waitFor(() => {
    expect(mockDeleteProjectPayment).toHaveBeenCalledWith({
      projectId: 'project-1',
      paymentId: 'transaction-1',
    })
  })
  confirmSpy.mockRestore()
})

test('does not offer bill generation for pending or overdue payments', () => {
  mockProjectPayments = {
    payments: ['pending', 'overdue'].map((status, index) => ({
      id: `transaction-${index + 1}`,
      type: 'income',
      title: `${status} payment`,
      amount: '100',
      status,
      party_name: 'Supplier',
      transaction_date: '2026-11-03',
    })),
  }

  render(
    <MemoryRouter>
      <PaymentsPage projectId="project-1" />
    </MemoryRouter>
  )

  expect(screen.queryByRole('button', { name: /Generate bill/ })).not.toBeInTheDocument()
})
