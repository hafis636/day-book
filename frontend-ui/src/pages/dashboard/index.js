import React from 'react'
import { useLocation } from 'react-router-dom'
import { useGetCurrentSessionQuery } from '../../redux/services/users/usersApi'

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
