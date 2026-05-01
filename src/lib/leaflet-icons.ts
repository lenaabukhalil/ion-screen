import L from 'leaflet'
import type { Charger } from '@/types/lookups'

/** Per-charger online state for markers and filters. */
export type ChargerMarkerStatus = 'online' | 'offline' | 'unknown'

export function chargerStatus(c: Charger): ChargerMarkerStatus {
  const v = c.is_online
  if (v === true || v === 1 || v === '1' || v === 'online') return 'online'
  if (v === false || v === 0 || v === '0' || v === 'offline') return 'offline'
  return 'unknown'
}

/**
 * Location marker color: any online → green; else any offline → red; else gray.
 */
export function aggregateLocationMarkerStatus(chargers: Charger[]): ChargerMarkerStatus {
  if (chargers.length === 0) return 'unknown'
  if (chargers.some((c) => chargerStatus(c) === 'online')) return 'online'
  if (chargers.some((c) => chargerStatus(c) === 'offline')) return 'offline'
  return 'unknown'
}

export function markerIconForStatus(status: ChargerMarkerStatus): L.DivIcon {
  const fill = status === 'online' ? '#16a34a' : status === 'offline' ? '#dc2626' : '#6b7280'
  const pulseClass = status === 'online' ? 'charger-map-pin-pulse' : ''
  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="26" height="36" aria-hidden="true"><path fill="${fill}" stroke="#ffffff" stroke-width="1.5" d="M12 1.5C7.5 1.5 4 5 4 9.5c0 6.5 8 16.5 8 16.5s8-10 8-16.5C20 5 16.5 1.5 12 1.5z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>`
  return L.divIcon({
    className: 'charger-map-pin-root',
    html: `<div class="charger-map-pin ${pulseClass}">${pinSvg}</div>`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -34],
  })
}
