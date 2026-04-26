import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Code2, ImageIcon, Link2, Pencil, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/media/StatusBadge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import {
  approveMedia,
  deleteMedia,
  listMedia,
  rejectMedia,
  updateMedia,
  type MediaItem,
  type MediaStatus,
} from '@/lib/api/media'
import { getChargers, getLocations } from '@/lib/api/lookups'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: Array<'all' | MediaStatus> = ['all', 'pending', 'approved', 'rejected']

function getMediaLabel(item: MediaItem): string {
  return item.title?.trim() || `Media #${item.media_id}`
}

function formatRelativeTime(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MediaListPage() {
  const { t } = useTranslation()
  useSetPageTitle(t('pages.media_list'))

  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | MediaStatus>('all')

  const mediaQuery = useQuery({
    queryKey: ['media', 'list', status, search, isAdmin],
    queryFn: () =>
      listMedia({
        status: status === 'all' ? undefined : status,
        q: search.trim() || undefined,
      }),
  })

  const locsQuery = useQuery({
    queryKey: ['lookups', 'locations'],
    queryFn: getLocations,
  })
  const chargersQuery = useQuery({
    queryKey: ['lookups', 'chargers', 'all'],
    queryFn: () => getChargers(),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['media'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMedia(id),
    onSuccess: async () => {
      toast.success('Media deleted')
      await invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('common.error_generic'))
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => approveMedia(id, note),
    onSuccess: async () => {
      toast.success('Media approved')
      await invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('common.error_generic'))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => rejectMedia(id, note),
    onSuccess: async () => {
      toast.success('Media rejected')
      await invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('common.error_generic'))
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id }: { id: number; payload: { title?: string; description?: string; default_display_seconds?: number } }) =>
      updateMedia(id, {}),
  })

  const rows = mediaQuery.data?.items ?? []
  const locById = useMemo(() => {
    const map = new Map<number, string>()
    for (const loc of locsQuery.data ?? []) {
      map.set(loc.location_id, loc.name ?? `Location #${loc.location_id}`)
    }
    return map
  }, [locsQuery.data])
  const chargerById = useMemo(() => {
    const map = new Map<number, string>()
    for (const charger of chargersQuery.data ?? []) {
      map.set(charger.id, charger.name ?? charger.chargerID ?? `Charger #${charger.id}`)
    }
    return map
  }, [chargersQuery.data])

  const onApprove = (item: MediaItem) => {
    approveMutation.mutate({ id: item.media_id, note: t('media.approve_note') })
  }

  const onReject = (item: MediaItem) => {
    rejectMutation.mutate({ id: item.media_id, note: t('media.reject_default_note') })
  }

  const actions = !isAdmin ? (
    <Button asChild size="sm">
      <Link to="/media/upload">Upload media</Link>
    </Button>
  ) : undefined

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.media_list')} description={t('media.library_description')} actions={actions} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="media-search">{t('common.search')}</Label>
          <Input
            id="media-search"
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-status">{t('common.status')}</Label>
          <select
            id="media-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | MediaStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? t('dashboard.all_statuses') : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mediaQuery.isPending ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : mediaQuery.isError ? (
        <p className="text-sm text-destructive">{t('common.error_generic')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const locationLabel = item.location_id ? (locById.get(item.location_id) ?? `Location #${item.location_id}`) : t('common.unknown')
            const chargerLabel = item.charger_id ? (chargerById.get(item.charger_id) ?? `Charger #${item.charger_id}`) : t('common.unknown')
            const cardAccent =
              item.status === 'pending'
                ? 'border-l-4 border-l-amber-500'
                : item.status === 'approved'
                  ? 'border-l-4 border-l-green-500'
                  : item.status === 'rejected'
                    ? 'border-l-4 border-l-red-500'
                    : ''
            return (
              <Card key={item.media_id} className={cn('overflow-hidden', cardAccent)}>
                <div className="aspect-video border-b bg-muted">
                  {item.media_type === 'image' ? (
                    <img src={item.file_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {item.media_type === 'video' ? <Video className="h-8 w-8" /> : item.media_type === 'html' ? <Code2 className="h-8 w-8" /> : <Link2 className="h-8 w-8" />}
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="truncate text-base font-semibold">{getMediaLabel(item)}</p>
                    {item.status === 'rejected' && item.rejection_note ? (
                      <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{item.rejection_note}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {item.media_type === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : item.media_type === 'video' ? <Video className="h-3.5 w-3.5" /> : item.media_type === 'html' ? <Code2 className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span className="capitalize">{item.media_type}</span>
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{`📍 ${locationLabel} · ${chargerLabel}`}</p>
                  <p className="text-xs text-muted-foreground">{`🕐 ${formatRelativeTime(item.uploaded_at || item.created_at)}`}</p>
                  <div className="flex gap-2 pt-1">
                    {isAdmin ? (
                      item.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => onApprove(item)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                            {t('common.approve')}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onReject(item)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                            {t('common.reject')}
                          </Button>
                        </>
                      ) : null
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toast.info(t('common.coming_soon'))} disabled={editMutation.isPending}>
                          <Pencil className="mr-1 h-4 w-4" />
                          {t('media.edit')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(item.media_id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="mr-1 h-4 w-4" />
                          {t('media.delete')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
