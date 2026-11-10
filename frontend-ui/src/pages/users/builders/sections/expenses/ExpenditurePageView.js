import ProjectSectionLayout from '../ProjectSectionLayout'
import AddPaymentForm from '../../forms/AddPaymentForm'
import DataTable from '../../../../../components/common/DataTable'

const statusStyles = {
  Completed: 'bg-emerald-50 text-emerald-800',
  Advance: 'bg-amber-50 text-amber-800',
  'Partially paid': 'bg-sky-50 text-sky-800',
  Pending: 'bg-amber-50 text-amber-800',
  Overdue: 'bg-rose-50 text-rose-800',
}

const ExpenseTrend = ({
  monthlyExpenses,
  isAvailable,
  isLoading,
  formatCurrency,
  formatCompactCurrency,
}) => {
  const maxAmount = Math.max(0, ...monthlyExpenses.map(({ amount }) => amount))
  const currentMonth = monthlyExpenses[monthlyExpenses.length - 1]

  return (
    <figure className="min-w-0" aria-labelledby="expense-trend-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="expense-trend-title" className="text-base font-semibold text-slate-900">
            6-Month Expense Trend
          </h2>
          <p className="mt-1 text-sm text-slate-500">Recorded by transaction date</p>
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
          aria-label={`Monthly expenses: ${monthlyExpenses
            .map(({ label, amount }) => `${label} ${formatCurrency(amount)}`)
            .join('; ')}`}
        >
          {monthlyExpenses.map(({ key, month, amount }, index) => (
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
                    index === monthlyExpenses.length - 1
                      ? 'bg-amber-600'
                      : 'bg-amber-200'
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
        <p className="mt-5 text-sm text-slate-500" role={isLoading ? 'status' : 'alert'}>
          {isLoading
            ? 'Loading the six-month expense trend…'
            : 'Unable to load the expense trend.'}
        </p>
      )}
      <figcaption className="sr-only">
        Six-month expense trend shown as monthly rupee totals and proportional bars.
      </figcaption>
    </figure>
  )
}

const ExpenseActionIcon = () => (
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
    <path d="M4.5 7.5h15m-13.5 0 .75 12h10.5l.75-12M9 7.5V4.75h6V7.5m-4.5 3v5.25m3-5.25v5.25" />
  </svg>
)

const ExpenditurePageView = ({
  projectId,
  canAddExpense,
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
  onOpenExpenseForm,
  onCloseExpenseForm,
  onRemoveExpense,
}) => {
  const expenseColumns = [
    {
      key: 'expense',
      label: 'Expense',
      headerClassName:
        'w-[18%] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-3 py-4',
      renderCell: (expense) => (
        <>
          <p className="text-sm font-semibold text-slate-900">{expense.title}</p>
          {expense.partyName && (
            <p className="mt-1 text-xs text-slate-500">{expense.partyName}</p>
          )}
        </>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      headerClassName:
        'w-[13%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-2 py-4 text-sm text-slate-600',
      renderCell: (expense) => expense.category,
    },
    {
      key: 'date',
      label: 'Transaction date',
      sortKey: 'date',
      headerClassName: 'w-[13%] px-2 py-3 text-[11px]',
      cellClassName: 'px-2 py-4 text-sm text-slate-600',
      renderCell: (expense) => expense.date,
    },
    {
      key: 'method',
      label: 'Method',
      headerClassName:
        'w-[12%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-2 py-4 text-sm text-slate-600',
      renderCell: (expense) => expense.method,
    },
    {
      key: 'reference',
      label: 'Reference',
      headerClassName:
        'w-[12%] px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
      cellClassName: 'break-words px-2 py-4 text-xs font-medium text-slate-500',
      renderCell: (expense) => expense.reference,
    },
    {
      key: 'status',
      label: 'Status',
      sortKey: 'status',
      headerClassName: 'w-[12%] px-2 py-3 text-[11px]',
      cellClassName: 'px-2 py-4',
      renderCell: (expense) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            statusStyles[expense.status] || 'bg-slate-100 text-slate-700'
          }`}
        >
          {expense.status}
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
      renderCell: (expense) => formatCurrency(expense.amount),
    },
  ]

  const renderDeleteAction = (expense) => (
    <button
      type="button"
      aria-label={`Delete expense ${expense.title}`}
      title="Delete expense"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:cursor-wait disabled:opacity-50"
      disabled={isDeletingExpense}
      onClick={() => onRemoveExpense(expense)}
    >
      <ExpenseActionIcon />
    </button>
  )

  const action = canAddExpense ? (
    <button
      type="button"
      onClick={onOpenExpenseForm}
      className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 sm:self-auto"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add Expense
    </button>
  ) : null

  return (
    <ProjectSectionLayout title="Expenses" action={action}>
      <div className="mt-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
              Project spend
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">Project expense overview</p>
            <p className="mt-1 text-sm text-slate-500">
              Spending, categories and expenses that need attention.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
            Summary from project transactions
          </span>
        </div>

        <section
          aria-label="Expense Overview"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]"
        >
          <article className="rounded-lg border-l-4 border-amber-500 bg-slate-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Recorded expenses
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {isDataAvailable ? formatCurrency(expenseTotals.total) : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-300">Total expense amount</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expense records
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
              {isDataAvailable ? expenses.length : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Recorded for this project</p>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Pending
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
              {isDataAvailable ? formatCurrency(expenseTotals.pending) : '—'}
            </p>
            <p className="mt-2 text-xs text-amber-800">Awaiting payment</p>
          </article>
          <article className="rounded-lg border border-rose-200 bg-rose-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              Overdue
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
              {isDataAvailable ? formatCurrency(expenseTotals.overdue) : '—'}
            </p>
            <p className="mt-2 text-xs text-rose-700">Marked overdue</p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <ExpenseTrend
              monthlyExpenses={monthlyExpenses}
              isAvailable={isDataAvailable}
              isLoading={isLoadingPayments}
              formatCurrency={formatCurrency}
              formatCompactCurrency={formatCompactCurrency}
            />
          </div>
          <section
            aria-labelledby="expense-categories-title"
            className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div>
              <h2 id="expense-categories-title" className="text-base font-semibold text-slate-900">
                Expense categories
              </h2>
              <p className="mt-1 text-sm text-slate-500">Recorded spending by category</p>
            </div>
            {isDataAvailable && categories.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {categories.map((category) => (
                  <li key={category.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-slate-700">{category.name}</span>
                      <span className="shrink-0 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatCurrency(category.amount)}
                        </span>
                        <span className="ml-2 text-xs tabular-nums text-slate-500">
                          {category.share}%
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-slate-100"
                      role="img"
                      aria-label={`${category.name}: ${category.share}%`}
                    >
                      <div
                        className={`h-full rounded-full ${category.color}`}
                        style={{ width: `${category.share}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="mt-5 text-sm text-slate-500"
                role={isLoadingPayments ? 'status' : isPaymentsError ? 'alert' : undefined}
              >
                {isLoadingPayments
                  ? 'Loading expense categories…'
                  : isPaymentsError
                    ? 'Unable to load expense categories.'
                    : 'No expense categories have been recorded.'}
              </p>
            )}
            <div className="mt-5 flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-medium text-slate-600">Categorized total</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {isDataAvailable ? formatCurrency(categoryTotal) : '—'}
              </span>
            </div>
          </section>
        </section>

        <section
          aria-label="Pending & Overdue Expenses"
          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Pending &amp; Overdue Expenses
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isDataAvailable
                  ? `${pendingExpenses.length} expenses need attention`
                  : 'Expenses awaiting payment'}
              </p>
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />Pending</span>
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Overdue</span>
            </div>
          </div>
          {!isDataAvailable ? (
            <p className={`px-5 py-6 text-sm ${isPaymentsError ? 'text-red-700' : 'text-slate-500'}`} role={isLoadingPayments ? 'status' : 'alert'}>
              {isLoadingPayments
                ? 'Loading pending and overdue expenses…'
                : 'Unable to load pending and overdue expenses.'}
            </p>
          ) : pendingExpenses.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No pending or overdue expenses.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingExpenses.map((expense) => (
                <li
                  key={expense.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {expense.party_name || expense.category || 'Payee not specified'}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {expense.title} <span aria-hidden="true">·</span> {expense.categoryLabel}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="text-xs text-slate-500">
                      {expense.transaction_date
                        ? `Transaction date ${formatExpenseDate(expense.transaction_date)}`
                        : 'Transaction date not recorded'}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-slate-900 sm:mt-1">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      statusStyles[expense.statusLabel] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {expense.statusLabel}
                  </span>
                  {renderDeleteAction(expense)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="all-expenses"
          aria-labelledby="all-expenses-title"
          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 id="all-expenses-title" className="text-base font-semibold text-slate-900">
              All Expenses
            </h2>
          </div>
          {actionError && (
            <p className="px-5 py-3 text-sm text-red-700" role="alert">
              {actionError}
            </p>
          )}
          {isPaymentsError ? (
            <p className="px-5 py-6 text-sm text-red-700" role="alert">
              Unable to load project expenses. Please try again.
            </p>
          ) : isLoadingPayments ? (
            <p className="px-5 py-6 text-sm text-slate-500" role="status">
              Loading project expenses…
            </p>
          ) : transactions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No expenses have been added to this project yet.
            </p>
          ) : (
            <DataTable
              ariaLabel="Expenses"
              columns={expenseColumns}
              data={transactions}
              initialPageSize={10}
              minTableWidth="100%"
              pageSizeOptions={[10, 25, 50]}
              renderRowActions={renderDeleteAction}
              rowKey={(expense) => expense.id}
              sortOptions={expenseSortOptions}
            />
          )}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            All amounts shown in Indian rupees (INR)
          </div>
        </section>
      </div>
      {canAddExpense && isAddExpenseOpen && (
        <AddPaymentForm
          projectId={projectId}
          transactionType="expense"
          onClose={onCloseExpenseForm}
        />
      )}
    </ProjectSectionLayout>
  )
}

export default ExpenditurePageView
