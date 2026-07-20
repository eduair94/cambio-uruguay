// Framework-agnostic cart aggregator for the import-cart tool
// (`pages/herramientas/carrito-importacion.vue`).
//
// Reuses the sourced courier rules (`importRules`) and the product catalog
// (`importProductTypes`) to price a whole basket at once. PURE (no Vue/Nuxt runtime) so it can
// be unit-tested in plain Node via vitest.
//
// THE BASKET IS ONE SHIPMENT, and Aduanas assesses per shipment — so the regime is decided
// once for the basket, never per line. (This module used to split a single franchise across
// the lines and charge 60% on the remainder; Decreto 50/026 art. 15 does not permit that, and
// it under-charged every mixed basket.)
//
// This is still an ESTIMATOR: the page renders the same prominent disclaimers as the import
// calculator and links to Aduanas/DGI.
import { round } from './calculators'
import { generalImport, type ImportTaxResult, type TaxLine } from './importTax'
import {
  FRANCHISE_ANNUAL_USD,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
  resolveRegime,
  type ArrivalChannel,
} from './importRules'
import {
  productRegimeStatus,
  productTypeById,
  resolveProductTax,
  type ImportProductType,
} from './importProductTypes'

/** A single product in the cart. Prices in USD; weight in kg (per unit). */
export interface CartItem {
  /** Stable client id (used as the React/Vue key and for account-sync merges). */
  id: string
  /** Display name. */
  name: string
  /** Source product URL (Amazon/eBay/MercadoLibre), when added from a link. */
  url?: string
  /** Thumbnail URL captured from the product page, when available. */
  imageUrl?: string
  /** Unit price (USD). */
  priceUsd: number
  /** Quantity (whole units). */
  qty: number
  /** Unit weight (kg), used for the courier shipping estimate. */
  weightKg?: number
  /** Product category id from {@link IMPORT_PRODUCT_TYPES}. */
  categoryId: string
}

/** Basket-wide settings that drive the calculation. */
export interface CartSettings {
  /** Import regime: `courier` (online/door-to-door) or `general` (formal). */
  regime: 'courier' | 'general'
  /** Shipment origin (courier TIFA IVA exemption). */
  origin?: 'usa' | 'other'
  /**
   * How the parcel arrives: private courier, Correo EMS or correo no exprés. On the postal
   * channel Correo caps the franquicia per shipment (US$ 200 EMS / US$ 50 no exprés), so the
   * whole basket can lose it. Defaults to `'courier'`.
   */
  channel?: ArrivalChannel
  /** Whether to apply the courier franchise to this shipment. */
  useFranchise?: boolean
  /** Franchise still available this calendar year (USD). */
  franchiseAvailableUsd?: number
  /** Franchise shipments already used this calendar year (max 3). */
  shipmentsUsed?: number
  /** Is the invoice issuer registered with the DNA? Only consulted from 2026-10-01. */
  sellerRegistered?: boolean
  /** Resolution date — injectable so the dated rules are testable. */
  today?: Date
  /** Courier freight (USD); not on the seller's invoice, so untaxed and outside the thresholds. */
  shippingUsd?: number
  /** General regime: arancel / TGA (%). */
  arancelPct?: number
  /** General regime: tasa consular (%) on CIF. */
  tasaConsularPct?: number
  /** General regime: IMESI (%) applied to IMESI-flagged categories. */
  imesiPct?: number
  /** USD→UYU rate used to convert the landed cost; `null`/omitted skips it. */
  usdToUyu?: number | null
}

/** Per-line outcome: the resolved product, its line value and its tax (if any). */
export interface CartLineResult {
  item: CartItem
  productType: ImportProductType
  /** `priceUsd × qty`, rounded. */
  lineValueUsd: number
  /** `weightKg × qty`, rounded. */
  lineWeightKg: number
  /** True when the category cannot be imported under the chosen regime. */
  blocked: boolean
  /** Why the line is blocked, when it is. */
  blockedReason?: string
  /** Import-tax result for the line, or `null` when blocked. */
  tax: ImportTaxResult | null
}

/** Aggregate result for the whole basket. All monetary fields are USD unless noted. */
export interface CartResult {
  lines: CartLineResult[]
  /** Sum of every line value, including blocked items. */
  subtotalUsd: number
  /** Sum of non-blocked line values (the goods actually taxed). */
  taxableSubtotalUsd: number
  /** Cart-level shipping (untaxed). */
  shippingUsd: number
  /** Total taxes and fees across all non-blocked lines. */
  totalTaxUsd: number
  /** Taxable goods + taxes + shipping. */
  landedCostUsd: number
  /** Landed cost in UYU, or `null` when no rate was supplied. */
  landedCostUyu: number | null
  /** Total tax over the taxable goods (%), or `null` when there are none. */
  effectiveRatePct: number | null
  /** Sum of line weights (kg). */
  totalWeightKg: number
  /** Human-readable warnings (e.g. blocked items). */
  warnings: string[]
}

/** Build the per-line scaffolding (value, weight, category, blocked status). */
function describeLines(items: CartItem[], regime: 'courier' | 'general'): CartLineResult[] {
  return items.map(item => {
    const productType = productTypeById(item.categoryId)
    const status = productRegimeStatus(productType, regime)
    return {
      item,
      productType,
      lineValueUsd: round(Math.max(item.priceUsd || 0, 0) * Math.max(item.qty || 0, 0)),
      lineWeightKg: round(Math.max(item.weightKg || 0, 0) * Math.max(item.qty || 0, 0)),
      blocked: status.blocked,
      blockedReason: status.reason,
      tax: null,
    }
  })
}

