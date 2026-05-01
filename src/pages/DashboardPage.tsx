import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
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
import { cn } from '@/lib/utils'
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
  LocateFixed,
} from 'lucide-react'
import type { Charger } from '@/types/lookups'

const PAGE_SIZE = 20
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
type ChargerOnlineFilter = 'all' | 'online' | 'offline' | 'unknown'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function chargerStatus(charger: Charger): ChargerOnlineFilter {
  if (charger.is_online === true) return 'online'
  if (charger.is_online === false) return 'offline'
  return 'unknown'
}

function markerIconForStatus(status: ChargerOnlineFilter): L.DivIcon {
  const bg =
    status === 'online'
      ? '#16a34a'
      : status === 'offline'
        ? '#dc2626'
        : '#6b7280'
  return L.divIcon({
    className: 'custom-charger-marker',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${bg};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function FitAllMarkersButton({
  points,
  label,
  onDone,
}: {
  points: Array<[number, number]>
  label: string
  onDone?: () => void
}) {
  const map = useMap()
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => {
        if (points.length === 0) return
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
        onDone?.()
      }}
      className="absolute right-3 top-3 z-[500]"
    >
      <LocateFixed className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

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
  const [mapOrgFilter, setMapOrgFilter] = useState<number | 'all'>('all')
  const [onlineFilter, setOnlineFilter] = useState<ChargerOnlineFilter>('all')

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

  const locationById = useMemo(() => {
    const map = new Map<number, NonNullable<(typeof locsQuery.data)>[number]>()
    for (const loc of locsQuery.data ?? []) {
      map.set(loc.location_id, loc)
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

  const mapChargers = useMemo(() => {
    const byOrg =
      mapOrgFilter === 'all'
        ? chargersQuery.data ?? []
        : (chargersQuery.data ?? []).filter((charger) => {
            const loc = charger.location_id != null ? locationById.get(charger.location_id) : undefined
            return loc?.organization_id === mapOrgFilter
          })

    if (onlineFilter === 'all') return byOrg
    return byOrg.filter((charger) => chargerStatus(charger) === onlineFilter)
  }, [chargersQuery.data, locationById, mapOrgFilter, onlineFilter])

  const mapPoints = useMemo(() => {
    return mapChargers
      .map((charger) => {
        const loc = charger.location_id != null ? locationById.get(charger.location_id) : undefined
        if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null
        return {
          charger,
          loc,
          position: [Number(loc.lat), Number(loc.lng)] as [number, number],
        }
      })
      .filter((point): point is { charger: Charger; loc: NonNullable<(typeof locsQuery.data)>[number]; position: [number, number] } => point !== null)
  }, [locationById, mapChargers, locsQuery.data])

  const mapCenter = useMemo<[number, number]>(() => {
    if (mapPoints.length === 0) return [31.9, 35.9]
    const avgLat = mapPoints.reduce((sum, point) => sum + point.position[0], 0) / mapPoints.length
    const avgLng = mapPoints.reduce((sum, point) => sum + point.position[1], 0) / mapPoints.length
    return [avgLat, avgLng]
  }, [mapPoints])

  const onlineCount = mapChargers.filter((charger) => charger.is_online === true).length
  const offlineCount = mapChargers.filter((charger) => charger.is_online === false).length

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
            <CardTitle className="text-xl">{t('map.charger_map_title')}</CardTitle>
            <CardDescription>{t('map.charger_map_description')}</CardDescription>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={mapOrgFilter}
              onChange={(e) => setMapOrgFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">{t('map.all_organizations')}</option>
              {(orgsQuery.data ?? []).map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.name ?? t('dashboard.org_fallback', { id: org.organization_id })}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={onlineFilter}
              onChange={(e) => setOnlineFilter(e.target.value as ChargerOnlineFilter)}
            >
              <option value="all">{t('map.status_all')}</option>
              <option value="online">{t('common.online')}</option>
              <option value="offline">{t('common.offline')}</option>
              <option value="unknown">{t('map.status_unknown')}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>{t('map.stats', { locations: new Set(mapPoints.map((p) => p.loc.location_id)).size, chargers: mapPoints.length })}</span>
            <span className="text-green-600">{t('map.online_count', { count: onlineCount })}</span>
            <span className="text-red-600">{t('map.offline_count', { count: offlineCount })}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isTableLoading ? (
            <Skeleton className="h-[420px] w-full rounded-xl" />
          ) : mapPoints.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t('map.no_locations')}
            </div>
          ) : (
            <div className="relative h-[420px] overflow-hidden rounded-xl border border-border">
              <MapContainer center={mapCenter} zoom={8} className="h-full w-full" key={`${mapCenter[0]},${mapCenter[1]},${mapOrgFilter},${onlineFilter}`}>
                <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitAllMarkersButton points={mapPoints.map((p) => p.position)} label={t('map.fit_all_markers')} />
                <MarkerClusterGroup chunkedLoading>
                  {mapPoints.map((point) => {
                    const status = chargerStatus(point.charger)
                    const orgName =
                      point.loc.organization_id != null
                        ? (orgById.get(point.loc.organization_id) ?? t('dashboard.org_fallback', { id: point.loc.organization_id }))
                        : t('common.unknown')
                    return (
                      <Marker
                        key={point.charger.id}
                        position={point.position}
                        icon={markerIconForStatus(status)}
                      >
                        <Popup>
                          <div className="min-w-[220px] space-y-1 text-xs">
                            <p className="text-sm font-semibold">
                              {point.charger.name ?? point.charger.chargerID ?? `Charger #${point.charger.id}`}
                            </p>
                            <p className="text-muted-foreground">{point.loc.name ?? `Loc #${point.loc.location_id}`}</p>
                            <p className="text-muted-foreground">{orgName}</p>
                            <p>
                              <span className="font-medium">{t('common.status')}:</span>{' '}
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5',
                                  status === 'online'
                                    ? 'bg-green-100 text-green-700'
                                    : status === 'offline'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-100 text-slate-700',
                                )}
                              >
                                {status === 'unknown' ? t('map.status_unknown') : t(`common.${status}`)}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium">{t('map.connectors')}:</span>{' '}
                              {point.charger.connector_count ?? t('common.unknown')}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
                </MarkerClusterGroup>
              </MapContainer>
              <div className="absolute bottom-3 left-3 z-[500] rounded-md border bg-background/95 p-3 text-xs shadow-sm">
                <p className="mb-2 font-semibold">{t('map.legend')}</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />{t('common.online')}</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />{t('common.offline')}</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />{t('map.status_unknown')}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
