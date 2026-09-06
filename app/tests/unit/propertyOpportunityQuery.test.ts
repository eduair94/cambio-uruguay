import { describe, expect, it } from 'vitest'
import {
  normalizeOpportunityQuery,
  queryPropertyOpportunities,
  type PropertyOpportunitySnapshot,
} from '../../utils/propertyOpportunityQuery'
import type { OpportunityItem } from '../../utils/propertyOpportunities'

const now = Date.parse('2026-09-06T12:00:00Z')
const item = (id = '1', overrides: Partial<OpportunityItem['subject']> = {}): OpportunityItem => ({
  subject: {
    id: `rent:infocasas:${id}`,
    listingId: `infocasas:${id}`,
    operation: 'rent',
    source: 'infocasas',
    url: `https://www.infocasas.com.uy/test/${id}`,
    title: 'Apartamento de prueba',
    image: null,
    sellerName: 'Publicador',
    department: 'Montevideo',
    locality: 'Montevideo',
    neighborhood: 'Cordón',
    propertyType: 'apartamento',
    bedrooms: 1,
    bathrooms: 1,
    area: { value: 50, basis: 'built' },
    price: { amount: 20000, currency: 'UYU' },
    expenses: { amount: 3000, currency: 'UYU' },
    comparisonPrice: 23000,
    lastSeen: '2026-09-06',
    publishedAt: null,
    ...overrides,
  },
  analysis: {
    pricingBasis: 'monthly_total',
    currency: 'UYU',
    median: 30000,
    q25: 28000,
    q75: 32000,
    spread: 0.133,
    gapPct: 23.33,
    conservativeGapPct: 17.86,
    perAreaGapPct: 20,
    distinctN: 8,
    sellersN: 4,
    sources: ['infocasas'],
    oldestLastSeen: '2026-09-04',
    newestLastSeen: '2026-09-06',
    areaBasis: 'built',
    areaMin: 45,
    areaMax: 55,
    confidence: 'limited',
  },
  comparables: [],
  cautions: ['asking_prices_only'],
})
const snapshot = (items = [item()]): PropertyOpportunitySnapshot => ({
  version: 1,
  algorithm: 'local-asking-comparables-v1',
  operation: 'rent',
  generatedAt: '2026-09-06T11:00:00Z',
  sourceReadAt: '2026-09-06T05:00:00Z',
  usdUyu: 40,
  items,
  stats: {
    input: 100,
    eligible: 80,
    analyzed: 50,
    shortlisted: items.length,
    qualified: items.length,
    excluded: {},
    risks: {},
  },
  coverage: [
    {
      source: 'infocasas',
      observed: 100,
      lastRead: '2026-09-06T05:00:00Z',
      complete: false,
      note: 'Muestra',
    },
  ],
})

