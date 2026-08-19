// Pure analysis of the Bankos discount map: turns the raw catalog into the numbers
// /que-banco-tiene-mas-descuentos-uruguay charts. No Vue, no I/O — unit-testable.
//
// Every figure here is COUNTED from the catalog (how many brands/stores each issuer discounts),
// never an estimate of how much money you save: the catalog carries discount TEXT, not a
// machine-readable percentage, so this module deliberately does not average percentages.

import { BANKOS_BANKS, type BankosBank } from './bankos'

export interface AnalysisRawData {
  brands: Record<string, { brandId: string; name: string; categories?: string[] }>
  locations: Record<string, { locationId: string; brandId: string }>
  bankBrands: Record<
    string,
    Record<string, { creditDescription: string | null; debitDescription: string | null }>
  >
  brandLocations: Record<string, string[]>
}

export interface BankStats {
  bankId: string
  name: string
  color: string
  /** Brands (chains) with at least one discount for this issuer. */
  brands: number
  /** Stores those brands have on the map. */
  locations: number
  /**
   * Brands whose discount text carries a credit / debit benefit.
   *
   * In the catalog EVERY discount states a credit benefit, so `credit` always equals `brands` and
   * is not a differentiator — what actually varies between issuers is `debit` (and `debitShare`).
   */
  credit: number
  debit: number
  /** Share of this issuer's brands where the benefit also applies paying with débito, 0–1. */
  debitShare: number
  /** Brands NO other issuer in the catalog discounts. */
  exclusive: number
  /** Share of all discounted brands this issuer covers, 0–1. */
  coverage: number
  /** Biggest categories for this issuer, most brands first. */
  topCategories: { category: string; brands: number }[]
}

export interface CategoryLeader {
  category: string
  /** Total brands with any discount in this category. */
  brands: number
  /** Issuers ranked by brands covered in this category. */
  ranking: { bankId: string; name: string; color: string; brands: number }[]
}

export interface BankosAnalysis {
  banks: BankStats[]
  categories: CategoryLeader[]
  totals: { brands: number; locations: number; discountedBrands: number }
}

const bankById: Record<string, BankosBank> = Object.fromEntries(BANKOS_BANKS.map(b => [b.id, b]))

/** How many distinct issuers discount each brand — the basis for "exclusive". */
function issuersPerBrand(data: AnalysisRawData): Map<string, number> {
  const counts = new Map<string, number>()
  for (const brandMap of Object.values(data.bankBrands ?? {})) {
    for (const brandId of Object.keys(brandMap)) {
      counts.set(brandId, (counts.get(brandId) ?? 0) + 1)
    }
  }
  return counts
}

export function analyzeBankos(data: AnalysisRawData, topCategories = 5): BankosAnalysis {
  const perBrandIssuers = issuersPerBrand(data)
  const discountedBrands = perBrandIssuers.size

  const banks: BankStats[] = []
  // category -> bankId -> brand count
  const catBank = new Map<string, Map<string, number>>()
  // category -> set of brands with any discount
  const catBrands = new Map<string, Set<string>>()

  for (const bank of BANKOS_BANKS) {
    // Issuers with no benefit in this pull are kept with zeros instead of dropped: the app lets
    // you select their cards, so "Club El País: 0 marcas" is an answer, and silently omitting the
    // row reads as a bug. They sort last because the list is ordered by coverage.
    const brandMap = data.bankBrands?.[bank.id] ?? {}
    const brandIds = Object.keys(brandMap)

    let locations = 0
    let credit = 0
    let debit = 0
    let exclusive = 0
    const perCategory = new Map<string, number>()

    for (const brandId of brandIds) {
      const disc = brandMap[brandId]!
      if (disc.creditDescription) credit++
      if (disc.debitDescription) debit++
      if ((perBrandIssuers.get(brandId) ?? 0) === 1) exclusive++
      locations += (data.brandLocations?.[brandId] ?? []).length

      for (const cat of data.brands?.[brandId]?.categories ?? []) {
        perCategory.set(cat, (perCategory.get(cat) ?? 0) + 1)
        if (!catBank.has(cat)) catBank.set(cat, new Map())
        const m = catBank.get(cat)!
        m.set(bank.id, (m.get(bank.id) ?? 0) + 1)
        if (!catBrands.has(cat)) catBrands.set(cat, new Set())
        catBrands.get(cat)!.add(brandId)
      }
    }

    banks.push({
      bankId: bank.id,
      name: bank.name,
      color: bank.color,
      brands: brandIds.length,
      locations,
      credit,
      debit,
      debitShare: brandIds.length ? debit / brandIds.length : 0,
      exclusive,
      coverage: discountedBrands ? brandIds.length / discountedBrands : 0,
      topCategories: [...perCategory.entries()]
        .map(([category, brands]) => ({ category, brands }))
        .sort((a, b) => b.brands - a.brands || a.category.localeCompare(b.category))
        .slice(0, topCategories),
    })
  }

  banks.sort((a, b) => b.brands - a.brands || a.name.localeCompare(b.name))

  const categories: CategoryLeader[] = [...catBank.entries()]
    .map(([category, m]) => ({
      category,
      brands: catBrands.get(category)?.size ?? 0,
      ranking: [...m.entries()]
        .map(([bankId, brands]) => ({
          bankId,
          name: bankById[bankId]?.name ?? bankId,
          color: bankById[bankId]?.color ?? '#888888',
          brands,
        }))
        .sort((a, b) => b.brands - a.brands || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.brands - a.brands || a.category.localeCompare(b.category))

  return {
    banks,
    categories,
    totals: {
      brands: Object.keys(data.brands ?? {}).length,
      locations: Object.keys(data.locations ?? {}).length,
      discountedBrands,
    },
  }
}
