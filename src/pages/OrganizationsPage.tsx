import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import * as lookups from '@/lib/api/lookups'

export default function OrganizationsPage() {
  const { t } = useTranslation()
  useSetPageTitle(t('nav.organizations'))

  const orgsQ = useQuery({ queryKey: ['lookups', 'orgs'], queryFn: lookups.getOrganizations })
  const locsQ = useQuery({ queryKey: ['lookups', 'locations'], queryFn: lookups.getLocations })
  const chargersQ = useQuery({ queryKey: ['lookups', 'chargers', 'all'], queryFn: () => lookups.getChargers() })

  const stats = useMemo(() => {
    const locCount = new Map<number, number>()
    const chargerCount = new Map<number, number>()

    for (const loc of locsQ.data ?? []) {
      const oid = loc.organization_id
      if (oid == null || !Number.isFinite(oid)) continue
      locCount.set(oid, (locCount.get(oid) ?? 0) + 1)
    }

    const locOrg = new Map<number, number>()
    for (const loc of locsQ.data ?? []) {
      const oid = loc.organization_id
      if (oid == null || !Number.isFinite(oid)) continue
      locOrg.set(loc.location_id, oid)
    }

    for (const c of chargersQ.data ?? []) {
      const lid = c.location_id
      if (lid == null || !Number.isFinite(lid)) continue
      const oid = locOrg.get(lid)
      if (oid == null || !Number.isFinite(oid)) continue
      chargerCount.set(oid, (chargerCount.get(oid) ?? 0) + 1)
    }

    return { locCount, chargerCount }
  }, [locsQ.data, chargersQ.data])

  if (orgsQ.isPending || locsQ.isPending || chargersQ.isPending) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (orgsQ.isError || locsQ.isError || chargersQ.isError) {
    return <p className="text-sm text-destructive">{t('common.error_generic')}</p>
  }

  const rows = orgsQ.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.organizations')} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.org_id')}</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.name_ar')}</TableHead>
                <TableHead>{t('nav.locations')}</TableHead>
                <TableHead>{t('nav.chargers')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const lc = stats.locCount.get(o.organization_id) ?? 0
                const cc = stats.chargerCount.get(o.organization_id) ?? 0
                return (
                  <TableRow key={o.organization_id}>
                    <TableCell className="font-mono">{o.organization_id}</TableCell>
                    <TableCell className="font-medium">{o.name?.trim() || t('common.unknown')}</TableCell>
                    <TableCell>{o.name_ar?.trim() || t('common.unknown')}</TableCell>
                    <TableCell>{lc}</TableCell>
                    <TableCell>{cc}</TableCell>
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
