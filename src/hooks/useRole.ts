import { useAuth } from '@/context/AuthContext'

export function useRole() {
  const { user } = useAuth()
  const isAdmin = Number(user?.organization_id) === 1
  return { isAdmin }
}
