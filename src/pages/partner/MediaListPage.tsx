import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Pencil, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/media/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

const STATUS_OPTIONS: Array<'all' | MediaStatus> = ['all', 'pending', 'approved', 'rejected']

function formatDate(v: string): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString()
}

function getMediaLabel(item: MediaItem): string {
  return item.title?.trim() || `Media #${item.media_id}`
}

export default function MediaListPage() {
  const { t } = useTranslation()
  useSetPageTitle('Media library')

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
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: { title?: string; description?: string; default_display_seconds?: number }
    }) => updateMedia(id, payload),
    onSuccess: async () => {
      toast.success('Media updated')
      await invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('common.error_generic'))
    },
  })

  const rows = mediaQuery.data?.items ?? []

  const onEdit = (item: MediaItem) => {
    const nextTitle = window.prompt('Edit title', item.title)
    if (nextTitle == null) return
    const nextDescription = window.prompt('Edit description', item.description)
    if (nextDescription == null) return
    const rawDuration = window.prompt('Display duration (seconds)', String(item.default_display_seconds))
    if (rawDuration == null) return
    const seconds = Number(rawDuration)
    editMutation.mutate({
      id: item.media_id,
      payload: {
        title: nextTitle.trim() || item.title,
        description: nextDescription,
        default_display_seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : item.default_display_seconds,
      },
    })
  }

  const onDelete = (item: MediaItem) => {
    const ok = window.confirm(`Delete "${getMediaLabel(item)}"?`)
    if (!ok) return
    deleteMutation.mutate(item.media_id)
  }

  const onApprove = (item: MediaItem) => {
    const note = window.prompt('Approval note (optional)', '') ?? undefined
    approveMutation.mutate({ id: item.media_id, note })
  }

  const onReject = (item: MediaItem) => {
    const note = window.prompt('Reject note (required)', '')
    if (!note || !note.trim()) {
      toast.error('Reject note is required')
      return
    }
    rejectMutation.mutate({ id: item.media_id, note: note.trim() })
  }

  const actions = !isAdmin ? (
    <Button asChild size="sm">
      <Link to="/media/upload">Upload media</Link>
    </Button>
  ) : undefined

  return (
    <div className="space-y-6">
      <PageHeader title="Media library" description="Search, review, and manage media assets." actions={actions} />

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
                {option === 'all' ? 'All statuses' : option}
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                {isAdmin ? <TableHead>{t('common.organization')}</TableHead> : null}
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => {
                return (
                  <TableRow key={item.media_id}>
                    <TableCell>
                      <div className="h-14 w-24 overflow-hidden rounded bg-muted">
                        {item.media_type === 'image' ? (
                          <img
                            src={item.file_url}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Video className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{getMediaLabel(item)}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.media_type === 'image' ? (
                          <ImageIcon className="mr-1 inline h-3 w-3" />
                        ) : (
                          <Video className="mr-1 inline h-3 w-3" />
                        )}
                        <span className="capitalize">{item.media_type}</span>
                      </div>
                    </TableCell>
                    {isAdmin ? <TableCell>{item.organization_id}</TableCell> : null}
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex flex-wrap gap-2">
                          {isAdmin ? (
                            item.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => onApprove(item)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onReject(item)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">No actions</span>
                            )
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onEdit(item)}
                                      disabled={editMutation.isPending}
                                    >
                                      <Pencil className="mr-1 h-4 w-4" />
                                      Edit
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Edit media</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => onDelete(item)}
                                      disabled={deleteMutation.isPending}
                                    >
                                      <Trash2 className="mr-1 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Delete media</TooltipContent>
                              </Tooltip>

                              <Button size="sm" variant="secondary" asChild>
                                <Link to="/schedules">Schedule</Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
