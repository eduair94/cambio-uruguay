import type {
  OpportunityAnalysisResult,
  OpportunityCurrency,
  OpportunityItem,
  OpportunityOperation,
  OpportunityOperationStats,
  OpportunitySource,
  OpportunitySignal,
} from './propertyOpportunities'

export interface OpportunityCoverage {
  source: OpportunitySource
  observed: number
  lastRead: string
  complete: boolean
  note: string
}

export interface PropertyOpportunitySnapshot {
  version: OpportunityAnalysisResult['version']
  algorithm: OpportunityAnalysisResult['algorithm']
  operation: OpportunityOperation
  generatedAt: string
  sourceReadAt: string
  usdUyu: number
  items: OpportunityItem[]
  stats: OpportunityOperationStats
  coverage: OpportunityCoverage[]
}

export interface OpportunityQuery {
  operation: OpportunityOperation
  department: string
  neighborhood: string
  type: 'all' | 'casa' | 'apartamento'
  bedrooms: '' | number
  maxPrice: number | null
  confidence: 'all' | 'supported' | 'limited'
  evidence: 'all' | 'standard' | 'exploratory'
  signal: 'all' | OpportunitySignal
  sort: 'evidence' | 'discount' | 'price' | 'recent'
  page: number
  perPage: number
}

export interface PropertyOpportunitiesResponse {
  operation: OpportunityOperation
  generatedAt: string
  sourceReadAt: string
  stale: boolean
  currency: OpportunityCurrency
  usdUyu: number
  total: number
  page: number
  perPage: number
  pages: number
  items: OpportunityItem[]
  stats: OpportunityOperationStats
  coverage: OpportunityCoverage[]
  facets: { departments: string[]; neighborhoods: string[] }
  query: OpportunityQuery
}

const text = (value: unknown, max = 100): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''
const folded = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLocaleLowerCase('es')
const positiveInteger = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export function normalizeOpportunityQuery(input: Record<string, unknown>): OpportunityQuery {
  const price = Number(input.maxPrice)
  const bedrooms = input.bedrooms === '' || input.bedrooms == null ? NaN : Number(input.bedrooms)
  return {
    operation: input.operation === 'sale' ? 'sale' : 'rent',
    department: text(input.department),
    neighborhood: text(input.neighborhood),
    type: input.type === 'casa' || input.type === 'apartamento' ? input.type : 'all',
    bedrooms: Number.isInteger(bedrooms) && bedrooms >= 0 && bedrooms <= 8 ? bedrooms : '',
    maxPrice: Number.isFinite(price) && price > 0 ? Math.min(price, 100_000_000) : null,
    confidence:
      input.confidence === 'supported' || input.confidence === 'limited' ? input.confidence : 'all',
    evidence:
      input.evidence === 'standard' || input.evidence === 'exploratory' ? input.evidence : 'all',
    signal:
      input.signal === 'total_price' || input.signal === 'price_per_m2' ? input.signal : 'all',
    sort:
      input.sort === 'discount' || input.sort === 'price' || input.sort === 'recent'
        ? input.sort
        : 'evidence',
    page: positiveInteger(input.page, 1, 10_000),
    perPage: positiveInteger(input.perPage, 24, 48),
  }
}

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))

/** Querying never recalculates the reference from the user's price filter or result page. */
export function queryPropertyOpportunities(
  snapshot: PropertyOpportunitySnapshot,
  input: Record<string, unknown>,
  now = Date.now()
): PropertyOpportunitiesResponse {
  const query = normalizeOpportunityQuery({ ...input, operation: snapshot.operation })
  const matches = (value: string, filter: string): boolean =>
    !filter || folded(value) === folded(filter)
  // An old analysis must not continue recommending ads after their freshness window expired.
  const today = Math.floor(now / 86_400_000) * 86_400_000
  const cutoff = today - 3 * 86_400_000
  const fresh = snapshot.items.filter(
    item =>
      (item.analysis.signals === undefined || item.analysis.signals.length > 0) &&
      [item.subject.lastSeen, item.analysis.oldestLastSeen].every(date => {
        const parsed = Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date)
        const day = Math.floor(parsed / 86_400_000) * 86_400_000
        return Number.isFinite(parsed) && day >= cutoff && day <= today
      })
  )
  const departments = uniqueSorted(fresh.map(item => item.subject.department))
  const neighborhoods = uniqueSorted(
    fresh
      .filter(item => matches(item.subject.department, query.department))
      .map(item => item.subject.neighborhood)
  )
  const selected = fresh.filter(
    ({ subject, analysis }) =>
      matches(subject.department, query.department) &&
      matches(subject.neighborhood, query.neighborhood) &&
      (query.type === 'all' || subject.propertyType === query.type) &&
      (query.bedrooms === '' || subject.bedrooms === query.bedrooms) &&
      (query.maxPrice === null || subject.comparisonPrice <= query.maxPrice) &&
      (query.confidence === 'all' || analysis.confidence === query.confidence) &&
      (query.evidence === 'all' || (analysis.evidenceTier ?? 'standard') === query.evidence) &&
      (query.signal === 'all' || (analysis.signals ?? ['total_price']).includes(query.signal))
  )
  selected.sort((a, b) => {
    let order = 0
    if (query.sort === 'price') order = a.subject.comparisonPrice - b.subject.comparisonPrice
    else if (query.sort === 'recent') order = b.subject.lastSeen.localeCompare(a.subject.lastSeen)
    else if (query.sort === 'discount')
      order =
        query.signal === 'price_per_m2'
          ? b.analysis.perAreaGapPct - a.analysis.perAreaGapPct
          : b.analysis.gapPct - a.analysis.gapPct
    else {
      order =
        Number((b.analysis.evidenceTier ?? 'standard') === 'standard') -
          Number((a.analysis.evidenceTier ?? 'standard') === 'standard') ||
        Number(b.analysis.confidence === 'supported') -
          Number(a.analysis.confidence === 'supported') ||
        b.analysis.conservativeGapPct - a.analysis.conservativeGapPct ||
        b.analysis.distinctN - a.analysis.distinctN
    }
    return order || a.subject.id.localeCompare(b.subject.id)
  })
  const pages = Math.ceil(selected.length / query.perPage)
  const page = Math.min(query.page, Math.max(1, pages))
  const generated = Date.parse(snapshot.generatedAt)
  const sourceRead = Date.parse(snapshot.sourceReadAt)
  return {
    operation: snapshot.operation,
    generatedAt: snapshot.generatedAt,
    sourceReadAt: snapshot.sourceReadAt,
    stale:
      !Number.isFinite(generated) ||
      now - generated > 6 * 3_600_000 ||
      !Number.isFinite(sourceRead) ||
      now - sourceRead > 3 * 86_400_000,
    currency: snapshot.operation === 'rent' ? 'UYU' : 'USD',
    usdUyu: snapshot.usdUyu,
    total: selected.length,
    page,
    perPage: query.perPage,
    pages,
    items: selected.slice((page - 1) * query.perPage, page * query.perPage),
    stats: snapshot.stats,
    coverage: snapshot.coverage,
    facets: { departments, neighborhoods },
    query: { ...query, page },
  }
}
