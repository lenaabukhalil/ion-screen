import type {
  MockCharger,
  MockDb,
  MockLocation,
  MockMedia,
  MockOrganization,
  MockPlaybackLog,
  MockSchedule,
  MockScreenDevice,
  MockUser,
} from './db'

const UNSPLASH: string[] = [
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1280',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1280',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1280',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1280',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1280',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1280',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1280',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1280',
]

const SAMPLE_VIDEO = 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'

const REJECT_NOTE_ORG2 = 'Image resolution is too low. Please re-upload.'
const REJECT_NOTE_ORG3 = 'Content does not comply with display policy.'

function iso(d: Date): string {
  return d.toISOString()
}

function orgChargerIds(locations: MockLocation[], chargers: MockCharger[], orgId: number): number[] {
  const locIds = new Set(locations.filter((l) => l.organization_id === orgId).map((l) => l.location_id))
  return chargers.filter((c) => locIds.has(c.location_id)).map((c) => c.id)
}

function screensForOrg(
  orgId: number,
  locations: MockLocation[],
  chargers: MockCharger[],
  screens: MockScreenDevice[],
): MockScreenDevice[] {
  const cids = new Set(orgChargerIds(locations, chargers, orgId))
  return screens.filter((s) => cids.has(s.charger_id))
}

