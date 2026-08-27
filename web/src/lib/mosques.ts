// web/src/lib/mosques.ts
// Lightweight, reusable fetch of every mosque's map-relevant data (id, name,
// location, coordinates, and a single cover image). Used by MosqueMap's
// all-mosques view so the mosque detail page can show every mosque on one
// interactive map, not just the one being viewed.
//
// Deliberately NOT reusing BrowsePage's heavier query — that one also joins
// books, computes book counts, and pulls the *entire* image gallery per
// mosque, which this map doesn't need (it only ever shows one thumbnail per
// marker). Keeping this separate keeps the map's fetch fast and avoids
// coupling it to Browse's state shape.
import { supabase } from './supabase'

export type MapMosque = {
  mosque_id: string
  mosque_name: string | null
  mosque_city: string
  mosque_governorate: string
  mosque_lat: number
  mosque_lng: number
  image: string | null
}

type MosqueRow = {
  mosque_id: string
  mosque_name: string | null
  mosque_city: string
  mosque_governorate: string
  mosque_lat: number | null
  mosque_lng: number | null
  mosque_image: string | null
}

/**
 * Fetch every mosque that has coordinates set, each with a single cover
 * image (first row in mosque_images by sort_order, falling back to the
 * legacy mosques.mosque_image column — same fallback rule Browse uses).
 * Mosques without lat/lng are excluded since they can't be placed on a map.
 */
export async function fetchAllMosquesForMap(): Promise<MapMosque[]> {
  if (!supabase) return []
  const db = supabase
  const [mosquesRes, imagesRes] = await Promise.all([
    db
      .from('mosques')
      .select('mosque_id, mosque_name, mosque_city, mosque_governorate, mosque_lat, mosque_lng, mosque_image')
      .not('mosque_lat', 'is', null)
      .not('mosque_lng', 'is', null)
      .limit(400),
    db
      .from('mosque_images')
      .select('mosque_id, image_url, sort_order')
      .order('sort_order', { ascending: true }),
  ])
  if (mosquesRes.error) throw mosquesRes.error
  if (imagesRes.error) throw imagesRes.error

  // First image per mosque only (already ordered by sort_order).
  const firstImageByMosque: Record<string, string> = {}
  for (const row of (imagesRes.data ?? []) as Array<{ mosque_id: string; image_url: string }>) {
    if (!(row.mosque_id in firstImageByMosque)) firstImageByMosque[row.mosque_id] = row.image_url
  }

  return ((mosquesRes.data ?? []) as MosqueRow[])
    .filter((m): m is MosqueRow & { mosque_lat: number; mosque_lng: number } => m.mosque_lat != null && m.mosque_lng != null)
    .map((m) => ({
      mosque_id: m.mosque_id,
      mosque_name: m.mosque_name,
      mosque_city: m.mosque_city,
      mosque_governorate: m.mosque_governorate,
      mosque_lat: m.mosque_lat,
      mosque_lng: m.mosque_lng,
      image: firstImageByMosque[m.mosque_id] ?? m.mosque_image ?? null,
    }))
}