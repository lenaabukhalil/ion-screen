export interface MediaItem {
  media_id: string
  title: string
  type: 'image' | 'video'
  status: 'pending' | 'approved' | 'rejected'
  url: string
  duration_seconds: number
  uploaded_by: string
  created_at: string
  rejection_reason?: string
  organization_id?: number
  organization_name?: string
}

export interface StatsResponse {
  total_media: number
  pending_count: number
  approved_count: number
  rejected_count: number
  screens_online: number
}

export interface MockOrganization {
  organization_id: number
  name: string
  name_ar: string
  contact_first_name: string
  contact_last_name: string
  contact_phoneNumber: string
  logo?: string
}

export const MOCK_ORGANIZATIONS: MockOrganization[] = [
  { organization_id: 1, name: 'ION', name_ar: 'أيون', contact_first_name: 'Ahmad', contact_last_name: 'Majali', contact_phoneNumber: '+962788799364' },
  { organization_id: 2, name: 'North Ajloun Gas-Station', name_ar: 'محطة شمال عجلون', contact_first_name: 'Ahmad', contact_last_name: 'Majali', contact_phoneNumber: '+962788799364' },
  { organization_id: 3, name: 'KAYAN FOR EV CHARGING SERVICES', name_ar: 'كيان لشحن المركبات الكهربائية', contact_first_name: 'Shadi', contact_last_name: 'Karadsheh', contact_phoneNumber: '+962785859985' },
  { organization_id: 4, name: 'American University of Madaba', name_ar: 'الجامعة الأمريكية في مادبا', contact_first_name: 'Shadi', contact_last_name: 'Kharabsheh', contact_phoneNumber: '+962797207273' },
  { organization_id: 10, name: 'Go', name_ar: 'جو', contact_first_name: 'GoGo', contact_last_name: 'Gogo', contact_phoneNumber: '+962796969696', logo: 'https://d70mlvzyd1bhv.cloudfront.net/map_assets/go.png' },
  { organization_id: 11, name: 'Kawar Energy', name_ar: 'قعوار للطاقة', contact_first_name: 'KE', contact_last_name: 'KE', contact_phoneNumber: '+962' },
  { organization_id: 1000, name: 'Energy and Minerals Regulatory Commission', name_ar: 'هيئة تنظيم قطاع الطاقة والمعادن', contact_first_name: 'Ahmad', contact_last_name: 'Majali', contact_phoneNumber: '+962788799364' },
  { organization_id: 1001, name: 'Smart Energy Station', name_ar: 'محطة الطاقة الذكية', contact_first_name: 'Mohammad', contact_last_name: 'Kharabsheh', contact_phoneNumber: '+962797207273' },
  { organization_id: 1002, name: 'Rakan Central', name_ar: 'راكان سنترال', contact_first_name: '', contact_last_name: '', contact_phoneNumber: '' },
  { organization_id: 1003, name: 'Jadara University', name_ar: 'جامعة جدارا', contact_first_name: 'Mohannad', contact_last_name: '', contact_phoneNumber: '+962795667757' },
  { organization_id: 1100, name: 'Orange', name_ar: 'أورانج', contact_first_name: 'Waleed', contact_last_name: 'Nabulsi', contact_phoneNumber: '+962776800571' },
  { organization_id: 2001, name: 'Mesk', name_ar: 'مسك', contact_first_name: 'Ibrahim', contact_last_name: 'Faloge', contact_phoneNumber: '+962779241364' },
  { organization_id: 2002, name: 'Arab Bank', name_ar: 'البنك العربي', contact_first_name: 'Moath', contact_last_name: 'Hamaideh', contact_phoneNumber: '+962799004703' },
]

export const MOCK_KIOSK_STATS: StatsResponse = {
  total_media: 6,
  pending_count: 2,
  approved_count: 3,
  rejected_count: 1,
  screens_online: 14,
}

/** Mock login identifiers when `VITE_USE_MOCK=true` (profile data below stays ION / KAYAN). */
export const MOCK_DEV_LOGIN_ADMIN = 'admin@test.com'
export const MOCK_DEV_LOGIN_PARTNER = 'partner@test.com'

export const MOCK_AUTH_TOKEN_ADMIN = 'mock-admin-token'
export const MOCK_AUTH_TOKEN_PARTNER = 'mock-partner-token'

/** Matches ION (org 1). Extra fields are for realistic dev payloads; AuthContext uses id, name, role, organization_id. */
export const MOCK_AUTH_USER_ADMIN = {
  id: 1,
  name: 'Ahmad Majali',
  role: 'admin',
  organization_id: 1,
  organization_name: 'ION',
  f_name: 'Ahmad',
  l_name: 'Majali',
  email: 'admin@ion.jo',
  mobile: '+962788799364',
}

