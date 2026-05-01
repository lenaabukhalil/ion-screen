import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/contexts/AuthContext'
import * as lookups from '@/lib/api/lookups'

export function Topbar() {
  const { title } = usePageTitle()
  const { user } = useAuth()

  const heading = title || 'ION Screen'

  const orgId = user?.organization_id
  const orgsQuery = useQuery({
    queryKey: ['lookups', 'orgs'],
    queryFn: lookups.getOrganizations,
    enabled: orgId != null && orgId !== 1,
  })
  const orgLabel =
    orgId != null && orgId !== 1
      ? (orgsQuery.data ?? []).find((o) => o.organization_id === orgId)?.name
      : undefined

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      {orgLabel ? (
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 shadow-sm">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-xs font-semibold text-foreground max-w-[160px] truncate">{orgLabel}</span>
        </div>
      ) : null}
    </header>
  )
}
