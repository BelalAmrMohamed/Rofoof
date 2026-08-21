// web/src/features/onboarding/components/MapPicker.tsx
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { GeoPoint } from '../types/location';

interface MapPickerProps {
  point: GeoPoint | null;
  onPick: (point: GeoPoint) => void;
  centerHint?: GeoPoint;
  className?: string;
}

const DEFAULT_CENTER: GeoPoint = { lat: 30.0444, lng: 31.2357 };

export function MapPicker({ point, onPick, centerHint, className = '' }: MapPickerProps) {
  const center = centerHint ?? DEFAULT_CENTER;

  return (
    <div className={`relative h-64 w-full overflow-hidden rounded-2xl border border-gold/20 ${className}`}>
      <MapContainer center={[point?.lat ?? center.lat, point?.lng ?? center.lng]} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onPick={onPick} />
        {point && <CircleMarker center={[point.lat, point.lng]} radius={9} pathOptions={{ color: '#0b1f14', fillColor: '#c49a3c', fillOpacity: 1, weight: 3 }} />}
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-lg bg-white/90 px-3 py-2 text-center text-xs font-bold text-[#2a1e0c] shadow-sm">اضغط على الخريطة لتحديد الموقع</div>
    </div>
  );
}

function MapClickHandler({ onPick }: { onPick: (point: GeoPoint) => void }) {
  useMapEvents({ click: ({ latlng }) => onPick({ lat: latlng.lat, lng: latlng.lng }) });
  return null;
}
