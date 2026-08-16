import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader } from '../components/common/Loader'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../utils/constants'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader label="Checking your membership card…" full />
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  return <Outlet />
}
