// app/utils/travelerBaggageRules.ts
//
// Rules for Uruguay's traveler personal-baggage customs franchise ("franquicia de
// equipaje de viajero") — the regime for goods physically carried by a traveler
// through a border crossing (e.g. Aeropuerto de Carrasco). This is a DIFFERENT regime
// from `importRules.ts` (courier/postal shipments bought online): different law,
// different traveler, no despachante de aduana required.
//
// EVERY NUMBER HERE IS SOURCED. Verified against primary sources on 2026-07-12:
//   - Ley 19.276 (Código Aduanero) arts. 132-133, 211
//     https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/133
//     https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/211
//   - Decreto 139/014 (19/05/2014) art. 9 y 13
//     https://www.impo.com.uy/bases/decretos-internacional/139-2014/1
//   - Decreto 43/019 (05/02/2019) — modificación del régimen a US$ 500
//     https://www.impo.com.uy/bases/decretos/43-2019
//   - gub.uy trámite (verificado 2026-07-12)
//     https://www.gub.uy/tramites/equipaje-viajeros-gestion-franquicia-equipaje
//
// DO NOT cite "Decreto 49/019" for this regime. A page on aduanas.gub.uy does, but
// it's a citation bug on Aduanas' own site: Decreto 49/019 is an unrelated Ministerio
// de Transporte decree about toll-staff compensation, confirmed directly against IMPO
// 2026-07-12. Same staleness/data-quality pattern already documented for
// /advertencias-bcu (the Kredimio/Remesas Tres Cruces shared-source bug).
//
// The franchise amount does NOT differentiate resident vs. tourist — confirmed twice,
// independently, against the current gub.uy page. Several aduanas.gub.uy pages from
// 2014 still show an old tiered-by-origin split (300 MERCOSUR / 500 rest-of-world);
// that split predates Decreto 43/019 and no longer applies.

/** Date the facts below were last verified against primary sources. */
export const LAST_RESEARCHED = '2026-07-12'

/** Franchise for air/maritime entry (e.g. Aeropuerto de Carrasco), in USD. Decreto 43/019. */
export const FRANCHISE_AIR_SEA_USD = 500

/** Franchise for land-border entry, in USD — lower than air/sea. Decreto 43/019. */
export const FRANCHISE_LAND_USD = 300

/** Flat tax rate applied to the value EXCEEDING the franchise (Decreto 139/014 art. 13). */
export const EXCESS_TAX_RATE_PCT = 50

/** Where the traveler is entering the country from. Drives which franchise amount applies. */
export type EntryMode = 'air-sea' | 'land'

export interface BaggageTaxInput {
  entryMode: EntryMode
  /** Declared value in USD of everything being brought in, beyond personal-use items. */
  valueUsd: number
}

export interface BaggageTaxResult {
  entryMode: EntryMode
  franchiseUsd: number
  valueUsd: number
  withinFranchise: boolean
  excessUsd: number
  taxUsd: number
}

/** The franchise amount for a given entry mode. */
export function franchiseFor(entryMode: EntryMode): number {
  return entryMode === 'air-sea' ? FRANCHISE_AIR_SEA_USD : FRANCHISE_LAND_USD
}

/**
 * Resolve the tax owed on declared baggage value, given the entry mode.
 *
 * Only the EXCESS over the franchise is taxed, not the full value (Decreto 139/014
 * art. 13: "alícuota del 50% sobre el valor que exceda dichos límites") — the same
 * kind of "tax the whole thing" mistake `importRules.ts` had to fix for the courier
 * regime is easy to make here too.
 */
export function resolveBaggageTax(input: BaggageTaxInput): BaggageTaxResult {
  const franchiseUsd = franchiseFor(input.entryMode)
  const valueUsd = Math.max(input.valueUsd || 0, 0)
  const withinFranchise = valueUsd <= franchiseUsd
  const excessUsd = withinFranchise ? 0 : valueUsd - franchiseUsd
  const taxUsd = (excessUsd * EXCESS_TAX_RATE_PCT) / 100

  return { entryMode: input.entryMode, franchiseUsd, valueUsd, withinFranchise, excessUsd, taxUsd }
}
