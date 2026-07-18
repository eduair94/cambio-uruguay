// Framework-agnostic import-tax math for the Uruguay import calculator
// (`pages/herramientas/calculadora-impuestos-importacion.vue`).
//
// PURE functions (no Vue/Nuxt runtime, no I/O) so they can be unit-tested in
// plain Node via vitest. Two regimes are modelled:
//
//  1. Courier / encomiendas postales (compras online "puerta a puerta"): EITHER the annual
//     franchise (USD 800/year across at most 3 shipments, max 20 kg — exempt from aranceles,
//     IVA still due) OR the prestación única (60% of the invoice value, minimum USD 20 per
//     shipment). Never both: they are alternative regimes per shipment.
//  2. Régimen general (importación formal): CIF + arancel (TGA) + tasa consular,
//     then IVA on that base, plus optional IMESI.
//
// These are ESTIMATORS. Tax rules change and have many exceptions (product type,
// origin, Mercosur, exonerations). The page renders prominent disclaimers and
// links to Aduanas/DGI; this module only does the arithmetic it is given.
//
// The courier regime's RULES (which regime applies, whether IVA is owed, and the dated
// seller-registration condition) live in `./importRules`, sourced to the primary norms. This
// module only prices the decision that module makes.
import { round, URUGUAY } from './calculators'
import {
  DEFAULT_REGIME_RULES,
  USA_IVA_EXEMPTION_USD,
  resolveRegime,
  type CourierRegime,
  type ImportOrigin,
  type RegimeRules,
} from './importRules'

export type { ImportOrigin }

/** A single labelled line in a tax breakdown (amounts in the input currency). */
export interface TaxLine {
  /** Human-readable label, e.g. `'IVA (22%)'`. */
  label: string
  /** Amount for this line. */
  amount: number
}

/** Outcome of an import-tax calculation. All monetary fields share one currency. */
export interface ImportTaxResult {
  /** Taxable base after franchise / before-rate adjustments. */
  taxableBase: number
  /** Total taxes and fees. */
  totalTax: number
  /** Landed cost = goods + freight + insurance + taxes. */
  landedCost: number
  /** Effective tax rate over the declared goods value (%), or `null` if value is 0. */
  effectiveRatePct: number | null
  /** Ordered, labelled breakdown of every component. */
  breakdown: TaxLine[]
  /** Courier only: which regime the shipment fell under. */
  regime?: CourierRegime
  /** Courier only: whether the shipment escaped IVA (US invoice within the TIFA threshold). */
  ivaExempt?: boolean
  /** Courier only: why, in the reader's language. */
  reasons?: string[]
}

/** Inputs for the courier ("puerta a puerta") regime. */
export interface CourierInput {
  /** Declared merchandise value (the seller's price). */
  value: number
  /**
   * Freight billed SEPARATELY by the courier (Miami-box style). Not part of the seller's
   * invoice, so it does not count towards the USD 200/800 thresholds — see `sellerShipping`
   * for shipping the seller charges you on the invoice, which does.
   */
  shipping?: number
  /** Shipping the SELLER charges on the invoice — counts inside the threshold (art. 5). */
  sellerShipping?: number
  /** US sales tax charged on the invoice — also counts inside the threshold (art. 5). */
  salesTax?: number
  /** Insurance cost (optional); part of the invoice value. */
  insurance?: number
  /** Where the invoice was issued; `'usa'` enables the TIFA IVA exoneration ≤ USD 200. */
  origin?: ImportOrigin
  /** Whether to apply the annual franchise to this shipment. */
  useFranchise?: boolean
  /** Franchise USD still available this calendar year. */
  franchiseAvailable?: number
  /** Franchise shipments already used this calendar year (max 3). */
  shipmentsUsed?: number
  /** Is the invoice issuer registered with the DNA? Only consulted from 2026-10-01. */
  sellerRegistered?: boolean
  /** Simplified single rate (%); default 60. */
  ratePct?: number
  /** Minimum simplified tax per shipment; defaults to the official USD 20. */
  minTax?: number
  /** IVA rate (%); defaults to the 22% basic rate (some goods pay the 10% minimum rate). */
  ivaPct?: number
  /** Resolution date — injectable so the dated rules are testable. */
  today?: Date
}

