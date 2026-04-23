import { api, parseResponseBody } from '@/lib/api/client'

export type ScheduleTargetScope = 'organization' | 'location' | 'charger' | 'screen'

export interface ScheduleItem {
  schedule_id: number
  organization_id: number
  media_id: number
  starts_at: string
  ends_at: string
  active: boolean
  target_scope: ScheduleTargetScope
  location_id: number | null
  charger_id: number | null
  screen_device_id: number | null
  priority: number
  rate_per_minute: number
  created_at: string
}

export interface SchedulesListParams {
  media_id?: number
  active?: boolean
  from?: string
  to?: string
}

export interface SchedulesListResult {
  items: ScheduleItem[]
  total: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function toSchedule(v: unknown): ScheduleItem | null {
  if (!isRecord(v)) return null
  const schedule_id = Number(v.schedule_id)
  const organization_id = Number(v.organization_id)
  const media_id = Number(v.media_id)
  if (!Number.isFinite(schedule_id) || !Number.isFinite(organization_id) || !Number.isFinite(media_id)) {
    return null
  }

  const targetRaw = v.target_scope
  const target_scope: ScheduleTargetScope =
    targetRaw === 'location' || targetRaw === 'charger' || targetRaw === 'screen'
      ? targetRaw
      : 'organization'

  return {
    schedule_id,
    organization_id,
    media_id,
    starts_at: typeof v.starts_at === 'string' ? v.starts_at : '',
    ends_at: typeof v.ends_at === 'string' ? v.ends_at : '',
    active: v.active === true,
    target_scope,
    location_id: v.location_id == null ? null : Number(v.location_id),
    charger_id: v.charger_id == null ? null : Number(v.charger_id),
    screen_device_id: v.screen_device_id == null ? null : Number(v.screen_device_id),
    priority: Number(v.priority ?? 1) || 1,
    rate_per_minute: Number(v.rate_per_minute ?? 0) || 0,
    created_at: typeof v.created_at === 'string' ? v.created_at : '',
  }
}

export async function listSchedules(params: SchedulesListParams = {}): Promise<SchedulesListResult> {
  const query = new URLSearchParams()
  if (params.media_id != null) query.set('media_id', String(params.media_id))
  if (params.active != null) query.set('active', String(params.active))
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)

  const suffix = query.toString()
  const url = suffix ? `/api/v4/screens/schedules?${suffix}` : '/api/v4/screens/schedules'

  const res = await api.get(url)
  const body = parseResponseBody(res)

  if (!isRecord(body)) return { items: [], total: 0 }
  const rawItems = Array.isArray(body.items) ? body.items : []
  const items = rawItems.map(toSchedule).filter((x): x is ScheduleItem => x !== null)
  return {
    items,
    total: Number(body.total ?? items.length) || items.length,
  }
}
