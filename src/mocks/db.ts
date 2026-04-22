import { createSeedDb } from './seed'

export const STORAGE_KEY = 'ion_mock_db'

export interface MockUser {
  user_id: number
  organization_id: number
  role_name: string
  f_name: string
  l_name: string
  email: string
  mobile: string
  profile_img_url: null | string
}

export interface MockOrganization {
  organization_id: number
  name: string
}

export interface MockLocation {
  location_id: number
  organization_id: number
  name: string
  lat: number
  lng: number
}

export interface MockCharger {
  id: number
  location_id: number
  name: string
  chargerID: string
}

export interface MockScreenDevice {
  id: number
  charger_id: number
  device_token: string
  device_name: string
  resolution: string
  orientation: string
  is_online: number
  last_heartbeat_at: string | null
}

export type MediaStatus = 'pending' | 'approved' | 'rejected'
export type MediaType = 'image' | 'video'

export interface MockMedia {
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

export type ScheduleTargetScope = 'organization' | 'location' | 'charger' | 'screen'

export interface MockSchedule {
  schedule_id: number
  organization_id: number
  media_id: number
  starts_at: string
  ends_at: string
  active: boolean
  target_scope: ScheduleTargetScope
  location_id: number | null
  charger_id: number | null
  screen_device_id: number | null
  priority: number
  rate_per_minute: number
  created_at: string
}

export interface MockPlaybackLog {
  log_id: number
  organization_id: number
  media_id: number
  screen_device_id: number
  schedule_id: number | null
  played_at: string
  duration_seconds: number
  rate_per_minute: number
  computed_cost: number
}

export interface MockAppSettings {
  default_rate_per_minute_partner: number
}

export interface MockDb {
  users: MockUser[]
  organizations: MockOrganization[]
  locations: MockLocation[]
  chargers: MockCharger[]
  screen_devices: MockScreenDevice[]
  media: MockMedia[]
  schedules: MockSchedule[]
  playback_logs: MockPlaybackLog[]
  app_settings: MockAppSettings
}

let cache: MockDb | null = null

export function getDb(): MockDb {
  if (cache) return cache
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    cache = createSeedDb()
    persistDb()
    return cache
  }
  cache = JSON.parse(raw) as MockDb
  return cache
}

export function persistDb(): void {
  if (cache) localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

export function resetDbToSeed(): void {
  cache = createSeedDb()
  persistDb()
}

/** Next numeric id for new entities */
export function nextMediaId(db: MockDb): number {
  return db.media.reduce((m, x) => Math.max(m, x.media_id), 0) + 1
}

export function nextScheduleId(db: MockDb): number {
  return db.schedules.reduce((m, x) => Math.max(m, x.schedule_id), 0) + 1
}

export function nextLogId(db: MockDb): number {
  return db.playback_logs.reduce((m, x) => Math.max(m, x.log_id), 0) + 1
}
