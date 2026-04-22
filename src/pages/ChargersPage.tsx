import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSetPageTitle } from '@/hooks/usePageTitle'
import * as lookups from '@/lib/api/lookups'

export default function ChargersPage() {
  const { t } = useTranslation()
  useSetPageTitle(t('nav.chargers'))

  const [q, setQ] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')

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

  const locById = useMemo(() => {
    const m = new Map<number, { name?: string; organization_id?: number }>()
    for (const loc of locsQ.data ?? []) {
      m.set(loc.location_id, { name: loc.name, organization_id: loc.organization_id })
    }
    return m
  }, [locsQ.data])

  const filtered = useMemo(() => {
    const list = chargersQ.data ?? []
    const needle = q.trim().toLowerCase()
    return list.filter((c) => {
      if (locationFilter !== 'all') {
        const lid = Number(locationFilter)
        if (!Number.isFinite(lid) || c.location_id !== lid) return false
      }
      if (!needle) return true
      const idStr = String(c.id)
      const name = (c.name ?? '').toLowerCase()
      const cid = (c.chargerID ?? '').toLowerCase()
      return name.includes(needle) || cid.includes(needle) || idStr.includes(needle)
    })
  }, [chargersQ.data, q, locationFilter])

  if (locsQ.isPending || orgsQ.isPending || chargersQ.isPending) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (locsQ.isError || orgsQ.isError || chargersQ.isError) {
    return <p className="text-sm text-destructive">{t('common.error_generic')}</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.chargers')} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="grid w-full gap-2 sm:max-w-xs">
          <Label htmlFor="charger-search">{t('common.search')}</Label>
          <Input
            id="charger-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('common.search')}
          />
        </div>
        <div className="grid w-full gap-2 sm:max-w-xs">
          <Label htmlFor="loc-filter">{t('common.filter_location')}</Label>
          <select
            id="loc-filter"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">{t('common.all_locations')}</option>
            {(locsQ.data ?? []).map((loc) => (
              <option key={loc.location_id} value={String(loc.location_id)}>
                {loc.name?.trim() || String(loc.location_id)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.charger')}</TableHead>
                <TableHead>{t('common.location')}</TableHead>
                <TableHead>{t('common.organization')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const lid = c.location_id
                const loc = lid != null ? locById.get(lid) : undefined
                const locName = loc?.name?.trim() || (lid != null ? String(lid) : t('common.unknown'))
                const orgId = loc?.organization_id
                const orgLabel =
                  orgId != null && orgNameById.has(orgId) ? orgNameById.get(orgId)! : t('common.unknown')
                const label = c.name?.trim() || c.chargerID?.trim() || String(c.id)
                const online = c.is_online
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>{locName}</TableCell>
                    <TableCell>{orgLabel}</TableCell>
                    <TableCell>
                      {online === undefined ? (
                        t('common.unknown')
                      ) : online ? (
                        <Badge variant="default">{t('common.online')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('common.offline')}</Badge>
                      )}
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
