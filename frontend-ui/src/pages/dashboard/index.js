import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useGetCurrentSessionQuery, useLogoutMutation } from '../../redux/services/users/usersApi'

const Dashboard = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = useGetCurrentSessionQuery()
  const [logout, { isLoading }] = useLogoutMutation()
  const user = data.user
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    user.email

  const handleLogout = async () => {
    setLogoutError('')
    try {
      await logout().unwrap()
      navigate('/login', { replace: true, state: { loggedOut: true } })
    } catch (error) {
      setLogoutError(error?.data?.error || 'Unable to log out. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-xl font-bold text-slate-800">
            Day Book
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-sm font-medium text-slate-700 sm:block">
                {displayName}
              </span>
              <span aria-hidden="true" className="text-slate-500">▾</span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isLoading ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Welcome, {displayName}
          </h1>
          <p className="mt-2 text-slate-600">
            You’re signed in to your Day Book account.
          </p>
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
            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">Role</p>
              <p className="mt-1 font-semibold capitalize text-slate-800">{user.role}</p>
            </div>
          </div>
          {logoutError && (
            <p className="mt-5 text-sm text-red-600" role="alert">
              {logoutError}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
