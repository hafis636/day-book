import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGetCurrentSessionQuery } from '../../redux/services/users/usersApi'

const isBasicOrSilverPlan = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((part) => part === 'basic' || part === 'silver')

const Dashboard = () => {
  const location = useLocation()
  const { data } = useGetCurrentSessionQuery()
  const user = data.user
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    user.email

  return (
    <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        Welcome, {displayName}
      </h1>
      {location.state?.otpValidated && (
        <p className="mt-4 text-sm font-medium text-green-700" role="status">
          OTP validated successfully.
        </p>
      )}

      {[user.user_plan_name, user.user_plan].some(isBasicOrSilverPlan) && (
        <aside
          aria-label="Plan information"
          className="mt-8 flex flex-col gap-5 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Your plan
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Make more room for what’s next.
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Compare the available plans and find the right fit for your work.
            </p>
          </div>
          <Link
            to="/plans"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            View plans <span aria-hidden="true">→</span>
          </Link>
        </aside>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Email</p>
          <p className="mt-1 font-semibold text-slate-800">{user.email}</p>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
