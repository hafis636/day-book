import ProjectSectionLayout from '../ProjectSectionLayout'
import AddPaymentForm from '../../forms/AddPaymentForm'
import DataTable from '../../../../../components/common/DataTable'

const PaymentActionIcon = ({ action }) => {
  const paths = {
    edit: (
      <path d="m14.25 5.25 4.5 4.5M4.5 19.5l4.25-.9L19.2 8.15a1.77 1.77 0 0 0-2.5-2.5L6.25 16.1l-1.75 3.4Z" />
    ),
    delete: (
      <path d="M4.5 7.5h15m-13.5 0 .75 12h10.5l.75-12M9 7.5V4.75h6V7.5m-4.5 3v5.25m3-5.25v5.25" />
    ),
    bill: (
      <>
        <path d="M6 3.75h8.25L18 7.5v12.75H6V3.75Z" />
        <path d="M14.25 3.75V7.5H18M9 11.25h6m-6 3h6m-6 3h3" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[action]}
    </svg>
  )
}

const CollectionChart = ({
  monthlyCollections,
  isAvailable,
  isLoadingPayments,
  formatCurrency,
  formatCompactCurrency,
}) => {
  const maxAmount = Math.max(0, ...monthlyCollections.map(({ amount }) => amount))
  const currentMonth = monthlyCollections[monthlyCollections.length - 1]

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
            {isAvailable ? formatCurrency(currentMonth.amount) : '—'}
          </p>
        </div>
      </div>
      {isAvailable ? (
        <div
          className="mt-5 grid grid-cols-6 gap-1 border-b border-slate-200 pb-2 sm:gap-3"
          role="img"
          aria-label={`Monthly collections: ${monthlyCollections
            .map(({ label, amount }) => `${label} ${formatCurrency(amount)}`)
            .join('; ')}`}
        >
          {monthlyCollections.map(({ key, month, amount }, index) => (
            <div
              key={key}
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
                  style={{
                    height: amount > 0
                      ? `${Math.max(14, (amount / maxAmount) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-600">{month}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500" role={isLoadingPayments ? 'status' : 'alert'}>
          {isLoadingPayments
            ? 'Loading monthly collections…'
            : 'Unable to load monthly collections.'}
        </p>
      )}
      <figcaption className="sr-only">
        Six-month collection trend shown as monthly rupee totals and proportional bars.
      </figcaption>
    </figure>
  )
}

const PaymentsPageView = ({
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
  transactionStatusStyles,
  onClosePaymentForm,
  onOpenPaymentForm,
  onDeleteTransaction,
  onGenerateBill,
}) => {
  const transactionColumns = [
    {
      key: 'payment',
      label: 'Payment',
      headerClassName:
        'w-[16%] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-3 py-4',
      renderCell: (transaction) => (
        <>
          <p className="text-sm font-semibold text-slate-900">{transaction.title}</p>
          {transaction.partyName && (
            <p className="mt-1 text-xs text-slate-500">{transaction.partyName}</p>
          )}
        </>
      ),
    },
    {
      key: 'date',
      label: 'Date / due date',
      sortKey: 'date',
      headerClassName: 'w-[12%] px-2 py-3 text-[11px]',
      cellClassName: 'px-2 py-4 text-sm text-slate-600',
      renderCell: (transaction) => (
        <>
          {transaction.dateLabel && `${transaction.dateLabel} `}
          {transaction.date}
        </>
      ),
    },
    {
      key: 'method',
      label: 'Method',
      headerClassName:
        'w-[12%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-2 py-4 text-sm text-slate-600',
      renderCell: (transaction) => transaction.method,
    },
    {
      key: 'reference',
      label: 'Reference',
      headerClassName:
        'w-[14%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-2 py-4 text-xs font-medium text-slate-500',
      renderCell: (transaction) => transaction.reference,
    },
    {
      key: 'status',
      label: 'Status',
      sortKey: 'status',
      headerClassName: 'w-[12%] px-2 py-3 text-[11px]',
      cellClassName: 'px-2 py-4',
      renderCell: (transaction) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusStyles[transaction.status]}`}
        >
          {transaction.status}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortKey: 'amount',
      headerClassName: 'w-[14%] px-3 py-3 text-right text-[11px]',
      cellClassName:
        'px-3 py-4 text-right text-sm font-semibold tabular-nums text-slate-900',
      renderCell: (transaction) => formatCurrency(transaction.amount),
    },
  ]

  const renderTransactionActions = (transaction) => (
    <>
      {!['pending', 'overdue'].includes(
        transaction.source.status?.toLowerCase()
      ) && (
        <button
          type="button"
          aria-label={`Generate bill for ${transaction.title}`}
          title="Generate bill"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          onClick={() => onGenerateBill(transaction)}
        >
          <PaymentActionIcon action="bill" />
        </button>
      )}
      <button
        type="button"
        aria-label={`Edit payment ${transaction.title}`}
        title="Edit payment"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={() => onOpenPaymentForm(transaction.source)}
      >
        <PaymentActionIcon action="edit" />
      </button>
      <button
        type="button"
        aria-label={`Delete payment ${transaction.title}`}
        title="Delete payment"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:cursor-wait disabled:opacity-50"
        disabled={isDeletingPayment}
        onClick={() => onDeleteTransaction(transaction)}
      >
        <PaymentActionIcon action="delete" />
      </button>
    </>
  )

  const action = (
    <button
      type="button"
      onClick={() => onOpenPaymentForm()}
      className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:self-auto"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add Payment
    </button>
  )

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
            Summary from project transactions
          </span>
        </div>

        <section aria-label="Payment summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg bg-slate-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Collected</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{isPaymentsDataAvailable ? formatCurrency(paymentTotals.collected) : '—'}</p>
            <p className="mt-2 text-xs text-slate-300">Total received to date</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{isPaymentsDataAvailable ? formatCurrency(paymentTotals.pending) : '—'}</p>
            <p className="mt-2 text-xs text-slate-500">Awaiting payment</p>
          </article>
          <article className="rounded-lg border border-rose-200 bg-rose-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Overdue</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{isPaymentsDataAvailable ? formatCurrency(paymentTotals.overdue) : '—'}</p>
            <p className="mt-2 text-xs text-rose-700">Past the due date</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collection rate</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{isPaymentsDataAvailable ? `${collectionRate}%` : '—'}</p>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
              role={isPaymentsDataAvailable ? 'progressbar' : undefined}
              aria-label={isPaymentsDataAvailable ? 'Collection rate' : undefined}
              aria-valuemin={isPaymentsDataAvailable ? '0' : undefined}
              aria-valuemax={isPaymentsDataAvailable ? '100' : undefined}
              aria-valuenow={isPaymentsDataAvailable ? collectionRate : undefined}
            >
              <div className="h-full rounded-full bg-emerald-600" style={{ width: isPaymentsDataAvailable ? `${collectionRate}%` : '0%' }} />
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <CollectionChart
              monthlyCollections={monthlyCollections}
              isAvailable={isPaymentsDataAvailable}
              isLoadingPayments={isLoadingPayments}
              formatCurrency={formatCurrency}
              formatCompactCurrency={formatCompactCurrency}
            />
          </div>
          <section aria-labelledby="payment-sources-title" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <h2 id="payment-sources-title" className="text-base font-semibold text-slate-900">Payment sources</h2>
              <p className="mt-1 text-sm text-slate-500">Collected by payment method</p>
            </div>
            <div
              className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={
                paymentSources.length
                  ? `Payment source shares: ${paymentSources
                      .map(({ name, share }) => `${name} ${share}%`)
                      .join(', ')}`
                  : 'No collected payments by method'
              }
            >
              {paymentSources.map((source) => (
                <span key={source.name} style={{ width: `${source.share}%`, backgroundColor: source.color }} />
              ))}
            </div>
            {isPaymentsDataAvailable && paymentSources.length > 0 ? <ul className="mt-5 space-y-4">
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
            </ul> : (
              <p className="mt-5 text-sm text-slate-500" role={isLoadingPayments ? 'status' : isPaymentsDataAvailable ? undefined : 'alert'}>
                {isLoadingPayments
                  ? 'Loading payment sources…'
                  : isPaymentsDataAvailable
                    ? 'No collected payments have been recorded.'
                    : 'Unable to load payment sources.'}
              </p>
            )}
            <div className="mt-5 flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-medium text-slate-600">Total collected</span>
              <span className="font-semibold tabular-nums text-slate-900">{isPaymentsDataAvailable ? formatCurrency(paymentTotals.collected) : '—'}</span>
            </div>
          </section>
        </section>

        <section aria-labelledby="outstanding-title" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 id="outstanding-title" className="text-base font-semibold text-slate-900">Pending &amp; overdue payments</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isPaymentsDataAvailable
                  ? `${outstandingPayments.length} payments need attention`
                  : 'Outstanding payments'}
              </p>
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />Pending</span>
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Overdue</span>
            </div>
          </div>
          {!isPaymentsDataAvailable ? (
            <p className="px-5 py-6 text-sm text-slate-500" role={isLoadingPayments ? 'status' : 'alert'}>
              {isLoadingPayments
                ? 'Loading outstanding payments…'
                : 'Unable to load outstanding payments.'}
            </p>
          ) : outstandingPayments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No pending or overdue payments.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {outstandingPayments.map((payment) => (
                <li key={payment.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{payment.payer}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{payment.invoice}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="text-xs text-slate-500">
                      {payment.dueDate ? `Due ${payment.dueDate}` : 'Due date not recorded'}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-slate-900 sm:mt-1">{formatCurrency(payment.amount)}</p>
                  </div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusStyles[payment.status]}`}>
                    {payment.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="all-transactions-title" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 id="all-transactions-title" className="text-base font-semibold text-slate-900">All transactions</h2>
          </div>
          {paymentActionError && (
            <p className="px-5 py-3 text-sm text-red-700" role="alert">
              {paymentActionError}
            </p>
          )}
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
            <DataTable
              ariaLabel="Transactions"
              columns={transactionColumns}
              data={transactions}
              initialPageSize={10}
              minTableWidth="100%"
              pageSizeOptions={[10, 25, 50]}
              renderRowActions={renderTransactionActions}
              rowKey={(transaction) => transaction.id}
              sortOptions={transactionSortOptions}
            />
          )}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            All amounts shown in Indian rupees (INR)
          </div>
        </section>
      </div>
      {isAddPaymentOpen && (
        <AddPaymentForm
          projectId={projectId}
          payment={paymentToEdit}
          onClose={onClosePaymentForm}
        />
      )}
    </ProjectSectionLayout>
  )
}

export default PaymentsPageView
