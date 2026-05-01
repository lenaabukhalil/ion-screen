export interface Organization {
  organization_id: number
  name?: string
  name_ar?: string
}

export interface Location {
  location_id: number
  organization_id?: number
  name?: string
  lat?: number
  lng?: number
}

export interface Charger {
  id: number
  location_id?: number
  name?: string
  chargerID?: string
  is_online?: boolean
  connector_count?: number
}
