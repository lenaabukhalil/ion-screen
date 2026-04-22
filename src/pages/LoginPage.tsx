import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

type LoginForm = z.infer<ReturnType<typeof buildSchema>>

function buildSchema(t: (k: string) => string) {
  return z.object({
    identifier: z.string().min(3, t('login.identifier_min')),
    password: z.string().min(4, t('login.password_min')),
  })
}

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, login } = useAuth()

  const form = useForm<LoginForm>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { identifier: '', password: '' },
  })

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: LoginForm) {
    form.clearErrors('root')
    const ok = await login(values.identifier.trim(), values.password)
    if (ok) {
      navigate('/dashboard', { replace: true })
      return
    }
    const msg = t('login.error_invalid')
    toast.error(msg)
    form.setError('root', { message: msg })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('login.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit((v) => void onSubmit(v))} noValidate>
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('login.identifier_label')}</Label>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder={t('login.identifier_placeholder')}
                {...form.register('identifier')}
              />
              {form.formState.errors.identifier ? (
                <p className="text-sm text-destructive">{form.formState.errors.identifier.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password_label')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={t('login.password_placeholder')}
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {form.formState.errors.root ? (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
