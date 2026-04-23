import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import { uploadMedia, type MediaType } from '@/lib/api/media'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  media_type: z.enum(['image', 'video', 'html', 'url']),
  file_url: z.string().url('Must be a valid URL'),
  play_duration_sec: z.coerce.number().int().min(1, 'Duration must be at least 1 second'),
  schedule_start: z.string().optional(),
  schedule_end: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export default function MediaUploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  useSetPageTitle(t('pages.media_upload'))

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      media_type: 'image',
      file_url: '',
      play_duration_sec: 30,
      schedule_start: '',
      schedule_end: '',
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (values: FormValues) =>
      uploadMedia({
        title: values.title,
        description: values.description,
        media_type: values.media_type as MediaType,
        file_url: values.file_url,
        play_duration_sec: values.play_duration_sec,
        schedule_start: values.schedule_start || undefined,
        schedule_end: values.schedule_end || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Media uploaded and sent for review')
      navigate('/media', { replace: true })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('common.error_generic'))
    },
  })

  if (isAdmin) {
    return <Navigate to="/media" replace />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.media_upload')} />
      <form
        className="max-w-2xl space-y-4 rounded-md border bg-card p-6"
        onSubmit={form.handleSubmit((values: FormValues) => uploadMutation.mutate(values))}
      >
        <div className="space-y-2">
          <Label htmlFor="title">{t('common.name')}</Label>
          <Input id="title" {...form.register('title')} />
          {form.formState.errors.title ? (
            <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...form.register('description')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="media_type">Media type</Label>
            <select
              id="media_type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register('media_type')}
            >
              <option value="image">image</option>
              <option value="video">video</option>
              <option value="html">html</option>
              <option value="url">url</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="play_duration_sec">{t('common.duration')}</Label>
            <Input id="play_duration_sec" type="number" min={1} {...form.register('play_duration_sec')} />
            {form.formState.errors.play_duration_sec ? (
              <p className="text-sm text-destructive">{form.formState.errors.play_duration_sec.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file_url">{t('common.file_url')}</Label>
          <Input id="file_url" placeholder="https://..." {...form.register('file_url')} />
          {form.formState.errors.file_url ? (
            <p className="text-sm text-destructive">{form.formState.errors.file_url.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="schedule_start">{t('common.schedule_start')}</Label>
            <Input id="schedule_start" type="datetime-local" {...form.register('schedule_start')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule_end">{t('common.schedule_end')}</Label>
            <Input id="schedule_end" type="datetime-local" {...form.register('schedule_end')} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? t('common.loading') : t('common.upload')}
          </Button>
        </div>
      </form>
    </div>
  )
}
