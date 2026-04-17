import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function RequireAdmin() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return <Navigate to="/partner/dashboard" replace />
  }

  return <Outlet />
}
