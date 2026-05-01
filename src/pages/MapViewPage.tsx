import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import { getChargers, getLocations, getOrganizations } from '@/lib/api/lookups'
import { aggregateLocationMarkerStatus, chargerStatus, markerIconForStatus } from '@/lib/leaflet-icons'
import { cn } from '@/lib/utils'
import { Activity, Building2, CircleDot, LocateFixed, MapPin, Zap } from 'lucide-react'
import type { Charger } from '@/types/lookups'

type MapStatusFilter = 'all' | 'online' | 'offline' | 'unknown'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function FitAllMarkersButton({
  points,
  label,
}: {
  points: Array<[number, number]>
  label: string
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
          /* ignore */
        }
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

function FlyToTarget({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], 14)
  }, [map, target])
  return null
}

const POPUP_CHARGER_LIMIT = 5

export default function MapViewPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isION = user?.organization_id === 1
  const [orgFilter, setOrgFilter] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<MapStatusFilter>('all')
  const [locationSearch, setLocationSearch] = useState('')
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; nonce: number } | null>(null)

  useSetPageTitle(t('map.title'))

  const locsQuery = useQuery({
    queryKey: ['lookups', 'locations'],
    queryFn: getLocations,
  })
  const chargersQuery = useQuery({
    queryKey: ['lookups', 'chargers', 'all'],
    queryFn: () => getChargers(),
  })
  const orgsQuery = useQuery({
    queryKey: ['lookups', 'orgs'],
    queryFn: getOrganizations,
  })

  const orgNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const org of orgsQuery.data ?? []) {
      map.set(org.organization_id, org.name ?? `Org #${org.organization_id}`)
    }
    return map
  }, [orgsQuery.data])

  const orgScopedLocations = useMemo(() => {
    const all = (locsQuery.data ?? []).filter(
      (loc) => Number.isFinite(loc.lat) && Number.isFinite(loc.lng) && loc.lat !== 0 && loc.lng !== 0,
    )
    if (!isION) {
      return all.filter((loc) => loc.organization_id === user?.organization_id)
    }
    if (orgFilter != null) {
      return all.filter((loc) => loc.organization_id === orgFilter)
    }
    return all
  }, [isION, locsQuery.data, orgFilter, user?.organization_id])

  const scopedLocationIds = useMemo(
    () => new Set(orgScopedLocations.map((loc) => loc.location_id)),
    [orgScopedLocations],
  )

  const chargersByLocationId = useMemo(() => {
    const map = new Map<number, Charger[]>()
    for (const loc of orgScopedLocations) {
      map.set(loc.location_id, [])
    }
    for (const charger of chargersQuery.data ?? []) {
      if (charger.location_id == null) continue
      const lid = Number(charger.location_id)
      if (!scopedLocationIds.has(lid)) continue
      const list = map.get(lid)
      if (list) list.push(charger)
    }
    return map
  }, [chargersQuery.data, orgScopedLocations, scopedLocationIds])

  const statusFilteredLocations = useMemo(() => {
    if (statusFilter === 'all') return orgScopedLocations
    return orgScopedLocations.filter((loc) => {
      const list = chargersByLocationId.get(loc.location_id) ?? []
      if (statusFilter === 'online') return list.some((c) => chargerStatus(c) === 'online')
      if (statusFilter === 'offline') return list.some((c) => chargerStatus(c) === 'offline')
      return list.some((c) => chargerStatus(c) === 'unknown')
    })
  }, [chargersByLocationId, orgScopedLocations, statusFilter])

  const displayedLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase()
    if (!q) return statusFilteredLocations
    return statusFilteredLocations.filter((loc) => {
      const label = (loc.name ?? `Loc #${loc.location_id}`).toLowerCase()
      return label.includes(q)
    })
  }, [locationSearch, statusFilteredLocations])

  const mapPoints = useMemo(
    () =>
      displayedLocations.map(
        (loc) => [Number(loc.lat), Number(loc.lng)] as [number, number],
      ),
    [displayedLocations],
  )

  const statOnline = useMemo(() => {
    let n = 0
    for (const loc of displayedLocations) {
      for (const c of chargersByLocationId.get(loc.location_id) ?? []) {
        if (chargerStatus(c) === 'online') n++
      }
    }
    return n
  }, [chargersByLocationId, displayedLocations])

  const statOffline = useMemo(() => {
    let n = 0
    for (const loc of displayedLocations) {
      for (const c of chargersByLocationId.get(loc.location_id) ?? []) {
        if (chargerStatus(c) === 'offline') n++
      }
    }
    return n
  }, [chargersByLocationId, displayedLocations])

  const statChargerTotal = useMemo(() => {
    let n = 0
    for (const loc of displayedLocations) {
      n += (chargersByLocationId.get(loc.location_id) ?? []).length
    }
    return n
  }, [chargersByLocationId, displayedLocations])

  const loading =
    locsQuery.isPending || chargersQuery.isPending || orgsQuery.isPending

  const handleCardFlyTo = (lat: number, lng: number) => {
    setFlyTarget({ lat, lng, nonce: Date.now() })
  }

  const resetFilters = () => {
    setOrgFilter(null)
    setStatusFilter('all')
    setLocationSearch('')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-[60vh] min-h-[500px] w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-4 border-l-4 border-l-primary/40 pl-4">
        <div>
          <CardTitle className="text-xl">{t('map.title')}</CardTitle>
          <CardDescription>{t('map.view_description')}</CardDescription>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-violet-900 dark:text-violet-100"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {t('map.stat_locations', { count: displayedLocations.length })}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-amber-900 dark:text-amber-100"
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              {t('map.stat_chargers', { count: statChargerTotal })}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-green-800 dark:text-green-200"
            >
              <CircleDot className="h-3.5 w-3.5 shrink-0 text-green-600" />
              {t('map.online_count', { count: statOnline })}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-red-800 dark:text-red-200"
            >
              <CircleDot className="h-3.5 w-3.5 shrink-0 text-red-600" />
              {t('map.offline_count', { count: statOffline })}
            </Badge>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {isION ? (
              <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <select
                  className="h-8 min-w-[160px] flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0 sm:max-w-[220px]"
                  value={orgFilter ?? ''}
                  onChange={(e) => setOrgFilter(e.target.value ? Number(e.target.value) : null)}
                  aria-label={t('map.all_organizations')}
                >
                  <option value="">{t('map.all_organizations')}</option>
                  {(orgsQuery.data ?? []).map((org) => (
                    <option key={org.organization_id} value={org.organization_id}>
                      {org.name ?? `Org #${org.organization_id}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1">
              <Activity className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <select
                className="h-8 min-w-[140px] flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as MapStatusFilter)}
                aria-label={t('map.status_all')}
              >
                <option value="all">{t('map.status_all')}</option>
                <option value="online">{t('common.online')}</option>
                <option value="offline">{t('common.offline')}</option>
                <option value="unknown">{t('map.status_unknown')}</option>
              </select>
            </div>
            <Input
              className="h-9 max-w-full sm:max-w-[220px]"
              placeholder={t('map.location_search_placeholder')}
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              aria-label={t('map.location_search_placeholder')}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {displayedLocations.length === 0 ? (
          <div className="flex h-[60vh] min-h-[500px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground/50" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('map.no_locations')}</p>
              <p className="text-xs text-muted-foreground">{t('map.empty_filtered')}</p>
            </div>
            <Button type="button" variant="outline" onClick={resetFilters}>
              {t('map.reset_filters')}
            </Button>
          </div>
        ) : (
          <>
            <div className="relative h-[60vh] min-h-[500px] overflow-hidden rounded-xl border border-border">
              <MapContainer
                center={[31.9, 35.9]}
                zoom={8}
                className="dashboard-overview-map z-0 h-full w-full"
                zoomControl
                attributionControl={false}
                key="map-view-container"
              >
                <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoFitBounds points={mapPoints} />
                <FitAllMarkersButton points={mapPoints} label={t('map.fit_all_markers')} />
                <FlyToTarget target={flyTarget} />
                {displayedLocations.map((loc) => {
                  const list = chargersByLocationId.get(loc.location_id) ?? []
                  const agg = aggregateLocationMarkerStatus(list)
                  const orgName =
                    orgNameById.get(loc.organization_id ?? -1) ??
                    t('dashboard.org_fallback', { id: loc.organization_id ?? 0 })
                  const onlineN = list.filter((c) => chargerStatus(c) === 'online').length
                  const offlineN = list.filter((c) => chargerStatus(c) === 'offline').length
                  const shown = list.slice(0, POPUP_CHARGER_LIMIT)
                  const more = list.length - shown.length
                  const lat = Number(loc.lat)
                  const lng = Number(loc.lng)

                  return (
                    <Marker
                      key={loc.location_id}
                      position={[lat, lng]}
                      icon={markerIconForStatus(agg)}
                    >
                      <Popup>
                        <div className="min-w-[260px] space-y-2 text-xs">
                          <p className="text-base font-semibold leading-tight text-foreground">
                            {loc.name ?? `Loc #${loc.location_id}`}
                          </p>
                          <p className="text-muted-foreground">{orgName}</p>
                          <p>
                            <span className="font-medium text-foreground">{t('map.charger_count_other', { count: list.length })}</span>
                          </p>
                          <p className="text-muted-foreground">
                            {t('map.popup_breakdown', { online: onlineN, offline: offlineN })}
                          </p>
                          <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-border pt-2">
                            {list.length === 0 ? (
                              <li className="text-muted-foreground">{t('map.no_chargers')}</li>
                            ) : (
                              shown.map((c) => {
                                const st = chargerStatus(c)
                                const dot =
                                  st === 'online'
                                    ? 'bg-green-500'
                                    : st === 'offline'
                                      ? 'bg-red-500'
                                      : 'bg-slate-400'
                                return (
                                  <li key={c.id} className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />
                                    <span>{c.name ?? c.chargerID ?? `Charger #${c.id}`}</span>
                                  </li>
                                )
                              })
                            )}
                          </ul>
                          {more > 0 ? (
                            <p className="text-muted-foreground">{t('map.more_chargers', { count: more })}</p>
                          ) : null}
                          <p className="border-t border-border pt-2 text-[10px] text-muted-foreground">
                            {t('map.popup_coords', {
                              lat: lat.toFixed(5),
                              lng: lng.toFixed(5),
                            })}
                          </p>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedLocations.map((loc) => {
                const list = chargersByLocationId.get(loc.location_id) ?? []
                const orgName =
                  orgNameById.get(loc.organization_id ?? -1) ??
                  t('dashboard.org_fallback', { id: loc.organization_id ?? 0 })
                const onlineN = list.filter((c) => chargerStatus(c) === 'online').length
                const offlineN = list.filter((c) => chargerStatus(c) === 'offline').length
                const lat = Number(loc.lat)
                const lng = Number(loc.lng)

                return (
                  <Card
                    key={loc.location_id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-xl border border-border transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleCardFlyTo(lat, lng)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCardFlyTo(lat, lng)
                      }
                    }}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {loc.name ?? `Loc #${loc.location_id}`}
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0 text-xs font-normal">
                        {orgName}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Zap className="h-4 w-4 shrink-0" />
                        <span>{t('map.stat_chargers', { count: list.length })}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {onlineN} {t('common.online')}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          {offlineN} {t('common.offline')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
