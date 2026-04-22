export interface User {
  user_id: number
  organization_id?: number
  role_name?: string
  f_name?: string
  l_name?: string
  email?: string
  mobile?: string
  profile_img_url?: string | null
}
