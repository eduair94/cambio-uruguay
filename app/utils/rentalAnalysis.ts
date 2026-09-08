import { RENTAL_STALE_DAYS, type RentalCurrency, type RentalSource } from './rentals'

export type RentalAnalysisType = 'apartamento' | 'casa'
export type RentalAnalysisAreaBasis = 'built' | 'total'
export interface RentalAnalysisQuery {
  currency: RentalCurrency
  department: string
  neighborhood: string
  type: RentalAnalysisType | 'all'
  bedrooms: number | null
}
export interface RentalEstimateQuery {
  currency: RentalCurrency
  department: string
  neighborhood: string
  type: RentalAnalysisType
  bedrooms: number
  bathrooms: number
  area: number
  areaBasis: RentalAnalysisAreaBasis
  parkingSpaces: number | null
  askingPrice: number | null
}
export interface RentalAnalysisMeasure {
  count: number
  median: number
  p25: number
  p75: number
}
export interface RentalAnalysisSummary {
  count: number
  rent: RentalAnalysisMeasure | null
  expenses: RentalAnalysisMeasure | null
  monthly: RentalAnalysisMeasure | null
  expensesKnownCount: number
  expensesCoveragePct: number
  perM2: Record<RentalAnalysisAreaBasis, RentalAnalysisMeasure | null>
  oldestLastSeen: string | null
  newestLastSeen: string | null
}
export interface RentalAnalysisResponse {
  methodologyVersion: 1
  generatedAt: string
  analyzedAt: string
  query: RentalAnalysisQuery
  summary: RentalAnalysisSummary
  departments: Array<RentalAnalysisSummary & { name: string }>
  neighborhoods: Array<RentalAnalysisSummary & { name: string }>
  bedrooms: Array<RentalAnalysisSummary & { bedrooms: number }>
  distribution: Array<{ min: number; max: number; count: number }>
  facets: { departments: string[]; neighborhoods: string[] }
  coverage: {
    catalogueProperties: number
    eligibleProperties: number
    excludedProperties: number
    staleDays: number
  }
}
export interface RentalAnalysisComparable {
  propertyKey: string
  title: string
  url: string
  source: RentalSource
  price: number
  currency: RentalCurrency
  area: number | null
  areaBasis: RentalAnalysisAreaBasis | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  commonExpenses: number | null
  lastSeen: string
}
/** Internal normalized input; advertiser identity must never enter public API output. */
export interface RentalAnalysisListing extends RentalAnalysisComparable {
  advertId: string
  department: string
  neighborhood: string
  type: RentalAnalysisType
  advertiserKey: string | null
  /** Both own labelled areas may coexist. Selection never substitutes one basis for another. */
  areas?: Record<RentalAnalysisAreaBasis, number | null>
}
export interface RentalAnalysisCatalogue {
  generatedAt: string
  catalogueProperties: number
  listings: RentalAnalysisListing[]
}
export const RENTAL_ESTIMATE_CRITERIA = {
  minComparables: 8,
  minAdvertisers: 4,
  areaTolerancePct: 15,
  maxPerAdvertiser: 3,
  maxComparables: 30,
  advertiserIdentityScope: 'same_source' as const,
}
export interface RentalEstimateResponse {
  generatedAt: string
  query: RentalEstimateQuery
  status: 'supported' | 'insufficient' | 'dispersed'
  reason: 'insufficient_comparables' | 'insufficient_advertisers' | 'high_dispersion' | null
  sampleCount: number
  advertiserCount: number
  range: RentalAnalysisMeasure | null
  monthly: RentalAnalysisMeasure | null
  expensesKnownCount: number
  /** Positive means the submitted asking price exceeds the comparable median. */
  comparisonToAskingPct: number | null
  comparables: RentalAnalysisComparable[]
  criteria: typeof RENTAL_ESTIMATE_CRITERIA
  oldestLastSeen: string | null
  newestLastSeen: string | null
}

