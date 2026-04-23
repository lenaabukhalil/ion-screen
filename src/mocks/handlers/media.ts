import { delay, http, HttpResponse } from 'msw'
import { getAuthUser } from './auth'
import { getDb, nextMediaId, persistDb, type MockMedia, type MediaType } from '../db'
import { apiPath } from '../utils'

const SAMPLE_VIDEO = 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'
const UNSPLASH_POOL = [
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1280',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1280',
]

function isAdmin(user: { organization_id: number }): boolean {
  return user.organization_id === 1
}

function nowIso(): string {
  return new Date().toISOString()
}

function hasActiveScheduleForMedia(db: ReturnType<typeof getDb>, mediaId: number): boolean {
  const t = Date.now()
  return db.schedules.some((s) => {
    if (s.media_id !== mediaId || !s.active) return false
    const a = new Date(s.starts_at).getTime()
    const b = new Date(s.ends_at).getTime()
    return t >= a && t <= b
  })
}

function filterMediaList(
  db: ReturnType<typeof getDb>,
  user: { organization_id: number },
  status: string | null,
  q: string | null,
  orgFilter: string | null,
  mediaType: string | null,
  chargerId: string | null,
): MockMedia[] {
  let list = [...db.media]
  if (!isAdmin(user)) {
    list = list.filter((m) => m.organization_id === user.organization_id)
  } else if (orgFilter) {
    const oid = Number(orgFilter)
    if (Number.isFinite(oid)) list = list.filter((m) => m.organization_id === oid)
  }
  if (status) {
    list = list.filter((m) => m.status === status)
  }
  if (q) {
    const qq = q.toLowerCase()
    list = list.filter(
      (m) =>
        m.title.toLowerCase().includes(qq) ||
        m.description.toLowerCase().includes(qq),
    )
  }
  if (mediaType) {
    list = list.filter((m) => m.media_type === mediaType)
  }
  if (chargerId) {
    const cid = Number(chargerId)
    if (Number.isFinite(cid)) {
      list = list.filter((m) => Number((m as unknown as { charger_id?: number }).charger_id) === cid)
    }
  }
  return list
}

function ionScreenFiltered(
  request: Request,
  user: { organization_id: number },
): { list: MockMedia[]; limit: number; offset: number } {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const q = url.searchParams.get('q')
  const organizationId = url.searchParams.get('organizationId')
  const mediaType = url.searchParams.get('mediaType')
  const chargerId = url.searchParams.get('chargerId')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200)
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0)
  const db = getDb()
  const list = filterMediaList(db, user, status, q, organizationId, mediaType, chargerId)
  return {
    list,
    limit: Number.isFinite(limit) ? limit : 50,
    offset,
  }
}

