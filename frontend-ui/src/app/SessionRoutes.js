import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useGetCurrentSessionQuery } from '../redux/services/users/usersApi'

const SessionLoading = () => (
  <></>
)

export const HomeRedirect = () => {
  const { data, isLoading } = useGetCurrentSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  if (isLoading) return <SessionLoading />
  return <Navigate to={data?.user ? '/dashboard' : '/login'} replace />
}

export const ProtectedRoute = ({ children }) => {
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

  if (isLoading) return null
  return data?.user ? children : <Navigate to="/login" replace />
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
