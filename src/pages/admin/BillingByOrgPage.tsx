import { PageHeader } from '@/components/common/PageHeader'
import { useTranslation } from 'react-i18next'

export default function BillingByOrgPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.billing_by_org')} />
      <p className="text-sm text-muted-foreground">{t('common.coming_soon')}</p>
    </div>
  )
}