/**
 * Price a basket of products.
 *
 * THE BASKET IS ONE SHIPMENT. That is not a detail — it is the whole model. The courier
 * regime is decided once, for the shipment: either the franchise covers it (aranceles exempt,
 * IVA still due per product type unless the US/TIFA exoneration applies) or the entire
 * shipment pays the prestación única (60%, minimum USD 20). Decreto 50/026 art. 15 does not
 * allow a shipment to be split between the two, and the old code split it — franchising part
 * of the basket and charging 60% on the rest, a regime that does not exist.
 *
 * Cart-level shipping is the courier's own freight: it is not on the seller's invoice, so it
 * stays out of the USD 200/800 thresholds and is added to the landed cost untaxed.
 */
export function computeCart(items: CartItem[], settings: CartSettings): CartResult {
  const lines = describeLines(items, settings.regime)
  const warnings: string[] = []

  const taxable = lines.filter(l => !l.blocked)
  const taxableSubtotalUsd = round(taxable.reduce((s, l) => s + l.lineValueUsd, 0))
  const subtotalUsd = round(lines.reduce((s, l) => s + l.lineValueUsd, 0))
  const totalWeightKg = round(lines.reduce((s, l) => s + l.lineWeightKg, 0))

  for (const l of lines) {
    if (l.blocked) {
      warnings.push(`${l.item.name}: ${l.blockedReason ?? 'no se puede importar.'}`)
    }
  }

  // ONE regime decision for the whole shipment.
  const decision =
    settings.regime === 'courier'
      ? resolveRegime({
          valueUsd: taxableSubtotalUsd,
          origin: settings.origin ?? 'other',
          franchiseAvailableUsd: settings.franchiseAvailableUsd ?? FRANCHISE_ANNUAL_USD,
          shipmentsUsed: settings.shipmentsUsed ?? 0,
          useFranchise: !!settings.useFranchise,
          sellerRegistered: settings.sellerRegistered,
          channel: settings.channel,
          today: settings.today,
        })
      : null

  if (decision?.regime === 'general') {
    warnings.push(
      'El envío supera US$ 800: no entra en la franquicia ni en el régimen simplificado. Pasa al régimen general y hay que despacharlo aparte — no lo calculamos.'
    )
  }

  // The prestación única is a single tax on the SHIPMENT (60% of its value, floor USD 20), so
  // it is computed once and then split across the lines only for display.
  const ratePct = SIMPLIFIED_RATE_PCT
  const minTax = SIMPLIFIED_MIN_USD
  let basketSimplified = 0
  if (decision?.regime === 'simplificado') {
    basketSimplified = round((taxableSubtotalUsd * ratePct) / 100)
    if (basketSimplified > 0 && basketSimplified < minTax) basketSimplified = minTax
  }

  for (const line of taxable) {
    const { ivaPct, imesiApplies } = resolveProductTax(line.productType)
    if (settings.regime === 'courier') {
      const share = taxableSubtotalUsd > 0 ? line.lineValueUsd / taxableSubtotalUsd : 0
      let lineTax = 0
      const breakdown: TaxLine[] = [{ label: 'Mercadería', amount: line.lineValueUsd }]

      if (decision?.regime === 'franquicia') {
        lineTax = decision.ivaExempt ? 0 : round((line.lineValueUsd * ivaPct) / 100)
        breakdown.push({
          label: decision.ivaExempt
            ? `IVA exonerado (EE.UU. hasta US$ ${USA_IVA_EXEMPTION_USD})`
            : `IVA (${ivaPct}%)`,
          amount: lineTax,
        })
      } else if (decision?.regime === 'simplificado') {
        lineTax = round(basketSimplified * share)
        breakdown.push({ label: `Prestación única (${ratePct}%)`, amount: lineTax })
      }

      line.tax = {
        taxableBase: decision?.ivaExempt ? 0 : line.lineValueUsd,
        totalTax: lineTax,
        landedCost: round(line.lineValueUsd + lineTax),
        effectiveRatePct:
          line.lineValueUsd > 0 ? round((lineTax / line.lineValueUsd) * 100, 2) : null,
        breakdown,
        regime: decision?.regime,
        ivaExempt: decision?.ivaExempt,
      }
    } else {
      line.tax = generalImport({
        value: line.lineValueUsd,
        arancelPct: settings.arancelPct ?? 0,
        tasaConsularPct: settings.tasaConsularPct ?? 5,
        ivaPct,
        imesiPct: imesiApplies ? (settings.imesiPct ?? 0) : 0,
        shipping: 0,
      })
    }
  }

  // Rounding each line's share can drift a cent or two off the shipment's single tax; the
  // shipment figure is the legal one, so it wins.
  const lineSum = round(taxable.reduce((s, l) => s + (l.tax?.totalTax ?? 0), 0))
  const totalTaxUsd = decision?.regime === 'simplificado' ? basketSimplified : lineSum
  const shippingUsd = round(Math.max(settings.shippingUsd ?? 0, 0))
  const landedCostUsd = round(taxableSubtotalUsd + totalTaxUsd + shippingUsd)
  const rate = settings.usdToUyu
  const landedCostUyu = typeof rate === 'number' && rate > 0 ? round(landedCostUsd * rate) : null
  const effectiveRatePct =
    taxableSubtotalUsd > 0 ? round((totalTaxUsd / taxableSubtotalUsd) * 100, 2) : null

  return {
    lines,
    subtotalUsd,
    taxableSubtotalUsd,
    shippingUsd,
    totalTaxUsd,
    landedCostUsd,
    landedCostUyu,
    effectiveRatePct,
    totalWeightKg,
    warnings,
  }
}
