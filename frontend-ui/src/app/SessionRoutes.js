import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useGetCurrentSessionQuery } from '../redux/services/users/usersApi'
import AuthenticatedLayout from './AuthenticatedLayout'
import Unauthorized from '../pages/Unauthorized'
import { normalizeRole } from '../menus/menuNames'

const SessionLoading = () => (
  <main className="grid min-h-screen place-items-center bg-slate-50">
    <div
      role="status"
      aria-label="Loading session"
      className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700"
    />
  </main>
)

export const HomeRedirect = () => {
  const { data, isLoading } = useGetCurrentSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  if (isLoading) return <SessionLoading />
  return <Navigate to={data?.user ? '/dashboard' : '/login'} replace />
}

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { data, isLoading, refetch } = useGetCurrentSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    let lastRefresh = Date.now()
    const refreshOnActivity = () => {
      if (Date.now() - lastRefresh < 5 * 60 * 1000) return
      lastRefresh = Date.now()
      refetch()
    }

    window.addEventListener('pointerdown', refreshOnActivity)
    window.addEventListener('keydown', refreshOnActivity)
    window.addEventListener('scroll', refreshOnActivity)
    return () => {
      window.removeEventListener('pointerdown', refreshOnActivity)
      window.removeEventListener('keydown', refreshOnActivity)
      window.removeEventListener('scroll', refreshOnActivity)
    }
  }, [refetch])

  if (isLoading) return <SessionLoading />
  if (!data?.user) return <Navigate to="/login" replace />

  const hasAccess =
    !allowedRoles ||
    allowedRoles.map(normalizeRole).includes(normalizeRole(data.user.role))

  return (
    <AuthenticatedLayout>
      {hasAccess ? children : <Unauthorized />}
    </AuthenticatedLayout>
  )
}

export const PublicOnlyRoute = ({ children }) => {
  const location = useLocation()
  const { data, isLoading } = useGetCurrentSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  if (isLoading) return <SessionLoading />
  if (location.state?.loggedOut) return children
  return data?.user ? <Navigate to="/dashboard" replace /> : children
}
