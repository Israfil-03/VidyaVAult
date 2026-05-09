import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'
import { Loader } from './Loader'

interface ProtectedRouteProps {
  roles: Role[]
  children: ReactNode
}

export const ProtectedRoute = ({ roles, children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!roles.includes(user.role)) {
    const redirectPath = user.role === 'teacher_admin' 
      ? '/teacher' 
      : user.role === 'institute_admin' 
        ? '/institute-admin' 
        : `/${user.role}`
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
