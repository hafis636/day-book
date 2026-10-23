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
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between px-6 py-4">
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

      <div className="flex w-full">
        <LeftMenu role={user.role} open={leftMenuOpen} />
        <main className="min-w-0 flex-1 px-6 py-12">
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