function approvedMediaForOrg(media: MockMedia[], orgId: number): MockMedia[] {
  return media.filter((m) => m.organization_id === orgId && m.status === 'approved')
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function weightedOrgId(): number {
  const r = Math.random()
  if (r < 0.6) return 2
  if (r < 0.9) return 3
  return 4
}

function generatePlaybackLogs(
  media: MockMedia[],
  locations: MockLocation[],
  chargers: MockCharger[],
  screens: MockScreenDevice[],
  schedules: MockSchedule[],
): MockPlaybackLog[] {
  const logs: MockPlaybackLog[] = []
  let logId = 1
  const now = Date.now()
  const dayMs = 86400000

  for (let n = 0; n < 300; n++) {
    const orgId = weightedOrgId()
    const pool = approvedMediaForOrg(media, orgId)
    if (pool.length === 0) continue
    const m = pool[randInt(0, pool.length - 1)] as MockMedia
    const screenPool = screensForOrg(orgId, locations, chargers, screens)
    if (screenPool.length === 0) continue
    const scr = screenPool[randInt(0, screenPool.length - 1)] as MockScreenDevice

    const playedAt = new Date(now - randInt(0, 30) * dayMs - randInt(0, 86400) * 1000)
    const duration =
      m.media_type === 'image' ? randInt(10, 60) : randInt(15, 120)

    const schedCandidates = schedules.filter(
      (s) => s.organization_id === orgId && s.media_id === m.media_id && s.active,
    )
    const sched = schedCandidates.length ? pick(schedCandidates, n) : null
    const rate = sched ? sched.rate_per_minute : randFloat(0.1, 0.5)
    const computed = Math.round((duration / 60) * rate * 1000) / 1000

    logs.push({
      log_id: logId++,
      organization_id: orgId,
      media_id: m.media_id,
      screen_device_id: scr.id,
      schedule_id: sched?.schedule_id ?? null,
      played_at: iso(playedAt),
      duration_seconds: duration,
      rate_per_minute: rate,
      computed_cost: computed,
    })
  }
  return logs
}

function buildMedia(now: string): MockMedia[] {
  const rows: MockMedia[] = [
    {
      media_id: 1,
      organization_id: 2,
      title: 'Mothers Day Promo',
      description: 'Spring campaign',
      media_type: 'image',
      file_url: UNSPLASH[0] as string,
      status: 'approved',
      review_note: null,
      default_display_seconds: 30,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 2,
      organization_id: 2,
      title: 'Ramadan Sale',
      description: 'Ramadan discounts',
      media_type: 'video',
      file_url: SAMPLE_VIDEO,
      status: 'approved',
      review_note: null,
      default_display_seconds: 45,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 3,
      organization_id: 2,
      title: 'New Branch Opening',
      description: 'Grand opening',
      media_type: 'image',
      file_url: UNSPLASH[1] as string,
      status: 'approved',
      review_note: null,
      default_display_seconds: 25,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 4,
      organization_id: 2,
      title: 'EV Weekend',
      description: 'Weekend EV promo',
      media_type: 'image',
      file_url: UNSPLASH[2] as string,
      status: 'approved',
      review_note: null,
      default_display_seconds: 20,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 5,
      organization_id: 2,
      title: 'Summer Splash',
      description: 'Pending review',
      media_type: 'image',
      file_url: UNSPLASH[3] as string,
      status: 'pending',
      review_note: null,
      default_display_seconds: 30,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 6,
      organization_id: 2,
      title: 'Kids Corner',
      description: 'Pending',
      media_type: 'video',
      file_url: SAMPLE_VIDEO,
      status: 'pending',
      review_note: null,
      default_display_seconds: 60,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 7,
      organization_id: 2,
      title: 'Low res banner',
      description: 'Rejected sample',
      media_type: 'image',
      file_url: UNSPLASH[4] as string,
      status: 'rejected',
      review_note: REJECT_NOTE_ORG2,
      default_display_seconds: 15,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 8,
      organization_id: 3,
      title: 'City Fashion Week',
      description: 'Fashion',
      media_type: 'image',
      file_url: UNSPLASH[5] as string,
      status: 'approved',
      review_note: null,
      default_display_seconds: 35,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 9,
      organization_id: 3,
      title: 'Zarqa Nights',
      description: 'Night promo',
      media_type: 'video',
      file_url: SAMPLE_VIDEO,
      status: 'approved',
      review_note: null,
      default_display_seconds: 50,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 10,
      organization_id: 3,
      title: 'Coffee & Charge',
      description: 'Café cross-promo',
      media_type: 'image',
      file_url: UNSPLASH[6] as string,
      status: 'approved',
      review_note: null,
      default_display_seconds: 22,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 11,
      organization_id: 3,
      title: 'Winter Sale Draft',
      description: 'Pending',
      media_type: 'image',
      file_url: UNSPLASH[7] as string,
      status: 'pending',
      review_note: null,
      default_display_seconds: 28,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 12,
      organization_id: 3,
      title: 'Flash 24h',
      description: 'Pending',
      media_type: 'image',
      file_url: UNSPLASH[8] as string,
      status: 'pending',
      review_note: null,
      default_display_seconds: 18,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 13,
      organization_id: 3,
      title: 'Policy breach',
      description: 'Rejected',
      media_type: 'video',
      file_url: SAMPLE_VIDEO,
      status: 'rejected',
      review_note: REJECT_NOTE_ORG3,
      default_display_seconds: 40,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 14,
      organization_id: 4,
      title: 'Tech Park Launch',
      description: 'Approved',
      media_type: 'image',
      file_url: UNSPLASH[9] as string,
      status: 'approved',
      review_note: null,
      default_display_seconds: 32,
      created_at: now,
      updated_at: now,
    },
    {
      media_id: 15,
      organization_id: 4,
      title: 'Irbid Students',
      description: 'Pending',
      media_type: 'image',
      file_url: UNSPLASH[0] as string,
      status: 'pending',
      review_note: null,
      default_display_seconds: 24,
      created_at: now,
      updated_at: now,
    },
  ]
  return rows
}

function buildSchedules(startMonth: Date, endMonth: Date, created: string): MockSchedule[] {
  const s = iso(startMonth)
  const e = iso(endMonth)
  return [
    {
      schedule_id: 1,
      organization_id: 2,
      media_id: 1,
      starts_at: s,
      ends_at: e,
      active: true,
      target_scope: 'organization',
      location_id: null,
      charger_id: null,
      screen_device_id: null,
      priority: 1,
      rate_per_minute: 0.35,
      created_at: created,
    },
    {
      schedule_id: 2,
      organization_id: 2,
      media_id: 2,
      starts_at: s,
      ends_at: e,
      active: true,
      target_scope: 'location',
      location_id: 10,
      charger_id: null,
      screen_device_id: null,
      priority: 2,
      rate_per_minute: 0.42,
      created_at: created,
    },
    {
      schedule_id: 3,
      organization_id: 2,
      media_id: 3,
      starts_at: s,
      ends_at: e,
      active: true,
      target_scope: 'charger',
      location_id: null,
      charger_id: 100,
      screen_device_id: null,
      priority: 3,
      rate_per_minute: 0.28,
      created_at: created,
    },
    {
      schedule_id: 4,
      organization_id: 3,
      media_id: 8,
      starts_at: s,
      ends_at: e,
      active: true,
      target_scope: 'screen',
      location_id: null,
      charger_id: null,
      screen_device_id: 503,
      priority: 1,
      rate_per_minute: 0.5,
      created_at: created,
    },
    {
      schedule_id: 5,
      organization_id: 3,
      media_id: 9,
      starts_at: s,
      ends_at: e,
      active: true,
      target_scope: 'location',
      location_id: 11,
      charger_id: null,
      screen_device_id: null,
      priority: 2,
      rate_per_minute: 0.22,
      created_at: created,
    },
    {
      schedule_id: 6,
      organization_id: 4,
      media_id: 14,
      starts_at: s,
      ends_at: e,
      active: true,
      target_scope: 'charger',
      location_id: null,
      charger_id: 300,
      screen_device_id: null,
      priority: 1,
      rate_per_minute: 0.18,
      created_at: created,
    },
  ]
}

export function createSeedDb(): MockDb {
  const now = new Date()
  const nowIso = iso(now)
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const users: MockUser[] = [
    {
      user_id: 1,
      organization_id: 1,
      role_name: 'admin',
      f_name: 'Lena',
      l_name: 'Abukhalil',
      email: 'admin@ion.jo',
      mobile: '0799000001',
      profile_img_url: null,
    },
    {
      user_id: 2,
      organization_id: 2,
      role_name: 'owner',
      f_name: 'Ahmad',
      l_name: 'Hijazi',
      email: 'ahmad@greenmall.jo',
      mobile: '0799000002',
      profile_img_url: null,
    },
    {
      user_id: 3,
      organization_id: 3,
      role_name: 'owner',
      f_name: 'Sara',
      l_name: 'Qassem',
      email: 'sara@citycenter.jo',
      mobile: '0799000003',
      profile_img_url: null,
    },
    {
      user_id: 4,
      organization_id: 4,
      role_name: 'manager',
      f_name: 'Omar',
      l_name: 'Saleh',
      email: 'omar@technopark.jo',
      mobile: '0799000004',
      profile_img_url: null,
    },
  ]

  const organizations: MockOrganization[] = [
    { organization_id: 1, name: 'ION EV Charging' },
    { organization_id: 2, name: 'Green Mall' },
    { organization_id: 3, name: 'City Center' },
    { organization_id: 4, name: 'Techno Park' },
  ]

  const locations: MockLocation[] = [
    { location_id: 10, organization_id: 2, name: 'Green Mall Amman', lat: 31.95, lng: 35.93 },
    { location_id: 11, organization_id: 3, name: 'City Center Zarqa', lat: 32.07, lng: 36.08 },
    { location_id: 12, organization_id: 4, name: 'Techno Park Irbid', lat: 32.55, lng: 35.84 },
  ]

  const chargers: MockCharger[] = [
    { id: 100, location_id: 10, name: 'Charger GM-A01', chargerID: 'GM-A01' },
    { id: 101, location_id: 10, name: 'Charger GM-A02', chargerID: 'GM-A02' },
    { id: 102, location_id: 10, name: 'Charger GM-B01', chargerID: 'GM-B01' },
    { id: 200, location_id: 11, name: 'Charger CC-01', chargerID: 'CC-01' },
    { id: 201, location_id: 11, name: 'Charger CC-02', chargerID: 'CC-02' },
    { id: 300, location_id: 12, name: 'Charger TP-01', chargerID: 'TP-01' },
  ]

  const screen_devices: MockScreenDevice[] = [
    { id: 500, charger_id: 100, device_token: 'tok_a01', device_name: 'Screen GM-A01', resolution: '1920x1080', orientation: 'landscape', is_online: 1, last_heartbeat_at: nowIso },
    { id: 501, charger_id: 101, device_token: 'tok_a02', device_name: 'Screen GM-A02', resolution: '1920x1080', orientation: 'landscape', is_online: 1, last_heartbeat_at: nowIso },
    { id: 502, charger_id: 102, device_token: 'tok_b01', device_name: 'Screen GM-B01', resolution: '1920x1080', orientation: 'landscape', is_online: 0, last_heartbeat_at: iso(new Date(Date.now() - 3600000)) },
    { id: 503, charger_id: 200, device_token: 'tok_cc1', device_name: 'Screen CC-01', resolution: '1080x1920', orientation: 'portrait', is_online: 1, last_heartbeat_at: nowIso },
    { id: 504, charger_id: 201, device_token: 'tok_cc2', device_name: 'Screen CC-02', resolution: '1080x1920', orientation: 'portrait', is_online: 1, last_heartbeat_at: nowIso },
    { id: 505, charger_id: 300, device_token: 'tok_tp1', device_name: 'Screen TP-01', resolution: '1920x1080', orientation: 'landscape', is_online: 0, last_heartbeat_at: null },
  ]

  const media = buildMedia(nowIso)
  const schedules = buildSchedules(startMonth, endMonth, nowIso)
  const playback_logs = generatePlaybackLogs(media, locations, chargers, screen_devices, schedules)

  return {
    users,
    organizations,
    locations,
    chargers,
    screen_devices,
    media,
    schedules,
    playback_logs,
    app_settings: { default_rate_per_minute_partner: 0.25 },
  }
}
