// app/utils/importRules.ts
// Effective-dated rules for Uruguay's personal-import regime (envíos postales
// internacionales / courier "puerta a puerta"), resolved from a date instead of
// hard-coded — the same pattern as `ivaStatus.ts`.
//
// WHY THIS EXISTS: the regime was rewritten in 2026 (Ley 20.446 → Decreto 50/026 →
// RG DNA 09/2026), and one of its conditions is on a clock that has ALREADY been
// postponed twice. A bare constant cannot express "true today, false on 1 October",
// so the calculator silently keeps applying a rule after it stops being true. It
// was doing exactly that.
//
// EVERY NUMBER HERE IS SOURCED. Verified against primary sources on 2026-07-11:
//   - Ley 20.446 art. 627        https://www.impo.com.uy/bases/leyes/20446-2025/627
//   - Decreto 50/026 (19/03/2026) https://www.impo.com.uy/bases/decretos/50-2026
//   - RG DNA 09/2026 (20/04/2026) https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf
//   - RG DNA 21/2026 (25/06/2026) https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf
//   - TIFA, Ley 18.761 art. 7 (g) https://www.impo.com.uy/bases/leyes-internacional/18761-2011
//   - FAQ MEF (24/04/2026)        https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias
//
// DO NOT "fix" these against aduanas.gub.uy/innovaportal/v/27950 ("Encomiendas
// Postales"): that page still describes the REPEALED Decreto 356/014 (USD 10 minimum,
// USD 200 per shipment) and will "confirm" the very bugs this module removes.

/** Date the facts below were last verified against primary sources. */
export const LAST_RESEARCHED = '2026-07-11'

/**
 * From this date the IVA exoneration for US shipments additionally requires the INVOICE
 * ISSUER (the seller/platform, NOT the courier) to be registered with the DNA, and LUCIA
 * validates it automatically — no informal grace.
 *
 * Already postponed twice (RG 12/2026 → 2026-07-01; RG 21/2026 → 2026-10-01) and RG 21's
 * own recitals concede that "resta aún cumplir con varias etapas ineludibles", so a third
 * postponement is likely. When it moves, change THIS CONSTANT — nothing else.
 * Source: RG 21/2026 num. 1.
 */
export const SELLER_REGISTRY_ENFORCED_FROM = '2026-10-01'

/** Annual franchise: USD 800 ACCUMULATED per calendar year (Decreto 50/026 art. 3 y 4 lit. c). */
export const FRANCHISE_ANNUAL_USD = 800

/** Franchise shipments: at most 3 per calendar year (Decreto 50/026 art. 4 lit. c). */
export const FRANCHISE_MAX_SHIPMENTS = 3

/** Per-shipment weight ceiling, in kg (Decreto 50/026). */
export const MAX_WEIGHT_KG = 20

/** Simplified single rate, % of the invoice value (Ley 20.446 art. 627). */
export const SIMPLIFIED_RATE_PCT = 60

/**
 * Minimum payable under the simplified regime, per shipment.
 *
 * USD 20 — NOT the USD 10 we shipped for months. The 10 is Decreto 356/014, repealed.
 * Ley 20.446 art. 627: "…con un pago mínimo de US$ 20 (veinte dólares…) por envío", and the
 * MEF's FAQ says the same ("El 60% del valor del envío, con un mínimo de USD 20").
 */
export const SIMPLIFIED_MIN_USD = 20

/**
 * US-origin shipments up to this invoice value keep the IVA exoneration (TIFA, Ley 18.761
 * art. 7 lit. g). ALL-OR-NOTHING: one dollar over and the whole shipment pays IVA — there is
 * no partial exemption. This is the ONLY meaning of "USD 200" in the regime; there is no
 * USD 200 per-shipment franchise cap (that too was Decreto 356/014).
 */
export const USA_IVA_EXEMPTION_USD = 200

/** Which regime a shipment falls under. They are ALTERNATIVE, never combined. */
export type CourierRegime = 'franquicia' | 'simplificado' | 'general'

/** Where the invoice was issued — drives the TIFA exoneration. */
export type ImportOrigin = 'usa' | 'other'

export interface RegimeInput {
  /**
   * The shipment's VALUE for every threshold: the invoice TOTAL, i.e. price + US sales tax +
   * any shipping the SELLER charges on that invoice (Decreto 50/026 art. 5: "el total de la
   * factura original de compra, incluidos todos los conceptos que figuren adicionados en la
   * misma"). The courier's own separately-billed freight is not part of the seller's invoice.
   */
  valueUsd: number
  origin: ImportOrigin
  /** Franchise USD still unused this calendar year. */
  franchiseAvailableUsd: number
  /** Franchise shipments already used this calendar year. */
  shipmentsUsed: number
  /** Whether the reader asked to use their franchise on this shipment. */
  useFranchise: boolean
  /** Is the invoice issuer registered with the DNA? Only consulted once enforcement starts. */
  sellerRegistered?: boolean
  /** Resolution date; defaults to today. Injectable so the rules are testable. */
  today?: Date
}

