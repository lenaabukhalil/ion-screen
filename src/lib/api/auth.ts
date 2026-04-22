import { api, parseResponseBody } from '@/lib/api/client'
import type { User } from '@/types/user'
import type { AxiosResponse } from 'axios'

const authLoggedKeys = new Set<string>()

function devLogAuthOnce(key: string, payload: unknown): void {
  if (!import.meta.env.DEV || authLoggedKeys.has(key)) return
  authLoggedKeys.add(key)
  console.log(`[api] first response shape: ${key}`, payload)
}

export interface LoginResult {
  token: string
  user: User
}

export interface MeResult {
  user: User
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function pickUser(raw: unknown): User | null {
  if (!isRecord(raw)) return null
  const user_id = Number(raw.user_id ?? raw.userId)
  if (!Number.isFinite(user_id)) return null
  const orgRaw = raw.organization_id ?? raw.organizationId
  let organization_id: number | undefined
  if (orgRaw !== undefined && orgRaw !== null && orgRaw !== '') {
    const n = Number(orgRaw)
    organization_id = Number.isFinite(n) ? n : undefined
  }
  return {
    user_id,
    organization_id,
    role_name: typeof raw.role_name === 'string' ? raw.role_name : undefined,
    f_name: typeof raw.f_name === 'string' ? raw.f_name : typeof raw.fName === 'string' ? raw.fName : undefined,
    l_name: typeof raw.l_name === 'string' ? raw.l_name : typeof raw.lName === 'string' ? raw.lName : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    mobile: typeof raw.mobile === 'string' ? raw.mobile : undefined,
    profile_img_url:
      raw.profile_img_url === null
        ? null
        : typeof raw.profile_img_url === 'string'
          ? raw.profile_img_url
          : typeof raw.profileImgUrl === 'string'
            ? raw.profileImgUrl
            : undefined,
  }
}

function parseLoginPayload(body: unknown): LoginResult {
  let token: string | undefined
  let userRaw: unknown

  if (isRecord(body)) {
    if (typeof body.token === 'string') token = body.token
    if (body.user !== undefined) userRaw = body.user
    if (isRecord(body.data)) {
      const d = body.data
      if (typeof d.token === 'string') token = d.token
      if (d.user !== undefined) userRaw = d.user
    }
  }

  const user = pickUser(userRaw ?? body)
  if (token == null || user == null) {
    throw new Error('Invalid login response')
  }
  return { token, user }
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  const res: AxiosResponse<unknown> = await api.post('/api/v4/auth/login', { identifier, password })
  devLogAuthOnce('POST /api/v4/auth/login', res.data)
  const body = parseResponseBody(res)
  if (isRecord(body) && body.success === false) {
    const msg = typeof body.message === 'string' ? body.message : 'Login failed'
    throw new Error(msg)
  }
  return parseLoginPayload(body)
}

export async function getMe(): Promise<MeResult> {
  const res: AxiosResponse<unknown> = await api.get('/api/v4/auth/me')
  devLogAuthOnce('GET /api/v4/auth/me', res.data)
  const body = parseResponseBody(res)
  let userRaw: unknown = body
  if (isRecord(body) && body.user !== undefined) {
    userRaw = body.user
  }
  const user = pickUser(userRaw)
  if (user == null) {
    throw new Error('Invalid profile response')
  }
  return { user }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/v4/auth/logout')
  } catch {
    /* fire and forget */
  }
}
