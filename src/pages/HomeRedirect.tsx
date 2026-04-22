import { Navigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

export function HomeRedirect() {
  const { status } = useAuth()
  const { t } = useTranslation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8" aria-busy="true" aria-label={t('common.loading')}>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/dashboard" replace />
}
