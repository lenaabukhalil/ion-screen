import { api, parseResponseBody } from '@/lib/api/client'

export type MediaStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
export type MediaType = 'image' | 'video' | 'html' | 'url'

export interface MediaItem {
  media_id: number
  organization_id: number
  location_id?: number | null
  charger_id?: number | null
  media_type: MediaType
  category?: string | null
  title: string
  description: string
  file_url: string
  thumbnail_url?: string | null
  mime_type?: string | null
  file_size_bytes?: number | null
  duration_sec?: number | null
  status: MediaStatus
  approved_by?: number | null
  approved_at?: string | null
  rejection_note?: string | null
  review_note: string | null
  uploaded_by?: number | null
  uploaded_at?: string | null
  default_display_seconds: number
  created_at: string
  updated_at: string
  tags?: string[]
  schedule_start?: string | null
  schedule_end?: string | null
  play_order?: number | null
  play_duration_sec?: number | null
}

export interface MediaListParams {
  status?: MediaStatus
  q?: string
  organization_id?: number
  media_type?: MediaType
  charger_id?: number
  limit?: number
  offset?: number
}

export interface MediaListResult {
  items: MediaItem[]
  total: number
  limit: number
  offset: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function toMediaItem(v: unknown): MediaItem | null {
  if (!isRecord(v)) return null
  const mediaId = Number(v.media_id)
  const orgId = Number(v.organization_id)
  if (!Number.isFinite(mediaId) || !Number.isFinite(orgId)) return null

  const mediaTypeRaw = v.media_type
  const mediaType: MediaType =
    mediaTypeRaw === 'video' || mediaTypeRaw === 'html' || mediaTypeRaw === 'url'
      ? mediaTypeRaw
      : 'image'
  const statusRaw = v.status
  const status: MediaStatus =
    statusRaw === 'draft' ||
    statusRaw === 'approved' ||
    statusRaw === 'rejected' ||
    statusRaw === 'archived'
      ? statusRaw
      : 'pending'

  return {
    media_id: mediaId,
    organization_id: orgId,
    location_id: v.location_id == null ? null : Number(v.location_id),
    charger_id: v.charger_id == null ? null : Number(v.charger_id),
    title: typeof v.title === 'string' ? v.title : 'Untitled',
    description: typeof v.description === 'string' ? v.description : '',
    media_type: mediaType,
    category: typeof v.category === 'string' ? v.category : null,
    file_url: typeof v.file_url === 'string' ? v.file_url : '',
    thumbnail_url: typeof v.thumbnail_url === 'string' ? v.thumbnail_url : null,
    mime_type: typeof v.mime_type === 'string' ? v.mime_type : null,
    file_size_bytes: v.file_size_bytes == null ? null : Number(v.file_size_bytes),
    duration_sec: v.duration_sec == null ? null : Number(v.duration_sec),
    status,
    approved_by: v.approved_by == null ? null : Number(v.approved_by),
    approved_at: typeof v.approved_at === 'string' ? v.approved_at : null,
    rejection_note: typeof v.rejection_note === 'string' ? v.rejection_note : null,
    review_note: typeof v.review_note === 'string' ? v.review_note : null,
    uploaded_by: v.uploaded_by == null ? null : Number(v.uploaded_by),
    uploaded_at: typeof v.uploaded_at === 'string' ? v.uploaded_at : null,
    default_display_seconds: Number(v.default_display_seconds ?? 30) || 30,
    created_at: typeof v.created_at === 'string' ? v.created_at : typeof v.uploaded_at === 'string' ? v.uploaded_at : '',
    updated_at: typeof v.updated_at === 'string' ? v.updated_at : '',
    tags: Array.isArray(v.tags) ? v.tags.filter((x): x is string => typeof x === 'string') : [],
    schedule_start: typeof v.schedule_start === 'string' ? v.schedule_start : null,
    schedule_end: typeof v.schedule_end === 'string' ? v.schedule_end : null,
    play_order: v.play_order == null ? null : Number(v.play_order),
    play_duration_sec: v.play_duration_sec == null ? null : Number(v.play_duration_sec),
  }
}

function toMediaListResult(raw: unknown): MediaListResult {
  const fallback: MediaListResult = { items: [], total: 0, limit: 50, offset: 0 }
  if (Array.isArray(raw)) {
    const items = raw.map(toMediaItem).filter((x): x is MediaItem => x !== null)
    return {
      items,
      total: items.length,
      limit: items.length || 50,
      offset: 0,
    }
  }
  if (!isRecord(raw)) return fallback

  const rawItems = Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(raw.items)
      ? raw.items
      : []
  const items = rawItems.map(toMediaItem).filter((x): x is MediaItem => x !== null)

  return {
    items,
    total: Number(raw.count ?? raw.total ?? items.length) || items.length,
    limit: Number(raw.limit ?? 50) || 50,
    offset: Number(raw.offset ?? 0) || 0,
  }
}

async function getMediaById(id: number): Promise<MediaItem> {
  const res = await api.get(`/api/v4/ion-screen/media?id=${encodeURIComponent(String(id))}`)
  const body = parseResponseBody(res)
  const list = toMediaListResult(body)
  const item = list.items.find((x) => x.media_id === id)
  if (item) return item

  const direct = toMediaItem(body)
  if (direct) return direct

  throw new Error('Media not found after update')
}

export async function listMedia(params: MediaListParams = {}): Promise<MediaListResult> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)
  if (params.organization_id != null) query.set('organizationId', String(params.organization_id))
  if (params.media_type) query.set('mediaType', params.media_type)
  if (params.charger_id != null) query.set('chargerId', String(params.charger_id))
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.offset != null) query.set('offset', String(params.offset))
  const suffix = query.toString()
  const url = suffix ? `/api/v4/ion-screen/media?${suffix}` : '/api/v4/ion-screen/media'

  const res = await api.get(url)
  const body = parseResponseBody(res)
  return toMediaListResult(body)
}