describe('public property opportunity query', () => {
  it('filters independent signal labels without duplicating a two-signal advert or changing its cohort', () => {
    const twoSignals = item('two')
    twoSignals.analysis.signals = ['total_price', 'price_per_m2']
    twoSignals.analysis.evidenceTier = 'exploratory'
    const source = snapshot([item('legacy'), twoSignals])
    const found = queryPropertyOpportunities(
      source,
      { signal: 'price_per_m2', evidence: 'exploratory' },
      now
    )
    expect(found.total).toBe(1)
    expect(found.items[0].subject.id).toBe(twoSignals.subject.id)
    expect(found.items[0].analysis.median).toBe(30000)
    expect(queryPropertyOpportunities(source, { signal: 'total_price' }, now).total).toBe(2)
    expect(
      queryPropertyOpportunities(source, { evidence: 'standard' }, now).items[0].subject.listingId
    ).toBe('infocasas:legacy')
  })
  it('ranks the original evidence tier first and sorts m² only against the m² metric', () => {
    const strict = item('strict')
    const exploratory = item('exploratory')
    strict.analysis.signals = ['total_price', 'price_per_m2']
    exploratory.analysis.signals = ['total_price', 'price_per_m2']
    exploratory.analysis.evidenceTier = 'exploratory'
    exploratory.analysis.gapPct = 40
    exploratory.analysis.perAreaGapPct = 10
    const source = snapshot([exploratory, strict])
    expect(queryPropertyOpportunities(source, {}, now).items[0].subject.id).toBe(strict.subject.id)
    expect(
      queryPropertyOpportunities(source, { sort: 'discount', signal: 'price_per_m2' }, now).items[0]
        .subject.id
    ).toBe(strict.subject.id)
    expect(
      queryPropertyOpportunities(source, { sort: 'discount', signal: 'total_price' }, now).items[0]
        .subject.id
    ).toBe(exploratory.subject.id)
  })
  it('preserves legacy signal semantics but never fabricates a signal for an explicit empty array', () => {
    const empty = item('empty')
    empty.analysis.signals = []
    const found = queryPropertyOpportunities(snapshot([empty, item('legacy')]), {}, now)
    expect(found.total).toBe(1)
    expect(found.items[0].subject.listingId).toBe('infocasas:legacy')
    expect(
      normalizeOpportunityQuery({ signal: 'guaranteed', evidence: 'guaranteed' })
    ).toMatchObject({ signal: 'all', evidence: 'all' })
  })
  it('normalizes only supported operations, filters and bounded pagination', () => {
    expect(
      normalizeOpportunityQuery({
        operation: 'other',
        page: -1,
        perPage: 1000,
        maxPrice: 'NaN',
        bedrooms: 20,
        confidence: 'guaranteed',
      })
    ).toMatchObject({
      operation: 'rent',
      page: 1,
      perPage: 48,
      maxPrice: null,
      bedrooms: '',
      confidence: 'all',
      sort: 'evidence',
    })
  })
  it('keeps studio zero distinct from any bedroom count', () => {
    expect(normalizeOpportunityQuery({ bedrooms: '0' }).bedrooms).toBe(0)
    expect(normalizeOpportunityQuery({ bedrooms: '' }).bedrooms).toBe('')
  })
  it('filters the complete monthly cost and never recomputes comparables from a budget', () => {
    const source = snapshot()
    expect(queryPropertyOpportunities(source, { maxPrice: 21000 }, now).total).toBe(0)
    const found = queryPropertyOpportunities(source, { maxPrice: 23000 }, now)
    expect(found.items[0].analysis.median).toBe(30000)
    expect(found.stats.input).toBe(100)
    expect(source.items).toHaveLength(1)
  })
  it('matches accented locations and keeps facets independent of budget', () => {
    const found = queryPropertyOpportunities(
      snapshot(),
      { neighborhood: 'cordon', maxPrice: 1 },
      now
    )
    expect(found.total).toBe(0)
    expect(found.facets.neighborhoods).toEqual(['Cordón'])
  })
  it('preserves the operation of the snapshot and its currency', () => {
    const sale = snapshot([item('2', { operation: 'sale', comparisonPrice: 150000 })])
    sale.operation = 'sale'
    expect(queryPropertyOpportunities(sale, { operation: 'rent' }, now)).toMatchObject({
      operation: 'sale',
      currency: 'USD',
    })
  })
  it('prefers stronger evidence by default rather than the largest apparent discount', () => {
    const limited = item('1')
    limited.analysis.gapPct = 40
    const supported = item('2')
    supported.analysis.confidence = 'supported'
    const source = snapshot([limited, supported])
    expect(queryPropertyOpportunities(source, {}, now).items[0].subject.id).toBe(
      supported.subject.id
    )
    expect(queryPropertyOpportunities(source, { sort: 'discount' }, now).items[0].subject.id).toBe(
      limited.subject.id
    )
  })
  it('applies source-day freshness consistently to the subject and the oldest comparable', () => {
    const edge = item('1', { lastSeen: '2026-09-03' })
    edge.analysis.oldestLastSeen = '2026-09-03'
    const old = item('2', { lastSeen: '2026-09-02' })
    const stalePeers = item('3')
    stalePeers.analysis.oldestLastSeen = '2026-09-02'
    const future = item('4', { lastSeen: '2026-09-07' })
    expect(
      queryPropertyOpportunities(snapshot([edge, old, stalePeers, future]), {}, now).items.map(
        row => row.subject.id
      )
    ).toEqual([edge.subject.id])
  })
  it('exposes stale analysis without changing a price or observation date', () => {
    const source = snapshot()
    source.generatedAt = '2026-09-05T00:00:00Z'
    const result = queryPropertyOpportunities(source, {}, now)
    expect(result.stale).toBe(true)
    expect(result.items[0].subject.lastSeen).toBe('2026-09-06')
  })
  it('clamps pagination and filters independently without mutating the snapshot', () => {
    const source = snapshot([
      item('1'),
      item('2', { bedrooms: 0 }),
      item('3', { comparisonPrice: 21000 }),
    ])
    expect(queryPropertyOpportunities(source, { bedrooms: 0 }, now).items[0].subject.id).toBe(
      'rent:infocasas:2'
    )
    expect(
      queryPropertyOpportunities(source, { sort: 'price', perPage: 1, page: 100 }, now)
    ).toMatchObject({ page: 3, pages: 3, total: 3 })
    expect(source.items.map(row => row.subject.id)).toEqual([
      'rent:infocasas:1',
      'rent:infocasas:2',
      'rent:infocasas:3',
    ])
  })
})
