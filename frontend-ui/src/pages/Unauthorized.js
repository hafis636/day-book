import React from 'react'
import { Link } from 'react-router-dom'

const Unauthorized = () => (
  <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
      Access denied
    </p>
    <h1 className="mt-2 text-3xl font-bold text-slate-900">
      You don’t have permission to view this page
    </h1>
    <p className="mt-3 text-slate-600">
      Your account does not have access to this page. Contact your administrator
      if you think you should have access.
    </p>
    <Link
      to="/dashboard"
      className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
    >
      Return to dashboard
    </Link>
  </section>
)

export default Unauthorized
