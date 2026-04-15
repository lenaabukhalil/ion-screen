export interface AppUser {
  id: number
  name: string
  role: string
  organization_id: number
}

export function isIonAdmin(user: AppUser | null) {
  return Number(user?.organization_id) === 1
}

export function canAccessApp(user: AppUser | null) {
  return Boolean(user && typeof user.organization_id === 'number')
}
