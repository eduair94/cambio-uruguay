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

/**
 * The subset of regime figures that can move — the amounts the backend tracks as facts, plus the
 * October enforcement date. Passing a `rules` overlay to `resolveRegime` / `isSellerRegistryEnforced`
 * lets the live `/api/aduana` values drive the calculator and the semáforo; the constants above are
 * the baseline fallback, assembled here into `DEFAULT_REGIME_RULES`. `FRANCHISE_MAX_SHIPMENTS` and
 * `MAX_WEIGHT_KG` stay static on purpose — the decree in play changes the date and the amounts, not
 * the 3-envíos / 20-kg structure. This is how the app stays a single source of truth WITHOUT ever
 * calling Gemini (it only reads its own /api/aduana proxy — noGeminiInApp stays green).
 */
export interface RegimeRules {
  franchiseAnnualUsd: number
  simplifiedRatePct: number
  simplifiedMinUsd: number
  usaIvaExemptionUsd: number
  /** YYYY-MM-DD */
  sellerRegistryEnforcedFrom: string
}

export const DEFAULT_REGIME_RULES: RegimeRules = {
  franchiseAnnualUsd: FRANCHISE_ANNUAL_USD,
  simplifiedRatePct: SIMPLIFIED_RATE_PCT,
  simplifiedMinUsd: SIMPLIFIED_MIN_USD,
  usaIvaExemptionUsd: USA_IVA_EXEMPTION_USD,
  sellerRegistryEnforcedFrom: SELLER_REGISTRY_ENFORCED_FROM,
}

/**
 * How the shipment physically arrives. The decree does not distinguish modalities — but the
 * OPERATOR does, and the operator is who decides at the counter.
 *
 *  - `courier`        private door-to-door (DAC, UPS, FedEx, Gripper, Casilla Mía courier, Punto
 *                     Mío, Tiendamia…). The USD 800/3-shipment annual franquicia is the only ceiling.
 *  - `postal-ems`     Correo Uruguayo EMS (Express Mail Service). Tracking starts with E.
 *  - `postal-simple`  Correo Uruguayo NO exprés — the "PP, SIMPLE" modalities. This is where
 *                     AliExpress/Shein/Temu "envío gratis" and most Etsy/eBay standard shipping
 *                     land, and it is the channel our guides used to ignore entirely.
 */
export type ArrivalChannel = 'courier' | 'postal-ems' | 'postal-simple'

/**
 * The per-shipment franquicia ceilings that applied BY MODALITY until 30/04/2026 — and no longer.
 * `null` = no per-shipment ceiling for that channel even under the old regime.
 *
 * They are Decreto 356/014 art. 3 ("entrega no expresa … no supere … U$S 50,00") and art. 4
 * ("entrega expresa … no exceda los U$S 200,00"), DEROGADO by Decreto 50/026 art. 19, whose art.
 * 18 sets the full entry into force at 1/5/2026. The MEF's own comparison table files
 * "US$ 200 (Expreso) / US$ 50 (No expreso)" under "Régimen Actual (Hasta 30/04/2026)" and
 * replaces it with "Tope anual acumulado de US$ 800"; its FAQ adds "No es un tope por compra".
 *
 * WHY THEY ARE STILL HERE, then: two official pages keep publishing them, so readers keep hitting
 * them and believing them —
 *   - Correo Uruguayo, "Cómo declarar su compra u obsequio" (paso 3), still says franquicia only
 *     up to US$ 50 non-express / US$ 200 EMS, contradicting its own paso 4 (self-manage up to
 *     US$ 800), its own current FAQ, and the decree. https://www.correo.com.uy/como-declarar-su-compra-u-obsequio
 *   - DNA's "Encomiendas Postales" glossary (21/10/2025) repeats the same pair plus the US$ 10
 *     minimum.
 * The old regime really did bite: every reported case of "tenía franquicia y me cobraron igual"
 * we found (r/uruguay, oct-2025 — US$ 118 de AliExpress, US$ 75 cobrados; ene-2026 — Etsy Brasil)
 * predates 1/5/2026. We surface the discrepancy and tell the reader what to do if the Correo form
 * still refuses; we do NOT price a repealed rule. Same discipline as the note at the top of this
 * file about the DNA page.
 */
export const LEGACY_CHANNEL_FRANCHISE_CAP_USD: Record<ArrivalChannel, number | null> = {
  courier: null,
  'postal-ems': 200,
  'postal-simple': 50,
}

/** Last day the modality caps above were in force (Decreto 50/026 arts. 18 y 19). */
export const LEGACY_CHANNEL_CAPS_UNTIL = '2026-04-30'

