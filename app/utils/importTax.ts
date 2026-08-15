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
  MAX_WEIGHT_KG,
  USA_IVA_EXEMPTION_USD,
  resolveRegime,
  type ArrivalChannel,
  type CourierRegime,
  type ImportOrigin,
  type RegimeRules,
} from './importRules'
import { postalHandling, type DeclarationTiming } from './postalHandling'

export type { ArrivalChannel, ImportOrigin }

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
  /** Courier only: the shipment left the postal regimes because it weighs over 20 kg. */
  overWeight?: boolean
  /** Courier only: why, in the reader's language. */
  reasons?: string[]
  /**
   * Postal channels only: what Correo Uruguayo charges for handling the declaration, on top of
   * the tax (see `./postalHandling`). It is a fee, not a tribute, so it stays OUT of `totalTax`
   * and `effectiveRatePct` and only lands in `landedCost`.
   */
  handlingFee?: number
  /**
   * Courier only: set when the parcel arrives by post over the REPEALED per-modality ceiling, so
   * the page can warn that Correo's declaration form may still refuse the franquicia.
   */
  legacyChannelCap?: { channel: ArrivalChannel; capUsd: number }
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
  /**
   * Shipment weight in kg. Over 20 kg neither postal regime applies (Decreto 50/026 arts. 1 y 2):
   * the shipment becomes a formal import, exactly as if it were over USD 800. Omit (or 0) when the
   * weight is unknown — the rule is then not applied.
   */
  weightKg?: number
  /** Where the invoice was issued; `'usa'` enables the TIFA IVA exoneration ≤ USD 200. */
  origin?: ImportOrigin
  /**
   * How the parcel arrives (private courier vs Correo Uruguayo EMS vs correo no exprés). On the
   * postal channel the operator caps the franquicia per shipment, so a USD 118 non-express parcel
   * pays the 60% even with franquicia available. Defaults to `'courier'`.
   */
  channel?: ArrivalChannel
  /** Whether to apply the annual franchise to this shipment. */
  useFranchise?: boolean
  /** Franchise USD still available this calendar year. */
  franchiseAvailable?: number
  /** Franchise shipments already used this calendar year (max 3). */
  shipmentsUsed?: number
  /**
   * When the reader files the declaration, for Correo Uruguayo's administrative charge. Only
   * priced on the POSTAL channels — a private courier bills its own handling on its own tariff.
   * Omit to leave the fee out of the estimate entirely (the previous behaviour).
   */
  declarationTiming?: DeclarationTiming
  /** Is the invoice issuer registered with the DNA? Only consulted from 2026-10-01. */
  sellerRegistered?: boolean
  /** Simplified single rate (%); default 60. */
  ratePct?: number
  /** Minimum simplified tax per shipment; defaults to the official USD 20. */
  minTax?: number
  /** IVA rate (%); defaults to the 22% basic rate (some goods pay the 10% minimum rate). */
  ivaPct?: number
  /**
   * How far the merchandise's own import exoneration reaches (see `importProductTypes`).
   * `'todo-tributo'` (libros, material educativo) zeroes the shipment under every regime.
   */
  exemption?: 'none' | 'iva' | 'todo-tributo'
  /** Goods excepted from the USD 800 annual cap (Decreto 50/026 art. 4): libros y medicamentos. */
  franchiseCapExempt?: boolean
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
      weightKg: input.weightKg,
      origin,
      franchiseAvailableUsd: input.franchiseAvailable ?? rules.franchiseAnnualUsd,
      shipmentsUsed: input.shipmentsUsed ?? 0,
      useFranchise: input.useFranchise ?? false,
      sellerRegistered: input.sellerRegistered,
      channel: input.channel,
      exemption: input.exemption,
      franchiseCapExempt: input.franchiseCapExempt,
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

  if (decision.regime === 'exonerado') {
    // La mercadería trae su propia exoneración de todo tributo: no hay base que gravar. No es
    // "franquicia con IVA 0" — no consume cupo ni depende del régimen elegido.
    breakdown.push({
      label: 'Importación exonerada de todo tributo (Título 10 art. 41; Ley 15.913 art. 8)',
      amount: 0,
    })
  } else if (decision.regime === 'franquicia') {
    iva = decision.ivaExempt ? 0 : round((invoiceValue * ivaPct) / 100)
    breakdown.push({ label: 'Franquicia anual (exenta de aranceles)', amount: -invoiceValue })
    breakdown.push({
      label: decision.ivaExempt
        ? `IVA exonerado (EE.UU. hasta US$ ${rules.usaIvaExemptionUsd})`
        : `IVA (${ivaPct}%) sobre el valor de la factura`,
      amount: iva,
    })
    // Piso legal del IVA en el régimen postal: Título 10 art. 13 lit. B, inciso 3.º. No corre
    // cuando el envío está integrado exclusivamente por bienes exonerados — de ahí el `iva > 0`.
    if (iva > 0 && iva < rules.postalIvaMinUsd) {
      const topUp = round(rules.postalIvaMinUsd - iva)
      breakdown.push({
        label: `Mínimo legal de IVA por envío (US$ ${rules.postalIvaMinUsd}, Título 10 art. 13 lit. B)`,
        amount: topUp,
      })
      iva = round(rules.postalIvaMinUsd)
    }
  } else if (decision.regime === 'simplificado') {
    simplified = round((invoiceValue * ratePct) / 100)
    if (simplified > 0 && simplified < minTax) simplified = minTax
    breakdown.push({
      label: `Prestación única (${ratePct}%, mínimo US$ ${minTax})`,
      amount: simplified,
    })
  } else {
    // Over USD 800 or over 20 kg: neither regime reaches it. We refuse to invent a number.
    breakdown.push({
      label: decision.overWeight
        ? `Supera ${MAX_WEIGHT_KG} kg: régimen general (no lo calculamos)`
        : `Supera US$ ${rules.franchiseAnnualUsd}: régimen general (no lo calculamos)`,
      amount: 0,
    })
  }

  const totalTax = round(iva + simplified)

  // Correo's administrative charge for handling the declaration. Postal channels only, and only
  // once the caller says WHEN it declares: the fee doubles-and-then-some for a parcel that is
  // already retained, which is exactly how a US$ 19 AliExpress parcel ends up owing US$ 26.
  const isPostal = input.channel === 'postal-ems' || input.channel === 'postal-simple'
  const handling =
    isPostal && input.declarationTiming && decision.regime !== 'general'
      ? postalHandling({
          taxUsd: totalTax,
          timing: input.declarationTiming,
          useFranchise: decision.regime === 'franquicia',
        })
      : null
  if (handling) breakdown.push({ label: handling.label, amount: handling.totalUsd })

  if (courierFreight > 0) {
    breakdown.push({
      label: 'Flete del courier (aparte, sin impuestos)',
      amount: round(courierFreight),
    })
  }

  const handlingFee = handling?.totalUsd ?? 0

  return {
    taxableBase: decision.regime === 'general' ? 0 : decision.ivaExempt ? 0 : invoiceValue,
    totalTax,
    landedCost: round(invoiceValue + totalTax + handlingFee + courierFreight),
    effectiveRatePct: value > 0 ? round((totalTax / value) * 100, 2) : null,
    breakdown,
    regime: decision.regime,
    ivaExempt: decision.ivaExempt,
    overWeight: decision.overWeight,
    reasons: decision.reasons,
    legacyChannelCap: decision.legacyChannelCap,
    handlingFee: handling ? handlingFee : undefined,
  }
}

