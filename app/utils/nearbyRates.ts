export interface LatLng {
  lat: number
  lng: number
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371 // km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type RateLite = { buy: number | null; sell: number | null }
export type RatesByOrigin = Record<string, Record<string, RateLite>>

export function buildRatesByOrigin(
  rows: Array<{ origin: string; code: string; buy: number | null; sell: number | null }>
): RatesByOrigin {
  const out: RatesByOrigin = {}
  for (const r of rows || []) {
    if (!r || !r.origin || !r.code) continue
    if (!out[r.origin]) out[r.origin] = {}
    out[r.origin][r.code] = { buy: r.buy ?? null, sell: r.sell ?? null }
  }
  return out
}

export interface RankedBranch<T> {
  branch: T
  distanceKm: number
  rate: number
}

export function rankNearby<T extends { origin: string; lat: number; lng: number }>(
  branches: T[],
  rates: RatesByOrigin,
  user: LatLng,
  radiusKm: number,
  currency: string,
  direction: 'buy' | 'sell'
): RankedBranch<T>[] {
  const out: RankedBranch<T>[] = []
  for (const b of branches || []) {
    const distanceKm = haversineKm(user, { lat: b.lat, lng: b.lng })
    if (distanceKm > radiusKm) continue
    const rate = rates[b.origin]?.[currency]?.[direction]
    if (rate == null || !(rate > 0)) continue
    out.push({ branch: b, distanceKm, rate })
  }
  out.sort((x, y) => (direction === 'buy' ? y.rate - x.rate : x.rate - y.rate))
  return out
}
