import { describe, expect, it } from 'vitest'
import {
  analyzeRentalMarket,
  estimateRentalPrice,
  normalizeRentalAnalysisQuery,
  normalizeRentalEstimateQuery,
  rentalAnalysisFresh,
  rentalAnalysisMeasure,
  rentalAnalysisSummary,
  type RentalAnalysisCatalogue,
  type RentalAnalysisListing,
  type RentalEstimateQuery,
} from '../../utils/rentalAnalysis'

const now = new Date('2026-09-07T12:00:00.000Z')
const listing = (
  id: number,
  overrides: Partial<RentalAnalysisListing> = {}
): RentalAnalysisListing => ({
  propertyKey: `property-${id}`,
  advertId: `infocasas:${id}`,
  title: `Apartamento ${id}`,
  url: `https://www.infocasas.com.uy/apartamento/${id}`,
  source: 'infocasas',
  price: 20000,
  currency: 'UYU',
  area: 50,
  areaBasis: 'built',
  bedrooms: 1,
  bathrooms: 1,
  parkingSpaces: 0,
  commonExpenses: 3000,
  lastSeen: '2026-09-06T12:00:00.000Z',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  type: 'apartamento',
  advertiserKey: `infocasas:agency-${id % 4}`,
  ...overrides,
})
const sample = (count = 8) => Array.from({ length: count }, (_, id) => listing(id))
const catalogue = (listings = sample()): RentalAnalysisCatalogue => ({
  generatedAt: '2026-09-07T04:00:00.000Z',
  catalogueProperties: new Set(listings.map(row => row.propertyKey)).size,
  listings,
})
const subject = (overrides: Partial<RentalEstimateQuery> = {}): RentalEstimateQuery => ({
  currency: 'UYU',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  type: 'apartamento',
  bedrooms: 1,
  bathrooms: 1,
  area: 50,
  areaBasis: 'built',
  parkingSpaces: null,
  askingPrice: null,
  ...overrides,
})

