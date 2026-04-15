import {
  MOCK_AUTH_TOKEN_ADMIN,
  MOCK_AUTH_TOKEN_PARTNER,
  MOCK_AUTH_USER_ADMIN,
  MOCK_AUTH_USER_PARTNER,
  MOCK_CHARGERS,
  MOCK_DEV_LOGIN_ADMIN,
  MOCK_DEV_LOGIN_PARTNER,
  MOCK_KIOSK_STATS,
  MOCK_MEDIA_ITEMS,
  MOCK_SCREENS,
  type MediaItem,
  type StatsResponse,
} from '@/services/mockData'

const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'kiosk_token'
const GET_CACHE_TTL_MS = 20_000
const getCache = new Map<string, { data: unknown; at: number }>()

export type ApiResult<T> = { success: boolean; data?: T; message?: string; statusCode?: number }

export interface AuthUser {
  id: number
  name: string
  role: string
  organization_id: number
}

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function clearGetCache() {
  getCache.clear()
}

async function mockRequest<T>(path: string, opts: RequestInit = {}): Promise<ApiResult<T>> {
  await delay(400)
  const method = (opts.method || 'GET').toUpperCase()

  if (path.includes('/auth/login') && method === 'POST') {
    const body = JSON.parse(String(opts.body || '{}'))
    if (body.identifier && body.password) {
      const idLower = String(body.identifier).trim().toLowerCase()
      if (idLower === MOCK_DEV_LOGIN_ADMIN.toLowerCase()) {
        return { success: true, data: { token: MOCK_AUTH_TOKEN_ADMIN, user: MOCK_AUTH_USER_ADMIN, permissions: [] } as T }
      }
      if (idLower === MOCK_DEV_LOGIN_PARTNER.toLowerCase()) {
        return { success: true, data: { token: MOCK_AUTH_TOKEN_PARTNER, user: MOCK_AUTH_USER_PARTNER, permissions: [] } as T }
      }
      return {
        success: false,
        message: `Mock login: use ${MOCK_DEV_LOGIN_ADMIN} or ${MOCK_DEV_LOGIN_PARTNER} (any password).`,
        statusCode: 401,
      }
    }
    return { success: false, message: 'Invalid credentials', statusCode: 401 }
  }

  if (path.includes('/auth/me')) {
    const t = getToken()
    if (!t) {
      return { success: false, message: 'Unauthorized', statusCode: 401 }
    }
    if (t === MOCK_AUTH_TOKEN_ADMIN) {
      return { success: true, data: { user: MOCK_AUTH_USER_ADMIN, permissions: [] } as T }
    }
    if (t === MOCK_AUTH_TOKEN_PARTNER) {
      return { success: true, data: { user: MOCK_AUTH_USER_PARTNER, permissions: [] } as T }
    }
    return { success: false, message: 'Invalid or expired session', statusCode: 401 }
  }

  if (path.includes('/kiosk/stats')) {
    return { success: true, data: MOCK_KIOSK_STATS as T }
  }
  if (path.includes('/media/pending')) {
    return { success: true, data: MOCK_MEDIA_ITEMS.filter((m) => m.status === 'pending') as T }
  }
  if (path.includes('/media') && method === 'GET' && !path.includes('/media/upload') && !path.includes('/media/pending')) {
    const url = new URL(path, 'http://mock')
    const status = url.searchParams.get('status')
    const orgParam = url.searchParams.get('organization_id')
    const page = Number(url.searchParams.get('page') || 1)
    const limit = Number(url.searchParams.get('limit') || 10)

    const t = getToken()
    const pool: MediaItem[] =
      t === MOCK_AUTH_TOKEN_PARTNER
        ? MOCK_MEDIA_ITEMS.filter((m) => m.organization_id === MOCK_AUTH_USER_PARTNER.organization_id)
        : [...MOCK_MEDIA_ITEMS]

    let filtered = status ? pool.filter((m) => m.status === status) : pool
    if (orgParam) {
      const oid = Number(orgParam)
      filtered = filtered.filter((m) => (m.organization_id ?? 0) === oid)
    }
    const start = (page - 1) * limit
    return { success: true, data: { items: filtered.slice(start, start + limit), total: filtered.length, page, limit } as T }
  }

  if (path.includes('/media/upload') && method === 'POST') {
    return { success: true, data: { media_id: String(Date.now()) } as T, message: 'Uploaded' }
  }

  if (path.includes('/chargers')) return { success: true, data: MOCK_CHARGERS as T }
  if (path.includes('/screens')) return { success: true, data: MOCK_SCREENS as T }
  if (path.includes('/screen/config') && method === 'GET') return { success: true, data: { slide_duration: 8, transition: 'fade', loop_playlist: true } as T }
  if (path.includes('/screen/config') && method === 'PUT') return { success: true, data: JSON.parse(String(opts.body || '{}')) as T }

  return { success: true, data: undefined }
}

