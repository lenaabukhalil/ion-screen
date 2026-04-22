import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { ChargersMap, type ChargerMapPoint } from '@/components/dashboard/ChargersMap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import * as lookups from '@/lib/api/lookups'
import type { Location } from '@/types/lookups'
import { Building2, BatteryCharging, MapPin } from 'lucide-react'

export default function DashboardPage() {
  const { t } = useTranslation()
  useSetPageTitle(t('nav.dashboard'))

  const orgsQ = useQuery({ queryKey: ['lookups', 'orgs'], queryFn: lookups.getOrganizations })
  const locsQ = useQuery({ queryKey: ['lookups', 'locations'], queryFn: lookups.getLocations })
  const chargersQ = useQuery({ queryKey: ['lookups', 'chargers', 'all'], queryFn: () => lookups.getChargers() })

  const orgById = useMemo(() => {
    const m = new Map<number, string>()
    for (const o of orgsQ.data ?? []) {
      if (o.name) m.set(o.organization_id, o.name)
    }
    return m
  }, [orgsQ.data])

  const locById = useMemo(() => {
    const m = new Map<number, Location>()
    for (const loc of locsQ.data ?? []) {
      m.set(loc.location_id, loc)
    }
    return m
  }, [locsQ.data])

  const mapPoints: ChargerMapPoint[] = useMemo(() => {
    const out: ChargerMapPoint[] = []
    for (const c of chargersQ.data ?? []) {
      const lid = c.location_id
      if (lid == null || !Number.isFinite(lid)) continue
      const loc = locById.get(lid)
      const lat = loc?.lat
      const lng = loc?.lng
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const orgId = loc?.organization_id
      const organizationName = orgId != null ? orgById.get(orgId) : undefined
      out.push({
        charger: c,
        lat,
        lng,
        locationName: loc?.name,
        organizationName,
      })
    }
    return out
  }, [chargersQ.data, locById, orgById])

  const loading = orgsQ.isPending || locsQ.isPending || chargersQ.isPending
  const error = orgsQ.isError || locsQ.isError || chargersQ.isError

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('nav.dashboard')} />
        <p className="text-sm text-destructive">{t('common.error_generic')}</p>
      </div>
    )
  }

  const totalOrgs = orgsQ.data?.length ?? 0
  const totalLocs = locsQ.data?.length ?? 0
  const totalChargers = chargersQ.data?.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.dashboard')} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_orgs')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_locations')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_chargers')}</CardTitle>
            <BatteryCharging className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChargers}</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.map_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {mapPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          ) : (
            <ChargersMap points={mapPoints} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
