import React from 'react'
import {
  useGetCurrentSessionQuery,
  useGetPlansQuery,
  useSelectPlanMutation,
} from '../../redux/services/users/usersApi'

const formatPrice = (price) => {
  const amount = Number(price)
  if (!Number.isFinite(amount)) return 'Price unavailable'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const PlanCard = ({ plan, currentPlanCode, isSelecting, onSelectPlan }) => {
  const isCurrentPlan =
    String(plan.plan_code).trim().toLowerCase() ===
    String(currentPlanCode || '').trim().toLowerCase()

  return (
    <article
      className={`relative flex h-full flex-col border border-t-2 bg-white p-6 shadow-sm ${
        isCurrentPlan
          ? 'border-blue-700 ring-1 ring-blue-700'
          : 'border-slate-200 border-t-slate-400'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {plan.plan_code}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {plan.plan_name}
          </h2>
        </div>
        {isCurrentPlan && (
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            Current plan
          </span>
        )}
      </div>

      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">
        {plan.description || 'A clear way to keep your work moving.'}
      </p>

      <div className="mt-7 border-t border-slate-100 pt-5">
        <dl className="grid grid-cols-2 divide-x divide-slate-200">
          <div className="pr-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Per month
            </dt>
            <dd className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {formatPrice(plan.monthly_price)}
            </dd>
          </div>
          <div className="pl-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Per year
            </dt>
            <dd className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {formatPrice(plan.yearly_price)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-auto pt-7">
        <div className="h-px bg-slate-100" />
        <p className="pt-4 text-xs font-medium text-slate-500">
          {isCurrentPlan
            ? 'This is the plan linked to your account.'
            : 'Available for your account'}
        </p>
        <button
          type="button"
          onClick={() => onSelectPlan(plan.plan_code)}
          disabled={isCurrentPlan || isSelecting}
          className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed ${
            isCurrentPlan
              ? 'bg-slate-100 text-slate-500'
              : 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-slate-300'
          }`}
        >
          {isCurrentPlan ? 'Selected' : isSelecting ? 'Updating...' : 'Select plan'}
        </button>
      </div>
    </article>
  )
}

const PlansPage = () => {
  const { data: session } = useGetCurrentSessionQuery()
  const { data, isLoading, isError, refetch } = useGetPlansQuery()
  const [selectPlan, { isLoading: isSelecting, error: selectionError }] =
    useSelectPlanMutation()
  const plans = data?.plans || []
  const currentPlanCode = session?.user?.user_plan
  const selectionErrorMessage =
    selectionError?.data?.error || 'Could not update your plan. Please try again.'

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
          Plans &amp; pricing
        </p>
        <div className="mt-3 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Choose what works for you.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Compare straightforward pricing, with monthly and yearly rates
            shown side by side.
          </p>
        </div>
      </header>

      {selectionError && (
        <p className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {selectionErrorMessage}
        </p>
      )}

      {isLoading ? (
        <div
          className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          aria-label="Loading plans"
          role="status"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-72 animate-pulse border border-slate-200 bg-white p-6"
            >
              <div className="h-3 w-24 bg-slate-100" />
              <div className="mt-5 h-7 w-36 bg-slate-100" />
              <div className="mt-6 h-4 w-full bg-slate-100" />
              <div className="mt-2 h-4 w-4/5 bg-slate-100" />
              <div className="mt-10 h-8 w-28 bg-slate-100" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-8 border border-red-200 bg-red-50 p-6" role="alert">
          <h2 className="font-semibold text-red-900">Plans couldn’t be loaded</h2>
          <p className="mt-1 text-sm text-red-800">
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Try again
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-8 border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No plans are available right now
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Please check back later.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.plan_code}
              plan={plan}
              currentPlanCode={currentPlanCode}
              isSelecting={isSelecting}
              onSelectPlan={selectPlan}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default PlansPage
