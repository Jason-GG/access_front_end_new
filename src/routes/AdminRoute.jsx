import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader } from '../components/common/Loader'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../utils/constants'
import { isAdminUser } from '../utils/helpers'

export function AdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader label="Verifying administrator privileges…" full />
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  if (!isAdminUser(user)) {
    return <Navigate to={ROUTES.home} replace />
  }

  return <Outlet />
}