/**
 * Uplift applied to the IVA base when the importer is NOT an IVA taxpayer — i.e. every private
 * person using this calculator. Título 10 del T.O. 2023, art. 13 lit. B): "Si la importación se
 * efectuara a nombre propio y por cuenta ajena, o por no contribuyentes, la referida suma será
 * incrementada en un 50% (cincuenta por ciento) a los efectos de la liquidación del tributo."
 * (Decreto 220/998 art. 134 reglamenta lo mismo.)
 */
export const NON_TAXPAYER_BASE_UPLIFT = 0.5

/** Inputs for the general import regime (importación formal). */
export interface GeneralImportInput {
  /** FOB / merchandise value. */
  value: number
  /** Freight to Uruguay — part of the customs value (CIF). */
  shipping?: number
  /** Insurance — part of the customs value (CIF). */
  insurance?: number
  /** Arancel / Tasa Global Arancelaria (%); 0 for many Mercosur-origin goods. */
  arancelPct?: number
  /** Tasa consular (%) on the customs value; 5% general, 3% for Mercosur/ACE 18. */
  tasaConsularPct?: number
  /** IVA rate (%); defaults to the 22% general rate. */
  ivaPct?: number
  /** Optional IMESI (%) for specific goods (cosmetics, vehicles, lubricants). */
  imesiPct?: number
  /**
   * Is the importer an IVA taxpayer (a company with RUT)? Defaults to `false` — a private person,
   * which is who uses this calculator — and that is what triggers the 50% base uplift above.
   */
  contribuyente?: boolean
  /** The merchandise is exonerated of every national tax on import (books). */
  exemptAllTaxes?: boolean
}

