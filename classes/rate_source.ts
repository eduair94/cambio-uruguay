// Backend mirror of app/utils/rateSource.ts — the single rule for "is this a
// price the public can actually transact at?". The API (this package) and the
// Nuxt app run under separate tsconfigs and can't share one module, so this is
// a hand-kept copy; change both together.
//
// Excluded from a "public" price:
//   - the BCU official reference (origin `bcu`): the Banco Central's published
//     rate. It is bank-only for EVERY currency, not a casa de cambio anyone can
//     buy/sell at.
//   - wholesale / interbank quote types (INTERBANCARIO, PROMED.FONDO, CABLE):
//     reference prices between banks, never offered to a person.
// Kept: plain/cash ('') and BILLETE — obtainable by the public at a casa.

/** Origin id of the Banco Central reference quote (official, not a casa). */
export const BCU_ORIGIN = "bcu";

/** Wholesale / interbank quote types that are NOT obtainable by the public. */
export const NON_PUBLIC_TYPES: ReadonlySet<string> = new Set<string>(["INTERBANCARIO", "PROMED.FONDO", "CABLE"]);

/** Minimal shape needed to classify a quote. */
export interface RateOriginType {
  origin?: string | null;
  type?: string | null;
}

/**
 * True when a quote is a price the public can actually transact at — i.e. not
 * the BCU official reference and not a wholesale/interbank type.
 */
export function isPublicRate(row: RateOriginType): boolean {
  return row.origin !== BCU_ORIGIN && !NON_PUBLIC_TYPES.has(row.type ?? "");
}

/** Filter a rate list down to public-obtainable quotes (see {@link isPublicRate}). */
export function publicRates<T extends RateOriginType>(rows: readonly T[]): T[] {
  return rows.filter(isPublicRate);
}
