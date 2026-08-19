// web/src/features/onboarding/components/MapPicker.tsx
import { useCallback, useRef } from 'react';
import type { GeoPoint } from '../types/location';

interface MapPickerProps {
  point: GeoPoint | null;
  onPick: (point: GeoPoint) => void;
  centerHint?: GeoPoint;
  className?: string;
}

const DEFAULT_CENTER: GeoPoint = { lat: 30.0444, lng: 31.2357 };

export function MapPicker({ point, onPick, centerHint, className = '' }: MapPickerProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const center = centerHint ?? DEFAULT_CENTER;

  const handleSurfaceClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const surface = surfaceRef.current;
      if (!surface) return;

      const rect = surface.getBoundingClientRect();
      const xRatio = (event.clientX - rect.left) / rect.width;
      const yRatio = (event.clientY - rect.top) / rect.height;

      const lngSpan = 0.08;
      const latSpan = 0.06;
      const lat = center.lat + (0.5 - yRatio) * latSpan;
      const lng = center.lng + (xRatio - 0.5) * lngSpan;

      onPick({ lat, lng });
    },
    [center, onPick]
  );

  return (
    <div
      ref={surfaceRef}
      onClick={handleSurfaceClick}
      role="button"
      tabIndex={0}
      aria-label="اضغط لتحديد موقعك على الخريطة"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onPick(point ?? center);
        }
      }}
      className={`relative h-64 w-full cursor-crosshair overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-[#112a1c] to-[#1a4530] ${className}`}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(201,168,76,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      <div className="absolute inset-x-3 top-3 flex items-center justify-between text-[11px] font-semibold text-text-3">
        <span>خريطة تفاعلية — عنصر نائب</span>
        <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-gold-light">
          React Leaflet / Mapbox
        </span>
      </div>

      {point && (
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
          style={{ left: '50%', top: '50%' }}
        >
          <svg width="30" height="38" viewBox="0 0 30 38" fill="none" aria-hidden="true">
            <path
              d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23c0-8.3-6.7-15-15-15z"
              fill="#C9A84C"
            />
            <circle cx="15" cy="15" r="6" fill="#0A2E1E" />
          </svg>
        </div>
      )}

      {!point && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-text-2">
          اضغط في أي مكان على الخريطة لوضع دبوس موقعك
        </div>
      )}

      {point && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[rgba(10,46,30,0.75)] px-3 py-2 text-center text-[11px] text-text-2">
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
}
