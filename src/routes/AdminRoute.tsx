import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isAdminRole } from '../auth/roleUtils'

export function AdminRoute() {
  const auth = useAuth()

  if (!isAdminRole(auth.user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