/**
 * @deprecated Misleading name: USD 200 is the TIFA IVA threshold for US invoices, NOT a
 * per-shipment franchise cap (that was the repealed Decreto 356/014). Use
 * `USA_IVA_EXEMPTION_USD` from `./importRules`.
 */
export const TIFA_IVA_EXEMPTION_USD = USA_IVA_EXEMPTION_USD

/**
 * Courier / encomiendas postales — Ley 20.446 art. 627 + Decreto 50/026 + RG DNA 09/2026.
 *
 * The two regimes are ALTERNATIVE, never combined (Decreto art. 15):
 *
 *  - FRANQUICIA: the shipment fits in what is left of the USD 800 annual franchise (max 3
 *    shipments/year). Exempt from **aranceles**; still pays **IVA**, unless it is a US invoice
 *    of up to USD 200 (TIFA) — and, from 2026-10-01, unless the seller is also registered
 *    with the DNA.
 *  - PRESTACIÓN ÚNICA: everything else up to USD 800 — 60% of the invoice value, minimum
 *    **USD 20** per shipment. No IVA on top: it replaces all taxation of the shipment.
 *
 *  Over USD 800 neither regime applies; we do not price the general regime here.
 *
 * The value used for every threshold is the INVOICE TOTAL (price + US sales tax + the seller's
 * own shipping), per Decreto art. 5. The courier's separately-billed freight is not on that
 * invoice and is added to the landed cost untaxed.
 */
export function courierImport(
  input: CourierInput,
  rules: RegimeRules = DEFAULT_REGIME_RULES
): ImportTaxResult {
  const value = Math.max(input.value || 0, 0)
  const courierFreight = Math.max(input.shipping || 0, 0) // separately billed → outside thresholds
  const sellerShipping = Math.max(input.sellerShipping || 0, 0)
  const salesTax = Math.max(input.salesTax || 0, 0)
  const insurance = Math.max(input.insurance || 0, 0)

  // Decreto 50/026 art. 5: "el total de la factura original de compra, incluidos todos los
  // conceptos que figuren adicionados en la misma".
  const invoiceValue = round(value + sellerShipping + salesTax + insurance)

  const origin: ImportOrigin = input.origin ?? 'other'
  // `rules` is the live overlay from /api/aduana (or DEFAULT_REGIME_RULES); an explicit per-call
  // input.* still wins over both, so callers can force a value in tests.
  const ratePct = input.ratePct ?? rules.simplifiedRatePct
  const minTax = input.minTax ?? rules.simplifiedMinUsd
  const ivaPct = input.ivaPct ?? URUGUAY.iva.basica

  const decision = resolveRegime(
    {
      valueUsd: invoiceValue,
      origin,
      franchiseAvailableUsd: input.franchiseAvailable ?? rules.franchiseAnnualUsd,
      shipmentsUsed: input.shipmentsUsed ?? 0,
      useFranchise: input.useFranchise ?? false,
      sellerRegistered: input.sellerRegistered,
      today: input.today,
    },
    rules
  )

  const breakdown: TaxLine[] = [{ label: 'Mercadería', amount: round(value) }]
  if (sellerShipping > 0)
    breakdown.push({ label: 'Envío del vendedor (cuenta)', amount: round(sellerShipping) })
  if (salesTax > 0)
    breakdown.push({ label: 'Sales tax de EE.UU. (cuenta)', amount: round(salesTax) })
  if (insurance > 0) breakdown.push({ label: 'Seguro', amount: round(insurance) })

  let iva = 0
  let simplified = 0

  if (decision.regime === 'franquicia') {
    iva = decision.ivaExempt ? 0 : round((invoiceValue * ivaPct) / 100)
    breakdown.push({ label: 'Franquicia anual (exenta de aranceles)', amount: -invoiceValue })
    breakdown.push({
      label: decision.ivaExempt
        ? `IVA exonerado (EE.UU. hasta US$ ${rules.usaIvaExemptionUsd})`
        : `IVA (${ivaPct}%) sobre el valor de la factura`,
      amount: iva,
    })
  } else if (decision.regime === 'simplificado') {
    simplified = round((invoiceValue * ratePct) / 100)
    if (simplified > 0 && simplified < minTax) simplified = minTax
    breakdown.push({
      label: `Prestación única (${ratePct}%, mínimo US$ ${minTax})`,
      amount: simplified,
    })
  } else {
    // Over USD 800: neither regime reaches it. We refuse to invent a number.
    breakdown.push({ label: 'Supera US$ 800: régimen general (no lo calculamos)', amount: 0 })
  }

  const totalTax = round(iva + simplified)
  if (courierFreight > 0) {
    breakdown.push({
      label: 'Flete del courier (aparte, sin impuestos)',
      amount: round(courierFreight),
    })
  }

  return {
    taxableBase: decision.regime === 'general' ? 0 : decision.ivaExempt ? 0 : invoiceValue,
    totalTax,
    landedCost: round(invoiceValue + totalTax + courierFreight),
    effectiveRatePct: value > 0 ? round((totalTax / value) * 100, 2) : null,
    breakdown,
    regime: decision.regime,
    ivaExempt: decision.ivaExempt,
    reasons: decision.reasons,
  }
}

