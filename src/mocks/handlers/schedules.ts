import { http, HttpResponse } from 'msw'
import { getAuthUser } from './auth'
import { getDb, nextScheduleId, persistDb, type MockSchedule } from '../db'
import { apiPath } from '../utils'

function isAdmin(user: { organization_id: number }): boolean {
  return user.organization_id === 1
}

function nowIso(): string {
  return new Date().toISOString()
}

export const schedulesHandlers = [
  http.post(apiPath('/api/v4/screens/schedules'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    if (isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Use the partner app to create schedules' }, { status: 403 })
    }
    const body = (await request.json()) as Partial<{
      media_id: number
      starts_at: string
      ends_at: string
      target_scope: MockSchedule['target_scope']
      location_id: number | null
      charger_id: number | null
      screen_device_id: number | null
      priority: number
      rate_per_minute: number
      active: boolean
    }>
    if (!body.media_id || !body.starts_at || !body.ends_at || !body.target_scope) {
      return HttpResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }
    const db = getDb()
    const media = db.media.find((m) => m.media_id === body.media_id)
    if (!media || media.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Invalid media' }, { status: 400 })
    }
    if (media.status !== 'approved') {
      return HttpResponse.json({ success: false, message: 'Media must be approved' }, { status: 400 })
    }
    const rate = db.app_settings.default_rate_per_minute_partner
    const row: MockSchedule = {
      schedule_id: nextScheduleId(db),
      organization_id: user.organization_id,
      media_id: body.media_id,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      active: body.active ?? true,
      target_scope: body.target_scope,
      location_id: body.location_id ?? null,
      charger_id: body.charger_id ?? null,
      screen_device_id: body.screen_device_id ?? null,
      priority: body.priority ?? 1,
      rate_per_minute: rate,
      created_at: nowIso(),
    }
    db.schedules.push(row)
    persistDb()
    return HttpResponse.json({ success: true, data: row }, { status: 201 })
  }),

  http.get(apiPath('/api/v4/screens/schedules'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const mediaId = url.searchParams.get('media_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const active = url.searchParams.get('active')

    const db = getDb()
    let list = db.schedules.filter((s) =>
      isAdmin(user) ? true : s.organization_id === user.organization_id,
    )
    if (mediaId) {
      const mid = Number(mediaId)
      if (Number.isFinite(mid)) list = list.filter((s) => s.media_id === mid)
    }
    if (active === 'true') list = list.filter((s) => s.active)
    if (active === 'false') list = list.filter((s) => !s.active)
    if (from) {
      const t = new Date(from).getTime()
      list = list.filter((s) => new Date(s.ends_at).getTime() >= t)
    }
    if (to) {
      const t = new Date(to).getTime()
      list = list.filter((s) => new Date(s.starts_at).getTime() <= t)
    }
    return HttpResponse.json({ success: true, data: { items: list, total: list.length } })
  }),

  http.get(apiPath('/api/v4/screens/schedules/:id'), ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const id = Number(params.id)
    const db = getDb()
    const row = db.schedules.find((s) => s.schedule_id === id)
    if (!row) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    return HttpResponse.json({ success: true, data: row })
  }),

  http.put(apiPath('/api/v4/screens/schedules/:id'), async ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const id = Number(params.id)
    const db = getDb()
    const idx = db.schedules.findIndex((s) => s.schedule_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.schedules[idx]
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    const body = (await request.json()) as Partial<MockSchedule>
    const updated: MockSchedule = {
      ...row,
      ...body,
      schedule_id: row.schedule_id,
      organization_id: row.organization_id,
      media_id: body.media_id ?? row.media_id,
      created_at: row.created_at,
    }
    if (!isAdmin(user)) {
      updated.rate_per_minute = row.rate_per_minute
    }
    db.schedules[idx] = updated
    persistDb()
    return HttpResponse.json({ success: true, data: updated })
  }),

  http.delete(apiPath('/api/v4/screens/schedules/:id'), ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const id = Number(params.id)
    const db = getDb()
    const idx = db.schedules.findIndex((s) => s.schedule_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.schedules[idx]
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    db.schedules.splice(idx, 1)
    persistDb()
    return HttpResponse.json({ success: true, data: { deleted: id } })
  }),
]
