import { PageHeader } from '@/components/common/PageHeader'
import { useTranslation } from 'react-i18next'

export default function ScheduleCreatePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.schedule_create')} />
      <p className="text-sm text-muted-foreground">{t('common.coming_soon')}</p>
    </div>
  )
}
