import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useGetCurrentSessionQuery, useLogoutMutation } from '../../redux/services/users/usersApi'
import LeftMenu, { LeftMenuToggle } from '../../menus/LeftMenu'
import TopMenu from '../../menus/TopMenu'

const Dashboard = () => {
  const [leftMenuOpen, setLeftMenuOpen] = useState(false)
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
          <div className="flex items-center gap-3">
            <LeftMenuToggle
              role={user.role}
              open={leftMenuOpen}
              onToggle={() => setLeftMenuOpen((open) => !open)}
            />
            <Link to="/dashboard" className="text-xl font-bold text-slate-800">
              Day Book
            </Link>
          </div>
          <TopMenu
            role={user.role}
            displayName={displayName}
            isLoading={isLoading}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        <LeftMenu role={user.role} open={leftMenuOpen} />
        <main className="min-w-0 flex-1 px-6 py-12">
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
    </div>
  )
}

export default Dashboard