async function request<T>(path: string, opts: RequestInit & { skipCache?: boolean; noAuth?: boolean } = {}): Promise<ApiResult<T>> {
  try {
    const method = (opts.method || 'GET').toUpperCase()
    const cacheKey = `${method}:${path}`

    if (method === 'GET' && !opts.skipCache) {
      const hit = getCache.get(cacheKey)
      if (hit && Date.now() - hit.at <= GET_CACHE_TTL_MS) {
        return { success: true, data: hit.data as T }
      }
    }

    if (USE_MOCK) {
      return mockRequest<T>(path, opts)
    }

    const token = getToken()
    const isFormData = opts.body instanceof FormData
    const headers = new Headers(opts.headers || {})
    if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (!opts.noAuth && token) headers.set('Authorization', `Bearer ${token}`)

    const res = await fetch(`${BASE}${path}`, { ...opts, headers })

    if (res.status === 401) {
      clearToken()
      window.location.href = '/login'
      return { success: false, message: 'Unauthorized', statusCode: 401 }
    }

    const json = await res.json().catch(() => ({} as Record<string, unknown>))
    const result = {
      ...json,
      success: (json as { success?: boolean }).success !== false,
      statusCode: res.status,
    } as ApiResult<T>

    if (method === 'GET' && result.success && !opts.skipCache) {
      getCache.set(cacheKey, { data: result.data, at: Date.now() })
    }

    return result
  } catch {
    if (!USE_MOCK) {
      return mockRequest<T>(path, opts)
    }
    return { success: false, message: 'Request failed' }
  }
}

export async function login(identifier: string, password: string) {
  return request<{ token: string; user: AuthUser; permissions: unknown[] }>(
    '/api/v4/auth/login',
    { method: 'POST', body: JSON.stringify({ identifier, password }), noAuth: true },
  )
}

export async function me() {
  return request<{ user: AuthUser; permissions: unknown[] }>('/api/v4/auth/me', { skipCache: true })
}

export async function getStats() {
  return request<StatsResponse>('/api/v1/kiosk/stats')
}

export async function getMedia(filters: { status?: string; page?: number; limit?: number; organizationId?: number }) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.organizationId != null) params.set('organization_id', String(filters.organizationId))
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<{ items: MediaItem[]; total: number; page: number; limit: number }>(`/api/v1/kiosk/media${query}`)
}

export async function uploadMedia(formData: FormData) {
  return request<{ media_id: string }>('/api/v1/kiosk/media/upload', { method: 'POST', body: formData })
}

export async function deleteMedia(mediaId: string) {
  return request<{ media_id: string }>(`/api/v1/kiosk/media/${mediaId}`, { method: 'DELETE' })
}

export async function approveMedia(mediaId: string, notes?: string) {
  return request(`/api/v1/kiosk/media/${mediaId}/approve`, { method: 'POST', body: JSON.stringify({ notes }) })
}

export async function rejectMedia(mediaId: string, reason: string) {
  return request(`/api/v1/kiosk/media/${mediaId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export async function getPendingMedia() {
  return request<MediaItem[]>('/api/v1/kiosk/media/pending')
}

export async function getChargers(locationId?: string) {
  const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  return request<Array<{ charger_id: string; name: string; location: string; status: string; active_session: boolean; last_seen?: string }>>(`/api/v1/kiosk/chargers${query}`)
}

export async function getChargerStatus(chargerId: string) {
  return request<{ charger_id: string; status: string }>(`/api/v1/kiosk/chargers/${chargerId}/status`)
}

export async function getScreens() {
  return request<Array<{ screen_id: string; charger_id: string; status: string; uptime_seconds: number; last_heartbeat: string }>>('/api/v1/kiosk/screens')
}

export async function getSettings() {
  return request<{ slide_duration: number; transition: 'fade' | 'slide' | 'none'; loop_playlist: boolean }>('/api/v1/kiosk/screen/config')
}

export async function updateSettings(body: { slide_duration: number; transition: 'fade' | 'slide' | 'none'; loop_playlist: boolean }) {
  return request('/api/v1/kiosk/screen/config', { method: 'PUT', body: JSON.stringify(body) })
}

export async function logoutApi() {
  return request<void>('/api/v4/auth/logout', { method: 'POST', body: '{}' })
}
