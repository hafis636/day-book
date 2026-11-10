import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

let mockProjectPayments
let mockDeleteProjectPayment
let mockCreateProjectPayment

jest.mock('../redux/services/users/usersApi', () => ({
  useCreateProjectPaymentMutation: () => [
    mockCreateProjectPayment,
    { isLoading: false },
  ],
  useUpdateProjectPaymentMutation: () => [jest.fn(), { isLoading: false }],
  useDeleteProjectPaymentMutation: () => [mockDeleteProjectPayment, { isLoading: false }],
}))

import ExpenditurePageComponent from '../pages/users/builders/sections/expenses/ExpenditurePage'

const ExpenditurePage = (props) => (
  <ExpenditurePageComponent
    project={{
      expenses: mockProjectPayments.data?.payments?.filter(
        (payment) => payment.type === 'expense'
      ),
    }}
    {...props}
  />
)

const renderPage = () =>
  render(
    <MemoryRouter>
      <ExpenditurePage projectId="project-42" canAddExpense />
    </MemoryRouter>
  )

beforeEach(() => {
  mockProjectPayments = {
    data: { payments: [] },
    isLoading: false,
    isError: false,
  }
  mockDeleteProjectPayment = jest.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ id: 'expense-1' }),
  })
  mockCreateProjectPayment = jest.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ payment: { id: 'expense-1', type: 'expense' } }),
  })
})

test('adds an expense through the project transaction API with type expense', async () => {
  renderPage()

  await userEvent.click(screen.getByRole('button', { name: 'Add Expense' }))
  const dialog = screen.getByRole('dialog', { name: 'Add an expense' })
  expect(within(dialog).getByText('Project expenses')).toBeInTheDocument()

  await userEvent.type(within(dialog).getByLabelText(/Title/), 'Tool rental')
  await userEvent.type(within(dialog).getByLabelText(/Amount \(INR\)/), '825')
  await userEvent.selectOptions(within(dialog).getByLabelText(/Payment method/), 'bank_transfer')
  await userEvent.selectOptions(within(dialog).getByLabelText(/Status/), 'completed')
  await userEvent.type(within(dialog).getByLabelText(/Party name/), 'Equipment Hire')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save expense' }))

  await waitFor(() => {
    expect(mockCreateProjectPayment).toHaveBeenCalledWith({
      projectId: 'project-42',
      type: 'expense',
      title: 'Tool rental',
      amount: 825,
      transaction_date: null,
      description: '',
      category: '',
      party_name: 'Equipment Hire',
      payment_method: 'bank_transfer',
      reference_number: '',
      status: 'completed',
    })
  })
  expect(screen.queryByRole('dialog', { name: 'Add an expense' })).not.toBeInTheDocument()
})

test('builds the expenses dashboard from expense records in project details', () => {
  const now = new Date()
  const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10)
  const previousMonthDate = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-10`
  mockProjectPayments = {
    data: {
      payments: [
        {
          id: 'expense-current-paid',
          type: 'expense',
          title: 'Site labour',
          category: 'Labour',
          party_name: 'Crew A',
          amount: '350',
          status: 'completed',
          transaction_date: currentMonthDate,
          payment_method: 'bank_transfer',
        },
        {
          id: 'expense-current-pending',
          type: 'expense',
          title: 'Cement delivery',
          category: 'Materials',
          party_name: 'Build Supply',
          amount: '1200',
          status: 'pending',
          transaction_date: currentMonthDate,
        },
        {
          id: 'expense-overdue',
          type: 'expense',
          title: 'Fuel invoice',
          category: 'Fuel',
          party_name: 'North Depot',
          amount: '700',
          status: 'overdue',
          transaction_date: previousMonthDate,
        },
        {
          id: 'income',
          type: 'income',
          title: 'Income excluded',
          category: 'Materials',
          amount: '99000',
          status: 'completed',
          transaction_date: currentMonthDate,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }

  renderPage()

  expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument()

  const summary = screen.getByRole('region', { name: 'Expense Overview' })
  expect(summary).toHaveTextContent('₹2,250')
  expect(summary).toHaveTextContent('3')
  expect(summary).toHaveTextContent('₹1,200')
  expect(summary).toHaveTextContent('₹700')

  const monthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(now)
  expect(screen.getByRole('img', { name: /Monthly expenses:/ })).toHaveAttribute(
    'aria-label',
    expect.stringContaining(`${monthLabel} ₹1,550`)
  )
  expect(screen.getByText('Categorized total').parentElement).toHaveTextContent('₹2,250')
  expect(screen.getByRole('img', { name: 'Materials: 53%' })).toBeInTheDocument()

  const outstanding = screen.getByRole('region', {
    name: 'Pending & Overdue Expenses',
  })
  expect(outstanding).toHaveTextContent('2 expenses need attention')
  expect(outstanding).toHaveTextContent('Cement delivery')
  expect(outstanding).toHaveTextContent('Fuel invoice')
  const formattedTransactionDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${currentMonthDate}T00:00:00`))
  expect(outstanding).toHaveTextContent(`Transaction date ${formattedTransactionDate}`)
  expect(outstanding).not.toHaveTextContent('Due')
  expect(outstanding).not.toHaveTextContent('Income excluded')

  const expensesTable = screen.getByRole('table', { name: 'Expenses' })
  expect(within(expensesTable).getByRole('columnheader', { name: 'Transaction date' })).toBeInTheDocument()
  const visibleRows = within(expensesTable).getAllByRole('row').slice(1)
  expect(visibleRows).toHaveLength(3)
  expect(visibleRows.map((row) => row.textContent).join(' ')).toContain('Site labour')
  expect(visibleRows.map((row) => row.textContent).join(' ')).not.toContain('Income excluded')
})

test('describes a missing pending transaction date without implying a due date', () => {
  mockProjectPayments = {
    data: {
      payments: [
        {
          id: 'expense-missing-date',
          type: 'expense',
          title: 'Unscheduled materials',
          amount: '450',
          status: 'pending',
        },
      ],
    },
    isLoading: false,
    isError: false,
  }

  renderPage()

  const outstanding = screen.getByRole('region', {
    name: 'Pending & Overdue Expenses',
  })
  expect(outstanding).toHaveTextContent('Transaction date not recorded')
  expect(outstanding).not.toHaveTextContent('Due date not recorded')
})

test('shows empty states when the project has no expense records', () => {
  renderPage()

  expect(screen.getByText('No expense categories have been recorded.')).toBeInTheDocument()
  expect(screen.getByText('No pending or overdue expenses.')).toBeInTheDocument()
  expect(screen.getByText('No expenses have been added to this project yet.')).toBeInTheDocument()
})

test('shows empty states when the project response contains no expenses', () => {
  mockProjectPayments = {
    data: { payments: [] },
    isLoading: false,
    isError: false,
  }
  renderPage()

  expect(screen.getByText('No expense categories have been recorded.')).toBeInTheDocument()
  expect(screen.getByText('No pending or overdue expenses.')).toBeInTheDocument()
  expect(screen.getByText('No expenses have been added to this project yet.')).toBeInTheDocument()
})

test('hides the add-expense option without add permission', () => {
  render(
    <MemoryRouter>
      <ExpenditurePage projectId="project-42" />
    </MemoryRouter>
  )

  expect(screen.queryByRole('button', { name: 'Add Expense' })).not.toBeInTheDocument()
})
