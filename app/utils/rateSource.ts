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