export interface RegimeDecision {
  regime: CourierRegime
  /** True when this shipment pays no IVA (US-origin, within the TIFA threshold). */
  ivaExempt: boolean
  /** Machine-readable reasons, in the order they were decided. */
  reasons: string[]
  /** Whether the seller-registration condition is being enforced on `today`. */
  registryEnforced: boolean
}

/** YYYY-MM-DD in UTC — date-only strings compare correctly with `<=`. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Is the DNA seller-registration requirement exigible on `today`? */
export function isSellerRegistryEnforced(today: Date): boolean {
  return toISODate(today) >= SELLER_REGISTRY_ENFORCED_FROM
}

/**
 * Decide which regime a shipment falls under, and whether it pays IVA.
 *
 * The three rules that the old code got wrong, all from Decreto 50/026:
 *  - a shipment is NEVER split between franchise and the 60% rate (art. 15: a shipment that
 *    cannot use the franchise goes ENTIRELY to the simplified regime);
 *  - the franchise ceiling is USD 800 ACCUMULATED PER YEAR across at most 3 shipments — there
 *    is no per-shipment cap;
 *  - above USD 800 a shipment fits neither regime and goes to the general one, which this
 *    calculator does not attempt to price.
 */
export function resolveRegime(input: RegimeInput): RegimeDecision {
  const today = input.today ?? new Date()
  const registryEnforced = isSellerRegistryEnforced(today)
  const value = Math.max(input.valueUsd || 0, 0)
  const reasons: string[] = []

  // Neither regime reaches past USD 800 (Decreto arts. 2 y 3): it is a formal import.
  if (value > FRANCHISE_ANNUAL_USD) {
    reasons.push(
      `El envío supera US$ ${FRANCHISE_ANNUAL_USD}: no entra en franquicia ni en el régimen simplificado.`
    )
    return { regime: 'general', ivaExempt: false, reasons, registryEnforced }
  }

  const franchiseFits = input.franchiseAvailableUsd >= value
  const shipmentsLeft = input.shipmentsUsed < FRANCHISE_MAX_SHIPMENTS
  const useFranchise = input.useFranchise && franchiseFits && shipmentsLeft

  if (input.useFranchise && !shipmentsLeft) {
    reasons.push(`Ya usaste los ${FRANCHISE_MAX_SHIPMENTS} envíos con franquicia del año.`)
  }
  if (input.useFranchise && shipmentsLeft && !franchiseFits) {
    reasons.push(
      `Te quedan US$ ${input.franchiseAvailableUsd} de franquicia y el envío vale US$ ${value}: no alcanza, y la franquicia no se puede partir.`
    )
  }

  if (!useFranchise) {
    reasons.push(
      `Paga la prestación única: ${SIMPLIFIED_RATE_PCT}% del valor, mínimo US$ ${SIMPLIFIED_MIN_USD}.`
    )
    return { regime: 'simplificado', ivaExempt: false, reasons, registryEnforced }
  }

  // Franchise: exempt from aranceles, but IVA still applies — except the TIFA carve-out.
  const withinUsaThreshold = input.origin === 'usa' && value <= USA_IVA_EXEMPTION_USD
  const sellerOk = !registryEnforced || input.sellerRegistered === true
  const ivaExempt = withinUsaThreshold && sellerOk

  reasons.push('Entra en la franquicia anual: exenta de aranceles.')
  if (input.origin === 'usa' && value > USA_IVA_EXEMPTION_USD) {
    reasons.push(
      `La exoneración de IVA de EE.UU. es hasta US$ ${USA_IVA_EXEMPTION_USD} y es todo o nada: por US$ ${value} pagás IVA sobre el total.`
    )
  }
  if (withinUsaThreshold && registryEnforced && input.sellerRegistered !== true) {
    reasons.push(
      'Desde el 1/10/2026 la exoneración exige que el vendedor esté registrado ante la Aduana. Si no lo está, el envío paga IVA.'
    )
  }
  if (ivaExempt) reasons.push(`Sin IVA: compra en EE.UU. de hasta US$ ${USA_IVA_EXEMPTION_USD}.`)

  return { regime: 'franquicia', ivaExempt, reasons, registryEnforced }
}
