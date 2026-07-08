import { haversineKm, type LatLng, type RatesByOrigin } from './nearbyRates'
import type { CasaReputation } from './casasDirectory'

export interface RankedCasa<T> {
  branch: T
  casa: CasaReputation
  distanceKm: number
  rate: number
  score: number
}

const NEUTRAL_RATING = 3
const WEIGHT_RATE = 0.45
const WEIGHT_DISTANCE = 0.35
const WEIGHT_RATING = 0.2

/**
 * Ranks casas de cambio (never bancos/fintechs) near the user by a blended
 * score of rate, distance and Google rating. Excludes any branch whose
 * origin has no CASAS_REPUTATION entry, or whose entry isn't category:'casa'
 * — fail closed so a bank/fintech is never shown as a casa de cambio.
 * Dedupes multiple branches of the same casa down to its nearest one.
 */
export function rankNearbyCasas<T extends { origin: string; lat: number; lng: number }>(
  branches: T[],
  reputations: CasaReputation[],
  rates: RatesByOrigin,
  user: LatLng,
  radiusKm: number,
  currency: string,
  direction: 'buy' | 'sell'
): RankedCasa<T>[] {
  const casaByCode = new Map(reputations.filter(r => r.category === 'casa').map(r => [r.code, r]))

  const nearestByOrigin = new Map<string, { branch: T; distanceKm: number; rate: number }>()
  for (const b of branches || []) {
    if (!casaByCode.has(b.origin)) continue
    const distanceKm = haversineKm(user, { lat: b.lat, lng: b.lng })
    if (distanceKm > radiusKm) continue
    const rate = rates[b.origin]?.[currency]?.[direction]
    if (rate == null || !(rate > 0)) continue
    const prev = nearestByOrigin.get(b.origin)
    if (!prev || distanceKm < prev.distanceKm) {
      nearestByOrigin.set(b.origin, { branch: b, distanceKm, rate })
    }
  }

  const entries = [...nearestByOrigin.entries()]
  if (entries.length === 0) return []

  const rateValues = entries.map(([, e]) => e.rate)
  const distanceValues = entries.map(([, e]) => e.distanceKm)
  const bestRate = direction === 'buy' ? Math.max(...rateValues) : Math.min(...rateValues)
  const worstRate = direction === 'buy' ? Math.min(...rateValues) : Math.max(...rateValues)
  const rateSpan = Math.abs(bestRate - worstRate)
  const minDistance = Math.min(...distanceValues)
  const maxDistance = Math.max(...distanceValues)
  const distanceSpan = maxDistance - minDistance

  const scored: RankedCasa<T>[] = entries.map(([origin, e]) => {
    const casa = casaByCode.get(origin)!
    const rateScore = rateSpan === 0 ? 1 : 1 - Math.abs(bestRate - e.rate) / rateSpan
    const distanceScore = distanceSpan === 0 ? 1 : 1 - (e.distanceKm - minDistance) / distanceSpan
    const ratingScore = (casa.googleRating ?? NEUTRAL_RATING) / 5
    const score =
      rateScore * WEIGHT_RATE + distanceScore * WEIGHT_DISTANCE + ratingScore * WEIGHT_RATING
    return { branch: e.branch, casa, distanceKm: e.distanceKm, rate: e.rate, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored
}