describe('rental market asking-price statistics', () => {
  it('keeps currencies separate across summaries, charts and available locations', () => {
    const data = catalogue([
      ...sample(),
      listing(20, { currency: 'USD', price: 1000, neighborhood: 'Pocitos' }),
      listing(21, { currency: 'USD', price: 2000, neighborhood: 'Pocitos' }),
    ])
    const pesos = analyzeRentalMarket(data, { department: 'Montevideo' }, now)
    expect(pesos.summary.rent).toEqual({ count: 8, median: 20000, p25: 20000, p75: 20000 })
    expect(pesos.distribution.reduce((total, bin) => total + bin.count, 0)).toBe(8)
    expect(pesos.facets.neighborhoods).toEqual(['Cordón'])
    const dollars = analyzeRentalMarket(data, { currency: 'USD' }, now)
    expect(dollars.summary.rent?.median).toBe(1500)
    expect(dollars.summary.count).toBe(2)
  })

  it('compares matching homes while retaining the separate bedroom breakdown', () => {
    const data = catalogue([
      listing(1),
      listing(2, { bedrooms: 2, price: 35000 }),
      listing(3, { type: 'casa', price: 50000 }),
      listing(4, { bedrooms: null, price: 60000 }),
    ])
    const result = analyzeRentalMarket(data, { type: 'apartamento', bedrooms: '1' }, now)
    expect(result.summary.count).toBe(1)
    expect(result.summary.rent?.median).toBe(20000)
    expect(result.bedrooms.map(row => [row.bedrooms, row.count])).toEqual([
      [1, 1],
      [2, 1],
    ])
  })

  it('scopes identical neighborhood names to their department and matches accents', () => {
    const data = catalogue([
      listing(1),
      listing(2, { neighborhood: 'CORDON' }),
      listing(3, { neighborhood: 'Pocitos', price: 50000 }),
      listing(4, { department: 'Canelones', price: 10000 }),
    ])
    const result = analyzeRentalMarket(
      data,
      { department: 'montevideo', neighborhood: 'cordon' },
      now
    )
    expect(result.summary.count).toBe(2)
    expect(result.neighborhoods.find(row => row.name === 'Cordón')?.count).toBe(2)
    expect(result.neighborhoods).toHaveLength(2)
    expect(analyzeRentalMarket(data, {}, now).neighborhoods).toEqual([])
    expect(normalizeRentalAnalysisQuery({ neighborhood: 'Cordón' }).neighborhood).toBe('')
  })

  it('counts a property and a source advert once, preferring the recent observation', () => {
    const rows = sample(4)
    const result = analyzeRentalMarket(
      catalogue([
        ...rows,
        listing(20, {
          propertyKey: rows[0].propertyKey,
          price: 90000,
          lastSeen: '2026-09-05',
        }),
        listing(21, { advertId: rows[1].advertId, price: 90000, lastSeen: '2026-09-05' }),
      ]),
      {},
      now
    )
    expect(result.summary.count).toBe(4)
    expect(result.summary.rent?.median).toBe(20000)
    expect(result.distribution).toEqual([{ min: 20000, max: 20000, count: 4 }])
  })

  it('distinguishes unknown expenses from explicit zero and reports the known subset', () => {
    const result = rentalAnalysisSummary([
      listing(1, { commonExpenses: null }),
      listing(2, { commonExpenses: 0 }),
      listing(3, { price: 22000, commonExpenses: 3000 }),
      listing(4, { commonExpenses: null }),
    ])
    expect(result.count).toBe(4)
    expect(result.expensesKnownCount).toBe(2)
    expect(result.expensesCoveragePct).toBe(50)
    expect(result.expenses?.median).toBe(1500)
    expect(result.monthly).toMatchObject({ count: 2, median: 22500 })
    expect(rentalAnalysisSummary([listing(1, { commonExpenses: null })]).monthly).toBeNull()
  })

  it('keeps built and total area rates separate and excludes house lots from total area', () => {
    const result = rentalAnalysisSummary([
      listing(1),
      listing(2, { price: 32000, area: 100, areaBasis: 'total' }),
      listing(3, { type: 'casa', price: 40000, area: 200, areaBasis: 'total' }),
      listing(4, { area: null, areaBasis: null }),
    ])
    expect(result.perM2.built).toMatchObject({ count: 1, median: 400 })
    expect(result.perM2.total).toMatchObject({ count: 1, median: 320 })
    expect(result.rent?.count).toBe(4)
  })

  it('excludes stale, invalid and future observations without hiding that coverage loss', () => {
    const data = catalogue([
      listing(1),
      listing(2, { lastSeen: '2026-08-27' }),
      listing(3, { lastSeen: '2026-09-08' }),
      listing(4, { lastSeen: 'invalid' }),
      listing(5, { price: 0 }),
    ])
    const result = analyzeRentalMarket(data, {}, now)
    expect(result.summary.count).toBe(1)
    expect(result.coverage).toMatchObject({
      catalogueProperties: 5,
      eligibleProperties: 1,
      excludedProperties: 4,
    })
    expect(rentalAnalysisFresh('2026-08-28', now)).toBe(true)
    expect(rentalAnalysisFresh('2026-02-30', now)).toBe(false)
    expect(rentalAnalysisFresh('2026-09-07T12:00:00.001Z', now)).toBe(false)
  })

  it('returns empty measures honestly and calculates interpolated quartiles without mutation', () => {
    const prices = [40000, 10000, 30000, 20000]
    expect(rentalAnalysisMeasure(prices)).toEqual({
      count: 4,
      median: 25000,
      p25: 17500,
      p75: 32500,
    })
    expect(prices).toEqual([40000, 10000, 30000, 20000])
    const empty = analyzeRentalMarket(catalogue([]), {}, now)
    expect(empty.summary).toMatchObject({ count: 0, rent: null, monthly: null })
    expect(empty.distribution).toEqual([])
  })
})

