import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/media/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import { listMedia, type MediaItem, type MediaStatus } from '@/lib/api/media'
import { getChargers, getLocations, getOrganizations } from '@/lib/api/lookups'
import {
  Archive,
  CheckCircle,
  Clock,
  Code2,
  ImageIcon,
  LayoutDashboard,
  Link2,
  RefreshCcw,
  Video,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

const PAGE_SIZE = 20
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

function formatRelativeTime(
  dateStr: string | null | undefined,
  labels: { unknown: string; justNow: string; minuteAgo: string; hourAgo: string; dayAgo: string },
): string {
  if (!dateStr) return labels.unknown
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return labels.unknown

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return labels.justNow
  if (diffMin < 60) return `${diffMin}${labels.minuteAgo}`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}${labels.hourAgo}`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}${labels.dayAgo}`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const relativeTimeLabels = useMemo(
    () => ({
      unknown: t('common.unknown'),
      justNow: t('dashboard.just_now'),
      minuteAgo: t('dashboard.minute_ago'),
      hourAgo: t('dashboard.hour_ago'),
      dayAgo: t('dashboard.day_ago'),
    }),
    [t],
  )

  useSetPageTitle(t('dashboard.overview'))
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [orgFilter, setOrgFilter] = useState<number | 'all'>('all')
  const [page, setPage] = useState(1)

  const allMediaQuery = useQuery({
    queryKey: ['media', 'overview', 'all'],
    queryFn: () => listMedia({ limit: 1 }),
  })

  const statusCounts = useQueries({
    queries: (['pending', 'approved', 'rejected', 'archived'] as MediaStatus[]).map((status) => ({
      queryKey: ['media', 'count', status],
      queryFn: () => listMedia({ status, limit: 1 }),
    })),
  })

  const mediaQuery = useQuery({
    queryKey: ['media', 'overview', statusFilter, orgFilter, page],
    queryFn: () =>
      listMedia({
        status: statusFilter === 'all' ? undefined : statusFilter,
        organization_id: orgFilter === 'all' ? undefined : orgFilter,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    placeholderData: (previousData) => previousData,
  })

  const orgsQuery = useQuery({ queryKey: ['lookups', 'orgs'], queryFn: getOrganizations })
  const locsQuery = useQuery({ queryKey: ['lookups', 'locations'], queryFn: getLocations })
  const chargersQuery = useQuery({
    queryKey: ['lookups', 'chargers', 'all'],
    queryFn: () => getChargers(),
  })

  const orgById = useMemo(() => {
    const map = new Map<number, string>()
    for (const org of orgsQuery.data ?? []) {
      if (org.name) map.set(org.organization_id, org.name)
    }
    return map
  }, [orgsQuery.data])

  const locById = useMemo(() => {
    const map = new Map<number, string>()
    for (const loc of locsQuery.data ?? []) {
      if (loc.name) map.set(loc.location_id, loc.name)
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

  const totalCount = allMediaQuery.data?.total ?? 0
  const pendingCount = statusCounts[0]?.data?.total ?? 0
  const approvedCount = statusCounts[1]?.data?.total ?? 0
  const rejectedCount = statusCounts[2]?.data?.total ?? 0
  const archivedCount = statusCounts[3]?.data?.total ?? 0
  const mediaItems = mediaQuery.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil((mediaQuery.data?.total ?? 0) / PAGE_SIZE))

  const isStatsLoading = allMediaQuery.isPending || statusCounts.some((q) => q.isPending)
  const isTableLoading =
    mediaQuery.isPending || orgsQuery.isPending || locsQuery.isPending || chargersQuery.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.overview')}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['media'] })
              void queryClient.invalidateQueries({ queryKey: ['lookups'] })
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('dashboard.refresh')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isStatsLoading ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" />)
        ) : (
          <>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.total_media')}</CardTitle>
                <ImageIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalCount}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.pending_review')}</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.approved')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{approvedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.rejected')}</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{rejectedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-slate-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.archived')}</CardTitle>
                <Archive className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{archivedCount}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-xl">{t('dashboard.media_requests')}</CardTitle>
            <CardDescription>{t('dashboard.media_requests_subtitle')}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter)
                setPage(1)
              }}
            >
              <option value="all">{t('dashboard.all_statuses')}</option>
              <option value="pending">{t('dashboard.pending_review')}</option>
              <option value="approved">{t('dashboard.approved')}</option>
              <option value="rejected">{t('dashboard.rejected')}</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={orgFilter}
              onChange={(e) => {
                const value = e.target.value
                setOrgFilter(value === 'all' ? 'all' : Number(value))
                setPage(1)
              }}
            >
              <option value="all">{t('dashboard.all_orgs')}</option>
              {(orgsQuery.data ?? []).map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.name || t('dashboard.org_fallback', { id: org.organization_id })}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isTableLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-dashed">
              <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('dashboard.no_results')}</p>
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.preview')}</TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('dashboard.type')}</TableHead>
                    <TableHead>{t('common.organization')}</TableHead>
                    <TableHead>{t('common.location')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('dashboard.submitted')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mediaItems.map((item: MediaItem) => {
                    const orgName =
                      orgById.get(item.organization_id) ?? t('dashboard.org_fallback', { id: item.organization_id })
                    const locationName =
                      item.location_id == null
                        ? t('common.unknown')
                        : (locById.get(item.location_id) ?? t('dashboard.loc_fallback', { id: item.location_id }))
                    const rowAccent =
                      item.status === 'pending'
                        ? 'border-l-4 border-l-amber-500'
                        : item.status === 'rejected'
                          ? 'border-l-4 border-l-red-500'
                          : ''

                    return (
                      <TableRow key={item.media_id} className={rowAccent}>
                        <TableCell>
                          <div className="h-12 w-16 overflow-hidden rounded border bg-muted">
                            {item.media_type === 'image' ? (
                              <img
                                src={item.file_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                {item.media_type === 'video' ? (
                                  <Video className="h-4 w-4" />
                                ) : item.media_type === 'html' ? (
                                  <Code2 className="h-4 w-4" />
                                ) : (
                                  <Link2 className="h-4 w-4" />
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{item.title || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.uploaded_by != null
                              ? `${t('dashboard.by_user')} #${item.uploaded_by}`
                              : `${t('dashboard.by_user')} ${t('common.unknown')}`}
                          </p>
                        </TableCell>
                        <TableCell className="capitalize">{item.media_type}</TableCell>
                        <TableCell>{orgName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{locationName}</span>
                            {item.charger_id ? (
                              <span className="text-xs text-muted-foreground">
                                {chargerById.get(item.charger_id) ?? `Charger #${item.charger_id}`}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.status} />
                            {item.status === 'rejected' && item.rejection_note ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-amber-600" aria-label={t('dashboard.rejection_note')}>
                                    <AlertTriangle className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{item.rejection_note}</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{formatRelativeTime(item.uploaded_at || item.created_at, relativeTimeLabels)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              {t('common.prev')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              {t('common.next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
