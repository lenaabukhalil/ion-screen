import { PageHeader } from '@/components/common/PageHeader'
import { useTranslation } from 'react-i18next'

export default function ApprovalsQueuePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.approvals')} />
      <p className="text-sm text-muted-foreground">{t('common.coming_soon')}</p>
    </div>
  )
}
