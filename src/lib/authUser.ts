import type { AuthUser } from '@/services/api'

function pickOrganizationId(raw: Record<string, unknown>): number | null {
  const direct = raw.organization_id ?? raw.organizationId
  if (direct != null && typeof direct === 'object' && direct !== null && 'id' in direct) {
    const n = Number((direct as { id: unknown }).id)
    return Number.isFinite(n) ? n : null
  }
  const n = Number(direct)
  return Number.isFinite(n) ? n : null
}

/** Normalizes /auth/me and login payloads so organization_id is always a number (APIs often send strings). */
export function normalizeAuthUser(raw: unknown): AuthUser | null {
  if (raw == null || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = Number(r.id)
  const orgId = pickOrganizationId(r)
  if (!Number.isFinite(id) || orgId == null) return null
  return {
    id,
    name: String(r.name ?? ''),
    role: String(r.role ?? ''),
    organization_id: orgId,
  }
}
