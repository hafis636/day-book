import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGetCurrentSessionQuery, useLogoutMutation } from '../redux/services/users/usersApi'
import LeftMenu, { LeftMenuToggle } from '../menus/LeftMenu'
import TopMenu from '../menus/TopMenu'

const AuthenticatedLayout = ({ children }) => {
  const [leftMenuOpen, setLeftMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
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
      <header className="relative z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px]">
          <div
            aria-hidden="true"
            className="shrink-0 lg:w-0"
          />
          <div
            role="group"
            aria-label="Page header content"
            className="flex min-w-0 flex-1 items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
          >
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
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px]">
        {leftMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setLeftMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          />
        )}
        <LeftMenu role={user.role} open={leftMenuOpen} />
        <main className="relative min-w-0 flex-1 px-4 py-12 sm:px-6 lg:px-8">
          {children}
          {logoutError && (
            <p className="mt-5 text-sm text-red-600" role="alert">
              {logoutError}
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

export default AuthenticatedLayout