describe('rental comparable-based estimate', () => {
  it('supports eight comparable homes from four proven advertisers and compares the asking price', () => {
    const result = estimateRentalPrice(catalogue(), subject({ askingPrice: 22000 }), now)
    expect(result).toMatchObject({
      status: 'supported',
      reason: null,
      sampleCount: 8,
      advertiserCount: 4,
      range: { count: 8, median: 20000 },
      monthly: { count: 8, median: 23000 },
      comparisonToAskingPct: 10,
    })
    expect(result.comparables).toHaveLength(8)
  })

  it('abstains for too few homes or too few advertisers instead of suggesting a price', () => {
    const tooFew = estimateRentalPrice(catalogue(sample(7)), subject(), now)
    expect(tooFew).toMatchObject({
      status: 'insufficient',
      reason: 'insufficient_comparables',
      range: null,
      comparisonToAskingPct: null,
    })
    const concentrated = sample().map((row, index) => ({
      ...row,
      advertiserKey: `infocasas:agency-${index % 3}`,
    }))
    expect(estimateRentalPrice(catalogue(concentrated), subject(), now)).toMatchObject({
      status: 'insufficient',
      reason: 'insufficient_advertisers',
      sampleCount: 8,
      advertiserCount: 3,
      range: null,
    })
  })

  it('caps each advertiser at three observations so a large catalogue cannot dominate the range', () => {
    const rows = [
      ...sample(12),
      ...Array.from({ length: 20 }, (_, index) =>
        listing(100 + index, { advertiserKey: 'infocasas:agency-0', price: 100000, area: 51 })
      ),
    ]
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result).toMatchObject({
      status: 'supported',
      sampleCount: 12,
      advertiserCount: 4,
      range: { median: 20000 },
    })
    const agencies = result.comparables.map(
      row => rows.find(input => input.propertyKey === row.propertyKey)?.advertiserKey
    )
    for (const agency of new Set(agencies)) {
      expect(agencies.filter(value => value === agency)).toHaveLength(3)
    }
  })

  it('does not claim source-local advertiser identities prove independence across portals', () => {
    const rows = [
      ...sample(4),
      ...sample(4).map((row, index) =>
        listing(index + 10, {
          source: 'casasweb',
          advertId: `casasweb:${index}`,
          advertiserKey: `casasweb:agency-${index}`,
        })
      ),
    ]
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result.status).toBe('insufficient')
    expect(result.sampleCount).toBe(4)
    expect(new Set(result.comparables.map(row => row.source)).size).toBe(1)
    expect(result.criteria.advertiserIdentityScope).toBe('same_source')
  })

  it.each<Partial<RentalAnalysisListing>>([
    { advertiserKey: null },
    { advertiserKey: 'Unverified agency name' },
    { advertiserKey: 'casasweb:agency-1' },
    { area: null },
    { areaBasis: 'total' },
    { area: 57.51 },
    { bedrooms: null },
    { bathrooms: null },
    { currency: 'USD' },
    { type: 'casa' },
    { department: 'Canelones' },
    { neighborhood: 'Pocitos' },
    { lastSeen: '2026-08-27' },
  ])('excludes incompatible or unknown own-advert facts: %j', changes => {
    const rows = sample()
    rows[0] = { ...rows[0], ...changes }
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result.sampleCount).toBe(7)
    expect(result.status).toBe('insufficient')
    expect(result.range).toBeNull()
  })

  it('accepts the area tolerance boundaries and respects explicit parking without inferring zero', () => {
    const rows = sample()
    rows[0] = { ...rows[0], area: 42.5 }
    rows[1] = { ...rows[1], area: 57.5, parkingSpaces: null }
    expect(estimateRentalPrice(catalogue(rows), subject(), now).status).toBe('supported')
    const constrained = estimateRentalPrice(catalogue(rows), subject({ parkingSpaces: 0 }), now)
    expect(constrained.sampleCount).toBe(7)
    expect(constrained.range).toBeNull()
  })

  it('does not count duplicate property or source advert rows as additional comparables', () => {
    const rows = sample(7)
    rows.push(listing(20, { propertyKey: rows[0].propertyKey }))
    rows.push(listing(21, { advertId: rows[1].advertId }))
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result.sampleCount).toBe(7)
    expect(result.status).toBe('insufficient')
  })

  it('requires enough known expenses for the monthly figure while retaining the rent estimate', () => {
    const rows = sample()
    rows[0] = { ...rows[0], commonExpenses: null }
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result.status).toBe('supported')
    expect(result.range?.median).toBe(20000)
    expect(result.expensesKnownCount).toBe(7)
    expect(result.monthly).toBeNull()
    rows[0] = { ...rows[0], commonExpenses: 0 }
    expect(estimateRentalPrice(catalogue(rows), subject(), now).monthly?.count).toBe(8)
  })

  it('withholds a recommendation when compatible asking prices are too dispersed', () => {
    const rows = sample().map((row, index) => ({ ...row, price: index < 4 ? 10000 : 50000 }))
    expect(
      estimateRentalPrice(catalogue(rows), subject({ askingPrice: 30000 }), now)
    ).toMatchObject({
      status: 'dispersed',
      reason: 'high_dispersion',
      range: null,
      monthly: null,
      comparisonToAskingPct: null,
    })
  })

  it('withholds the monthly estimate if its known-expenses subset lacks independent advertisers', () => {
    const rows = sample(12).map(row => ({
      ...row,
      commonExpenses: row.advertiserKey === 'infocasas:agency-3' ? null : 3000,
    }))
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result.status).toBe('supported')
    expect(result.expensesKnownCount).toBe(9)
    expect(result.monthly).toBeNull()
  })

  it('projects public responses explicitly and leaves internal input unchanged', () => {
    const rows = sample().map(row => ({
      ...row,
      advertiserKey: row.advertiserKey?.replace('agency', 'PRIVATE-ID') || null,
      privateFutureField: 'PRIVATE-FUTURE-FIELD',
      identity: { address: 'PRIVATE-ADDRESS' },
    }))
    const data = catalogue(rows)
    const before = JSON.stringify(data)
    const market = analyzeRentalMarket(data, {}, now)
    const estimate = estimateRentalPrice(data, subject(), now)
    expect(estimate.status).toBe('supported')
    expect(JSON.stringify({ market, estimate })).not.toMatch(
      /advertiserKey|advertId|PRIVATE-|privateFutureField|identity/
    )
    expect(JSON.stringify(data)).toBe(before)
  })
})