/**
 * General-regime (importación formal) calculation.
 *
 * Valor en aduana = CIF (Norma de aplicación Mercosur sobre valoración, Decreto 538/008 art. 5:
 * includes freight to the place of import, handling and insurance). On top of it:
 *
 *  - ARANCEL (TGA) over the customs value.
 *  - TASA CONSULAR over the customs value — Ley 19.535 art. 265: 5%, or 3% under ACE 18
 *    (Mercosur). It is NOT part of the IVA base.
 *  - IVA over (customs value + arancel), and that sum is increased 50% for a non-taxpayer
 *    importer (Título 10 art. 13 lit. B). The tasa consular and the IMESI do NOT belong in this
 *    base — the article names only "el valor normal de aduana más el arancel". The previous
 *    version of this function added both, and understated the base for every private importer.
 *  - IMESI, when it applies. For cosmetics/perfumery, vehicles and lubricants imported by a
 *    non-taxpayer the base is the same uplifted (customs value + arancel) sum (Decreto 96/990
 *    art. 11 num. I). Alcohol and tobacco are assessed on ADMINISTRATIVE FICTO PRICES
 *    (Título 11 art. 15), which no percentage of the invoice can reproduce — the caller must not
 *    pass an `imesiPct` for those, and the page says so.
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
  const uplift = input.contribuyente ? 1 : 1 + NON_TAXPAYER_BASE_UPLIFT

  // Libros y material educativo: exonerados de todo tributo nacional, gravámenes aduaneros y
  // tasas consulares (Título 10 art. 41; Ley 15.913 art. 8). No hay nada que liquidar.
  if (input.exemptAllTaxes) {
    return {
      taxableBase: 0,
      totalTax: 0,
      landedCost: round(cif),
      effectiveRatePct: value > 0 ? 0 : null,
      breakdown: [
        { label: 'Valor CIF (mercadería + flete + seguro)', amount: round(cif) },
        {
          label: 'Importación exonerada de todo tributo (Título 10 art. 41; Ley 15.913 art. 8)',
          amount: 0,
        },
      ],
    }
  }

  const arancel = round((cif * arancelPct) / 100)
  const tasaConsular = round((cif * tasaConsularPct) / 100)
  // Base común del IVA y del IMESI de importación por no contribuyente: (valor en aduana +
  // arancel), incrementada un 50%.
  const upliftedBase = round((cif + arancel) * uplift)
  const imesi = round((upliftedBase * imesiPct) / 100)
  const iva = round((upliftedBase * ivaPct) / 100)

  const totalTax = round(arancel + tasaConsular + imesi + iva)

  const breakdown: TaxLine[] = [
    { label: 'Valor CIF (mercadería + flete + seguro)', amount: round(cif) },
  ]
  if (arancelPct > 0) breakdown.push({ label: `Arancel (${arancelPct}%)`, amount: arancel })
  if (tasaConsularPct > 0)
    breakdown.push({
      label: `Tasa consular (${tasaConsularPct}% del valor en aduana)`,
      amount: tasaConsular,
    })
  // La base va en la ETIQUETA, no en una línea propia: una línea con el monto de la base se lee
  // como un cargo más y el total dejaría de cerrar a ojo.
  const baseLabel = input.contribuyente
    ? 'valor en aduana + arancel'
    : 'valor en aduana + arancel, +50% por importar como particular'
  if (imesiPct > 0)
    breakdown.push({ label: `IMESI (${imesiPct}% sobre ${baseLabel})`, amount: imesi })
  breakdown.push({ label: `IVA (${ivaPct}% sobre ${baseLabel})`, amount: iva })

  return {
    taxableBase: round(upliftedBase),
    totalTax,
    landedCost: round(cif + totalTax),
    effectiveRatePct: value > 0 ? round((totalTax / value) * 100, 2) : null,
    breakdown,
  }
}
