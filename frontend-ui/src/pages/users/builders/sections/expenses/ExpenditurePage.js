import { createElement, useCallback, useState } from 'react'
import ExpenditurePageView from './ExpenditurePageView'
import {
  useDeleteProjectPaymentMutation,
  useGetProjectPaymentsQuery,
} from '../../../../../redux/services/users/usersApi'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const formatCurrency = (amount) => currencyFormatter.format(amount)

const formatCompactCurrency = (amount) =>
  amount >= 100000
    ? `₹${(amount / 100000).toFixed(1)}L`
    : amount >= 1000
      ? `₹${(amount / 1000).toFixed(1)}K`
      : formatCurrency(amount)

const parseExpenseDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(date)) return null
  const datePart = date.slice(0, 10)
  const parsedDate = new Date(`${datePart}T00:00:00`)
  const [year, month, day] = datePart.split('-').map(Number)
  return Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
    ? null
    : parsedDate
}

const formatExpenseDate = (date) => {
  const parsedDate = parseExpenseDate(date)
  return parsedDate
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(parsedDate)
    : '—'
}

const getExpenseAmount = (expense) => {
  const amount = Number(expense.amount)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

const formatExpenseStatus = (status) => ({
  pending: 'Pending',
  overdue: 'Overdue',
  advance: 'Advance',
  partially_paid: 'Partially paid',
  completed: 'Completed',
}[status?.toLowerCase()] || status || '—')

const formatExpenseMethod = (method) =>
  method
    ? method
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '—'

const ExpenditurePage = ({ projectId }) => {
  const [actionError, setActionError] = useState('')
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [deleteProjectPayment, { isLoading: isDeletingExpense }] =
    useDeleteProjectPaymentMutation()
  const closeExpenseForm = useCallback(() => {
    setIsAddExpenseOpen(false)
  }, [])
  const openExpenseForm = useCallback(() => {
    setIsAddExpenseOpen(true)
  }, [])
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
  } = useGetProjectPaymentsQuery(projectId)
  const expenses = Array.isArray(paymentsData?.payments)
    ? paymentsData.payments.filter((payment) => payment.type === 'expense')
    : []
  const isDataAvailable =
    !isLoadingPayments && !isPaymentsError && Array.isArray(paymentsData?.payments)
  const transactions = expenses.map((expense) => ({
    id: expense.id,
    title: expense.title,
    partyName: expense.party_name || '',
    category: expense.category || '—',
    date: formatExpenseDate(expense.transaction_date),
    method: formatExpenseMethod(expense.payment_method),
    reference: expense.reference_number || '—',
    status: formatExpenseStatus(expense.status),
    amount: getExpenseAmount(expense),
    sortDate: parseExpenseDate(expense.transaction_date)?.getTime() ?? null,
    source: expense,
  }))

  const removeExpense = async (expense) => {
    if (!window.confirm(`Delete "${expense.title}"? This action cannot be undone.`)) {
      return
    }

    setActionError('')
    try {
      await deleteProjectPayment({
        projectId,
        paymentId: expense.id,
      }).unwrap()
    } catch (error) {
      setActionError(
        error?.data?.error || 'Unable to delete the expense. Please try again.'
      )
    }
  }

  const expenseSortOptions = [
    {
      key: 'date',
      initialDirection: 'desc',
      getValue: (expense) => expense.sortDate,
    },
    {
      key: 'status',
      initialDirection: 'asc',
      getValue: (expense) =>
        ({ Overdue: 0, Pending: 1, 'Partially paid': 2, Advance: 3, Completed: 4 }[
          expense.status
        ] ?? Number.MAX_SAFE_INTEGER),
      compareRows: (first, second) =>
        (second.sortDate ?? 0) - (first.sortDate ?? 0),
    },
    {
      key: 'amount',
      initialDirection: 'desc',
      getValue: (expense) => expense.amount,
    },
  ]

  const expenseTotals = expenses.reduce(
    (totals, expense) => {
      const amount = getExpenseAmount(expense)
      totals.total += amount
      if (expense.status?.toLowerCase() === 'pending') totals.pending += amount
      if (expense.status?.toLowerCase() === 'overdue') totals.overdue += amount
      return totals
    },
    { total: 0, pending: 0, overdue: 0 }
  )
  const pendingExpenses = expenses
    .filter((expense) =>
      ['pending', 'overdue'].includes(expense.status?.toLowerCase())
    )
    .map((expense) => ({
      ...expense,
      amount: getExpenseAmount(expense),
      statusLabel: formatExpenseStatus(expense.status),
      categoryLabel: expense.category || 'Category not recorded',
    }))
    .filter((expense) => expense.amount > 0)
    .sort((first, second) =>
      first.status === 'overdue' && second.status !== 'overdue'
        ? -1
        : second.status === 'overdue' && first.status !== 'overdue'
          ? 1
          : (parseExpenseDate(first.transaction_date)?.getTime() ?? 0) -
            (parseExpenseDate(second.transaction_date)?.getTime() ?? 0)
    )

  const categoryAmounts = expenses.reduce((categories, expense) => {
    const category = expense.category?.trim()
    if (!category) return categories
    categories.set(category, (categories.get(category) || 0) + getExpenseAmount(expense))
    return categories
  }, new Map())
  const categoryTotal = Array.from(categoryAmounts.values()).reduce(
    (total, amount) => total + amount,
    0
  )
  const categoryColors = ['bg-amber-600', 'bg-blue-700', 'bg-emerald-600', 'bg-slate-500', 'bg-orange-500']
  const categories = Array.from(categoryAmounts, ([name, amount], index) => ({
    name,
    amount,
    color: categoryColors[index % categoryColors.length],
    share: categoryTotal ? Math.round((amount / categoryTotal) * 100) : 0,
  })).sort((first, second) => second.amount - first.amount)

  const chartStart = new Date()
  chartStart.setDate(1)
  chartStart.setHours(0, 0, 0, 0)
  chartStart.setMonth(chartStart.getMonth() - 5)
  const monthlyExpenses = Array.from({ length: 6 }, (_, index) => {
    const monthStart = new Date(chartStart)
    monthStart.setMonth(chartStart.getMonth() + index)
    const year = monthStart.getFullYear()
    const monthIndex = monthStart.getMonth()
    return {
      key: `${year}-${monthIndex}`,
      month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(monthStart),
      label: new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        year: 'numeric',
      }).format(monthStart),
      amount: expenses.reduce((total, expense) => {
        const expenseDate = parseExpenseDate(expense.transaction_date)
        return expenseDate &&
          expenseDate.getFullYear() === year &&
          expenseDate.getMonth() === monthIndex
          ? total + getExpenseAmount(expense)
          : total
      }, 0),
    }
  })

  return createElement(ExpenditurePageView, {
    projectId,
    actionError,
    isAddExpenseOpen,
    isDeletingExpense,
    isDataAvailable,
    isLoadingPayments,
    isPaymentsError,
    expenses,
    transactions,
    expenseSortOptions,
    expenseTotals,
    pendingExpenses,
    categories,
    categoryTotal,
    monthlyExpenses,
    formatCurrency,
    formatCompactCurrency,
    formatExpenseDate,
    onOpenExpenseForm: openExpenseForm,
    onCloseExpenseForm: closeExpenseForm,
    onRemoveExpense: removeExpense,
  })
}

export default ExpenditurePage
