import axios, { type AxiosResponse } from 'axios'

export const TOKEN_KEY = 'ion_screen_token'

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:1880'

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

export function unwrap<T>(res: AxiosResponse<ApiEnvelope<T>>): T {
  const body = res.data
  if (!body.success) {
    throw new Error(body.message ?? 'Request failed')
  }
  if (body.data === undefined) {
    throw new Error('Missing data')
  }
  return body.data
}
