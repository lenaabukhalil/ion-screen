import { Badge } from '@/components/ui/badge'
import type { MediaStatus } from '@/lib/api/media'
import { useTranslation } from 'react-i18next'

interface StatusBadgeProps {
  status: MediaStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation()

  if (status === 'approved') {
    return <Badge className="bg-green-600 text-white hover:bg-green-600">{t('common.approved')}</Badge>
  }
  if (status === 'rejected') {
    return <Badge variant="destructive">{t('common.rejected')}</Badge>
  }
  if (status === 'archived') {
    return <Badge className="bg-slate-500 text-white hover:bg-slate-500">{t('common.archived')}</Badge>
  }
  if (status === 'draft') {
    return <Badge variant="secondary">{t('common.draft')}</Badge>
  }
  return <Badge className="bg-amber-500 text-black hover:bg-amber-500">{t('common.pending')}</Badge>
}