const scalar = (value: unknown) => (Array.isArray(value) ? value[0] : value)
export function rentalAnalysisText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, '')
        .replace(/\p{Cc}/gu, ' ')
        .trim()
        .slice(0, 100)
    : ''
}
const folded = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
const number = (value: unknown, min: number, max: number, integer = false): number | null => {
  const raw = scalar(value)
  if (raw === '' || raw === null || raw === undefined || typeof raw === 'boolean') return null
  if (typeof raw !== 'number' && typeof raw !== 'string') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) &&
    parsed >= min &&
    parsed <= max &&
    (!integer || Number.isInteger(parsed))
    ? parsed
    : null
}
export function normalizeRentalAnalysisQuery(input: Record<string, unknown>): RentalAnalysisQuery {
  const department = rentalAnalysisText(scalar(input.department))
  return {
    currency: scalar(input.currency) === 'USD' ? 'USD' : 'UYU',
    department,
    neighborhood: department ? rentalAnalysisText(scalar(input.neighborhood)) : '',
    type: input.type === 'casa' || input.type === 'apartamento' ? input.type : 'all',
    bedrooms: number(input.bedrooms, 0, 10, true),
  }
}
/** Invalid subjects fail explicitly; no missing feature is filled with a plausible value. */
export function normalizeRentalEstimateQuery(
  input: Record<string, unknown>
): RentalEstimateQuery | null {
  const base = normalizeRentalAnalysisQuery(input)
  const bathrooms = number(input.bathrooms, 1, 10, true)
  const area = number(input.area, 20, 450)
  const parkingSpaces = number(input.parkingSpaces, 0, 10, true)
  const askingPrice = number(input.askingPrice, 1, 10_000_000)
  const optionalValid = (key: string, value: number | null) =>
    input[key] === '' || input[key] === undefined || input[key] === null || value !== null
  if (
    !base.department ||
    !base.neighborhood ||
    base.type === 'all' ||
    base.bedrooms === null ||
    bathrooms === null ||
    area === null ||
    !['built', 'total'].includes(String(input.areaBasis)) ||
    (base.type === 'casa' && input.areaBasis !== 'built') ||
    !['UYU', 'USD'].includes(String(input.currency)) ||
    !optionalValid('parkingSpaces', parkingSpaces) ||
    !optionalValid('askingPrice', askingPrice)
  )
    return null
  return {
    ...base,
    type: base.type,
    bedrooms: base.bedrooms,
    bathrooms,
    area,
    areaBasis: input.areaBasis as RentalAnalysisAreaBasis,
    parkingSpaces,
    askingPrice,
  }
}

