import { haversineKm } from './nearbyRates'
/** Distances from a publisher's approximate point, never an inferred home entrance. */
export const PROPERTY_NEARBY_CATEGORIES = [
  'supermarket',
  'grocery',
  'pharmacy',
  'healthcare',
  'transit',
  'education',
] as const
export type PropertyNearbyCategory = (typeof PROPERTY_NEARBY_CATEGORIES)[number]
export type PropertyNearbyOperation = 'rent' | 'sale'
export interface PropertyNearbyOrigin {
  lat: number
  lng: number
  precision: 'approximate'
  basis: 'published_point'
}
export interface PropertyNearbyItem {
  id: string
  name: string | null
  lat: number
  lng: number
  distanceM: number
  pointKind: 'node' | 'area_center'
  osmUrl: string
  walkingUrl: string
}
export interface PropertyNearbyResponse {
  status: 'ready' | 'stale' | 'unlocated' | 'unavailable'
  operation: PropertyNearbyOperation
  key: string
  origin: PropertyNearbyOrigin | null
  radiusM: 1000
  distanceMethod: 'straight_line'
  coverage: 'partial'
  fetchedAt: string | null
  dataAsOf: string | null
  attribution: { text: string; url: string; sourceUrl: string }
  categories: Array<{ id: PropertyNearbyCategory; items: PropertyNearbyItem[]; hasMore: boolean }>
  retryAfterSeconds?: number
}
export const PROPERTY_NEARBY_ATTRIBUTION = {
  text: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
  sourceUrl: 'https://download.geofabrik.de/south-america/uruguay.html',
} as const
export function propertyNearbyOrigin(lat: unknown, lng: unknown): PropertyNearbyOrigin | null {
  return typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -35.5 &&
    lat <= -30 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -58.6 &&
    lng <= -53
    ? { lat, lng, precision: 'approximate', basis: 'published_point' }
    : null
}
export function propertyNearbyWalkingUrl(origin: PropertyNearbyOrigin, lat: number, lng: number) {
  const query = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${lat},${lng}`,
    travelmode: 'walking',
  })
  return `https://www.google.com/maps/dir/?${query}`
}
/** Missing ownership evidence must not turn an old group coordinate into a precise new promise. */
export function rentalNearbyOrigin(row: {
  latitude?: unknown
  longitude?: unknown
  offers?: Array<{
    identity?: {
      version?: unknown
      latitude?: unknown
      longitude?: unknown
      addressHidden?: unknown
    }
  }>
}): PropertyNearbyOrigin | null {
  const point = propertyNearbyOrigin(row.latitude, row.longitude)
  if (!point) return null
  const visiblePoints =
    row.offers?.flatMap(({ identity }) => {
      const own =
        identity?.version === 1 && identity.addressHidden !== true
          ? propertyNearbyOrigin(identity.latitude, identity.longitude)
          : null
      return own ? [own] : []
    }) || []
  if (visiblePoints.some(own => haversineKm(point, own) > 0.1)) return null
  return row.offers?.some(
    ({ identity }) =>
      identity?.version === 1 &&
      identity.addressHidden !== true &&
      identity.latitude === point.lat &&
      identity.longitude === point.lng
  )
    ? point
    : null
}
export function propertyNearbyDataState(
  dataAsOf: unknown,
  now = Date.now()
): 'ready' | 'stale' | 'unavailable' {
  const at = typeof dataAsOf === 'string' ? Date.parse(dataAsOf) : NaN
  const age = now - at
  if (!Number.isFinite(at) || age < -86_400_000 || age > 45 * 86_400_000) return 'unavailable'
  return age > 14 * 86_400_000 ? 'stale' : 'ready'
}
/** Allowlist persisted POI fields; never expose OSM contributor metadata or arbitrary tags. */
export function publicPropertyNearbyItem(
  row: Record<string, unknown>,
  origin: PropertyNearbyOrigin
): PropertyNearbyItem | null {
  const id =
    typeof row.id === 'string' && /^(?:node|way)\/[1-9]\d{0,18}$/.test(row.id) ? row.id : null
  const location = row.location as { coordinates?: unknown[] } | undefined
  const point = propertyNearbyOrigin(location?.coordinates?.[1], location?.coordinates?.[0])
  const distance = row.distanceM
  if (
    !id ||
    !point ||
    typeof distance !== 'number' ||
    !Number.isFinite(distance) ||
    distance < 0 ||
    distance > 1000 ||
    (row.pointKind !== 'node' && row.pointKind !== 'area_center')
  )
    return null
  return {
    id,
    name: typeof row.name === 'string' ? row.name.slice(0, 160) || null : null,
    lat: point.lat,
    lng: point.lng,
    distanceM: Math.round(distance),
    pointKind: row.pointKind,
    osmUrl: `https://www.openstreetmap.org/${id}`,
    walkingUrl: propertyNearbyWalkingUrl(origin, point.lat, point.lng),
  }
}
export function emptyPropertyNearby(
  operation: PropertyNearbyOperation,
  key: string,
  origin: PropertyNearbyOrigin | null,
  status: PropertyNearbyResponse['status']
): PropertyNearbyResponse {
  return {
    status,
    operation,
    key,
    origin,
    radiusM: 1000,
    distanceMethod: 'straight_line',
    coverage: 'partial',
    fetchedAt: null,
    dataAsOf: null,
    attribution: { ...PROPERTY_NEARBY_ATTRIBUTION },
    categories: PROPERTY_NEARBY_CATEGORIES.map(id => ({ id, items: [], hasMore: false })),
  }
}
