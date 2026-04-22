import { http, HttpResponse } from 'msw'
import { getAuthUser } from './auth'
import { getDb } from '../db'
import { apiPath } from '../utils'

export const lookupsHandlers = [
  http.get(apiPath('/api/v4/location'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const db = getDb()
    let list = [...db.locations]
    if (user.organization_id !== 1) {
      list = list.filter((l) => l.organization_id === user.organization_id)
    }
    return HttpResponse.json({ success: true, data: { items: list, total: list.length } })
  }),

  http.get(apiPath('/api/v4/charger'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const locationId = url.searchParams.get('locationId')
    const db = getDb()
    let list = [...db.chargers]
    if (locationId) {
      const lid = Number(locationId)
      if (Number.isFinite(lid)) list = list.filter((c) => c.location_id === lid)
    }
    if (user.organization_id !== 1) {
      const locIds = new Set(
        db.locations.filter((l) => l.organization_id === user.organization_id).map((l) => l.location_id),
      )
      list = list.filter((c) => locIds.has(c.location_id))
    }
    return HttpResponse.json({ success: true, data: { items: list, total: list.length } })
  }),

  http.get(apiPath('/api/v4/org'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const db = getDb()
    let list = [...db.organizations]
    if (user.organization_id !== 1) {
      list = list.filter((o) => o.organization_id === user.organization_id)
    }
    return HttpResponse.json({ success: true, data: { items: list, total: list.length } })
  }),
]
