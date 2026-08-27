// web/src/components/MosqueMap.tsx
// Interactive Leaflet map showing every mosque with known coordinates, not
// just the one being viewed — lets people browse nearby mosques directly
// from a mosque's detail page instead of going back to Browse. The map
// initially centers/zooms on `focusMosqueId` and renders it with a larger,
// gold-filled marker so it's easy to spot among the rest.
//
// Uses CircleMarkers (SVG) rather than Leaflet's default image-based marker
// icon — this avoids the well-known Leaflet + Vite bundling issue where the
// default marker icon URLs resolve incorrectly and render as broken images.
import { useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'

export type MosqueMapPoint = {
  id: string
  lat: number
  lng: number
  label: string
  image?: string | null
}

function externalMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}

export function MosqueMap({
  points, focusMosqueId, className = '',
}: {
  points: MosqueMapPoint[]
  focusMosqueId: string
  className?: string
}) {
  const focus = useMemo(() => points.find((p) => p.id === focusMosqueId) ?? points[0], [points, focusMosqueId])

  if (!focus) return null

  return (
    <div className={`mosque-map ${className}`}>
      <MapContainer center={[focus.lat, focus.lng]} zoom={13} scrollWheelZoom={true} className="mosque-map-container">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p) => {
          const isFocus = p.id === focusMosqueId
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={isFocus ? 11 : 7}
              pathOptions={
                isFocus
                  ? { color: '#0b1f14', fillColor: '#c49a3c', fillOpacity: 1, weight: 3 }
                  : { color: '#146654', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }
              }
            >
              <Popup minWidth={220} maxWidth={220} className="mosque-map-popup">
                {p.image && <img src={p.image} alt={p.label} className="mosque-map-popup-image" />}
                <strong className="mosque-map-popup-title">{p.label}</strong>
                <span className="mosque-map-popup-links">
                  {!isFocus && <a href={`/mosques/${p.id}`} className="mosque-map-popup-link">عرض صفحة المسجد ←</a>}
                  <a href={externalMapUrl(p.lat, p.lng)} target="_blank" rel="noreferrer" className="mosque-map-popup-link">
                    فتح في خرائط أكبر ←
                  </a>
                </span>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      <a className="mosque-map-external-link" href={externalMapUrl(focus.lat, focus.lng)} target="_blank" rel="noreferrer">
        فتح في خرائط أكبر
      </a>
    </div>
  )
}