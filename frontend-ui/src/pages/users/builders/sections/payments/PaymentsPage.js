import { createElement, useCallback, useState } from 'react'
import generatePaymentBill from './generatePaymentBill'
import PaymentsPageView from './PaymentsPageView'
import {
  useDeleteProjectPaymentMutation,
  useGetProjectPaymentsQuery,
} from '../../../../../redux/services/users/usersApi'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const transactionStatusOrder = {
  Overdue: 0,
  Pending: 1,
  'Partially paid': 2,
  Advance: 3,
  Completed: 4,
}

const formatCompactCurrency = (amount) =>
  amount >= 100000
    ? `₹${(amount / 100000).toFixed(1)}L`
    : amount >= 1000
      ? `₹${(amount / 1000).toFixed(1)}K`
      : formatCurrency(amount)

const isCollectedStatus = (status) =>
  ['completed', 'advance', 'partially_paid'].includes(status?.toLowerCase())

const getPaymentAmount = (payment) => {
  const amount = Number(payment.amount)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

const parsePaymentDate = (date) => {
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

const formatPaymentDate = (date) => {
  const parsedDate = parsePaymentDate(date)
  return parsedDate
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(parsedDate)
    : '—'
}

const formatPaymentStatus = (status) => ({
  pending: 'Pending',
  overdue: 'Overdue',
  advance: 'Advance',
  partially_paid: 'Partially paid',
  completed: 'Completed',
}[status] || status)

const formatPaymentMethod = (method) =>
  method
    ? method
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '—'

const PaymentsPage = ({ projectId }) => {
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [paymentToEdit, setPaymentToEdit] = useState(null)
  const [paymentActionError, setPaymentActionError] = useState('')
  const [deleteProjectPayment, { isLoading: isDeletingPayment }] =
    useDeleteProjectPaymentMutation()
  const closePaymentForm = useCallback(() => {
    setIsAddPaymentOpen(false)
    setPaymentToEdit(null)
  }, [])
  const openPaymentForm = useCallback((payment = null) => {
    setPaymentToEdit(payment)
    setIsAddPaymentOpen(true)
  }, [])
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
  } = useGetProjectPaymentsQuery(projectId)
  const payments = paymentsData?.payments || []
  const isPaymentsDataAvailable =
    !isLoadingPayments && !isPaymentsError && Array.isArray(paymentsData?.payments)
  const transactions = payments.map((payment) => ({
    id: payment.id,
    title: payment.title,
    partyName: payment.party_name || payment.category || '',
    date: formatPaymentDate(payment.transaction_date),
    dateLabel: ['pending', 'overdue'].includes(payment.status?.toLowerCase())
      ? 'Due'
      : '',
    method: formatPaymentMethod(payment.payment_method),
    reference: payment.reference_number || '—',
    status: formatPaymentStatus(payment.status),
    amount: getPaymentAmount(payment),
    sortDate: parsePaymentDate(payment.transaction_date)?.getTime() ?? null,
    payerName: payment.party_name || '',
    source: payment,
  }))

  const deleteTransaction = async (transaction) => {
    if (!window.confirm(`Delete "${transaction.title}"? This action cannot be undone.`)) {
      return
    }

    setPaymentActionError('')
    try {
      await deleteProjectPayment({
        projectId,
        paymentId: transaction.id,
      }).unwrap()
    } catch (error) {
      setPaymentActionError(
        error?.data?.error || 'Unable to delete the payment. Please try again.'
      )
    }
  }

  const transactionSortOptions = [
    {
      key: 'date',
      initialDirection: 'desc',
      getValue: (transaction) => transaction.sortDate,
    },
    {
      key: 'status',
      initialDirection: 'asc',
      getValue: (transaction) =>
        transactionStatusOrder[transaction.status] ?? Number.MAX_SAFE_INTEGER,
      compareRows: (first, second) =>
        (second.sortDate ?? 0) - (first.sortDate ?? 0),
    },
    {
      key: 'amount',
      initialDirection: 'desc',
      getValue: (transaction) => transaction.amount,
    },
  ]

  const incomePayments = payments.filter((payment) => payment.type === 'income')
  const collectedPayments = incomePayments.filter((payment) =>
    isCollectedStatus(payment.status)
  )
  const paymentTotals = incomePayments.reduce(
    (totals, payment) => {
      const amount = getPaymentAmount(payment)
      if (!amount) return totals

      switch (payment.status?.toLowerCase()) {
        case 'completed':
        case 'advance':
        case 'partially_paid':
          totals.collected += amount
          break
        case 'pending':
          totals.pending += amount
          break
        case 'overdue':
          totals.overdue += amount
          break
        default:
          break
      }
      return totals
    },
    { collected: 0, pending: 0, overdue: 0 }
  )
  const outstandingPayments = incomePayments
    .filter((payment) => ['pending', 'overdue'].includes(payment.status?.toLowerCase()))
    .map((payment) => ({
      id: payment.id,
      payer: payment.party_name || payment.category || 'Payer not specified',
      invoice: payment.title,
      dueDate: payment.transaction_date
        ? formatPaymentDate(payment.transaction_date)
        : null,
      amount: getPaymentAmount(payment),
      status: formatPaymentStatus(payment.status),
    }))
    .filter((payment) => payment.amount > 0)
  const chartStart = new Date()
  chartStart.setDate(1)
  chartStart.setHours(0, 0, 0, 0)
  chartStart.setMonth(chartStart.getMonth() - 5)
  const monthlyCollections = Array.from({ length: 6 }, (_, index) => {
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
      amount: collectedPayments.reduce((total, payment) => {
        const paymentDate = parsePaymentDate(payment.transaction_date)
        return paymentDate &&
          paymentDate.getFullYear() === year &&
          paymentDate.getMonth() === monthIndex
          ? total + getPaymentAmount(payment)
          : total
      }, 0),
    }
  })
  const paymentSourceColors = ['#2563eb', '#0f766e', '#f59e0b', '#7c3aed', '#db2777', '#64748b']
  const paymentSourceAmounts = collectedPayments.reduce((sources, payment) => {
    const name = payment.payment_method
      ? formatPaymentMethod(payment.payment_method)
      : 'Not specified'
    sources.set(name, (sources.get(name) || 0) + getPaymentAmount(payment))
    return sources
  }, new Map())
  const paymentSourceTotal = Array.from(paymentSourceAmounts.values()).reduce(
    (total, amount) => total + amount,
    0
  )
  const paymentSources = Array.from(paymentSourceAmounts, ([name, amount], index) => ({
    name,
    amount,
    color: paymentSourceColors[index % paymentSourceColors.length],
    share: paymentSourceTotal
      ? Math.round((amount / paymentSourceTotal) * 100)
      : 0,
  })).sort((first, second) => second.amount - first.amount)
  const totalPaymentAmount =
    paymentTotals.collected + paymentTotals.pending + paymentTotals.overdue
  const collectionRate =
    totalPaymentAmount === 0
      ? 0
      : Math.round((paymentTotals.collected / totalPaymentAmount) * 100)

  return createElement(PaymentsPageView, {
    projectId,
    isAddPaymentOpen,
    paymentToEdit,
    paymentActionError,
    isDeletingPayment,
    isPaymentsDataAvailable,
    isLoadingPayments,
    isPaymentsError,
    transactions,
    transactionSortOptions,
    paymentTotals,
    collectionRate,
    monthlyCollections,
    paymentSources,
    outstandingPayments,
    formatCurrency,
    formatCompactCurrency,
    transactionStatusStyles: {
      Completed: 'bg-emerald-50 text-emerald-800',
      Advance: 'bg-amber-50 text-amber-800',
      'Partially paid': 'bg-sky-50 text-sky-800',
      Pending: 'bg-amber-50 text-amber-800',
      Overdue: 'bg-rose-50 text-rose-800',
    },
    onClosePaymentForm: closePaymentForm,
    onOpenPaymentForm: openPaymentForm,
    onDeleteTransaction: deleteTransaction,
    onGenerateBill: generatePaymentBill,
  })
}

export default PaymentsPage
