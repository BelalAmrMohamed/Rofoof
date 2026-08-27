// web/src/components/MosqueMap.tsx
// Read-only Leaflet map centered on a single point with one marker. Used on
// the mosque full-page view to show where the mosque actually is — unlike
// MapPicker (onboarding/submit), the pin here is fixed and cannot be moved.
//
// Uses a CircleMarker (SVG) rather than Leaflet's default image-based marker
// icon, matching MapPicker's approach — this avoids the well-known
// Leaflet + Vite bundling issue where the default marker icon URLs resolve
// incorrectly and render as broken images.
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'

export function MosqueMap({ lat, lng, label, className = '' }: { lat: number; lng: number; label: string; className?: string }) {
  return (
    <div className={`mosque-map ${className}`}>
      <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={true} className="mosque-map-container">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: '#0b1f14', fillColor: '#c49a3c', fillOpacity: 1, weight: 3 }}>
          <Popup>{label}</Popup>
        </CircleMarker>
      </MapContainer>
      <a
        className="mosque-map-external-link"
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
        target="_blank"
        rel="noreferrer"
      >
        فتح في خرائط أكبر
      </a>
    </div>
  )
}