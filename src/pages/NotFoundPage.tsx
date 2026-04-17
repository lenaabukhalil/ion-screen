import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">{t('not_found.title')}</h1>
      <Button asChild variant="outline">
        <Link to="/">{t('not_found.back')}</Link>
      </Button>
    </div>
  )
}
