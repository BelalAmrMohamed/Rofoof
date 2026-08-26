// web/src/features/onboarding/components/MapPicker.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { GeoPoint } from '../types/location';
import { reverseGeocode, searchPlaces } from '../../../lib/geocode';
import type { GeocodedLocation, GeocodeSearchResult } from '../../../lib/geocode';

interface MapPickerProps {
  point: GeoPoint | null;
  onPick: (point: GeoPoint) => void;
  /** Called after reverse geocoding resolves (debounced 800ms after pick) */
  onGeocode?: (result: GeocodedLocation) => void;
  centerHint?: GeoPoint;
  className?: string;
}

// Default center: Cairo, Egypt
const DEFAULT_CENTER: GeoPoint = { lat: 30.0444, lng: 31.2357 };

export function MapPicker({ point, onPick, onGeocode, centerHint, className = '' }: MapPickerProps) {
  const center = centerHint ?? DEFAULT_CENTER;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<GeoPoint | null>(null);

  const runGeocode = useCallback(async (picked: GeoPoint) => {
    if (!onGeocode) return;
    const result = await reverseGeocode(picked.lat, picked.lng);
    if (result) onGeocode(result);
  }, [onGeocode]);

  const handlePick = useCallback((picked: GeoPoint) => {
    onPick(picked);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void runGeocode(picked); }, 800);
  }, [onPick, runGeocode]);

  // Forward geocode as the user types — debounced 400ms, min 3 chars.
  // The <3-char clear is handled in the onChange handler itself (see
  // handleSearchTextChange) so this effect never calls setState synchronously
  // on entry — it only ever schedules the async lookup.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const text = searchText.trim();
    if (text.length < 3) return;
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(text);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchText]);

  const handleSearchTextChange = (value: string) => {
    setSearchText(value);
    setResultsOpen(true);
    if (value.trim().length < 3) { setSearchResults([]); setSearching(false); }
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  const handleSelectResult = (result: GeocodeSearchResult) => {
    const picked = { lat: result.lat, lng: result.lng };
    setSearchText(result.label);
    setResultsOpen(false);
    setSearchResults([]);
    setFlyTo(picked);
    onPick(picked);
    void runGeocode(picked);
  };

  return (
    <div className={`relative h-64 w-full overflow-visible rounded-2xl border border-gold/20 ${className}`}>
      <div className="absolute inset-x-2 top-2 z-[600]">
        <div className="relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearchTextChange(e.target.value)}
            onFocus={() => setResultsOpen(true)}
            onBlur={() => setTimeout(() => setResultsOpen(false), 150)}
            placeholder="ابحث عن عنوان أو مكان..."
            className="h-10 w-full rounded-lg border border-gold/25 bg-white/95 px-3 text-xs font-bold text-[#2a1e0c] shadow-sm outline-none placeholder:font-normal placeholder:text-stone-400 focus:border-gold"
          />
          {resultsOpen && (searching || searchResults.length > 0) && (
            <div className="absolute inset-x-0 top-11 max-h-48 overflow-y-auto rounded-lg border border-gold/20 bg-white shadow-lg">
              {searching && searchResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-stone-400">جارٍ البحث...</div>
              )}
              {searchResults.map((result, i) => (
                <button
                  type="button"
                  key={`${result.lat}-${result.lng}-${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectResult(result)}
                  className="block w-full border-b border-stone-100 px-3 py-2 text-right text-xs text-[#2a1e0c] last:border-0 hover:bg-gold/10"
                >
                  {result.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <MapContainer center={[point?.lat ?? center.lat, point?.lng ?? center.lng]} zoom={12} scrollWheelZoom className="h-full w-full !overflow-hidden !rounded-2xl">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onPick={handlePick} />
        <FlyToPoint point={flyTo} />
        {point && <CircleMarker center={[point.lat, point.lng]} radius={9} pathOptions={{ color: '#0b1f14', fillColor: '#c49a3c', fillOpacity: 1, weight: 3 }} />}
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-white/90 px-3 py-2 text-center text-xs font-bold text-[#2a1e0c] shadow-sm">ابحث عن عنوان أو اضغط على الخريطة لتحديد الموقع</div>
    </div>
  );
}

function MapClickHandler({ onPick }: { onPick: (point: GeoPoint) => void }) {
  useMapEvents({ click: ({ latlng }) => onPick({ lat: latlng.lat, lng: latlng.lng }) });
  return null;
}

// Recenters/zooms the map when a search result is picked, without fighting
// user-driven pans/zooms the rest of the time (only reacts to `point` changes).
function FlyToPoint({ point }: { point: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], 15, { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.lat, point?.lng]);
  return null;
}