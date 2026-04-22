import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '@/lib/api/auth'
import { TOKEN_KEY } from '@/lib/api/client'
import type { User } from '@/types/user'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: User | null
  token: string | null
  status: AuthStatus
  isAdmin: boolean
  login: (identifier: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const onLogout = () => {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      void queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      window.location.assign('/login')
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [queryClient])

  useEffect(() => {
    if (meQuery.isError && token) {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      void queryClient.removeQueries({ queryKey: ['auth', 'me'] })
    }
  }, [meQuery.isError, token, queryClient])

  const login = useCallback(
    async (identifier: string, password: string): Promise<boolean> => {
      try {
        const data = await authApi.login(identifier, password)
        localStorage.setItem(TOKEN_KEY, data.token)
        queryClient.setQueryData(['auth', 'me'], { user: data.user })
        setToken(data.token)
        return true
      } catch {
        return false
      }
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      void queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      window.location.assign('/login')
    }
  }, [queryClient])

  const status: AuthStatus = useMemo(() => {
    if (!token) return 'unauthenticated'
    if (meQuery.isPending || meQuery.isFetching) return 'loading'
    if (meQuery.isError) return 'unauthenticated'
    if (meQuery.isSuccess && meQuery.data?.user) return 'authenticated'
    return 'unauthenticated'
  }, [token, meQuery.isPending, meQuery.isFetching, meQuery.isError, meQuery.isSuccess, meQuery.data?.user])

  const user = meQuery.data?.user ?? null
  const isAdmin = user?.organization_id === 1

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      isAdmin,
      login,
      logout,
    }),
    [user, token, status, isAdmin, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