export const mediaHandlers = [
  http.get(apiPath('/api/v4/screens/media/pending-count'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const db = getDb()
    const count = db.media.filter((m) => {
      if (m.status !== 'pending') return false
      if (isAdmin(user)) return true
      return m.organization_id === user.organization_id
    }).length
    return HttpResponse.json({ success: true, data: { count } })
  }),

  http.post(apiPath('/api/v4/screens/media'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    if (isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins cannot upload media here' }, { status: 403 })
    }
    await delay(1500)
    const fd = await request.formData()
    const file = fd.get('file')
    const title = String(fd.get('title') ?? 'Untitled')
    const description = String(fd.get('description') ?? '')
    const defaultDisplaySeconds = Number(fd.get('default_display_seconds') ?? 30)

    const isVideo =
      file instanceof File && (file.type.startsWith('video/') || /\.mp4$/i.test(file.name))
    const mediaType: MediaType = isVideo ? 'video' : 'image'
    const fileUrl = isVideo ? SAMPLE_VIDEO : UNSPLASH_POOL[Math.floor(Math.random() * UNSPLASH_POOL.length)] as string

    const db = getDb()
    const media_id = nextMediaId(db)
    const ts = nowIso()
    const row: MockMedia = {
      media_id,
      organization_id: user.organization_id,
      title,
      description,
      media_type: mediaType,
      file_url: fileUrl,
      status: 'pending',
      review_note: null,
      default_display_seconds: Number.isFinite(defaultDisplaySeconds) ? defaultDisplaySeconds : 30,
      created_at: ts,
      updated_at: ts,
    }
    db.media.push(row)
    persistDb()
    return HttpResponse.json({ success: true, data: row }, { status: 201 })
  }),

  http.get(apiPath('/api/v4/screens/media'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const q = url.searchParams.get('q')
    const organization_id = url.searchParams.get('organization_id')
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200)
    const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0)

    const db = getDb()
    const filtered = filterMediaList(db, user, status, q, organization_id, null, null)
    const slice = filtered.slice(offset, offset + (Number.isFinite(limit) ? limit : 50))
    return HttpResponse.json({
      success: true,
      data: {
        items: slice,
        total: filtered.length,
        limit: Number.isFinite(limit) ? limit : 50,
        offset,
      },
    })
  }),

  http.get(apiPath('/api/v4/ion-screen/media'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const db = getDb()
    if (id) {
      const mediaId = Number(id)
      const row = db.media.find((m) => m.media_id === mediaId)
      if (!row) {
        return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
      }
      if (!isAdmin(user) && row.organization_id !== user.organization_id) {
        return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
      }
      return HttpResponse.json({ success: true, count: 1, data: [row] })
    }
    const { list, limit, offset } = ionScreenFiltered(request, user)
    const slice = list.slice(offset, offset + limit)
    return HttpResponse.json({ success: true, count: list.length, data: slice })
  }),

  http.post(apiPath('/api/v4/ion-screen/media'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    if (isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins cannot upload media here' }, { status: 403 })
    }
    const body = (await request.json().catch(() => ({}))) as Partial<MockMedia> & {
      media_type?: MediaType
      file_url?: string
      category?: string
      schedule_start?: string
      schedule_end?: string
      play_duration_sec?: number
    }
    const db = getDb()
    const media_id = nextMediaId(db)
    const ts = nowIso()
    const row: MockMedia = {
      media_id,
      organization_id: user.organization_id,
      title: body.title ?? 'Untitled',
      description: body.description ?? '',
      media_type: body.media_type === 'video' ? 'video' : 'image',
      file_url: body.file_url ?? UNSPLASH_POOL[0] as string,
      status: 'pending',
      review_note: null,
      default_display_seconds: Number(body.default_display_seconds ?? body.play_duration_sec ?? 30) || 30,
      created_at: ts,
      updated_at: ts,
      ...(body as Partial<MockMedia>),
    }
    db.media.push(row)
    persistDb()
    return HttpResponse.json({ success: true, data: row }, { status: 201 })
  }),

  http.put(apiPath('/api/v4/ion-screen/media'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return HttpResponse.json({ success: false, message: 'Missing id' }, { status: 400 })
    }
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.media[idx]
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    const body = (await request.json().catch(() => ({}))) as Partial<MockMedia>
    db.media[idx] = {
      ...row,
      ...body,
      media_id: row.media_id,
      organization_id: row.organization_id,
      updated_at: nowIso(),
    }
    persistDb()
    return HttpResponse.json({ success: true, message: 'Updated' })
  }),

  http.delete(apiPath('/api/v4/ion-screen/media'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return HttpResponse.json({ success: false, message: 'Missing id' }, { status: 400 })
    }
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.media[idx]
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    db.media[idx] = { ...row, status: 'rejected', review_note: 'archived', updated_at: nowIso() }
    persistDb()
    return HttpResponse.json({ success: true, message: 'Archived' })
  }),

  http.put(apiPath('/api/v4/ion-screen/media/approve'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return HttpResponse.json({ success: false, message: 'Missing id' }, { status: 400 })
    }
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json().catch(() => ({}))) as { review_note?: string }
    const row = db.media[idx]
    db.media[idx] = {
      ...row,
      status: 'approved',
      review_note: body.review_note ?? null,
      updated_at: nowIso(),
    }
    persistDb()
    return HttpResponse.json({ success: true, message: 'Approved' })
  }),

  http.put(apiPath('/api/v4/ion-screen/media/reject'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return HttpResponse.json({ success: false, message: 'Missing id' }, { status: 400 })
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    const reason = String(body.reason ?? '').trim()
    if (!reason) {
      return HttpResponse.json({ success: false, message: 'Reason is required' }, { status: 400 })
    }
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.media[idx]
    db.media[idx] = {
      ...row,
      status: 'rejected',
      review_note: reason,
      updated_at: nowIso(),
    }
    persistDb()
    return HttpResponse.json({ success: true, message: 'Rejected' })
  }),

  http.get(apiPath('/api/v4/screens/media/:id'), ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const id = Number(params.id)
    const db = getDb()
    const row = db.media.find((m) => m.media_id === id)
    if (!row) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    return HttpResponse.json({ success: true, data: row })
  }),

  http.put(apiPath('/api/v4/screens/media/:id'), async ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const id = Number(params.id)
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.media[idx]
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    if (row.status === 'approved' && hasActiveScheduleForMedia(db, id)) {
      return HttpResponse.json(
        { success: false, message: 'Cannot edit: media has active schedules' },
        { status: 409 },
      )
    }
    const body = (await request.json()) as Partial<{
      title: string
      description: string
      default_display_seconds: number
    }>
    const updated: MockMedia = {
      ...row,
      title: body.title ?? row.title,
      description: body.description ?? row.description,
      default_display_seconds:
        body.default_display_seconds ?? row.default_display_seconds,
      updated_at: nowIso(),
    }
    db.media[idx] = updated
    persistDb()
    return HttpResponse.json({ success: true, data: updated })
  }),

  http.delete(apiPath('/api/v4/screens/media/:id'), ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const id = Number(params.id)
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.media[idx]
    if (!isAdmin(user) && row.organization_id !== user.organization_id) {
      return HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    if (row.status === 'approved' && hasActiveScheduleForMedia(db, id)) {
      return HttpResponse.json(
        { success: false, message: 'Cannot delete: media has active schedules' },
        { status: 409 },
      )
    }
    db.media.splice(idx, 1)
    persistDb()
    return HttpResponse.json({ success: true, data: { deleted: id } })
  }),

  http.put(apiPath('/api/v4/screens/media/:id/approve'), async ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const id = Number(params.id)
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json().catch(() => ({}))) as { review_note?: string }
    const row = db.media[idx]
    row.status = 'approved'
    row.review_note = body.review_note ?? null
    row.updated_at = nowIso()
    db.media[idx] = row
    persistDb()
    return HttpResponse.json({ success: true, data: row })
  }),

  http.put(apiPath('/api/v4/screens/media/:id/reject'), async ({ request, params }) => {
    const user = getAuthUser(request)
    if (!user || !isAdmin(user)) {
      return HttpResponse.json({ success: false, message: 'Admins only' }, { status: 403 })
    }
    const id = Number(params.id)
    const body = (await request.json()) as { review_note?: string }
    const note = String(body.review_note ?? '').trim()
    if (!note) {
      return HttpResponse.json({ success: false, message: 'Review note is required' }, { status: 400 })
    }
    const db = getDb()
    const idx = db.media.findIndex((m) => m.media_id === id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    const row = db.media[idx]
    row.status = 'rejected'
    row.review_note = note
    row.updated_at = nowIso()
    db.media[idx] = row
    persistDb()
    return HttpResponse.json({ success: true, data: row })
  }),
]
