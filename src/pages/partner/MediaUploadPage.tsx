import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Code2,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  PlayCircle,
  Upload,
  Video,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import { uploadMedia, type MediaType } from '@/lib/api/media'
import { getChargers, getLocations } from '@/lib/api/lookups'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  media_type: z.enum(['image', 'video', 'html', 'url']),
  file_url: z.string().url(),
  play_duration_sec: z.coerce.number().int().min(1).max(3600),
  location_id: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(1, 'Please select a location'),
  ),
  charger_id: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(1, 'Please select a charger'),
  ),
  schedule_start: z.string().optional(),
  schedule_end: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const STEPS = ['media_details', 'assignment', 'review_submit'] as const
type StepIndex = 0 | 1 | 2

export default function MediaUploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin, user } = useAuth()
  const [currentStep, setCurrentStep] = useState<StepIndex>(0)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [chargerSearch, setChargerSearch] = useState('')
  useSetPageTitle(t('pages.media_upload'))

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      media_type: 'image',
      file_url: '',
      play_duration_sec: 30,
      location_id: undefined,
      charger_id: undefined,
      schedule_start: '',
      schedule_end: '',
    },
  })

  const selectedLocationRaw = form.watch('location_id')
  const selectedLocationId =
    typeof selectedLocationRaw === 'number' && Number.isFinite(selectedLocationRaw) ? selectedLocationRaw : undefined

  const locsQuery = useQuery({
    queryKey: ['lookups', 'locations'],
    queryFn: getLocations,
  })
  const chargersQuery = useQuery({
    queryKey: ['lookups', 'chargers', selectedLocationId],
    queryFn: () => getChargers(selectedLocationId),
    enabled: Boolean(selectedLocationId),
  })

  const uploadMutation = useMutation({
    mutationFn: (values: FormValues) =>
      uploadMedia({
        title: values.title,
        description: values.description || undefined,
        media_type: values.media_type,
        file_url: values.file_url,
        play_duration_sec: values.play_duration_sec,
        location_id: values.location_id,
        charger_id: values.charger_id,
        schedule_start: values.schedule_start || undefined,
        schedule_end: values.schedule_end || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success(t('media.upload_success'))
      navigate('/media', { replace: true })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('common.error_generic'))
    },
  })

  if (isAdmin) return <Navigate to="/media" replace />

  const title = form.watch('title') ?? ''
  const description = form.watch('description') ?? ''
  const mediaType = form.watch('media_type')
  const fileUrl = form.watch('file_url') ?? ''
  const duration = Number(form.watch('play_duration_sec') || 0)
  const scheduleStart = form.watch('schedule_start') ?? ''
  const scheduleEnd = form.watch('schedule_end') ?? ''
  const urlValid = !form.formState.errors.file_url && fileUrl.trim().length > 0

  const locationOptions = useMemo(
    () =>
      (locsQuery.data ?? []).filter((loc) =>
        (loc.name ?? `Location #${loc.location_id}`).toLowerCase().includes(locationSearch.toLowerCase()),
      ),
    [locsQuery.data, locationSearch],
  )
  const chargerOptions = useMemo(
    () =>
      (chargersQuery.data ?? []).filter((c) =>
        (c.name ?? c.chargerID ?? `Charger #${c.id}`).toLowerCase().includes(chargerSearch.toLowerCase()),
      ),
    [chargersQuery.data, chargerSearch],
  )

  const selectedLocationLabel =
    (locsQuery.data ?? []).find((loc) => loc.location_id === selectedLocationId)?.name ??
    (selectedLocationId ? `Location #${selectedLocationId}` : t('common.unknown'))
  const selectedChargerRaw = form.watch('charger_id')
  const selectedChargerId =
    typeof selectedChargerRaw === 'number' && Number.isFinite(selectedChargerRaw) ? selectedChargerRaw : undefined
  const selectedChargerLabel =
    (chargersQuery.data ?? []).find((c) => c.id === selectedChargerId)?.name ??
    (chargersQuery.data ?? []).find((c) => c.id === selectedChargerId)?.chargerID ??
    (selectedChargerId ? `Charger #${selectedChargerId}` : t('common.unknown'))

  const goNext = async () => {
    if (currentStep === 0) {
      const ok = await form.trigger(['title', 'description', 'media_type', 'file_url', 'play_duration_sec'])
      if (ok) setCurrentStep(1)
      return
    }
    if (currentStep === 1) {
      const ok = await form.trigger(['location_id', 'charger_id', 'schedule_start', 'schedule_end'])
      if (ok) setCurrentStep(2)
    }
  }

  const typeOptions: Array<{ value: MediaType; icon: typeof ImageIcon; emoji: string; label: string }> = [
    { value: 'image', icon: ImageIcon, emoji: '🖼', label: t('media.type_image') },
    { value: 'video', icon: Video, emoji: '🎬', label: t('media.type_video') },
    { value: 'html', icon: Code2, emoji: '</>', label: t('media.type_html') },
    { value: 'url', icon: Link2, emoji: '🔗', label: t('media.type_url') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.media_upload')} description={t('media.wizard_description')} />

      <Card className="p-6">
        <div className="mb-8 flex items-center justify-center gap-3">
          {STEPS.map((step, index) => {
            const done = currentStep > index
            const active = currentStep === index
            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                    done || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {index + 1}
                </div>
                {index < STEPS.length - 1 ? <div className="h-px w-10 bg-border" /> : null}
              </div>
            )
          })}
        </div>

        <form onSubmit={form.handleSubmit((values: FormValues) => uploadMutation.mutate(values))} className="space-y-6">
          {currentStep === 0 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">{t('media.step_media_details')}</h3>
              <div className="space-y-2">
                <Label htmlFor="title">{t('common.name')}</Label>
                <Input id="title" maxLength={100} {...form.register('title')} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{form.formState.errors.title?.message}</span>
                  <span>{title.length}/100</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('media.description')}</Label>
                <textarea
                  id="description"
                  maxLength={300}
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register('description')}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{form.formState.errors.description?.message}</span>
                  <span>{description.length}/300</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('media.media_type')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {typeOptions.map((option) => {
                    const Icon = option.icon
                    const selected = mediaType === option.value
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => form.setValue('media_type', option.value, { shouldDirty: true, shouldValidate: true })}
                        className={cn(
                          'rounded-lg border p-4 text-left transition',
                          selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">{option.emoji}</span>
                        </div>
                        <p className="text-sm font-medium">{option.label}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_url">{t('common.file_url')}</Label>
                <Input id="file_url" placeholder="https://example.com/media.jpg" {...form.register('file_url')} />
                <div
                  className={cn(
                    'text-xs',
                    urlValid ? 'text-emerald-600' : fileUrl ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {fileUrl ? (urlValid ? t('media.valid_url') : t('media.invalid_url')) : t('media.url_hint')}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="aspect-video overflow-hidden rounded-md border bg-background">
                  {mediaType === 'image' && urlValid ? (
                    <img src={fileUrl} alt={title || 'preview'} className="h-full w-full object-cover" />
                  ) : mediaType === 'video' ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                  ) : mediaType === 'url' ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Link2 className="h-10 w-10" />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Code2 className="h-10 w-10" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="play_duration_sec">{t('common.duration')}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.setValue('play_duration_sec', Math.max(1, duration - 1), { shouldValidate: true })}
                  >
                    -
                  </Button>
                  <Input id="play_duration_sec" type="number" min={1} max={3600} {...form.register('play_duration_sec')} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.setValue('play_duration_sec', Math.min(3600, duration + 1), { shouldValidate: true })}
                  >
                    +
                  </Button>
                  <span className="text-sm text-muted-foreground">{t('media.seconds_label', { value: duration || 0 })}</span>
                </div>
                {form.formState.errors.play_duration_sec ? (
                  <p className="text-xs text-destructive">{form.formState.errors.play_duration_sec.message}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">{t('media.step_assignment')}</h3>
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <p className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4" />
                  <span>{t('media.assignment_notice')}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('common.organization')}</Label>
                <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {t('media.organization_badge', { id: user?.organization_id ?? t('common.unknown') })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-search">{t('common.location')}</Label>
                <Input
                  id="location-search"
                  placeholder={t('media.select_location')}
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={typeof selectedLocationId === 'number' ? selectedLocationId : ''}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : undefined
                    form.setValue('location_id', next, { shouldValidate: true, shouldDirty: true })
                    form.setValue('charger_id', undefined, { shouldDirty: true, shouldValidate: true })
                    setChargerSearch('')
                  }}
                >
                  <option value="">{t('media.select_location')}</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name ?? `Location #${loc.location_id}`}
                    </option>
                  ))}
                </select>
                {form.formState.errors.location_id ? (
                  <p className="text-xs text-destructive">{form.formState.errors.location_id.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="charger-search">{t('common.charger')}</Label>
                <Input
                  id="charger-search"
                  placeholder={t('media.select_charger')}
                  value={chargerSearch}
                  onChange={(e) => setChargerSearch(e.target.value)}
                  disabled={!selectedLocationId}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={typeof selectedChargerId === 'number' ? selectedChargerId : ''}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : undefined
                    form.setValue('charger_id', next, { shouldValidate: true, shouldDirty: true })
                  }}
                  disabled={!selectedLocationId}
                >
                  <option value="">{t('media.select_charger')}</option>
                  {chargerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.name ?? t('media.charger_fallback', { id: c.id })} (${c.chargerID ?? c.id})`}
                    </option>
                  ))}
                </select>
                {!selectedLocationId ? <p className="text-xs text-muted-foreground">{t('common.select_location_first')}</p> : null}
                {form.formState.errors.charger_id ? (
                  <p className="text-xs text-destructive">{form.formState.errors.charger_id.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium"
                  onClick={() => setIsScheduleOpen((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('media.scheduling_optional')}
                  </span>
                  {isScheduleOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isScheduleOpen ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="schedule_start">{t('common.schedule_start')}</Label>
                      <Input id="schedule_start" type="datetime-local" {...form.register('schedule_start')} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="schedule_end">{t('common.schedule_end')}</Label>
                      <Input id="schedule_end" type="datetime-local" {...form.register('schedule_end')} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">{t('media.step_review_submit')}</h3>
              <div className="rounded-lg border p-4">
                <div className="mb-4 aspect-video overflow-hidden rounded-md border bg-muted">
                  {mediaType === 'image' && urlValid ? (
                    <img src={fileUrl} alt={title || 'preview'} className="h-full w-full object-cover" />
                  ) : mediaType === 'video' ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                  ) : mediaType === 'url' ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Link2 className="h-10 w-10" />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Code2 className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">{t('media.title_label')}:</span> {title || t('common.unknown')}</p>
                  <p>
                    <span className="text-muted-foreground">{t('media.type_label')}:</span> {mediaType}
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{t('media.duration_label')}:</span> {duration}s
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('common.location')}:</span> {selectedLocationLabel}
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{t('common.charger')}:</span> {selectedChargerLabel}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('media.schedule_label')}:</span>{' '}
                    {scheduleStart || scheduleEnd ? `${scheduleStart || '—'} → ${scheduleEnd || '—'}` : t('media.no_schedule')}
                  </p>
                </div>
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-semibold">{t('media.pending_review_title')}</p>
                  <p>{t('media.pending_review_desc')}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setCurrentStep((s) => (s > 0 ? ((s - 1) as StepIndex) : s))} disabled={currentStep === 0}>
              {t('common.back')}
            </Button>
            {currentStep < 2 ? (
              <Button type="button" onClick={goNext}>
                {t('common.next')}
              </Button>
            ) : (
              <Button type="submit" className="w-full sm:w-auto" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {t('media.upload_media')}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
