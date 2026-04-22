import { api, parseResponseBody } from '@/lib/api/client'
import type { Charger, Location, Organization } from '@/types/lookups'
import type { AxiosResponse } from 'axios'

const loggedKeys = new Set<string>()

function devLogOnce(key: string, payload: unknown): void {
  if (!import.meta.env.DEV || loggedKeys.has(key)) return
  loggedKeys.add(key)
  console.log(`[api] first response shape: ${key}`, payload)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (isRecord(data)) {
    if (Array.isArray(data.data)) return data.data
    if (Array.isArray(data.items)) return data.items
    if (Array.isArray(data.results)) return data.results
    if (data.data !== undefined) return asArray(data.data)
  }
  return []
}

function toOrganization(raw: unknown): Organization | null {
  if (!isRecord(raw)) return null
  const organization_id = Number(raw.organization_id ?? raw.organizationId ?? raw.id)
  if (!Number.isFinite(organization_id)) return null
  return {
    organization_id,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    name_ar: typeof raw.name_ar === 'string' ? raw.name_ar : undefined,
  }
}

function toLocation(raw: unknown): Location | null {
  if (!isRecord(raw)) return null
  const location_id = Number(raw.location_id ?? raw.locationId ?? raw.id)
  if (!Number.isFinite(location_id)) return null
  const latRaw = raw.lat ?? raw.latitude
  const lngRaw = raw.lng ?? raw.longitude
  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw)
  const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw)
  return {
    location_id,
    organization_id:
      raw.organization_id !== undefined || raw.organizationId !== undefined
        ? Number(raw.organization_id ?? raw.organizationId)
        : undefined,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  }
}

function toCharger(raw: unknown): Charger | null {
  if (!isRecord(raw)) return null
  const id = Number(raw.id ?? raw.charger_id ?? raw.chargerId)
  if (!Number.isFinite(id)) return null
  const locId = raw.location_id ?? raw.locationId
  return {
    id,
    location_id: locId !== undefined ? Number(locId) : undefined,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    chargerID: typeof raw.chargerID === 'string' ? raw.chargerID : typeof raw.chargerId === 'string' ? raw.chargerId : undefined,
    is_online: typeof raw.is_online === 'boolean' ? raw.is_online : typeof raw.isOnline === 'boolean' ? raw.isOnline : undefined,
  }
}

export async function getOrganizations(): Promise<Organization[]> {
  const res: AxiosResponse<unknown> = await api.get('/api/v4/org')
  devLogOnce('GET /api/v4/org', res.data)
  const body = parseResponseBody(res)
  return asArray(body).map(toOrganization).filter((x): x is Organization => x != null)
}

export async function getLocations(): Promise<Location[]> {
  const res: AxiosResponse<unknown> = await api.get('/api/v4/location')
  devLogOnce('GET /api/v4/location', res.data)
  const body = parseResponseBody(res)
  return asArray(body).map(toLocation).filter((x): x is Location => x != null)
}

export async function getChargers(locationId?: number): Promise<Charger[]> {
  const url =
    locationId !== undefined && Number.isFinite(locationId)
      ? `/api/v4/charger?locationId=${encodeURIComponent(String(locationId))}`
      : '/api/v4/charger'
  const res: AxiosResponse<unknown> = await api.get(url)
  devLogOnce(`GET ${url}`, res.data)
  const body = parseResponseBody(res)
  return asArray(body).map(toCharger).filter((x): x is Charger => x != null)
}
