// Framework-agnostic import-tax math for the Uruguay import calculator
// (`pages/herramientas/calculadora-impuestos-importacion.vue`).
//
// PURE functions (no Vue/Nuxt runtime, no I/O) so they can be unit-tested in
// plain Node via vitest. Two regimes are modelled:
//
//  1. Courier / encomiendas postales (compras online "puerta a puerta"): an
//     annual franchise (USD 800 since 2026-05-01, up to 3 shipments/year, max
//     20 kg) plus a simplified single rate (60% of declared value, min USD 10)
//     on the non-exempt portion.
//  2. Régimen general (importación formal): CIF + arancel (TGA) + tasa consular,
//     then IVA on that base, plus optional IMESI.
//
// These are ESTIMATORS. Tax rules change and have many exceptions (product type,
// origin, Mercosur, exonerations). The page renders prominent disclaimers and
// links to Aduanas/DGI; this module only does the arithmetic it is given.
import { round, URUGUAY } from './calculators'

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
}

/** Shipment origin — drives the USA/TIFA IVA exemption. */
export type ImportOrigin = 'usa' | 'other'

/** Inputs for the courier ("puerta a puerta") simplified regime. */
export interface CourierInput {
  /** Declared merchandise value. */
  value: number
  /** Freight / shipping cost (optional, included in declared value). */
  shipping?: number
  /** Insurance cost (optional). */
  insurance?: number
  /** Shipment origin; `'usa'` enables the TIFA IVA exemption ≤ USD 200. */
  origin?: ImportOrigin
  /** Whether to apply the annual franchise to this shipment. */
  useFranchise?: boolean
  /** Franchise amount still available this year (capped at the declared value). */
  franchiseAvailable?: number
  /** Simplified single rate (%) on the portion above the franchise; default 60%. */
  ratePct?: number
  /** Minimum simplified tax when any is due; defaults to the official USD 10. */
  minTax?: number
  /** IVA rate (%) applied to the franchised portion; defaults to 22%. */
  ivaPct?: number
}

/** USD threshold under which a US-origin shipment keeps the IVA exemption (TIFA). */
export const TIFA_IVA_EXEMPTION_USD = 200

/**
 * Courier / encomiendas postales (Decreto 50/026, vigente 2026-05-01).
 *
 * The annual franchise (up to USD 800/year) exempts **aranceles** but the
 * franchised value still pays **IVA (22%)** — except shipments from the USA of
 * up to USD 200, which keep the IVA exemption under the TIFA framework. The
 * portion **above** the franchise pays the simplified single rate (60%).
 */
export function courierImport(input: CourierInput): ImportTaxResult {
  const value = Math.max(input.value || 0, 0)
  const shipping = Math.max(input.shipping || 0, 0)
  const insurance = Math.max(input.insurance || 0, 0)
  const declared = value + shipping + insurance

  const origin: ImportOrigin = input.origin ?? 'other'
  const ratePct = input.ratePct ?? URUGUAY.courier.simplifiedRatePct
  const minTax = input.minTax ?? URUGUAY.courier.simplifiedMinUsd
  const ivaPct = input.ivaPct ?? URUGUAY.iva.basica

  const franchise = input.useFranchise
    ? Math.min(
        Math.max(input.franchiseAvailable ?? URUGUAY.courier.franchiseAnnualUsd, 0),
        declared
      )
    : 0
  const franchisedBase = round(franchise) // arancel-exempt; IVA may still apply
  const excess = round(Math.max(declared - franchise, 0)) // simplified 60%

  // TIFA: US-origin shipments up to USD 200 keep the IVA exemption.
  const usaIvaExempt = origin === 'usa' && declared <= TIFA_IVA_EXEMPTION_USD
  const iva = round((franchisedBase * (usaIvaExempt ? 0 : ivaPct)) / 100)

  let simplified = round((excess * ratePct) / 100)
  if (simplified > 0 && simplified < minTax) simplified = minTax

  const totalTax = round(iva + simplified)
  const taxableBase = round((usaIvaExempt ? 0 : franchisedBase) + excess)

  const breakdown: TaxLine[] = [
    { label: 'Valor declarado (mercadería + envío)', amount: round(declared) },
  ]
  if (input.useFranchise && franchise > 0) {
    breakdown.push({ label: 'Franquicia (exenta de aranceles)', amount: -franchisedBase })
    breakdown.push({
      label: usaIvaExempt
        ? `IVA exonerado (TIFA · EE.UU. ≤ US$ ${TIFA_IVA_EXEMPTION_USD})`
        : `IVA (${ivaPct}%) sobre la franquicia`,
      amount: iva,
    })
    if (excess > 0) {
      breakdown.push({
        label: `Impuesto único (${ratePct}%) sobre el excedente`,
        amount: simplified,
      })
    }
  } else {
    breakdown.push({ label: `Impuesto único (${ratePct}%)`, amount: simplified })
  }

  return {
    taxableBase,
    totalTax,
    landedCost: round(declared + totalTax),
    effectiveRatePct: value > 0 ? round((totalTax / value) * 100, 2) : null,
    breakdown,
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
