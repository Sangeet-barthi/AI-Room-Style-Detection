import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { PageLoader } from '@/components/ui/page-loader'
import { useAuth } from '@/stores/auth'

/** Blocks unauthenticated access and remembers where the user was heading. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Keeps signed-in users away from the login and register screens. */
export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <PageLoader />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
