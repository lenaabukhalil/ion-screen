import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/media/StatusBadge'
import { Badge } from '@/components/ui/badge'
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
import { useAuth } from '@/contexts/AuthContext'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import { listMedia, type MediaItem, type MediaListResult, type MediaStatus } from '@/lib/api/media'
import { getChargers, getLocations, getOrganizations } from '@/lib/api/lookups'
import { chargerStatus, markerIconForStatus } from '@/lib/leaflet-icons'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
  Clock,
  Code2,
  ImageIcon,
  Link2,
  LocateFixed,
  MapPin,
  RefreshCcw,
  Video,
  XCircle,
  Zap,
} from 'lucide-react'
import type { Charger, Location, Organization } from '@/types/lookups'

const PAGE_SIZE = 20

const DASHBOARD_REFETCH_OPTIONS = {
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  staleTime: 15_000,
} as const

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
type ChargerOnlineFilter = 'all' | 'online' | 'offline' | 'unknown'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

/** Prefer charger.organization_id, then location's org (for filtering / labels). */
function resolvedChargerOrgId(charger: Charger, loc: Location | undefined): number | undefined {
  if (charger.organization_id != null && Number.isFinite(Number(charger.organization_id))) {
    return Number(charger.organization_id)
  }
  if (loc?.organization_id != null && Number.isFinite(loc.organization_id)) {
    return loc.organization_id
  }
  return undefined
}

/** Charger lat/lng first, then location fallback. */
function resolveChargerPosition(
  charger: Charger,
  locationById: Map<number, Location>,
): { lat: number; lng: number } | null {
  const tryPair = (latRaw: unknown, lngRaw: unknown): { lat: number; lng: number } | null => {
    const la = typeof latRaw === 'number' ? latRaw : latRaw != null && latRaw !== '' ? Number(latRaw) : NaN
    const ln = typeof lngRaw === 'number' ? lngRaw : lngRaw != null && lngRaw !== '' ? Number(lngRaw) : NaN
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
    if (la === 0 && ln === 0) return null
    return { lat: la, lng: ln }
  }
  const direct = tryPair(charger.lat, charger.lng)
  if (direct) return direct
  const loc = charger.location_id != null ? locationById.get(Number(charger.location_id)) : undefined
  if (!loc) return null
  return tryPair(loc.lat, loc.lng)
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
        try {
          map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
        } catch {
          /* ignore invalid bounds */
        }
        onDone?.()
      }}
      className="absolute right-3 top-3 z-[500] rounded-md border border-border bg-card shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LocateFixed className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

function AutoFitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    try {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
    } catch {
      /* ignore */
    }
  }, [map, points])
  return null
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
  const { user } = useAuth()
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
    placeholderData: (previousData: MediaListResult | undefined) => previousData,
    ...DASHBOARD_REFETCH_OPTIONS,
  })

  const statusCounts = useQueries({
    queries: (['pending', 'approved', 'rejected', 'archived'] as MediaStatus[]).map((status) => ({
      queryKey: ['media', 'count', status],
      queryFn: () => listMedia({ status, limit: 1 }),
      placeholderData: (previousData: MediaListResult | undefined) => previousData,
      ...DASHBOARD_REFETCH_OPTIONS,
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
    placeholderData: (previousData: MediaListResult | undefined) => previousData,
    ...DASHBOARD_REFETCH_OPTIONS,
  })

  const orgsQuery = useQuery({
    queryKey: ['lookups', 'orgs'],
    queryFn: getOrganizations,
    placeholderData: (previousData: Organization[] | undefined) => previousData,
    ...DASHBOARD_REFETCH_OPTIONS,
  })
  const locsQuery = useQuery({
    queryKey: ['lookups', 'locations'],
    queryFn: getLocations,
    placeholderData: (previousData: Location[] | undefined) => previousData,
    ...DASHBOARD_REFETCH_OPTIONS,
  })
  const chargersQuery = useQuery({
    queryKey: ['lookups', 'chargers', 'all'],
    queryFn: () => getChargers(),
    placeholderData: (previousData: Charger[] | undefined) => previousData,
    ...DASHBOARD_REFETCH_OPTIONS,
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
      map.set(Number(loc.location_id), loc)
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
  const mediaTotal = mediaQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(mediaTotal / PAGE_SIZE))

  const isStatsLoading = allMediaQuery.isPending || statusCounts.some((q) => q.isPending)
  const isTableLoading =
    mediaQuery.isPending || orgsQuery.isPending || locsQuery.isPending || chargersQuery.isPending

  const isDashboardFetching =
    mediaQuery.isFetching ||
    allMediaQuery.isFetching ||
    statusCounts.some((q) => q.isFetching) ||
    orgsQuery.isFetching ||
    locsQuery.isFetching ||
    chargersQuery.isFetching

  const orgsInChargerData = useMemo(() => {
    const ids = new Set<number>()
    for (const c of chargersQuery.data ?? []) {
      const loc = c.location_id != null ? locationById.get(Number(c.location_id)) : undefined
      const oid = resolvedChargerOrgId(c, loc)
      if (oid != null && Number.isFinite(oid)) ids.add(oid)
    }
    return [...ids].sort((a, b) => a - b)
  }, [chargersQuery.data, locationById])

  const mapChargers = useMemo(() => {
    let list = chargersQuery.data ?? []
    if (mapOrgFilter !== 'all') {
      list = list.filter((charger) => {
        const loc =
          charger.location_id != null ? locationById.get(Number(charger.location_id)) : undefined
        return resolvedChargerOrgId(charger, loc) === mapOrgFilter
      })
    }
    if (onlineFilter !== 'all') {
      list = list.filter((charger) => chargerStatus(charger) === onlineFilter)
    }
    return list
  }, [chargersQuery.data, locationById, mapOrgFilter, onlineFilter])

  const { mapMarkers, mapUniqueLocationCount } = useMemo(() => {
    const markers: Array<{
      charger: Charger
      position: [number, number]
      loc: Location | undefined
      orgId: number | undefined
    }> = []
    const locKeys = new Set<string | number>()
    let skipped = 0
    for (const charger of mapChargers) {
      const loc =
        charger.location_id != null ? locationById.get(Number(charger.location_id)) : undefined
      const orgId = resolvedChargerOrgId(charger, loc)

      if (charger.location_id != null) {
        locKeys.add(Number(charger.location_id))
      } else {
        const posEarly = resolveChargerPosition(charger, locationById)
        if (posEarly) locKeys.add(`${posEarly.lat.toFixed(5)},${posEarly.lng.toFixed(5)}`)
      }

      const pos = resolveChargerPosition(charger, locationById)
      if (!pos) {
        skipped++
        continue
      }
      markers.push({
        charger,
        position: [pos.lat, pos.lng],
        loc,
        orgId,
      })
    }
    if (skipped > 0) {
      console.log('[Charger map] skipped markers (invalid coords):', skipped)
    }
    return { mapMarkers: markers, mapUniqueLocationCount: locKeys.size }
  }, [locationById, mapChargers])

  const mapMarkerPositions = useMemo(() => mapMarkers.map((m) => m.position), [mapMarkers])

  const onlineCount = mapChargers.filter((charger) => chargerStatus(charger) === 'online').length
  const offlineCount = mapChargers.filter((charger) => chargerStatus(charger) === 'offline').length

  const dashboardGreeting =
    user?.organization_id === 1
      ? t('dashboard.welcome_back_with_name', { name: t('dashboard.ion_admin') })
      : user?.f_name?.trim()
        ? t('dashboard.welcome_back_with_name', { name: user.f_name.trim() })
        : t('dashboard.welcome_back')

  const statusFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('dashboard.all_statuses') },
    { value: 'pending', label: t('dashboard.pending_review') },
    { value: 'approved', label: t('dashboard.approved') },
    { value: 'rejected', label: t('dashboard.rejected') },
  ]

  return (
    <div className="space-y-8">
      <div className="relative">
        {isDashboardFetching ? (
          <Circle
            className="absolute right-0 top-2 h-2 w-2 fill-green-500 text-green-500 animate-pulse"
            aria-hidden
          />
        ) : null}
        <PageHeader title={t('dashboard.overview')} />
      </div>

      <section className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-muted/40 p-4 shadow-sm sm:p-6">
        <p className="mb-4 text-sm font-medium text-foreground">{dashboardGreeting}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isStatsLoading ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" />)
          ) : (
            <>
              <Card className="border-l-4 border-l-blue-500 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.total_media')}</CardTitle>
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-3xl font-bold tabular-nums">{totalCount}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.pending_review')}</CardTitle>
                  <Clock className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-3xl font-bold tabular-nums">{pendingCount}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.approved')}</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-3xl font-bold tabular-nums">{approvedCount}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.rejected')}</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-3xl font-bold tabular-nums">{rejectedCount}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-slate-400 transition-all hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.archived')}</CardTitle>
                  <Archive className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-3xl font-bold tabular-nums">{archivedCount}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-4 border-l-4 border-l-primary/40 pl-4">
          <div>
            <CardTitle className="text-xl">{t('map.charger_map_title')}</CardTitle>
            <CardDescription>{t('map.charger_map_description')}</CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-blue-800 dark:text-blue-200">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {t('map.stat_locations', { count: mapUniqueLocationCount })}
              </Badge>
              <Badge variant="secondary" className="gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-amber-900 dark:text-amber-100">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                {t('map.stat_chargers', { count: mapChargers.length })}
              </Badge>
              <Badge variant="secondary" className="gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-green-800 dark:text-green-200">
                <CircleDot className="h-3.5 w-3.5 shrink-0 text-green-600" />
                {t('map.online_count', { count: onlineCount })}
              </Badge>
              <Badge variant="secondary" className="gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-red-800 dark:text-red-200">
                <CircleDot className="h-3.5 w-3.5 shrink-0 text-red-600" />
                {t('map.offline_count', { count: offlineCount })}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <select
                  className="h-8 max-w-[200px] flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0"
                  value={mapOrgFilter}
                  onChange={(e) =>
                    setMapOrgFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  aria-label={t('map.all_organizations')}
                >
                  <option value="all">{t('map.all_organizations')}</option>
                  {orgsInChargerData.map((organization_id) => (
                    <option key={organization_id} value={organization_id}>
                      {orgById.get(organization_id) ??
                        t('dashboard.org_fallback', { id: organization_id })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1">
                <Activity className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <select
                  className="h-8 max-w-[180px] flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0"
                  value={onlineFilter}
                  onChange={(e) => setOnlineFilter(e.target.value as ChargerOnlineFilter)}
                  aria-label={t('map.status_all')}
                >
                  <option value="all">{t('map.status_all')}</option>
                  <option value="online">{t('common.online')}</option>
                  <option value="offline">{t('common.offline')}</option>
                  <option value="unknown">{t('map.status_unknown')}</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isTableLoading ? (
            <Skeleton className="h-[520px] w-full rounded-xl" />
          ) : mapMarkers.length === 0 ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <MapPin className="h-16 w-16 text-muted-foreground/50" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{t('map.no_locations')}</p>
                <p className="text-xs text-muted-foreground">{t('map.empty_map_hint')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setMapOrgFilter('all')
                  setOnlineFilter('all')
                }}
              >
                {t('map.reset_filters')}
              </Button>
            </div>
          ) : (
            <div className="relative h-[520px] overflow-hidden rounded-xl border border-border">
              <MapContainer
                center={[31.9, 35.9]}
                zoom={8}
                className="dashboard-overview-map z-0 h-full w-full"
                zoomControl
                attributionControl={false}
                key="dashboard-charger-map"
              >
                <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoFitBounds points={mapMarkerPositions} />
                <FitAllMarkersButton points={mapMarkerPositions} label={t('map.fit_all_markers')} />
                {mapMarkers.map((point) => {
                  const status = chargerStatus(point.charger)
                  const orgName =
                    point.orgId != null
                      ? (orgById.get(point.orgId) ??
                        t('dashboard.org_fallback', { id: point.orgId }))
                      : t('common.unknown')
                  const locLabel =
                    point.loc?.name ??
                    (point.charger.location_id != null
                      ? `Loc #${point.charger.location_id}`
                      : t('common.unknown'))
                  return (
                    <Marker
                      key={point.charger.id}
                      position={point.position}
                      icon={markerIconForStatus(status)}
                    >
                      <Popup>
                        <div className="min-w-[240px] space-y-2 rounded-md border border-border bg-card p-3 text-xs shadow-sm">
                          <p className="text-sm font-semibold leading-tight text-foreground">
                            {point.charger.name ??
                              point.charger.chargerID ??
                              `Charger #${point.charger.id}`}
                          </p>
                          <div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] font-semibold',
                                status === 'online' && 'bg-green-100 text-green-800',
                                status === 'offline' && 'bg-red-100 text-red-800',
                                status === 'unknown' && 'bg-slate-100 text-slate-800',
                              )}
                            >
                              {status === 'unknown' ? t('map.status_unknown') : t(`common.${status}`)}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">{t('common.location')}:</span>{' '}
                            {locLabel}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">{t('common.organization')}:</span>{' '}
                            {orgName}
                          </p>
                          <Button type="button" size="sm" variant="outline" className="mt-1 w-full text-xs" disabled>
                            {t('map.view_details')}
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
              <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md border border-border bg-background/95 p-3 text-xs shadow-sm">
                <p className="mb-2 font-semibold text-foreground">{t('map.legend')}</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                    {t('common.online')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                    {t('common.offline')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
                    {t('map.status_unknown')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4 border-l-4 border-l-primary/40 pl-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{t('dashboard.media_requests')}</CardTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  {t('dashboard.live')}
                </span>
              </div>
              <CardDescription>{t('dashboard.media_requests_subtitle')}</CardDescription>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.filter_status')}</p>
            <div className="flex flex-wrap gap-1 rounded-lg border border-input bg-muted/30 p-1">
              {statusFilterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === opt.value ? 'secondary' : 'ghost'}
                  className={cn(
                    'h-9 flex-1 rounded-md text-xs sm:flex-none sm:px-3',
                    statusFilter === opt.value && 'shadow-sm',
                  )}
                  onClick={() => {
                    setStatusFilter(opt.value)
                    setPage(1)
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.filter_organization')}</p>
            <select
              className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={orgFilter}
              onChange={(e) => {
                const value = e.target.value
                setOrgFilter(value === 'all' ? 'all' : Number(value))
                setPage(1)
              }}
              aria-label={t('dashboard.all_orgs')}
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
            <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 p-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/60" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{t('dashboard.no_results')}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.empty_media_hint')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  void queryClient.invalidateQueries({ queryKey: ['media'] })
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('dashboard.refresh')}
              </Button>
            </div>
          ) : (
            <TooltipProvider>
              <div className="-mx-2 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
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
                    {mediaItems.map((item: MediaItem, index: number) => {
                      const orgName =
                        orgById.get(item.organization_id) ??
                        t('dashboard.org_fallback', { id: item.organization_id })
                      const locationName =
                        item.location_id == null
                          ? t('common.unknown')
                          : (locById.get(item.location_id) ??
                            t('dashboard.loc_fallback', { id: item.location_id }))
                      const rowAccent =
                        item.status === 'pending'
                          ? 'border-l-4 border-l-amber-500'
                          : item.status === 'rejected'
                            ? 'border-l-4 border-l-red-500'
                            : ''

                      return (
                        <TableRow
                          key={item.media_id}
                          className={cn(rowAccent, index % 2 === 1 && 'bg-muted/30')}
                        >
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
                                    <button
                                      type="button"
                                      className="text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      aria-label={t('dashboard.rejection_note')}
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{item.rejection_note}</TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatRelativeTime(item.uploaded_at || item.created_at, relativeTimeLabels)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t('dashboard.results_count', { count: mediaTotal })}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                aria-label={t('dashboard.page_first')}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                aria-label={t('common.prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center text-sm tabular-nums text-muted-foreground">
                {t('dashboard.page_indicator', { page, totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                aria-label={t('common.next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                aria-label={t('dashboard.page_last')}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