/** Inputs for the general import regime (importación formal). */
export interface GeneralImportInput {
  /** FOB / merchandise value. */
  value: number
  /** Freight to Uruguay. */
  shipping?: number
  /** Insurance. */
  insurance?: number
  /** Arancel / Tasa Global Arancelaria (%); 0 for many Mercosur-origin goods. */
  arancelPct?: number
  /** Tasa consular (%) on CIF; commonly ~5% extrazona. */
  tasaConsularPct?: number
  /** IVA rate (%); defaults to the 22% general rate. */
  ivaPct?: number
  /** Optional IMESI (%) for specific goods (vehicles, alcohol, tobacco, etc.). */
  imesiPct?: number
}

/**
 * General-regime calculation: CIF = value + freight + insurance; arancel and
 * tasa consular apply over CIF; IVA applies over (CIF + arancel + tasa consular);
 * optional IMESI applies over the same pre-IVA base.
 */
export function generalImport(input: GeneralImportInput): ImportTaxResult {
  const value = Math.max(input.value || 0, 0)
  const shipping = Math.max(input.shipping || 0, 0)
  const insurance = Math.max(input.insurance || 0, 0)
  const cif = value + shipping + insurance

  const arancelPct = Math.max(input.arancelPct ?? 0, 0)
  const tasaConsularPct = Math.max(input.tasaConsularPct ?? 5, 0)
  const ivaPct = input.ivaPct ?? URUGUAY.iva.basica
  const imesiPct = Math.max(input.imesiPct ?? 0, 0)

  const arancel = round((cif * arancelPct) / 100)
  const tasaConsular = round((cif * tasaConsularPct) / 100)
  const imesi = round((cif * imesiPct) / 100)
  const ivaBase = cif + arancel + tasaConsular + imesi
  const iva = round((ivaBase * ivaPct) / 100)

  const totalTax = round(arancel + tasaConsular + imesi + iva)

  const breakdown: TaxLine[] = [
    { label: 'Valor CIF (mercadería + flete + seguro)', amount: round(cif) },
  ]
  if (arancelPct > 0) breakdown.push({ label: `Arancel (${arancelPct}%)`, amount: arancel })
  if (tasaConsularPct > 0)
    breakdown.push({ label: `Tasa consular (${tasaConsularPct}%)`, amount: tasaConsular })
  if (imesiPct > 0) breakdown.push({ label: `IMESI (${imesiPct}%)`, amount: imesi })
  breakdown.push({ label: `IVA (${ivaPct}%)`, amount: iva })

  return {
    taxableBase: round(ivaBase),
    totalTax,
    landedCost: round(cif + totalTax),
    effectiveRatePct: value > 0 ? round((totalTax / value) * 100, 2) : null,
    breakdown,
  }
}
