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
export type PublicCarSource =
  | 'mercadolibre'
  | 'facebook'
  | 'clasiautos'
  | 'julio'
  | 'shoppingdeautos'
  | 'carper'
  | 'fidocar'
  | 'carone'
  | 'motorlider'
  | 'duenodirecto'

export interface PublicCarReference {
  priceUsd: number
  basis: 'version' | 'year'
  updatedAt: string
}

export interface PublicCarListing {
  key: string
  source: PublicCarSource
  sourceName: string
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
  currencyInferred: boolean
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
  /** What the advert itself declares about the car, quoted. Empty for almost every row. */
  risks: PublicCarRisk[]
  opportunity: { tier: PublicCarTier; gap: number; median: number; n: number } | null
  reference: PublicCarReference | null
}

export interface PublicCarModelSummary {
  slug: string
  brand: string
  model: string
  listings: number
}

export interface PublicCarSourceCoverage {
  source: PublicCarSource
  name: string
  listings: number
  duplicates: number
  lastReadAt: string | null
  ok: boolean
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
  sources: PublicCarSourceCoverage[]
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

export interface PublicCarGuideVersion {
  name: string
  priceUsd: number
}

export interface PublicCarGuideYear {
  year: number
  averageUsd: number | null
  versions: PublicCarGuideVersion[]
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
  guide: PublicCarGuideYear[]
  guideUpdatedAt: string | null
}

export interface PublicCarComparable {
  key: string
  source: PublicCarSource
  sourceName: string
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
  algorithm: 'car-cohort-v2'
  generatedAt: string
  usdUyu: number
  policy: PublicCarOpportunityPolicy
  items: PublicCarOpportunityItem[]
  stats: PublicCarOpportunityStats
}

export type PublicCarRiskCategory =
  | 'deuda'
  | 'papeles'
  | 'siniestro'
  | 'recupero'
  | 'mecanica'
  | 'chapa_extranjera'
  | 'uso_intensivo'
export type PublicCarRiskSeverity = 'alta' | 'media'

export interface PublicCarRisk {
  category: PublicCarRiskCategory
  severity: PublicCarRiskSeverity
  /** The seller's own words. The site quotes, it does not conclude. */
  quote: string
  from: 'title' | 'description'
}

export interface PublicCarRiskItem {
  subject: PublicCarListing
  risks: PublicCarRisk[]
  severity: PublicCarRiskSeverity
  /** Discount against the SAME car without a declared risk null when there is nothing to compare. */
  gap: number | null
  median: number | null
  n: number | null
  sellers: number | null
  /** The advert's own photos show the damage the advert itself declares. */
  photoConfirms: boolean
}

export interface PublicCarRiskCategoryStat {
  category: PublicCarRiskCategory
  adverts: number
  measured: number
  medianGap: number | null
  p25Gap: number | null
  p75Gap: number | null
}

export interface PublicCarRiskStats {
  input: number
  declared: number
  measured: number
  withoutDescription: number
}

export interface PublicCarRiskSnapshot {
  version: 1
  generatedAt: string
  usdUyu: number
  items: PublicCarRiskItem[]
  categories: PublicCarRiskCategoryStat[]
  stats: PublicCarRiskStats
}

export interface PublicCarReportRange {
  p25: number
  median: number
  p75: number
}

export interface PublicCarReportModel {
  marketSlug: string
  brand: string
  model: string
  adverts: number
  share: number
  price: PublicCarReportRange
  medianYear: number
  medianKm: number | null
  /** Cuánto pierde por año, del promedio de años consecutivos. Null si la curva no alcanza. */
  annualDrop: number | null
  /** Qué tan abierto está el abanico de precios del mismo modelo: (p75-p25)/mediana. */
  spread: number
  dealerShare: number
  automaticShare: number
  declaredRiskShare: number
}

export interface PublicCarReportDepreciationPoint {
  year: number
  adverts: number
  medianUsd: number
}

export interface PublicCarReportDepreciation {
  marketSlug: string
  brand: string
  model: string
  annualDrop: number | null
  points: PublicCarReportDepreciationPoint[]
}

export interface PublicCarReportBudgetModel {
  marketSlug: string
  brand: string
  model: string
  adverts: number
  medianUsd: number
  medianYear: number
  medianKm: number | null
}

export interface PublicCarReportBudget {
  maxUsd: number
  adverts: number
  models: PublicCarReportBudgetModel[]
}

export interface PublicCarReportSellerGap {
  marketSlug: string
  brand: string
  model: string
  dealerMedian: number
  privateMedian: number
  gap: number
  cohorts: number
}

export interface PublicCarReportNegotiation {
  windowDays: number
  changed: number
  cut: number
  raised: number
  medianCut: number | null
  shareOfMarket: number
}

export interface PublicCarReportRotation {
  measurable: boolean
  historyDays: number
  retired: number
  note: string
  medianDays: number | null
}

export interface PublicCarCoefficient {
  /** Fraction of the price: 0.04 is 4 %. Null when there are not enough cohorts. */
  value: number | null
  cohorts: number
  p25: number | null
  p75: number | null
}

export interface PublicCarPriceEnding {
  ending: string
  adverts: number
}

export interface PublicCarValuation {
  km: PublicCarCoefficient
  automatic: PublicCarCoefficient
  diesel: PublicCarCoefficient
  endings: PublicCarPriceEnding[]
}

export interface PublicCarReportSnapshotData {
  market: {
    adverts: number
    brands: number
    models: number
    price: PublicCarReportRange
    year: PublicCarReportRange
    km: PublicCarReportRange | null
    sellers: Record<PublicCarSeller | 'unknown', number>
    fuels: Array<{ fuel: PublicCarFuel | 'unknown' adverts: number }>
    transmissions: Array<{ transmission: PublicCarTransmission | 'unknown' adverts: number }>
    departments: Array<{ department: string adverts: number }>
    priceBands: Array<{ from: number to: number | null adverts: number }>
  }
  brands: Array<{ slug: string name: string adverts: number share: number medianUsd: number medianYear: number }>
  models: PublicCarReportModel[]
  depreciation: PublicCarReportDepreciation[]
  budgets: PublicCarReportBudget[]
  sellerGaps: { median: number | null models: PublicCarReportSellerGap[] }
  negotiation: PublicCarReportNegotiation
  rotation: PublicCarReportRotation
  risk: { adverts: number share: number byCategory: Array<{ category: PublicCarRiskCategory adverts: number }> }
  /** Lo que mueve el precio dentro del mismo modelo y año: km, caja, combustible. */
  valuation: PublicCarValuation
}

export interface PublicCarReportSnapshot {
  version: 1
  generatedAt: string
  usdUyu: number
  data: PublicCarReportSnapshotData
}
