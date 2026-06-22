// Framework-agnostic cart aggregator for the import-cart tool
// (`pages/herramientas/carrito-importacion.vue`).
//
// Reuses the per-shipment import-tax math (`importTax`) and the product catalog
// (`importProductTypes`) to price a whole basket of products at once: each line
// is taxed by its category, an optional shared courier franchise is split across
// the basket, cart-level shipping is added untaxed, and the landed cost is
// converted to UYU with a supplied rate. PURE (no Vue/Nuxt runtime) so it can be
// unit-tested in plain Node via vitest.
//
// This is an ESTIMATOR. Splitting a single annual franchise across mixed-category
// items in one basket is a simplification (Aduanas assesses per shipment); the
// page renders the same prominent disclaimers as the import calculator.
import { round, URUGUAY } from './calculators'
import {
  courierImport,
  generalImport,
  TIFA_IVA_EXEMPTION_USD,
  type ImportTaxResult,
} from './importTax'
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
  /** Whether to apply the courier franchise across the basket. */
  useFranchise?: boolean
  /** Franchise still available this year (USD), shared across the basket. */
  franchiseAvailableUsd?: number
  /** Cart-level shipping/freight (USD); added untaxed to the landed cost. */
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
 * Price a basket of products. Each non-blocked line is taxed by its category;
 * under the courier regime the franchise is split across the basket in
 * proportion to each line's value, then the per-line simplified/IVA math runs.
 * Cart-level shipping is added untaxed, and the landed cost is converted to UYU
 * when a rate is given.
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

  // Courier franchise shared across the basket, allocated by line value.
  const useFranchise = settings.regime === 'courier' && !!settings.useFranchise
  const franchiseToUse = useFranchise
    ? Math.min(Math.max(settings.franchiseAvailableUsd ?? 800, 0), taxableSubtotalUsd)
    : 0

  // The courier regime assesses two rules at the SHIPMENT (basket) level, not per
  // line: the USA TIFA IVA exemption (whole basket ≤ USD 200) and the simplified
  // single-rate USD 10 minimum. Deciding these per line would let a split basket
  // dodge them (each line < 200 → all exempt; many tiny lines → 10× the floor).
  const ratePct = URUGUAY.courier.simplifiedRatePct
  const minTax = URUGUAY.courier.simplifiedMinUsd
  const tifaExempt =
    settings.regime === 'courier' &&
    (settings.origin ?? 'other') === 'usa' &&
    taxableSubtotalUsd <= TIFA_IVA_EXEMPTION_USD
  let simplifiedUnfloored = 0

  for (const line of taxable) {
    const { ivaPct, imesiApplies } = resolveProductTax(line.productType)
    if (settings.regime === 'courier') {
      const franchiseForLine =
        taxableSubtotalUsd > 0
          ? round((franchiseToUse * line.lineValueUsd) / taxableSubtotalUsd)
          : 0
      line.tax = courierImport({
        value: line.lineValueUsd,
        origin: 'other', // TIFA decided at the basket level via `ivaPct` below
        useFranchise,
        franchiseAvailable: franchiseForLine,
        ivaPct: tifaExempt ? 0 : ivaPct,
        minTax: 0, // the USD 10 floor is applied once to the basket below
        shipping: 0,
      })
      simplifiedUnfloored += round(
        (Math.max(line.lineValueUsd - franchiseForLine, 0) * ratePct) / 100
      )
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

  // Apply the simplified-rate minimum once across the basket (courier only).
  const minAdjust =
    simplifiedUnfloored > 0 && simplifiedUnfloored < minTax
      ? round(minTax - simplifiedUnfloored)
      : 0
  const totalTaxUsd = round(taxable.reduce((s, l) => s + (l.tax?.totalTax ?? 0), 0) + minAdjust)
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
