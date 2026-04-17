import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

export function RequireAuth() {
  const { status } = useAuth()
  const { t } = useTranslation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8" aria-busy="true" aria-label={t('common.loading')}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
        <Skeleton className="h-32 w-full max-w-2xl" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
