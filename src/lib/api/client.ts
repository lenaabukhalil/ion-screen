import axios, { type AxiosResponse } from 'axios'

export const TOKEN_KEY = 'ion_screen_token'

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const url = String(err.config?.url ?? '')
      const isLogin = url.includes('/auth/login')
      if (!isLogin) {
        localStorage.removeItem(TOKEN_KEY)
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
    return Promise.reject(err)
  },
)

/**
 * If body is `{ success: false, message }`, throw.
 * If body is `{ success: true, data }`, return `data`.
 * Otherwise return full body (arrays, plain objects, etc.).
 */
export function unwrap<T>(res: AxiosResponse<unknown>): T {
  const body = res.data
  if (body !== null && typeof body === 'object' && 'success' in body) {
    const rec = body as Record<string, unknown>
    if (rec.success === false) {
      const msg = typeof rec.message === 'string' ? rec.message : 'Request failed'
      throw new Error(msg)
    }
    if ('data' in rec && rec.data !== undefined) {
      return rec.data as T
    }
  }
  return body as T
}

export function parseResponseBody(res: AxiosResponse<unknown>): unknown {
  try {
    return unwrap<unknown>(res)
  } catch {
    return res.data
  }
}