/** Human label per channel, used in the reasons the resolver hands back to the page. */
export const CHANNEL_LABEL: Record<ArrivalChannel, string> = {
  courier: 'courier privado',
  'postal-ems': 'EMS del Correo (exprés)',
  'postal-simple': 'correo no exprés (PP, SIMPLE)',
}

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
  /**
   * How the parcel arrives. Defaults to `'courier'` — the historical behaviour of this module,
   * so every existing caller keeps its result until it opts in.
   */
  channel?: ArrivalChannel
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
  /**
   * Present when the parcel arrives by post and would have BLOWN the repealed modality cap
   * (see {@link LEGACY_CHANNEL_FRANCHISE_CAP_USD}). The regime above is what the norm says; this
   * flag lets the page warn that Correo's declaration page still publishes the old ceiling, so
   * the form may refuse the franquicia and charge the 60% anyway.
   */
  legacyChannelCap?: { channel: ArrivalChannel; capUsd: number }
}

/** YYYY-MM-DD in UTC — date-only strings compare correctly with `<=`. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Is the DNA seller-registration requirement exigible on `today`? Uses the live date if provided. */
export function isSellerRegistryEnforced(
  today: Date,
  rules: RegimeRules = DEFAULT_REGIME_RULES
): boolean {
  return toISODate(today) >= rules.sellerRegistryEnforcedFrom
}

/**
 * Decide which regime a shipment falls under, and whether it pays IVA.
 *
 * The three rules that the old code got wrong:
 *  - a shipment is NEVER split between franchise and the 60% rate (a shipment that cannot use
 *    the franchise goes ENTIRELY to the simplified regime). This is NOT sourced to Decreto
 *    50/026 art. 15 — that article is the incumplimiento/sanción rule, keyed to Ley 20.446
 *    art. 632, and has nothing to do with running out of franchise. No article says this
 *    outright; it follows from the regime's design (the franchise is granted "adicionalmente
 *    al régimen de prestación única", art. 3, and prestación única applies to the invoice
 *    value as a whole, art. 2). Verified 2026-07-12 — do not re-attach art. 15 to this rule;
 *  - the franchise ceiling is USD 800 ACCUMULATED PER YEAR across at most 3 shipments (Decreto
 *    50/026 art. 3 y art. 4 lit. c) — the NORM sets no per-shipment cap;
 *  - above USD 800 a shipment fits neither regime and goes to the general one (Decreto 50/026
 *    arts. 2 y 3), which this calculator does not attempt to price.
 *
 * The modality (express vs non-express) has NO fiscal consequence since 1/5/2026 — Decreto 50/026
 * art. 1 covers "operadores postales, públicos o privados" alike, one regime and one franquicia
 * counter for Correo and for a private courier. Passing `channel` never changes the regime; it
 * only raises {@link RegimeDecision.legacyChannelCap} so the page can warn the reader that the
 * Correo form still publishes the repealed per-modality ceiling.
 */
export function resolveRegime(
  input: RegimeInput,
  rules: RegimeRules = DEFAULT_REGIME_RULES
): RegimeDecision {
  const today = input.today ?? new Date()
  const registryEnforced = isSellerRegistryEnforced(today, rules)
  const value = Math.max(input.valueUsd || 0, 0)
  const reasons: string[] = []

  // Heads-up, never a rule: the modality cap the Correo form may still apply (repealed 30/4/2026).
  const channel = input.channel ?? 'courier'
  const legacyCap = LEGACY_CHANNEL_FRANCHISE_CAP_USD[channel]
  const legacyChannelCap =
    input.useFranchise && legacyCap !== null && value > legacyCap
      ? { channel, capUsd: legacyCap }
      : undefined

  // Neither regime reaches past USD 800 (Decreto arts. 2 y 3): it is a formal import.
  if (value > rules.franchiseAnnualUsd) {
    reasons.push(
      `El envío supera US$ ${rules.franchiseAnnualUsd}: no entra en franquicia ni en el régimen simplificado.`
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
      `Paga la prestación única: ${rules.simplifiedRatePct}% del valor, mínimo US$ ${rules.simplifiedMinUsd}.`
    )
    return { regime: 'simplificado', ivaExempt: false, reasons, registryEnforced, legacyChannelCap }
  }

  // Franchise: exempt from aranceles, but IVA still applies — except the TIFA carve-out.
  const withinUsaThreshold = input.origin === 'usa' && value <= rules.usaIvaExemptionUsd
  const sellerOk = !registryEnforced || input.sellerRegistered === true
  const ivaExempt = withinUsaThreshold && sellerOk

  reasons.push('Entra en la franquicia anual: exenta de aranceles.')
  if (input.origin === 'usa' && value > rules.usaIvaExemptionUsd) {
    reasons.push(
      `La exoneración de IVA de EE.UU. es hasta US$ ${rules.usaIvaExemptionUsd} y es todo o nada: por US$ ${value} pagás IVA sobre el total.`
    )
  }
  if (withinUsaThreshold && registryEnforced && input.sellerRegistered !== true) {
    reasons.push(
      `Desde el ${rules.sellerRegistryEnforcedFrom} la exoneración exige que el vendedor esté registrado ante la Aduana. Si no lo está, el envío paga IVA.`
    )
  }
  if (ivaExempt) reasons.push(`Sin IVA: compra en EE.UU. de hasta US$ ${rules.usaIvaExemptionUsd}.`)

  return { regime: 'franquicia', ivaExempt, reasons, registryEnforced, legacyChannelCap }
}
