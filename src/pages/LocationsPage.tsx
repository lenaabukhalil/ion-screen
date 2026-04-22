import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import * as lookups from '@/lib/api/lookups'

export default function LocationsPage() {
  const { t } = useTranslation()
  useSetPageTitle(t('nav.locations'))

  const locsQ = useQuery({ queryKey: ['lookups', 'locations'], queryFn: lookups.getLocations })
  const orgsQ = useQuery({ queryKey: ['lookups', 'orgs'], queryFn: lookups.getOrganizations })
  const chargersQ = useQuery({ queryKey: ['lookups', 'chargers', 'all'], queryFn: () => lookups.getChargers() })

  const orgNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const o of orgsQ.data ?? []) {
      const label = o.name?.trim() || String(o.organization_id)
      m.set(o.organization_id, label)
    }
    return m
  }, [orgsQ.data])

  const chargerCountByLocation = useMemo(() => {
    const m = new Map<number, number>()
    for (const c of chargersQ.data ?? []) {
      const lid = c.location_id
      if (lid == null || !Number.isFinite(lid)) continue
      m.set(lid, (m.get(lid) ?? 0) + 1)
    }
    return m
  }, [chargersQ.data])

  if (locsQ.isPending || orgsQ.isPending || chargersQ.isPending) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (locsQ.isError || orgsQ.isError || chargersQ.isError) {
    return <p className="text-sm text-destructive">{t('common.error_generic')}</p>
  }

  const rows = locsQ.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.locations')} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.organization')}</TableHead>
                <TableHead>{t('common.lat')}</TableHead>
                <TableHead>{t('common.lng')}</TableHead>
                <TableHead>{t('common.chargers')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((loc) => {
                const orgId = loc.organization_id
                const orgLabel =
                  orgId != null && orgNameById.has(orgId) ? orgNameById.get(orgId)! : t('common.unknown')
                const count = chargerCountByLocation.get(loc.location_id) ?? 0
                return (
                  <TableRow key={loc.location_id}>
                    <TableCell className="font-medium">{loc.name?.trim() || String(loc.location_id)}</TableCell>
                    <TableCell>{orgLabel}</TableCell>
                    <TableCell>{loc.lat != null ? String(loc.lat) : t('common.unknown')}</TableCell>
                    <TableCell>{loc.lng != null ? String(loc.lng) : t('common.unknown')}</TableCell>
                    <TableCell>{count}</TableCell>
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
