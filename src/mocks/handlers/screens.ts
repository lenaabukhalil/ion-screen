import { http, HttpResponse } from 'msw'
import { getAuthUser } from './auth'
import { getDb, persistDb, type MockScreenDevice } from '../db'
import { apiPath } from '../utils'

function isAdmin(user: { organization_id: number }): boolean {
  return user.organization_id === 1
}

function nowIso(): string {
  return new Date().toISOString()
}

export const screensHandlers = [
  http.get(apiPath('/api/v4/screens/devices'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const url = new URL(request.url)
    const chargerId = url.searchParams.get('charger_id')
    const isOnline = url.searchParams.get('is_online')

    const db = getDb()
    let list = [...db.screen_devices]
    if (chargerId) {
      const cid = Number(chargerId)
      if (Number.isFinite(cid)) list = list.filter((d) => d.charger_id === cid)
    }
    if (isOnline === '1' || isOnline === 'true') {
      list = list.filter((d) => d.is_online === 1)
    }
    if (isOnline === '0' || isOnline === 'false') {
      list = list.filter((d) => d.is_online === 0)
    }
    return HttpResponse.json({ success: true, data: { items: list, total: list.length } })
  }),

  http.put(apiPath('/api/v4/screens/devices/:id'), async ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const id = Number(params.id)
    const db = getDb()
    const idx = db.screen_devices.findIndex((d) => d.id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as Partial<Pick<MockScreenDevice, 'device_name' | 'is_online' | 'resolution' | 'orientation'>>
    const row = db.screen_devices[idx]
    const updated: MockScreenDevice = {
      ...row,
      device_name: body.device_name ?? row.device_name,
      resolution: body.resolution ?? row.resolution,
      orientation: body.orientation ?? row.orientation,
      is_online: body.is_online != null ? (body.is_online ? 1 : 0) : row.is_online,
      last_heartbeat_at: body.is_online === 1 ? nowIso() : row.last_heartbeat_at,
    }
    db.screen_devices[idx] = updated
    persistDb()
    return HttpResponse.json({ success: true, data: updated })
  }),
]