/** Matches KAYAN (org 3). */
export const MOCK_AUTH_USER_PARTNER = {
  id: 2,
  name: 'Shadi Karadsheh',
  role: 'partner',
  organization_id: 3,
  organization_name: 'KAYAN FOR EV CHARGING SERVICES',
  f_name: 'Shadi',
  l_name: 'Karadsheh',
  email: 'shadi@kayan.jo',
  mobile: '+962785859985',
}

export const MOCK_MEDIA_ITEMS: MediaItem[] = [
  {
    media_id: 'm-001',
    title: 'ION Charging Station – Summer Campaign',
    type: 'image',
    status: 'approved',
    organization_id: 1,
    organization_name: 'ION',
    uploaded_by: 'Ahmad Majali',
    created_at: '2025-05-10T09:00:00Z',
    url: 'https://d70mlvzyd1bhv.cloudfront.net/map_assets/go.png',
    duration_seconds: 8,
  },
  {
    media_id: 'm-002',
    title: 'KAYAN EV Awareness Video',
    type: 'video',
    status: 'pending',
    organization_id: 3,
    organization_name: 'KAYAN FOR EV CHARGING SERVICES',
    uploaded_by: 'Shadi Karadsheh',
    created_at: '2025-06-01T11:30:00Z',
    url: '',
    duration_seconds: 30,
  },
  {
    media_id: 'm-003',
    title: 'Go Station Promo',
    type: 'image',
    status: 'rejected',
    organization_id: 10,
    organization_name: 'Go',
    uploaded_by: 'GoGo Gogo',
    rejection_reason: 'Poor image quality – minimum 1080p required',
    created_at: '2025-05-28T14:00:00Z',
    url: 'https://d70mlvzyd1bhv.cloudfront.net/map_assets/go.png',
    duration_seconds: 6,
  },
  {
    media_id: 'm-004',
    title: 'Orange EV Partnership Banner',
    type: 'image',
    status: 'approved',
    organization_id: 1100,
    organization_name: 'Orange',
    uploaded_by: 'Waleed Nabulsi',
    created_at: '2025-06-03T08:00:00Z',
    url: 'https://1000logos.net/wp-content/uploads/2017/04/Orange-Logo.png',
    duration_seconds: 10,
  },
  {
    media_id: 'm-005',
    title: 'Arab Bank Charging Sponsorship',
    type: 'video',
    status: 'pending',
    organization_id: 2002,
    organization_name: 'Arab Bank',
    uploaded_by: 'Moath Hamaideh',
    created_at: '2025-06-05T10:00:00Z',
    url: '',
    duration_seconds: 45,
  },
  {
    media_id: 'm-006',
    title: 'KAYAN Station',
    type: 'image',
    status: 'approved',
    organization_id: 3,
    organization_name: 'KAYAN FOR EV CHARGING SERVICES',
    uploaded_by: 'Shadi Karadsheh',
    created_at: '2025-05-20T07:00:00Z',
    url: 'https://images.deliveryhero.io/image/hungerstation/restaurant/logo/0d489b86aa33e21448c382fb21d0c01e.jpg',
    duration_seconds: 8,
  },
]

export const MOCK_CHARGERS = [
  { charger_id: 'CHG-001', name: 'Charger Bay 1', location: 'Main Lot', status: 'online', active_session: true, last_seen: '2025-06-05T12:59:00Z' },
  { charger_id: 'CHG-002', name: 'Charger Bay 2', location: 'Main Lot', status: 'available', active_session: false, last_seen: '2025-06-05T12:55:00Z' },
  { charger_id: 'CHG-003', name: 'Charger Bay 3', location: 'North Wing', status: 'offline', active_session: false, last_seen: '2025-06-05T10:00:00Z' },
]

export const MOCK_SCREENS = [
  { screen_id: 'SCR-001', charger_id: 'CHG-001', status: 'online', uptime_seconds: 86400, last_heartbeat: '2025-06-05T12:59:00Z' },
  { screen_id: 'SCR-002', charger_id: 'CHG-002', status: 'online', uptime_seconds: 43200, last_heartbeat: '2025-06-05T12:58:45Z' },
  { screen_id: 'SCR-003', charger_id: 'CHG-003', status: 'error', uptime_seconds: 0, last_heartbeat: '2025-06-05T10:00:00Z' },
]
