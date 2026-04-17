import { api, unwrap, type ApiEnvelope } from '@/lib/api/client'
import type { User } from '@/types/user'
import type { AxiosResponse } from 'axios'

export interface LoginResult {
  token: string
  user: User
  permissions: Record<string, unknown>
}

export interface MeResult {
  user: User
  permissions: Record<string, unknown>
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  const res: AxiosResponse<ApiEnvelope<LoginResult>> = await api.post('/api/v4/auth/login', {
    identifier,
    password,
  })
  return unwrap(res)
}

export async function getMe(): Promise<MeResult> {
  const res: AxiosResponse<ApiEnvelope<MeResult>> = await api.get('/api/v4/auth/me')
  return unwrap(res)
}

export async function logout(): Promise<void> {
  const res: AxiosResponse<ApiEnvelope<Record<string, never>>> = await api.post('/api/v4/auth/logout')
  unwrap(res)
}
