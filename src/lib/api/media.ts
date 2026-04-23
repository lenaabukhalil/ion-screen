import { api, parseResponseBody } from '@/lib/api/client'

export type MediaStatus = 'pending' | 'approved' | 'rejected'
export type MediaType = 'image' | 'video'

export interface MediaItem {
  media_id: number
  organization_id: number
  title: string
  description: string
  media_type: MediaType
  file_url: string
  status: MediaStatus
  review_note: string | null
  default_display_seconds: number
  created_at: string
  updated_at: string
}

export interface MediaListParams {
  status?: MediaStatus
  q?: string
  organization_id?: number
  media_type?: MediaType
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

  const mediaType = v.media_type === 'video' ? 'video' : 'image'
  const statusRaw = v.status
  const status: MediaStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending'

  return {
    media_id: mediaId,
    organization_id: orgId,
    title: typeof v.title === 'string' ? v.title : 'Untitled',
    description: typeof v.description === 'string' ? v.description : '',
    media_type: mediaType,
    file_url: typeof v.file_url === 'string' ? v.file_url : '',
    status,
    review_note: typeof v.review_note === 'string' ? v.review_note : null,
    default_display_seconds: Number(v.default_display_seconds ?? 30) || 30,
    created_at: typeof v.created_at === 'string' ? v.created_at : '',
    updated_at: typeof v.updated_at === 'string' ? v.updated_at : '',
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
