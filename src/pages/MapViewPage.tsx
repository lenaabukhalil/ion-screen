import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import { getChargers, getLocations, getOrganizations } from '@/lib/api/lookups'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

export default function MapViewPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isION = user?.organization_id === 1
  const [orgFilter, setOrgFilter] = useState<number | null>(null)
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
    enabled: isION,
  })

  const visibleLocations = useMemo(() => {
    const all = locsQuery.data ?? []
    const withCoords = all.filter((loc) => Number.isFinite(loc.lat) && Number.isFinite(loc.lng))
    if (!isION) {
      return withCoords.filter((loc) => loc.organization_id === user?.organization_id)
    }
    if (orgFilter) return withCoords.filter((loc) => loc.organization_id === orgFilter)
    return withCoords
  }, [isION, locsQuery.data, orgFilter, user?.organization_id])

  const visibleLocationIds = useMemo(() => new Set(visibleLocations.map((loc) => loc.location_id)), [visibleLocations])

  const visibleChargers = useMemo(
    () => (chargersQuery.data ?? []).filter((charger) => charger.location_id != null && visibleLocationIds.has(charger.location_id)),
    [chargersQuery.data, visibleLocationIds],
  )

  const chargersByLocation = useMemo(() => {
    const map = new Map<number, ReturnType<typeof visibleChargers.filter>>()
    for (const loc of visibleLocations) {
      map.set(loc.location_id, visibleChargers.filter((charger) => charger.location_id === loc.location_id))
    }
    return map
  }, [visibleChargers, visibleLocations])

  const orgNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const org of orgsQuery.data ?? []) {
      map.set(org.organization_id, org.name ?? `Org #${org.organization_id}`)
    }
    return map
  }, [orgsQuery.data])

  const mapCenter = useMemo<[number, number]>(() => {
    if (visibleLocations.length === 0) return [31.9, 35.9]
    const avgLat = visibleLocations.reduce((sum, loc) => sum + Number(loc.lat), 0) / visibleLocations.length
    const avgLng = visibleLocations.reduce((sum, loc) => sum + Number(loc.lng), 0) / visibleLocations.length
    return [avgLat, avgLng]
  }, [visibleLocations])

  const loading = locsQuery.isPending || chargersQuery.isPending || (isION && orgsQuery.isPending)

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('map.title')} />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[60vh] min-h-[400px] w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('map.title')} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {t('map.stats', { locations: visibleLocations.length, chargers: visibleChargers.length })}
        </div>
        {isION ? (
          <select
            value={orgFilter ?? ''}
            onChange={(e) => setOrgFilter(e.target.value ? Number(e.target.value) : null)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('map.all_organizations')}</option>
            {(orgsQuery.data ?? []).map((org) => (
              <option key={org.organization_id} value={org.organization_id}>
                {org.name ?? `Org #${org.organization_id}`}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {visibleLocations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t('map.no_locations')}
        </div>
      ) : (
        <>
          <div className="h-[60vh] min-h-[400px] overflow-hidden rounded-xl border border-border shadow-sm">
            <MapContainer center={mapCenter} zoom={8} className="h-full w-full" key={mapCenter.join(',')}>
              <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {visibleLocations.map((loc) => {
                const locationChargers = chargersByLocation.get(loc.location_id) ?? []
                const orgName =
                  orgNameById.get(loc.organization_id ?? -1) ??
                  `Org #${loc.organization_id ?? t('common.unknown')}`
                return (
                  <Marker key={loc.location_id} position={[Number(loc.lat), Number(loc.lng)]}>
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="text-sm font-semibold">{loc.name ?? `Loc #${loc.location_id}`}</p>
                        <p className="mb-2 text-xs text-muted-foreground">{orgName}</p>
                        <div className="space-y-1">
                          {locationChargers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">{t('map.no_chargers')}</p>
                          ) : (
                            locationChargers.map((charger) => (
                              <div key={charger.id} className="flex items-center gap-2 text-xs">
                                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                                {charger.name ?? charger.chargerID ?? `Charger #${charger.id}`}
                              </div>
                            ))
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('map.charger_count', { count: locationChargers.length })}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleLocations.map((loc) => {
              const locationChargers = chargersByLocation.get(loc.location_id) ?? []
              const orgName =
                orgNameById.get(loc.organization_id ?? -1) ??
                `Org #${loc.organization_id ?? t('common.unknown')}`

              return (
                <Card key={loc.location_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{loc.name ?? `Loc #${loc.location_id}`}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('map.charger_count', { count: locationChargers.length })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {isION ? orgName : t('map.partner_badge', { count: locationChargers.length })}
                    </Badge>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
