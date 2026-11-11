import { frozenAheadIn, offMarketSide } from './marketOutlier'

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
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type RateLite = { buy: number | null; sell: number | null; frozen?: boolean }
export type RatesByOrigin = Record<string, Record<string, RateLite>>

/**
 * Today's buy and sell of each house, per currency, as /mapa and /casa-de-cambio-cerca-de-mi rank
 * them by distance.
 *
 * One quote per house: its first counter or cash row. The last row used to win, whatever its type,
 * so a branch could be ranked by an eBROU or interbank price it does not charge. And a price the site
 * refuses to crown (utils/marketOutlier.ts), judged against the whole national market, is left null,
 * so no ranking puts it first: near Punta del Este the board frozen since July at 39,55 headed
 * "Mejores cotizaciones cerca" (2026-11-11).
 */
export function buildRatesByOrigin(
  rows: Array<{
    origin: string
    code: string
    type?: string | null
    buy: number | null
    sell: number | null
    frozen?: boolean
  }>
): RatesByOrigin {
  const out: RatesByOrigin = {}
  for (const r of rows || []) {
    if (!r || !r.origin || !r.code || r.origin === 'bcu') continue
    if (r.type && r.type !== 'BILLETE') continue
    if (!out[r.origin]) out[r.origin] = {}
    if (out[r.origin][r.code]) continue
    out[r.origin][r.code] = {
      buy: r.buy ?? null,
      sell: r.sell ?? null,
      ...(r.frozen === true ? { frozen: true } : {}),
    }
  }
  const houses = Object.values(out)
  for (const code of new Set(houses.flatMap(byCode => Object.keys(byCode)))) {
    const market = houses.map(byCode => byCode[code]).filter((q): q is RateLite => !!q)
    const buyOff = offMarketSide(market, code, 'buy')
    const sellOff = offMarketSide(market, code, 'sell')
    for (const byCode of houses) {
      const quote = byCode[code]
      if (!quote) continue
      byCode[code] = {
        ...quote,
        buy: buyOff(quote) ? null : quote.buy,
        sell: sellOff(quote) ? null : quote.sell,
      }
    }
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
  // The national pass above only saw the national best: inside the radius, a frozen board that is
  // merely the best around here would still head "Mejores cotizaciones cerca".
  const quoteOf = (e: RankedBranch<T>) => ({
    [direction]: e.rate,
    frozen: rates[e.branch.origin]?.[currency]?.frozen === true,
  })
  const ahead = frozenAheadIn(out.map(quoteOf), direction)
  return out
    .filter(e => !ahead(quoteOf(e)))
    .sort((x, y) => (direction === 'buy' ? y.rate - x.rate : x.rate - y.rate))
}
