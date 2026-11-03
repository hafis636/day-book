import { useCallback, useState } from 'react'
import ProjectSectionLayout from '../ProjectSectionLayout'
import AddPaymentForm from './forms/AddPaymentForm'
import { useGetProjectPaymentsQuery } from '../../../../../redux/services/users/usersApi'

const outstandingPayments = [
  {
    payer: 'Riverside Electricals',
    invoice: 'Electrical rough-in · Stage 2',
    dueDate: '06 Nov 2026',
    amount: 124000,
    status: 'Pending',
  },
  {
    payer: 'A. K. Steel Works',
    invoice: 'Structural steel · Invoice 114',
    dueDate: '31 Oct 2026',
    amount: 186750,
    status: 'Overdue',
  },
  {
    payer: 'Greenline Materials',
    invoice: 'Cement delivery · Batch 08',
    dueDate: '29 Oct 2026',
    amount: 64200,
    status: 'Overdue',
  },
  {
    payer: 'Northstar Equipment Hire',
    invoice: 'Tower crane · October',
    dueDate: '10 Nov 2026',
    amount: 98000,
    status: 'Pending',
  },
]

const monthlyCollections = [
  { month: 'Jun', amount: 365000 },
  { month: 'Jul', amount: 492000 },
  { month: 'Aug', amount: 428000 },
  { month: 'Sep', amount: 618000 },
  { month: 'Oct', amount: 537000 },
  { month: 'Nov', amount: 712000 },
]

const paymentSourceAmounts = [
  { name: 'Bank transfer', amount: 1128500, color: '#2563eb' },
  { name: 'UPI', amount: 471000, color: '#0f766e' },
  { name: 'Cheque', amount: 243000, color: '#f59e0b' },
]
const paymentSourceTotal = paymentSourceAmounts.reduce(
  (total, source) => total + source.amount,
  0
)
const paymentSources = paymentSourceAmounts.map((source) => ({
  ...source,
  share: Math.round((source.amount / paymentSourceTotal) * 100),
}))

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const transactionStatusStyles = {
  Completed: 'bg-emerald-50 text-emerald-800',
  Advance: 'bg-amber-50 text-amber-800',
  'Partially paid': 'bg-sky-50 text-sky-800',
}

const formatCompactCurrency = (amount) =>
  `₹${(Math.round(amount / 1000) / 100).toFixed(1)}L`

