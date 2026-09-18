// El tasador de /cuanto-vale-mi-auto-uruguay y la guía de /vender-mi-auto-uruguay.
//
// No es una tasación: es cuánto PIDEN hoy por autos como el tuyo, corregido por kilómetros. Lo que te
// van a pagar es otra cosa —una automotora que te lo toma, por ejemplo, ofrece menos que el precio de
// sus propios avisos— y ese dato no lo tenemos, así que la página no lo inventa.
import type { PublicCarMarketRow, PublicCarMarketSnapshot, PublicCarValuation } from './carsPublic'

export const CAR_VALUATION_PATH = '/cuanto-vale-mi-auto-uruguay'
export const CAR_SELL_PATH = '/vender-mi-auto-uruguay'
/** Avisos mínimos de la cohorte para dar un número. */
export const CAR_VALUATION_MIN_SAMPLE = 5
/** El ajuste por kilómetros no se estira más que esto: más allá es extrapolar. */
export const CAR_VALUATION_MAX_KM_ADJUSTMENT = 0.25

export interface CarValuationRequest {
  year: number
  km: number | null
  /** Versión, motor y caja de una fila de la cohorte, si la persona la eligió. */
  rowKey: string | null
}

export interface CarValuationEstimate {
  basis: 'version' | 'year'
  row: PublicCarMarketRow
  /** Por cuánto se multiplicaron los precios de la cohorte para llevarlos a tus kilómetros. */
  kmFactor: number
  kmCapped: boolean
  low: number
  mid: number
  high: number
  /** Los tres precios de publicación, redondeados como redondea el mercado. */
  suggested: { quick: number; market: number; ceiling: number }
}

export const carValuationRowKey = (
  row: Pick<PublicCarMarketRow, 'trim' | 'engine' | 'transmission'>
): string => [row.trim ?? '', row.engine ?? '', row.transmission ?? ''].join('|')

/** Los años del modelo que tienen avisos suficientes para dar un número. */
export const carValuationYears = (market: PublicCarMarketSnapshot): number[] =>
  market.years
    .filter(row => row.n >= CAR_VALUATION_MIN_SAMPLE)
    .map(row => row.year)
    .sort((a, b) => b - a)

/** Las versiones de ese año con cohorte propia. */
export const carValuationVersions = (
  market: PublicCarMarketSnapshot,
  year: number
): PublicCarMarketRow[] =>
  market.rows.filter(row => row.year === year && row.n >= CAR_VALUATION_MIN_SAMPLE)

/**
 * El precio más cercano entre los que el mercado usa: terminado en 900, 500 o 990. Medido el
 * 2026-09-19: el 60 % de los avisos termina así (900 el 23 %, 500 el 20 %, 990 el 18 %).
 */
export function carMarketPrice(value: number): number {
  if (!(value > 0)) return 0
  const base = Math.floor(value / 1000)
  const candidates: number[] = []
  for (let thousand = base - 1; thousand <= base + 1; thousand++) {
    candidates.push(thousand * 1000 - 100, thousand * 1000 + 500, thousand * 1000 - 10)
  }
  return candidates
    .filter(candidate => candidate > 0)
    .reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value) ||
      (Math.abs(candidate - value) === Math.abs(best - value) && candidate < best)
        ? candidate
        : best
    )
}

export function estimateCarValue(
  market: PublicCarMarketSnapshot,
  coefficients: PublicCarValuation | null,
  request: CarValuationRequest
): CarValuationEstimate | null {
  const version = request.rowKey
    ? carValuationVersions(market, request.year).find(
        row => carValuationRowKey(row) === request.rowKey
      )
    : undefined
  const yearRow = market.years.find(
    row => row.year === request.year && row.n >= CAR_VALUATION_MIN_SAMPLE
  )
  const row = version ?? yearRow
  if (!row) return null

  let kmFactor = 1
  let kmCapped = false
  const perTenThousand = coefficients?.km.value ?? null
  if (request.km !== null && request.km >= 0 && perTenThousand !== null && row.kmMedian > 0) {
    const raw = (1 - perTenThousand) ** ((request.km - row.kmMedian) / 10_000)
    const floor = 1 - CAR_VALUATION_MAX_KM_ADJUSTMENT
    const ceiling = 1 + CAR_VALUATION_MAX_KM_ADJUSTMENT
    kmFactor = Math.min(ceiling, Math.max(floor, raw))
    kmCapped = kmFactor !== raw
  }
  const low = Math.round(row.p25 * kmFactor)
  const mid = Math.round(row.median * kmFactor)
  const high = Math.round(row.p75 * kmFactor)
  return {
    basis: version ? 'version' : 'year',
    row,
    kmFactor,
    kmCapped,
    low,
    mid,
    high,
    suggested: {
      quick: carMarketPrice(low),
      market: carMarketPrice(mid),
      ceiling: carMarketPrice(high),
    },
  }
}

/** Cuánto pierde el auto por cada año que pasa, en dólares, sobre el precio estimado. */
export const carValuationYearlyLoss = (mid: number, annualDrop: number | null): number | null =>
  annualDrop === null ? null : Math.round(mid * annualDrop)
