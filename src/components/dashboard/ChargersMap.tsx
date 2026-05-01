import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import type { Charger } from '@/types/lookups'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export interface ChargerMapPoint {
  charger: Charger
  lat: number
  lng: number
  locationName?: string
  organizationName?: string
}

interface ChargersMapProps {
  points: ChargerMapPoint[]
}

export function ChargersMap({ points }: ChargersMapProps) {
  const { t } = useTranslation()

  return (
    <MapContainer
      center={[31.95, 35.93]}
      zoom={7}
      className="z-0 h-[500px] w-full rounded-md"
      scrollWheelZoom
      attributionControl={false}
    >
      <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.map((p) => {
        const label = p.charger.name?.trim() || p.charger.chargerID?.trim() || String(p.charger.id)
        return (
          <Marker key={p.charger.id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{label}</div>
                <div className="text-muted-foreground">
                  {p.locationName ?? t('common.unknown')} · {p.organizationName ?? t('common.unknown')}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
