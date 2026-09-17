// Mirror of classes/autos/publicTypes.ts (the backend writes these shapes). tests/autos/contracts.test.ts compares both.
export type PublicCarCurrency = 'USD' | 'UYU'
export type PublicCarFuel = 'nafta' | 'diesel' | 'electrico' | 'hibrido' | 'gnc'
export type PublicCarTransmission = 'manual' | 'automatica'
export type PublicCarSeller = 'dealer' | 'private'
export type PublicCarFlag =
  | 'damaged'
  | 'financing'
  | 'foreign_plate'
  | 'paperwork'
  | 'price_mismatch'
  | 'recovered'
export type PublicCarTier = 'strict' | 'exploratory'

export interface PublicCarListing {
  key: string
  brand: string
  brandSlug: string
  model: string
  modelSlug: string
  marketSlug: string
  title: string
  year: number
  km: number | null
  price: number
  currency: PublicCarCurrency
  priceUsd: number
  priceConverted: boolean
  transmission: PublicCarTransmission | null
  fuel: PublicCarFuel | null
  engine: string | null
  trim: string | null
  department: string | null
  neighborhood: string | null
  sellerType: PublicCarSeller | null
  dealerName: string | null
  picture: string | null
  pictureCount: number | null
  permalink: string
  firstSeen: string
  lastSeen: string
  priceDrop: { from: number; currency: PublicCarCurrency; since: string } | null
  flags: PublicCarFlag[]
  opportunity: { tier: PublicCarTier; gap: number; median: number; n: number } | null
}

export interface PublicCarModelSummary {
  slug: string
  brand: string
  model: string
  listings: number
}

export interface PublicCarCatalogMeta {
  key: 'uy-cars'
  generatedAt: string
  freshDays: number
  sourceCoverage: 'partial'
  listings: number
  usdUyu: number
  lastFullReadAt: string | null
  lastReadAt: string | null
  reportedTotal: number | null
  opportunities: number
  models: PublicCarModelSummary[]
}

export interface PublicCarMarketRow {
  year: number
  trim: string | null
  engine: string | null
  transmission: PublicCarTransmission | null
  n: number
  sellers: number
  p25: number
  median: number
  p75: number
  kmMedian: number
}

export interface PublicCarMarketSnapshot {
  version: 1
  slug: string
  brand: string
  model: string
  brandSlug: string
  modelSlug: string
  generatedAt: string
  listings: number
  years: PublicCarMarketRow[]
  rows: PublicCarMarketRow[]
}

export interface PublicCarComparable {
  key: string
  title: string
  year: number
  km: number
  priceUsd: number
  trim: string | null
  engine: string | null
  sellerType: PublicCarSeller | null
  permalink: string
  lastSeen: string
}

export interface PublicCarSample {
  n: number
  sellers: number
  dealers: number
  privates: number
  p25: number
  median: number
  p75: number
  spread: number
  kmMedian: number
  kmP75: number
}

export interface PublicCarOpportunityItem {
  subject: PublicCarListing
  tier: PublicCarTier
  gap: number
  conservativeGap: number
  sellerSensitivityGap: number
  sample: PublicCarSample
  comparables: PublicCarComparable[]
  detailReadAt: string
}

export interface PublicCarTierPolicy {
  minimumComparables: number
  minimumSellers: number
  maximumSpread: number
  minimumGap: number
  minimumConservativeGap: number
  minimumSellerSensitivityGap: number
}

export interface PublicCarOpportunityPolicy {
  freshDays: number
  kmToleranceRatio: number
  kmToleranceMin: number
  maximumPerSeller: number
  maximumGap: number
  strict: PublicCarTierPolicy
  exploratory: PublicCarTierPolicy
}

export interface PublicCarOpportunityStats {
  input: number
  eligible: number
  analyzed: number
  candidates: number
  verified: number
  strict: number
  exploratory: number
  review: number
  excluded: Record<string, number>
  rejectedByDetail: Record<string, number>
}

export interface PublicCarOpportunitySnapshot {
  version: 1
  algorithm: 'car-cohort-v1'
  generatedAt: string
  usdUyu: number
  policy: PublicCarOpportunityPolicy
  items: PublicCarOpportunityItem[]
  stats: PublicCarOpportunityStats
}