const formatPaymentDate = (date) => {
  if (!date) return '—'
  const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`)
  return Number.isNaN(parsedDate.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(parsedDate)
}

const formatPaymentStatus = (status) => ({
  advance: 'Advance',
  partially_paid: 'Partially paid',
  completed: 'Completed',
}[status] || status)

const formatPaymentMethod = (method) =>
  method
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const CollectionChart = () => {
  const maxAmount = Math.max(...monthlyCollections.map(({ amount }) => amount))
  return (
    <figure className="min-w-0" aria-labelledby="collections-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="collections-chart-title" className="text-base font-semibold text-slate-900">
            Monthly collections
          </h2>
          <p className="mt-1 text-sm text-slate-500">Last six months</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">This month</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {formatCurrency(712000)}
          </p>
        </div>
      </div>
      <div
        className="mt-5 grid grid-cols-6 gap-1 border-b border-slate-200 pb-2 sm:gap-3"
        role="img"
        aria-label={`Monthly collections: ${monthlyCollections
          .map(({ month, amount }) => `${month} ${formatCurrency(amount)}`)
          .join('; ')}`}
      >
        {monthlyCollections.map(({ month, amount }, index) => (
          <div
            key={month}
            className="flex min-w-0 flex-col items-center justify-end"
            aria-hidden="true"
          >
            <span className="mb-2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-slate-700 sm:text-xs">
              {formatCompactCurrency(amount)}
            </span>
            <div className="flex h-32 w-full items-end justify-center sm:h-40">
              <div
                className={`w-full max-w-12 rounded-t-md ${
                  index === monthlyCollections.length - 1
                    ? 'bg-blue-700'
                    : 'bg-blue-200'
                }`}
                style={{ height: `${Math.max(14, (amount / maxAmount) * 100)}%` }}
              />
            </div>
            <span className="mt-2 text-xs font-medium text-slate-600">{month}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        Six-month collection trend shown as monthly rupee totals and proportional bars.
      </figcaption>
    </figure>
  )
}

const PaymentsPage = ({ projectId }) => {
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const closeAddPaymentForm = useCallback(() => setIsAddPaymentOpen(false), [])
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
  } = useGetProjectPaymentsQuery(projectId)
  const transactions = (paymentsData?.payments || []).map((payment) => ({
    id: payment.id,
    title: payment.title,
    partyName: payment.party_name || payment.category || '',
    date: formatPaymentDate(payment.transaction_date),
    method: formatPaymentMethod(payment.payment_method),
    reference: payment.reference_number || '—',
    status: formatPaymentStatus(payment.status),
    amount: Number(payment.amount),
  }))

  const action = (
    <button
      type="button"
      onClick={() => setIsAddPaymentOpen(true)}
      className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:self-auto"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add Payment
    </button>
  )

  const collectedAmount = 1842500
  const pendingAmount = outstandingPayments
    .filter(({ status }) => status === 'Pending')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const overdueAmount = outstandingPayments
    .filter(({ status }) => status === 'Overdue')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const collectionRate = 84

  return (
    <ProjectSectionLayout title="Payments" action={action}>
      <div className="mt-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Project payment overview</p>
            <p className="mt-1 text-sm text-slate-500">
              Collections, outstanding invoices and recent activity.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
            Overview sample data
          </span>
        </div>

        <section aria-label="Payment summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg bg-slate-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Collected</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(collectedAmount)}</p>
            <p className="mt-2 text-xs text-slate-300">Total received to date</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{formatCurrency(pendingAmount)}</p>
            <p className="mt-2 text-xs text-slate-500">Awaiting payment</p>
          </article>
          <article className="rounded-lg border border-rose-200 bg-rose-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Overdue</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{formatCurrency(overdueAmount)}</p>
            <p className="mt-2 text-xs text-rose-700">Past the due date</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collection rate</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{collectionRate}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Collection rate" aria-valuemin="0" aria-valuemax="100" aria-valuenow={collectionRate}>
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${collectionRate}%` }} />
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <CollectionChart />
          </div>
          <section aria-labelledby="payment-sources-title" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <h2 id="payment-sources-title" className="text-base font-semibold text-slate-900">Payment sources</h2>
              <p className="mt-1 text-sm text-slate-500">Collected by payment method</p>
            </div>
            <div
              className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`Payment source shares: ${paymentSources
                .map(({ name, share }) => `${name} ${share}%`)
                .join(', ')}`}
            >
              {paymentSources.map((source) => (
                <span key={source.name} style={{ width: `${source.share}%`, backgroundColor: source.color }} />
              ))}
            </div>
            <ul className="mt-5 space-y-4">
              {paymentSources.map((source) => (
                <li key={source.name} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: source.color }} aria-hidden="true" />
                    <span className="truncate text-sm font-medium text-slate-700">{source.name}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(source.amount)}</span>
                    <span className="ml-2 text-xs tabular-nums text-slate-500">{source.share}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-medium text-slate-600">Total collected</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(1842500)}</span>
            </div>
          </section>
        </section>

        <section aria-labelledby="outstanding-title" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 id="outstanding-title" className="text-base font-semibold text-slate-900">Pending &amp; overdue payments</h2>
              <p className="mt-1 text-sm text-slate-500">              {outstandingPayments.length} invoices need attention</p>
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />Pending</span>
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Overdue</span>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {outstandingPayments.map((payment, index) => (
              <li key={`${payment.payer}-${payment.dueDate}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{payment.payer}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{payment.invoice}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="text-xs text-slate-500">Due {payment.dueDate}</p>
                  <p className="text-sm font-semibold tabular-nums text-slate-900 sm:mt-1">{formatCurrency(payment.amount)}</p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusStyles[payment.status]}`}>
                  {payment.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recent-transactions-title" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 id="recent-transactions-title" className="text-base font-semibold text-slate-900">Recent transactions</h2>
           </div>
          {isPaymentsError ? (
            <p className="px-5 py-6 text-sm text-red-700" role="alert">
              Unable to load payment transactions. Please try again.
            </p>
          ) : isLoadingPayments ? (
            <p className="px-5 py-6 text-sm text-slate-500" role="status">
              Loading payment transactions…
            </p>
          ) : transactions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No payments have been added to this project yet.
            </p>
          ) : (
          <>
          <div className="hidden xl:block">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="w-[20%] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Payment</th>
                  <th scope="col" className="w-[13%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Date</th>
                  <th scope="col" className="w-[17%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Method</th>
                  <th scope="col" className="w-[18%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Reference</th>
                  <th scope="col" className="w-[14%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                  <th scope="col" className="w-[18%] px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="break-words px-3 py-4">
                      <p className="text-sm font-semibold text-slate-900">{transaction.title}</p>
                      {transaction.partyName && (
                        <p className="mt-1 text-xs text-slate-500">{transaction.partyName}</p>
                      )}
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600">{transaction.date}</td>
                    <td className="break-words px-2 py-4 text-sm text-slate-600">{transaction.method}</td>
                    <td className="break-words px-2 py-4 text-xs font-medium text-slate-500">{transaction.reference}</td>
                    <td className="px-2 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusStyles[transaction.status]}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(transaction.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 xl:hidden" aria-label="Recent transactions">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{transaction.title}</p>
                    {transaction.partyName && (
                      <p className="mt-1 truncate text-xs text-slate-500">{transaction.partyName}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{transaction.date} · {transaction.method}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(transaction.amount)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-medium text-slate-500">{transaction.reference}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusStyles[transaction.status]}`}>
                    {transaction.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          </>
          )}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            All amounts shown in Indian rupees (INR)
          </div>
        </section>
      </div>
      {isAddPaymentOpen && (
        <AddPaymentForm
          projectId={projectId}
          onClose={closeAddPaymentForm}
        />
      )}
    </ProjectSectionLayout>
  )
}

export default PaymentsPage
