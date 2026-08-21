// web/src/lib/geocode.ts
// Reverse geocoding via Nominatim (OpenStreetMap) — free, no API key required.
// Rate limit: 1 req/sec. We debounce in callers; this module is stateless.

export interface GeocodedLocation {
  country: string   // Arabic country name matched against our COUNTRIES list, or raw from Nominatim
  state: string     // Governorate / State
  city: string      // City / Suburb / Town
  raw: {
    country_code: string
    display_name: string
  }
}

// Our canonical Arabic country names — matched by country_code from Nominatim
const COUNTRY_CODE_MAP: Record<string, string> = {
  eg: 'مصر',
  sa: 'السعودية',
  ae: 'الإمارات',
  ma: 'المغرب',
  dz: 'الجزائر',
  tn: 'تونس',
  ly: 'ليبيا',
  sd: 'السودان',
  jo: 'الأردن',
  ps: 'فلسطين',
  sy: 'سوريا',
  lb: 'لبنان',
  iq: 'العراق',
  ye: 'اليمن',
  kw: 'الكويت',
  qa: 'قطر',
  bh: 'البحرين',
  om: 'عُمان',
  pk: 'باكستان',
  tr: 'تركيا',
  id: 'إندونيسيا',
  my: 'ماليزيا',
  so: 'الصومال',
  mr: 'موريتانيا',
  ml: 'مالي',
  ni: 'النيجر',
  sn: 'السنغال',
  gm: 'غامبيا',
  km: 'جزر القمر',
  dj: 'جيبوتي',
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RoofAlMasajid/1.0 (https://rofoof-almasajid.vercel.app)' },
    })
    if (!res.ok) return null
    const data = await res.json() as {
      address: {
        country?: string
        country_code?: string
        state?: string
        governorate?: string
        province?: string
        city?: string
        town?: string
        village?: string
        suburb?: string
        county?: string
      }
      display_name?: string
    }

    const addr = data.address
    const countryCode = addr.country_code?.toLowerCase() ?? ''
    const country = COUNTRY_CODE_MAP[countryCode] ?? addr.country ?? ''
    const state = addr.governorate ?? addr.state ?? addr.province ?? addr.county ?? ''
    const city = addr.city ?? addr.town ?? addr.suburb ?? addr.village ?? ''

    return {
      country,
      state,
      city,
      raw: {
        country_code: countryCode,
        display_name: data.display_name ?? '',
      },
    }
  } catch {
    return null
  }
}
