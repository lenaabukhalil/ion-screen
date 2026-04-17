import { PageHeader } from '@/components/common/PageHeader'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

export default function MediaDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.media_detail')} description={id != null ? `#${id}` : undefined} />
      <p className="text-sm text-muted-foreground">{t('common.coming_soon')}</p>
    </div>
  )
}