describe('rental analysis query validation', () => {
  it('normalizes market filters without inventing a bedroom or property type', () => {
    expect(normalizeRentalAnalysisQuery({})).toEqual({
      currency: 'UYU',
      department: '',
      neighborhood: '',
      type: 'all',
      bedrooms: null,
    })
    expect(
      normalizeRentalAnalysisQuery({ currency: 'EUR', bedrooms: '-1', type: 'oficina' })
    ).toMatchObject({ currency: 'UYU', bedrooms: null, type: 'all' })
    expect(normalizeRentalAnalysisQuery({ bedrooms: '0', type: 'apartamento' })).toMatchObject({
      bedrooms: 0,
      type: 'apartamento',
    })
  })

  it('accepts valid numeric form values and preserves unknown optional subject details', () => {
    expect(
      normalizeRentalEstimateQuery({
        ...subject(),
        bedrooms: '0',
        bathrooms: '1',
        area: '50',
        parkingSpaces: '',
        askingPrice: '',
      })
    ).toMatchObject({ bedrooms: 0, bathrooms: 1, area: 50, parkingSpaces: null, askingPrice: null })
  })

  it.each([
    { department: '' },
    { neighborhood: '' },
    { type: 'all' },
    { currency: 'EUR' },
    { bedrooms: null },
    { bedrooms: '1.5' },
    { bathrooms: 0 },
    { area: 19 },
    { area: 'Infinity' },
    { areaBasis: 'reported' },
    { type: 'casa', areaBasis: 'total' },
    { parkingSpaces: -1 },
    { askingPrice: 'unknown' },
  ])('rejects an invalid estimate subject explicitly: %j', changes => {
    expect(normalizeRentalEstimateQuery({ ...subject(), ...changes })).toBeNull()
  })
})
