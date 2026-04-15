import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { normalizeAuthUser } from '@/lib/authUser'
import { clearGetCache, clearToken, logoutApi, me, setToken, type AuthUser } from '@/services/api'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setAuthToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function hydrate() {
      const res = await me()
      if (mounted) {
        const raw = res.success ? res.data?.user : undefined
        setUser(normalizeAuthUser(raw))
        setLoading(false)
      }
    }
    hydrate()
    return () => {
      mounted = false
    }
  }, [])

  const setUserNormalized = useMemo(
    () => (next: AuthUser | null) => {
      setUser(next == null ? null : normalizeAuthUser(next as unknown) ?? null)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    setUser: setUserNormalized,
    setAuthToken: (token: string) => {
      clearGetCache()
      setToken(token)
    },
    logout: () => {
      clearToken()
      clearGetCache()
      setUser(null)
      void logoutApi()
    },
  }), [user, loading, setUserNormalized])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
