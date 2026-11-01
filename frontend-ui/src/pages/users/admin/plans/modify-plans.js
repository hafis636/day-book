import React, { useState } from 'react'
import {
  useGetAdminPlansQuery,
  useUpdateAdminPlanMutation,
} from '../../../../redux/services/users/usersApi'

const formatPrice = (price) => {
  const amount = Number(price)
  if (!Number.isFinite(amount)) return 'Price unavailable'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

const errorMessage = (error) =>
  error?.data?.error || 'The plan could not be saved. Please try again.'

const toDraft = (plan) => ({
  plan_name: plan.plan_name || '',
  description: plan.description || '',
  monthly_price: String(plan.monthly_price ?? ''),
  yearly_price: String(plan.yearly_price ?? ''),
  is_active: Boolean(plan.is_active),
})

const PlanDetails = ({ plan }) => (
  <>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {plan.plan_code}
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
          {plan.plan_name}
        </h2>
      </div>
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold ${
          plan.is_active
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-slate-100 text-slate-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            plan.is_active ? 'bg-emerald-600' : 'bg-slate-500'
          }`}
        />
        {plan.is_active ? 'Active' : 'Inactive'}
      </span>
    </div>
    <p className="mt-4 text-sm leading-6 text-slate-600">
      {plan.description || 'No description provided.'}
    </p>
    <dl className="mt-6 grid grid-cols-2 border-t border-slate-100 pt-4">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Per month
        </dt>
        <dd className="mt-1 text-lg font-bold text-slate-900">
          {formatPrice(plan.monthly_price)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Per year
        </dt>
        <dd className="mt-1 text-lg font-bold text-slate-900">
          {formatPrice(plan.yearly_price)}
        </dd>
      </div>
    </dl>
  </>
)

const PlanEditor = ({ plan, draft, setDraft, onSave, onCancel, saving, error }) => (
  <form onSubmit={onSave} className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {plan.plan_code}
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
          Editing {plan.plan_name}
        </h2>
      </div>
      <span className="bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
        Plan details
      </span>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-800">
        Plan name
        <input
          required
          disabled={saving}
          maxLength={100}
          value={draft.plan_name}
          onChange={(event) =>
            setDraft((current) => ({ ...current, plan_name: event.target.value }))
          }
          className="mt-2 block w-full border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Monthly price (₹)
        <input
          required
          disabled={saving}
          type="number"
          min="0"
          max="999999999.99"
          step="0.01"
          value={draft.monthly_price}
          onChange={(event) =>
            setDraft((current) => ({ ...current, monthly_price: event.target.value }))
          }
          className="mt-2 block w-full border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Yearly price (₹)
        <input
          required
          disabled={saving}
          type="number"
          min="0"
          max="999999999.99"
          step="0.01"
          value={draft.yearly_price}
          onChange={(event) =>
            setDraft((current) => ({ ...current, yearly_price: event.target.value }))
          }
          className="mt-2 block w-full border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
        />
      </label>
      <label className="flex items-center gap-3 self-end border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          disabled={saving}
          checked={draft.is_active}
          onChange={(event) =>
            setDraft((current) => ({ ...current, is_active: event.target.checked }))
          }
          className="h-4 w-4 accent-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
        Active plan
      </label>
      <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
        Description
        <textarea
          disabled={saving}
          rows="3"
          maxLength={1000}
          value={draft.description}
          onChange={(event) =>
            setDraft((current) => ({ ...current, description: event.target.value }))
          }
          className="mt-2 block w-full resize-y border border-slate-300 bg-white px-3 py-2.5 font-normal leading-6 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
        />
      </label>
    </div>
    {error && (
      <p className="text-sm font-medium text-red-800" role="alert">
        {error}
      </p>
    )}
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-w-28 items-center justify-center bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      {saving && (
        <span role="status" className="text-sm text-slate-600">
          Saving plan changes…
        </span>
      )}
    </div>
  </form>
)

const ManagePlansPage = () => {
  const { data, isLoading, isError, refetch } = useGetAdminPlansQuery()
  const [updatePlan, { isLoading: isSaving }] = useUpdateAdminPlanMutation()
  const [editingCode, setEditingCode] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saveError, setSaveError] = useState('')
  const plans = data?.plans || []

  const beginEditing = (plan) => {
    setEditingCode(plan.plan_code)
    setDraft(toDraft(plan))
    setSaveError('')
  }

  const cancelEditing = () => {
    setEditingCode(null)
    setDraft(null)
    setSaveError('')
  }

  const savePlan = async (event) => {
    event.preventDefault()
    setSaveError('')
    try {
      await updatePlan({
        planCode: editingCode,
        ...draft,
        monthly_price: Number(draft.monthly_price),
        yearly_price: Number(draft.yearly_price),
      }).unwrap()
      cancelEditing()
    } catch (error) {
      setSaveError(errorMessage(error))
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Administration
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Modify plans
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Update subscription details and pricing. Changes affect the plans
            available to customers.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="mt-8 space-y-4" role="status" aria-label="Loading plans">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-48 animate-pulse border border-slate-200 bg-white p-6"
            >
              <div className="h-3 w-24 bg-slate-100" />
              <div className="mt-5 h-6 w-40 bg-slate-100" />
              <div className="mt-6 h-4 w-full bg-slate-100" />
              <div className="mt-3 h-4 w-1/2 bg-slate-100" />
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
            className="mt-4 border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Try again
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-8 border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No customer plans to manage
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Plans will appear here when they are added.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4" aria-label="Subscription plans">
          {plans.map((plan) => {
            const isEditing = editingCode === plan.plan_code
            return (
              <article
                key={plan.plan_code}
                aria-label={`${plan.plan_name} plan`}
                className={`border bg-white p-5 shadow-sm transition-colors sm:p-6 ${
                  isEditing
                    ? 'border-blue-300 border-l-4 border-l-blue-700 ring-1 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                {isEditing ? (
                  <PlanEditor
                    plan={plan}
                    draft={draft}
                    setDraft={setDraft}
                    onSave={savePlan}
                    onCancel={cancelEditing}
                    saving={isSaving}
                    error={saveError}
                  />
                ) : (
                  <>
                    <PlanDetails plan={plan} />
                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        disabled={Boolean(editingCode) || isSaving}
                        onClick={() => beginEditing(plan)}
                        className="px-4 py-2 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit {plan.plan_name}
                      </button>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ManagePlansPage
