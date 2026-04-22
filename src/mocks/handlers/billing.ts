import { http, HttpResponse } from 'msw'
import { getAuthUser } from './auth'
import { getDb } from '../db'
import { apiPath } from '../utils'

function isAdmin(user: { organization_id: number }): boolean {
  return user.organization_id === 1
}

function parseRange(from: string | null, to: string | null): { start: number; end: number } {
  const end = to ? new Date(to).getTime() : Date.now()
  const start = from ? new Date(from).getTime() : end - 30 * 86400000
  return { start, end }
}

export const billingHandlers = [
  http.get(apiPath('/api/v4/screens/billing/summary'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const { start, end } = parseRange(url.searchParams.get('from'), url.searchParams.get('to'))
    const orgParam = url.searchParams.get('organization_id')
    const db = getDb()

    let logs = db.playback_logs.filter((l) => {
      const t = new Date(l.played_at).getTime()
      return t >= start && t <= end
    })

    if (isAdmin(user) && orgParam) {
      const oid = Number(orgParam)
      if (Number.isFinite(oid)) logs = logs.filter((l) => l.organization_id === oid)
    } else if (!isAdmin(user)) {
      logs = logs.filter((l) => l.organization_id === user.organization_id)
    }

    const total_plays = logs.length
    const total_duration_seconds = logs.reduce((s, l) => s + l.duration_seconds, 0)
    const total_cost = Math.round(logs.reduce((s, l) => s + l.computed_cost, 0) * 1000) / 1000

    const byDayMap = new Map<string, { plays: number; cost: number; seconds: number }>()
    for (const l of logs) {
      const day = l.played_at.slice(0, 10)
      const cur = byDayMap.get(day) ?? { plays: 0, cost: 0, seconds: 0 }
      cur.plays += 1
      cur.cost += l.computed_cost
      cur.seconds += l.duration_seconds
      byDayMap.set(day, cur)
    }
    const by_day = [...byDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        plays: v.plays,
        cost: Math.round(v.cost * 1000) / 1000,
        duration_seconds: v.seconds,
      }))

    const byMediaMap = new Map<number, { plays: number; cost: number; seconds: number }>()
    for (const l of logs) {
      const cur = byMediaMap.get(l.media_id) ?? { plays: 0, cost: 0, seconds: 0 }
      cur.plays += 1
      cur.cost += l.computed_cost
      cur.seconds += l.duration_seconds
      byMediaMap.set(l.media_id, cur)
    }
    const by_media = [...byMediaMap.entries()].map(([media_id, v]) => ({
      media_id,
      plays: v.plays,
      cost: Math.round(v.cost * 1000) / 1000,
      duration_seconds: v.seconds,
    }))

    return HttpResponse.json({
      success: true,
      data: {
        total_plays,
        total_duration_seconds,
        total_cost,
        by_day,
        by_media,
      },
    })
  }),

  http.get(apiPath('/api/v4/screens/billing/by-organization'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const url = new URL(request.url)
    const { start, end } = parseRange(url.searchParams.get('from'), url.searchParams.get('to'))
    const db = getDb()

    const logs = db.playback_logs.filter((l) => {
      const t = new Date(l.played_at).getTime()
      return t >= start && t <= end
    })

    const orgMap = new Map<
      number,
      { organization_id: number; plays: number; cost: number; seconds: number }
    >()
    for (const l of logs) {
      const cur = orgMap.get(l.organization_id) ?? {
        organization_id: l.organization_id,
        plays: 0,
        cost: 0,
        seconds: 0,
      }
      cur.plays += 1
      cur.cost += l.computed_cost
      cur.seconds += l.duration_seconds
      orgMap.set(l.organization_id, cur)
    }

    const items = [...orgMap.values()]
      .map((o) => ({
        ...o,
        cost: Math.round(o.cost * 1000) / 1000,
      }))
      .sort((a, b) => b.cost - a.cost)

    return HttpResponse.json({ success: true, data: { items, total: items.length } })
  }),
]
