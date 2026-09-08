import { describe, expect, it } from 'vitest'
import {
  analyzeRentalMarket,
  estimateRentalPrice,
  type RentalAnalysisCatalogue,
  type RentalAnalysisListing,
  type RentalEstimateQuery,
} from '../../utils/rentalAnalysis'
import { rentalAnalysisPriceStats } from '../../utils/rentalAnalysisDetails'

const now = new Date('2026-09-08T12:00:00.000Z')
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
  lastSeen: '2026-09-08T04:00:00.000Z',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  type: 'apartamento',
  advertiserKey: `infocasas:agency-${id % 4}`,
  ...overrides,
})
const catalogue = (listings: RentalAnalysisListing[]): RentalAnalysisCatalogue => ({
  generatedAt: '2026-09-08T05:00:00.000Z',
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
const analyze = (rows: RentalAnalysisListing[], query: Record<string, unknown> = {}) =>
  analyzeRentalMarket(catalogue(rows), query, now)

describe('expanded rental market descriptions', () => {
  it('distinguishes the mean, extremes and interpolated percentiles without mutating input', () => {
    const prices = [100000, 20000, 10000, 30000, NaN, Infinity]
    expect(rentalAnalysisPriceStats(prices)).toEqual({
      count: 4,
      mean: 40000,
      median: 25000,
      p10: 13000,
      p25: 17500,
      p75: 47500,
      p90: 79000,
      min: 10000,
      max: 100000,
    })
    expect(prices[0]).toBe(100000)
    expect(rentalAnalysisPriceStats([])).toBeNull()
    expect(rentalAnalysisPriceStats([12345.678])).toMatchObject({
      mean: 12345.68,
      median: 12345.68,
      min: 12345.68,
      max: 12345.68,
    })
  })

  it('uses exactly the headline cohort for every added breakdown', () => {
    const result = analyze(
      [
        listing(1),
        listing(2, { source: 'casasweb', advertId: 'casasweb:2', price: 22000 }),
        listing(3, { currency: 'USD', price: 600 }),
        listing(4, { type: 'casa', price: 100000 }),
        listing(5, { bedrooms: 2, price: 100000 }),
        listing(6, { neighborhood: 'Pocitos', price: 100000 }),
        listing(7, { department: 'Canelones', price: 100000 }),
        listing(8, { lastSeen: '2026-08-20', price: 100000 }),
        listing(9, { propertyKey: 'property-1', lastSeen: '2026-09-07', price: 100000 }),
      ],
      {
        currency: 'UYU',
        type: 'apartamento',
        bedrooms: 1,
        department: 'Montevideo',
        neighborhood: 'Cordón',
      }
    )
    expect(result.summary.count).toBe(2)
    expect(result.details.priceStats).toMatchObject({ count: 2, median: 21000, max: 22000 })
    expect(result.details.quality.total).toBe(2)
    expect(result.details.propertyTypes.map(row => [row.type, row.count])).toEqual([
      ['apartamento', 2],
      ['casa', 0],
    ])
    expect(result.details.sources).toEqual([
      { source: 'casasweb', count: 1 },
      { source: 'infocasas', count: 1 },
    ])
    expect(result.details.scatter.built).toHaveLength(2)
    expect(result.details.bathrooms[0]?.count).toBe(2)
  })

  it('keeps surface band boundaries exclusive above, accepts 450 and excludes invalid areas', () => {
    const areas = [20, 39.5, 40, 59.9, 60, 79.9, 80, 119.9, 120, 199.9, 200, 450, 19.9, 450.1]
    const result = analyze(areas.map((area, id) => listing(id, { area })))
    const bands = result.details.areaBands.filter(row => row.basis === 'built')
    expect(bands.map(row => [row.min, row.max, row.count])).toEqual([
      [20, 40, 2],
      [40, 60, 2],
      [60, 80, 2],
      [80, 120, 2],
      [120, 200, 2],
      [200, null, 2],
    ])
    expect(result.details.quality.builtAreaKnown).toBe(12)
    expect(result.summary.count).toBe(14)
    expect(
      result.details.areaBands.filter(row => row.basis === 'total').every(row => row.count === 0)
    ).toBe(true)
  })

  it('allows both labelled apartment areas while excluding a house plot from total-area metrics', () => {
    const result = analyze([
      listing(1, { areas: { built: 50, total: 70 } }),
      listing(2, { type: 'casa', areas: { built: 100, total: 300 } }),
      listing(3, { areas: { built: null, total: null }, area: 50 }),
    ])
    expect(result.details.quality).toMatchObject({ total: 3, builtAreaKnown: 2, totalAreaKnown: 1 })
    expect(result.details.scatter).toEqual({
      built: [
        { area: 50, price: 20000 },
        { area: 100, price: 20000 },
      ],
      total: [{ area: 70, price: 20000 }],
    })
    expect(
      result.details.areaBands.find(row => row.basis === 'total' && row.min === 60)?.count
    ).toBe(1)
  })

  it('reports missing features and expenses honestly and measures observation recency, not listing age', () => {
    const result = analyze([
      listing(1, { commonExpenses: 0, parkingSpaces: 0, lastSeen: '2026-09-06T12:00:00Z' }),
      listing(2, {
        commonExpenses: null,
        parkingSpaces: null,
        bathrooms: null,
        area: null,
        lastSeen: '2026-09-06T11:59:59Z',
      }),
      listing(3, { commonExpenses: -1, parkingSpaces: 1, bathrooms: 2 }),
      listing(4, { commonExpenses: NaN, parkingSpaces: -1, bathrooms: 0 }),
      listing(5, { parkingSpaces: 1.5, bathrooms: 1.5 }),
    ])
    expect(result.details.quality).toEqual({
      total: 5,
      expensesKnown: 2,
      builtAreaKnown: 4,
      totalAreaKnown: 0,
      bathroomsKnown: 2,
      parkingKnown: 2,
      observedWithin48Hours: 4,
    })
    expect(result.details.parking.knownCount).toBe(2)
    expect(result.details.parking.withParking.count).toBe(1)
    expect(result.details.parking.withoutParking.count).toBe(1)
    expect(result.details.bathrooms.map(row => [row.bathrooms, row.count])).toEqual([
      [1, 1],
      [2, 1],
    ])
  })

  it('bounds scatter output, covers both area extremes and ignores input ordering', () => {
    const rows = Array.from({ length: 1600 }, (_, id) =>
      listing(id, {
        area: 20 + (430 * id) / 1599,
        price: 20000 + ((id * 23) % 8000),
      })
    )
    const points = analyze(rows).details.scatter.built
    expect(points).toHaveLength(80)
    expect(points[0]?.area).toBe(20)
    expect(points.at(-1)?.area).toBe(450)
    expect(points).toEqual(analyze(rows.slice().reverse()).details.scatter.built)
    expect(points.every(point => Object.keys(point).sort().join(',') === 'area,price')).toBe(true)
    expect(new Set(points.map(point => point.area)).size).toBe(80)
  })

  it('returns empty summaries with no fake price, scatter point or coverage percentage', () => {
    const result = analyze([]).details
    expect(result.priceStats).toBeNull()
    expect(result.scatter).toEqual({ built: [], total: [] })
    expect(result.sources).toEqual([])
    expect(result.bathrooms).toEqual([])
    expect(result.parking.knownCount).toBe(0)
    expect(result.areaBands).toHaveLength(12)
    expect(
      result.areaBands.every(
        row => row.count === 0 && row.rent === null && row.expensesCoveragePct === 0
      )
    ).toBe(true)
  })

  it('never exposes internal advertiser or identity evidence through expanded descriptions', () => {
    const rows = [listing(1)].map(row => ({
      ...row,
      advertiserKey: 'infocasas:PRIVATE-ADVERTISER',
      identity: { address: 'PRIVATE-ADDRESS' },
      phone: 'PRIVATE-PHONE',
      email: 'PRIVATE-EMAIL',
    }))
    const before = JSON.stringify(rows)
    const result = analyze(rows)
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE-|advertiserKey|advertId|identity|phone|email/
    )
    expect(JSON.stringify(rows)).toBe(before)
  })
})

describe('rental estimate evidence and asking-price position', () => {
  it('explains each unique-property matching stage before choosing one portal cohort', () => {
    const base = Array.from({ length: 8 }, (_, id) => listing(id))
    const rows = [
      ...base,
      listing(10, { type: 'casa' }),
      listing(11, { bedrooms: 2 }),
      listing(12, { bathrooms: 2 }),
      listing(13, { parkingSpaces: 1 }),
      listing(14, { area: 100 }),
      listing(15, { areaBasis: 'total' }),
      listing(16, { advertiserKey: null }),
      listing(17, { currency: 'USD' }),
      listing(18, { department: 'Canelones' }),
      listing(19, { propertyKey: base[0]!.propertyKey }),
      ...Array.from({ length: 4 }, (_, index) =>
        listing(20 + index, {
          source: 'casasweb',
          advertId: `casasweb:${index}`,
          advertiserKey: `casasweb:agency-${index}`,
        })
      ),
    ]
    const result = estimateRentalPrice(catalogue(rows), subject({ parkingSpaces: 0 }), now)
    expect(result.diagnostics).toEqual({
      sameZoneCount: 19,
      matchingFeaturesCount: 15,
      matchingAreaCount: 13,
      identifiedAdvertiserCount: 12,
      selectedCount: 8,
      selectedSource: 'infocasas',
    })
    expect(result.advertiserCount).toBe(4)
    expect(result.comparables).toHaveLength(result.diagnostics.selectedCount)
  })

  it('uses midrank for price ties and expresses strict lower/equal/higher counts', () => {
    const rows = [18000, 19000, 20000, 20000, 20000, 21000, 22000, 23000].map((price, id) =>
      listing(id, { price })
    )
    const estimate = (askingPrice: number | null) =>
      estimateRentalPrice(catalogue(rows), subject({ askingPrice }), now)
    expect(estimate(20000).askingPosition).toEqual({
      belowCount: 2,
      equalCount: 3,
      aboveCount: 3,
      percentile: 43.8,
    })
    expect(estimate(10000).askingPosition).toEqual({
      belowCount: 0,
      equalCount: 0,
      aboveCount: 8,
      percentile: 0,
    })
    expect(estimate(30000).askingPosition).toEqual({
      belowCount: 8,
      equalCount: 0,
      aboveCount: 0,
      percentile: 100,
    })
    expect(estimate(null).askingPosition).toBeNull()
  })

  it('withholds percentile for every kind of insufficient or dispersed result', () => {
    const sample = Array.from({ length: 8 }, (_, id) => listing(id))
    const cases = [
      sample.slice(0, 7),
      sample.map((row, index) => ({ ...row, advertiserKey: `infocasas:agency-${index % 3}` })),
      sample.map((row, index) => ({ ...row, price: index < 4 ? 10000 : 50000 })),
      [],
    ]
    for (const rows of cases) {
      const result = estimateRentalPrice(catalogue(rows), subject({ askingPrice: 20000 }), now)
      expect(result.status).not.toBe('supported')
      expect(result.askingPosition).toBeNull()
    }
    expect(estimateRentalPrice(catalogue([]), subject(), now).diagnostics.selectedSource).toBeNull()
  })

  it('publishes all and only the at-most-30 chosen comparables without selecting by price', () => {
    const rows = Array.from({ length: 60 }, (_, id) =>
      listing(id, {
        advertiserKey: `infocasas:agency-${id % 20}`,
        area: 50 + id / 10,
      })
    )
    const result = estimateRentalPrice(catalogue(rows), subject(), now)
    expect(result.sampleCount).toBe(30)
    expect(result.comparables).toHaveLength(30)
    expect(result.diagnostics.identifiedAdvertiserCount).toBe(60)
    const changed = estimateRentalPrice(
      catalogue(rows.map((row, index) => ({ ...row, price: 10000 + index * 500 }))),
      subject(),
      now
    )
    expect(changed.comparables.map(row => row.propertyKey)).toEqual(
      result.comparables.map(row => row.propertyKey)
    )
    expect(JSON.stringify(result)).not.toMatch(/advertiserKey|advertId/)
  })
})
