// web/src/features/onboarding/types/location.ts
export type LocationSource = 'auto_detect' | 'manual_pin' | 'skipped';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface UserLocation {
  point: GeoPoint | null;
  source: LocationSource | null;
  governorate: string | null;
  city: string | null;
}

export type OnboardingStep = 'welcome' | 'location';

export type GeolocationStatus = 'idle' | 'locating' | 'success' | 'error' | 'unsupported';

export interface OnboardingResult {
  location: UserLocation;
}
