/**
 * DOMAIN LAYER — geography of Tashkent.
 * Approximate centres of the districts used in servicesDatabase.json,
 * so a point on the map can be turned into a district (and back) without
 * any paid geocoding API.
 */
import type { GeoPoint, Master } from './types';

export const TASHKENT_CENTER: GeoPoint = { lat: 41.3111, lng: 69.2797 };

/** Bounding box used by the schematic map. */
export const TASHKENT_BOUNDS = { minLat: 41.19, maxLat: 41.39, minLng: 69.14, maxLng: 69.38 };

export const DISTRICT_CENTERS: Record<string, GeoPoint> = {
  'Яккасарайский': { lat: 41.2875, lng: 69.2560 },
  'Бектемирский': { lat: 41.2090, lng: 69.3340 },
  'Сергелийский': { lat: 41.2240, lng: 69.2180 },
  'Учтепинский': { lat: 41.2950, lng: 69.1800 },
  'Мирзо-Улугбекский': { lat: 41.3300, lng: 69.3350 },
  'Юнусабадский': { lat: 41.3650, lng: 69.2860 },
  'Мирабадский': { lat: 41.2960, lng: 69.2800 },
  'Яшнабадский': { lat: 41.2900, lng: 69.3300 },
  'Чиланзарский': { lat: 41.2750, lng: 69.2050 },
  'Алмазарский': { lat: 41.3520, lng: 69.2250 },
  'Шайхантахурский': { lat: 41.3250, lng: 69.2400 },
  'Олмазорский': { lat: 41.3400, lng: 69.2050 },
  'Янгихаётский': { lat: 41.2050, lng: 69.2450 },
};

/** Distance in km (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest district to a point. */
export function nearestDistrict(p: GeoPoint): string {
  let best = '';
  let bestD = Infinity;
  for (const [name, c] of Object.entries(DISTRICT_CENTERS)) {
    const d = distanceKm(p, c);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

/**
 * Where to put a master on the map:
 *  registered master → their own point;
 *  OLX master → their base district (verified) or their only district.
 *  Masters working "all over the city" without a base are not pinned.
 */
export function masterPoint(m: Master): GeoPoint | null {
  if (m.point) return m.point;
  const d = m.location ?? (m.districts.length === 1 ? m.districts[0] : null);
  const c = d ? DISTRICT_CENTERS[d] : null;
  return c ? { ...c, label: d! } : null;
}