export interface UpdateMediaInput {
  title?: string
  description?: string
  default_display_seconds?: number
  category?: string
  media_type?: MediaType
  file_url?: string
  schedule_start?: string | null
  schedule_end?: string | null
  play_duration_sec?: number | null
}

export async function updateMedia(id: number, payload: UpdateMediaInput): Promise<MediaItem> {
  await api.put(`/api/v4/ion-screen/media?id=${encodeURIComponent(String(id))}`, payload)
  return getMediaById(id)
}

export async function deleteMedia(id: number): Promise<void> {
  await api.delete(`/api/v4/ion-screen/media?id=${encodeURIComponent(String(id))}`)
}

export async function approveMedia(id: number, review_note?: string): Promise<MediaItem> {
  await api.put(`/api/v4/ion-screen/media/approve?id=${encodeURIComponent(String(id))}`, { review_note })
  return getMediaById(id)
}

export async function rejectMedia(id: number, review_note: string): Promise<MediaItem> {
  await api.put(`/api/v4/ion-screen/media/reject?id=${encodeURIComponent(String(id))}`, { reason: review_note })
  return getMediaById(id)
}

export interface UploadMediaInput {
  title: string
  description?: string
  media_type: MediaType
  file_url: string
  status?: string
  location_id?: number
  charger_id?: number
  category?: string
  play_duration_sec?: number
  schedule_start?: string
  schedule_end?: string
}

export async function uploadMedia(payload: UploadMediaInput | FormData): Promise<MediaItem> {
  const body = payload instanceof FormData ? payload : { ...payload, status: 'pending' }
  if (!(body instanceof FormData)) {
    console.log('[uploadMedia] sending body:', JSON.stringify(body))
  }
  const res = await api.post('/api/v4/ion-screen/media', body)
  const parsed = parseResponseBody(res)
  if (parsed && typeof parsed === 'object' && 'insertId' in (parsed as object)) {
    const insertId = (parsed as { insertId: number }).insertId
    if (insertId) {
      return getMediaById(insertId)
    }
  }
  const item = toMediaItem(parsed)
  if (!item) {
    const list = toMediaListResult(parsed)
    if (list.items.length > 0) return list.items[0]
    throw new Error('Invalid upload response')
  }
  return item
}