export function rentalAnalysisMeasure(values: readonly number[]): RentalAnalysisMeasure | null {
  const sorted = values
    .filter(Number.isFinite)
    .slice()
    .sort((a, b) => a - b)
  if (!sorted.length) return null
  const quantile = (p: number) => {
    const index = (sorted.length - 1) * p
    const low = Math.floor(index),
      high = Math.ceil(index)
    return Math.round((sorted[low]! + (sorted[high]! - sorted[low]!) * (index - low)) * 100) / 100
  }
  return { count: sorted.length, median: quantile(0.5), p25: quantile(0.25), p75: quantile(0.75) }
}
export function rentalAnalysisFresh(lastSeen: string, now: Date): boolean {
  const parsed = Date.parse(lastSeen)
  const cutoff = new Date(now.getTime() - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  return (
    /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(lastSeen) &&
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === lastSeen.slice(0, 10) &&
    parsed <= now.getTime() &&
    lastSeen.slice(0, 10) >= cutoff
  )
}
function eligibleRows(catalogue: RentalAnalysisCatalogue, now: Date): RentalAnalysisListing[] {
  return catalogue.listings.filter(
    row =>
      row.propertyKey &&
      row.advertId &&
      ['UYU', 'USD'].includes(row.currency) &&
      ['casa', 'apartamento'].includes(row.type) &&
      Number.isFinite(row.price) &&
      row.price > 0 &&
      row.department &&
      rentalAnalysisFresh(row.lastSeen, now)
  )
}
/** One own-source offer per catalog property and currency; prefer its most recent observation. */
function distinctRows(rows: RentalAnalysisListing[]): RentalAnalysisListing[] {
  const properties = new Set<string>(),
    adverts = new Set<string>()
  return rows
    .slice()
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.advertId.localeCompare(b.advertId))
    .filter(row => {
      if (properties.has(row.propertyKey) || adverts.has(row.advertId)) return false
      properties.add(row.propertyKey)
      adverts.add(row.advertId)
      return true
    })
}
function areaFor(row: RentalAnalysisListing, basis: RentalAnalysisAreaBasis): number | null {
  if (basis === 'total' && row.type !== 'apartamento') return null
  const area = row.areas ? row.areas[basis] : row.areaBasis === basis ? row.area : null
  return typeof area === 'number' && Number.isFinite(area) && area >= 20 && area <= 450
    ? area
    : null
}
export function rentalAnalysisSummary(rows: RentalAnalysisListing[]): RentalAnalysisSummary {
  const known = rows.filter(
    row =>
      row.commonExpenses !== null && Number.isFinite(row.commonExpenses) && row.commonExpenses >= 0
  )
  const perM2 = (basis: RentalAnalysisAreaBasis) =>
    rentalAnalysisMeasure(
      rows.flatMap(row => {
        const area = areaFor(row, basis)
        return area === null ? [] : [row.price / area]
      })
    )
  const dates = rows.map(row => row.lastSeen).sort()
  return {
    count: rows.length,
    rent: rentalAnalysisMeasure(rows.map(row => row.price)),
    expenses: rentalAnalysisMeasure(known.map(row => row.commonExpenses!)),
    monthly: rentalAnalysisMeasure(known.map(row => row.price + row.commonExpenses!)),
    expensesKnownCount: known.length,
    expensesCoveragePct: rows.length ? Math.round((known.length / rows.length) * 1000) / 10 : 0,
    perM2: { built: perM2('built'), total: perM2('total') },
    oldestLastSeen: dates[0] || null,
    newestLastSeen: dates.at(-1) || null,
  }
}
function locations(rows: RentalAnalysisListing[], field: 'department' | 'neighborhood') {
  const groups = new Map<string, { name: string; rows: RentalAnalysisListing[] }>()
  for (const row of rows) {
    const name = row[field],
      key = folded(name)
    if (!key) continue
    const group = groups.get(key) || { name, rows: [] }
    group.rows.push(row)
    groups.set(key, group)
  }
  return [...groups.values()]
    .map(group => ({ name: group.name, ...rentalAnalysisSummary(group.rows) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
}
function histogram(rows: RentalAnalysisListing[]) {
  if (!rows.length) return []
  const values = rows.map(row => row.price)
  const min = Math.min(...values),
    max = Math.max(...values)
  if (min === max) return [{ min, max, count: values.length }]
  const width = (max - min) / 10
  const bins = Array.from({ length: 10 }, (_, i) => ({
    min: Math.round((min + width * i) * 100) / 100,
    max: Math.round((min + width * (i + 1)) * 100) / 100,
    count: 0,
  }))
  for (const value of values) bins[Math.min(9, Math.floor((value - min) / width))]!.count++
  return bins
}
export function analyzeRentalMarket(
  catalogue: RentalAnalysisCatalogue,
  input: Record<string, unknown>,
  now = new Date()
): RentalAnalysisResponse {
  const query = normalizeRentalAnalysisQuery(input)
  const eligible = eligibleRows(catalogue, now)
  const currency = eligible.filter(row => row.currency === query.currency)
  const selected = distinctRows(
    currency.filter(
      row =>
        (query.type === 'all' || row.type === query.type) &&
        (query.bedrooms === null || row.bedrooms === query.bedrooms)
    )
  )
  const department = selected.filter(
    row => !query.department || folded(row.department) === folded(query.department)
  )
  const local = department.filter(
    row => !query.neighborhood || folded(row.neighborhood) === folded(query.neighborhood)
  )
  const allBedrooms = distinctRows(
    currency.filter(
      row =>
        (query.type === 'all' || row.type === query.type) &&
        (!query.department || folded(row.department) === folded(query.department)) &&
        (!query.neighborhood || folded(row.neighborhood) === folded(query.neighborhood))
    )
  )
  const bedrooms = [
    ...new Set(
      allBedrooms.map(row => row.bedrooms).filter((value): value is number => value !== null)
    ),
  ]
    .sort((a, b) => a - b)
    .map(value => ({
      bedrooms: value,
      ...rentalAnalysisSummary(allBedrooms.filter(row => row.bedrooms === value)),
    }))
  const unique = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  const eligibleProperties = new Set(eligible.map(row => row.propertyKey)).size
  return {
    methodologyVersion: 1,
    generatedAt: catalogue.generatedAt,
    analyzedAt: now.toISOString(),
    query,
    summary: rentalAnalysisSummary(local),
    departments: locations(selected, 'department'),
    neighborhoods: query.department ? locations(department, 'neighborhood') : [],
    bedrooms,
    distribution: histogram(local),
    facets: {
      departments: unique(currency.map(row => row.department)),
      neighborhoods: unique(
        currency
          .filter(row => query.department && folded(row.department) === folded(query.department))
          .map(row => row.neighborhood)
      ),
    },
    coverage: {
      catalogueProperties: catalogue.catalogueProperties,
      eligibleProperties,
      excludedProperties: Math.max(0, catalogue.catalogueProperties - eligibleProperties),
      staleDays: RENTAL_STALE_DAYS,
    },
  }
}
function publicComparable(row: RentalAnalysisListing): RentalAnalysisComparable {
  return {
    propertyKey: row.propertyKey,
    title: row.title,
    url: row.url,
    source: row.source,
    price: row.price,
    currency: row.currency,
    area: row.area,
    areaBasis: row.areaBasis,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parkingSpaces: row.parkingSpaces,
    commonExpenses: row.commonExpenses,
    lastSeen: row.lastSeen,
  }
}
export function estimateRentalPrice(
  catalogue: RentalAnalysisCatalogue,
  query: RentalEstimateQuery,
  now = new Date()
): RentalEstimateResponse {
  const compatible = eligibleRows(catalogue, now)
    .map(row => ({
      ...row,
      area: areaFor(row, query.areaBasis),
      areaBasis: query.areaBasis,
    }))
    .filter(
      row =>
        row.currency === query.currency &&
        folded(row.department) === folded(query.department) &&
        folded(row.neighborhood) === folded(query.neighborhood) &&
        row.type === query.type &&
        row.bedrooms === query.bedrooms &&
        row.bathrooms === query.bathrooms &&
        row.areaBasis === query.areaBasis &&
        row.area !== null &&
        Math.abs(row.area / query.area - 1) <=
          RENTAL_ESTIMATE_CRITERIA.areaTolerancePct / 100 + 1e-9 &&
        (query.parkingSpaces === null || row.parkingSpaces === query.parkingSpaces) &&
        row.advertiserKey?.startsWith(`${row.source}:`)
    )
  // Native agency IDs prove independence within a portal, not between two portals. Never
  // count the same possible agency on different portals as two independent advertisers.
  const cohorts = [...new Set(compatible.map(row => row.source))]
    .map(source => {
      const seen = new Set<string>(),
        adverts = new Set<string>(),
        perAgency = new Map<string, number>()
      const rows = compatible
        .filter(row => row.source === source)
        .sort(
          (a, b) =>
            Math.abs(a.area! - query.area) - Math.abs(b.area! - query.area) ||
            b.lastSeen.localeCompare(a.lastSeen) ||
            a.advertId.localeCompare(b.advertId)
        )
        .filter(row => {
          const count = perAgency.get(row.advertiserKey!) || 0
          if (
            seen.has(row.propertyKey) ||
            adverts.has(row.advertId) ||
            count >= RENTAL_ESTIMATE_CRITERIA.maxPerAdvertiser ||
            seen.size >= RENTAL_ESTIMATE_CRITERIA.maxComparables
          )
            return false
          seen.add(row.propertyKey)
          adverts.add(row.advertId)
          perAgency.set(row.advertiserKey!, count + 1)
          return true
        })
      return { rows, advertiserCount: perAgency.size }
    })
    .sort((a, b) => {
      const enough = (cohort: { rows: RentalAnalysisListing[]; advertiserCount: number }) =>
        cohort.rows.length >= RENTAL_ESTIMATE_CRITERIA.minComparables &&
        cohort.advertiserCount >= RENTAL_ESTIMATE_CRITERIA.minAdvertisers
          ? 1
          : 0
      return (
        enough(b) - enough(a) ||
        b.rows.length - a.rows.length ||
        b.advertiserCount - a.advertiserCount
      )
    })
  const { rows, advertiserCount } = cohorts[0] || { rows: [], advertiserCount: 0 }
  const summary = rentalAnalysisSummary(rows)
  const range = summary.rent
  const reason =
    rows.length < RENTAL_ESTIMATE_CRITERIA.minComparables
      ? 'insufficient_comparables'
      : advertiserCount < RENTAL_ESTIMATE_CRITERIA.minAdvertisers
        ? 'insufficient_advertisers'
        : range && (range.p75 - range.p25) / range.median > 0.5
          ? 'high_dispersion'
          : null
  const supported = reason === null
  const expensesAdvertisers = new Set(
    rows
      .filter(
        row =>
          row.commonExpenses !== null &&
          Number.isFinite(row.commonExpenses) &&
          row.commonExpenses >= 0
      )
      .map(row => row.advertiserKey)
  ).size
  return {
    generatedAt: catalogue.generatedAt,
    query,
    status: supported ? 'supported' : reason === 'high_dispersion' ? 'dispersed' : 'insufficient',
    reason,
    sampleCount: rows.length,
    advertiserCount,
    range: supported ? range : null,
    monthly:
      supported &&
      summary.expensesKnownCount >= RENTAL_ESTIMATE_CRITERIA.minComparables &&
      expensesAdvertisers >= RENTAL_ESTIMATE_CRITERIA.minAdvertisers
        ? summary.monthly
        : null,
    expensesKnownCount: summary.expensesKnownCount,
    comparisonToAskingPct:
      supported && query.askingPrice && range
        ? Math.round((query.askingPrice / range.median - 1) * 1000) / 10
        : null,
    comparables: rows.slice(0, 12).map(publicComparable),
    criteria: { ...RENTAL_ESTIMATE_CRITERIA },
    oldestLastSeen: summary.oldestLastSeen,
    newestLastSeen: summary.newestLastSeen,
  }
}
