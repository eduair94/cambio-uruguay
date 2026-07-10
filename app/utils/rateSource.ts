// Single source of truth for "is this a price the public can actually transact
// at?" — used by the home headline price, the quick converter and the tool
// currency conversions so none of them ever quote a rate nobody can obtain.
//
// PURE functions (no Vue/Nuxt runtime) so they are unit-testable in plain Node.
//
// Excluded from a "public" price:
//   - the BCU official reference (origin `bcu`): the Banco Central's published
//     rate, not a casa de cambio you can buy/sell at.
//   - the wholesale / interbank quotes (INTERBANCARIO, PROMED.FONDO, CABLE):
//     reference prices between banks, not offered to a person.
// Kept: plain/cash (''), BILLETE and eBROU — all obtainable by the public.
import type { ExchangeType } from '../types/api'

/** Origin id of the Banco Central reference quote (official, not a casa). */
export const BCU_ORIGIN = 'bcu'

/** Wholesale / interbank quote types that are NOT obtainable by the public. */
export const NON_PUBLIC_TYPES: ReadonlySet<string> = new Set<ExchangeType>([
  'INTERBANCARIO',
  'PROMED.FONDO',
  'CABLE',
])

/** Minimal shape needed to classify a quote — `type` may be absent on enriched rows. */
export interface RateOriginType {
  origin: string
  type?: ExchangeType | string | null
}

/**
 * True when a quote is a price the public can actually transact at — i.e. not
 * the BCU official reference and not a wholesale/interbank type.
 */
export function isPublicRate(row: RateOriginType): boolean {
  return row.origin !== BCU_ORIGIN && !NON_PUBLIC_TYPES.has(row.type ?? '')
}

/** Filter a rate list down to public-obtainable quotes (see {@link isPublicRate}). */
export function publicRates<T extends RateOriginType>(rows: readonly T[]): T[] {
  return rows.filter(isPublicRate)
}

/** Minimal shape needed to quote one origin's price for one currency. */
export interface OriginRateRow extends RateOriginType {
  code: string
  buy: number
  sell: number
}

/**
 * Type preference when an origin quotes the same currency several ways: the
 * plain cash quote (`''`) is the walk-in rate, `BILLETE` is the bank
 * equivalent, anything else (EBROU, ewallet promos, ...) applies only under
 * conditions, so it ranks last.
 */
const typeRank = (t: string): number => (t === '' ? 0 : t === 'BILLETE' ? 1 : 2)

/**
 * The headline quote a single origin publishes for `code` — the number safe to
 * put in that origin's page title, meta description or answer block.
 *
 * The `/api` payload is one flat array of every casa's rows, ungrouped, so the
 * `origin` filter is what keeps `/historico/itau` from quoting the first USD
 * row in the market. Wholesale types nobody can transact at are dropped, and
 * the remaining rows are ranked by {@link typeRank}.
 *
 * Unlike {@link publicRates} this does NOT drop {@link BCU_ORIGIN}: on the BCU
 * page itself the Banco Central's own reference is the correct thing to quote.
 *
 * @returns the best row for that origin, or `null` when it publishes none
 *   (e.g. BCU quotes UI/UR/UP but no USD) — callers must fall back to prose
 *   rather than invent a number.
 */
export function pickOriginRate<T extends OriginRateRow>(
  rows: readonly T[],
  origin: string,
  code = 'USD'
): T | null {
  const candidates = rows.filter(
    r =>
      r.origin === origin &&
      r.code === code &&
      r.buy > 0 &&
      r.sell > 0 &&
      !NON_PUBLIC_TYPES.has(r.type ?? '')
  )
  if (!candidates.length) return null

  return candidates.reduce((best, r) =>
    typeRank(r.type ?? '') < typeRank(best.type ?? '') ? r : best
  )
}
