import { describe, expect, it } from 'vitest'
import type {
  RentalAnalysisQuery,
  RentalAnalysisResponse,
  RentalAnalysisSummary,
} from '../../utils/rentalAnalysis'
import {
  rentalAnalysisMapColor,
  rentalAnalysisMapMatches,
  rentalAnalysisMapMetric,
  rentalAnalysisMapRows,
  rentalAnalysisMapScale,
  RENTAL_ANALYSIS_MAP_NO_DATA_COLOR,
  RENTAL_ANALYSIS_MAP_PALETTE,
  type RentalAnalysisMapSelection,
} from '../../utils/rentalAnalysisMap'
import type {
  RentalZone,
  RentalZoneBoundaryCollection,
  RentalZoneResponse,
} from '../../utils/rentalZoneTypes'
import { emptyRentalZonePrices } from '../../utils/rentalZones'
import { rentalAnalysisMapMessages } from '../../utils/rentalAnalysisMapMessages'

const query: RentalAnalysisQuery = {
  currency: 'USD',
  department: 'Montevideo',
  neighborhood: '',
  type: 'apartamento',
  bedrooms: 1,
}
const source = {
  name: 'Official test source',
  url: 'https://example.com/source',
  dataAsOf: '2026-09-08',
  fetchedAt: '2026-09-08',
}
const boundary = (name: string, officialCode: string) => ({
  type: 'Feature' as const,
  properties: { zoneId: `ine-${officialCode}`, name, department: 'Montevideo', officialCode },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [-56.2, -34.9],
        [-56.1, -34.9],
        [-56.1, -34.8],
        [-56.2, -34.9],
      ],
    ],
  },
})
const boundaries: RentalZoneBoundaryCollection = {
  type: 'FeatureCollection',
  source,
  features: [boundary('CORDÓN', '01'), boundary('PUNTA RIELES BELLA ITALIA', '02')],
}
const summary = (name = 'Cordón', count = 12): RentalAnalysisSummary & { name: string } => ({
  name,
  count,
  rentMean: 850,
  rent: { count, median: 800, p25: 700, p75: 900 },
  expenses: null,
  monthly: null,
  expensesKnownCount: 0,
  expensesCoveragePct: 0,
  perM2: { built: null, total: null },
  oldestLastSeen: null,
  newestLastSeen: null,
})
const analysis = (rows = [summary()], filters = query) =>
  ({ query: filters, neighborhoods: rows }) as RentalAnalysisResponse
const territory = (name = 'Cordón', code = '01'): RentalZone => ({
  id: `ine-${code}`,
  ref: { department: 'Montevideo', neighborhood: name },
  officialCode: code,
  prices: {
    ...emptyRentalZonePrices(),
    rent: { count: 500, mean: 40000, median: 35000, p25: 30000, p75: 45000 },
  },
  boundaryAvailable: true,
  services: {
    status: 'ready',
    source,
    counts: { supermarket: 0, pharmacy: 7 },
    coverage: 'partial',
  },
  crime: {
    status: 'ready',
    source,
    geography: 'neighborhood',
    geographyName: name,
    periodFrom: '2025-09-01',
    periodTo: '2026-08-31',
    total: 1200,
    byOffense: { hurto: 1000, rapina: 200 },
  },
})
const context = (zones = [territory()]) =>
  ({
    filters: { department: 'Montevideo', propertyType: 'apartamento', bedrooms: 'any' },
    zones,
  }) as RentalZoneResponse
const selection: RentalAnalysisMapSelection = {
  layer: 'prices',
  statistic: 'mean',
  service: 'supermarket',
  offense: 'all',
}

describe('analysis map joins and original-currency prices', () => {
  it('uses the current analysis mean and median, never converted context prices', () => {
    const [row] = rentalAnalysisMapRows(boundaries, analysis(), query, context())
    expect(rentalAnalysisMapMetric(row!, selection)).toBe(850)
    expect(rentalAnalysisMapMetric(row!, { ...selection, statistic: 'median' })).toBe(800)
    expect(row!.rental?.count).toBe(12)
    expect(row!.services?.counts.pharmacy).toBe(7)
    expect(row).not.toHaveProperty('prices')
  })
  it('normalizes case, accents and spacing, without extending commercial aliases', () => {
    const rows = rentalAnalysisMapRows(
      boundaries,
      analysis([summary('  cordon  '), summary('Punta Rieles')]),
      query,
      context()
    )
    expect(rows[0]!.rental?.name).toBe('  cordon  ')
    expect(rows[1]!.rental).toBeNull()
  })
  it('rejects ambiguous name or context matches and mismatched official IDs', () => {
    expect(
      rentalAnalysisMapRows(boundaries, analysis([summary(), summary('CORDON')]), query, null)[0]!
        .rental
    ).toBeNull()
    expect(
      rentalAnalysisMapRows(boundaries, analysis(), query, context([territory(), territory()]))[0]!
        .services
    ).toBeNull()
    const wrongCode = territory()
    wrongCode.officialCode = '99'
    expect(
      rentalAnalysisMapRows(boundaries, analysis(), query, context([wrongCode]))[0]!.services
    ).toBeNull()
    const wrongId = territory()
    wrongId.id = 'advertised-cordon'
    expect(
      rentalAnalysisMapRows(boundaries, analysis(), query, context([wrongId]))[0]!.crime
    ).toBeNull()
  })
  it('never reuses prices with different currency, type, bedrooms or department', () => {
    for (const filters of [
      { ...query, currency: 'UYU' as const },
      { ...query, type: 'casa' as const },
      { ...query, bedrooms: 2 },
      { ...query, department: 'Canelones' },
    ]) {
      expect(rentalAnalysisMapMatches(analysis([summary()], filters), query)).toBe(false)
      const [row] = rentalAnalysisMapRows(
        boundaries,
        analysis([summary()], filters),
        query,
        context()
      )
      expect(row!.rental).toBeNull()
      expect(row!.services?.counts.pharmacy).toBe(7)
    }
  })
  it('keeps all-neighbourhood comparisons when a single neighbourhood is selected', () => {
    expect(rentalAnalysisMapMatches(analysis(), { ...query, neighborhood: 'Pocitos' })).toBe(true)
    expect(
      rentalAnalysisMapRows(boundaries, analysis(), { ...query, neighborhood: 'Pocitos' }, null)[0]!
        .rental?.mean
    ).toBe(850)
  })
  it('retains context without an analysis response and avoids mapping other departments', () => {
    const [row] = rentalAnalysisMapRows(boundaries, null, query, context())
    expect(row!.rental).toBeNull()
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'crime' })).toBe(1200)
    expect(
      rentalAnalysisMapRows(
        boundaries,
        analysis(),
        { ...query, department: 'Canelones' },
        context()
      )
    ).toEqual([])
    expect(
      rentalAnalysisMapRows(boundaries, analysis(), { ...query, department: '' }, context())
    ).toEqual([])
    expect(rentalAnalysisMapRows(null, analysis(), query, context())).toEqual([])
  })
})

describe('map layer values and abstentions', () => {
  it('requires eight homes and a valid requested statistic', () => {
    const [small] = rentalAnalysisMapRows(
      boundaries,
      analysis([summary('Cordón', 7)]),
      query,
      context()
    )
    expect(small!.rental?.count).toBe(7)
    expect(rentalAnalysisMapMetric(small!, selection)).toBeNull()
    const noMean = summary()
    noMean.rentMean = null
    const [missing] = rentalAnalysisMapRows(boundaries, analysis([noMean]), query, null)
    expect(rentalAnalysisMapMetric(missing!, selection)).toBeNull()
    expect(rentalAnalysisMapMetric(missing!, { ...selection, statistic: 'median' })).toBe(800)
  })
  it('distinguishes zero recorded services from missing, invalid or expired data', () => {
    const [row] = rentalAnalysisMapRows(boundaries, analysis(), query, context())
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'services' })).toBe(0)
    expect(
      rentalAnalysisMapMetric(row!, { ...selection, layer: 'services', service: 'healthcare' })
    ).toBeNull()
    row!.services!.counts.supermarket = -2
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'services' })).toBeNull()
    row!.services!.counts.supermarket = 2
    row!.services!.status = 'unavailable'
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'services' })).toBeNull()
    row!.services!.status = 'stale'
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'services' })).toBe(2)
  })
  it('shows reported crime by category without substituting department figures', () => {
    const [row] = rentalAnalysisMapRows(boundaries, analysis(), query, context())
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'crime', offense: 'hurto' })).toBe(
      1000
    )
    expect(
      rentalAnalysisMapMetric(row!, { ...selection, layer: 'crime', offense: 'abigeato' })
    ).toBeNull()
    const departmentCrime = territory()
    departmentCrime.crime!.geography = 'department'
    expect(
      rentalAnalysisMapRows(boundaries, null, query, context([departmentCrime]))[0]!.crime
    ).toBeNull()
    const differentCrime = territory()
    differentCrime.crime!.geographyName = 'Pocitos'
    expect(
      rentalAnalysisMapRows(boundaries, null, query, context([differentCrime]))[0]!.crime
    ).toBeNull()
    row!.crime!.status = 'unavailable'
    expect(rentalAnalysisMapMetric(row!, { ...selection, layer: 'crime' })).toBeNull()
  })
})

describe('map scale', () => {
  it('excludes missing values, includes recorded zero and safely handles one value', () => {
    const scale = rentalAnalysisMapScale([null, 0, 100, NaN, Infinity, -1])
    expect(scale).toEqual({ count: 2, min: 0, max: 100 })
    expect(rentalAnalysisMapColor(0, scale)).toBe(RENTAL_ANALYSIS_MAP_PALETTE[0])
    expect(rentalAnalysisMapColor(100, scale)).toBe(RENTAL_ANALYSIS_MAP_PALETTE[4])
    expect(rentalAnalysisMapColor(null, scale)).toBe(RENTAL_ANALYSIS_MAP_NO_DATA_COLOR)
    expect(rentalAnalysisMapColor(12, rentalAnalysisMapScale([12]))).toBe(
      RENTAL_ANALYSIS_MAP_PALETTE[2]
    )
    expect(rentalAnalysisMapColor(null, rentalAnalysisMapScale([]))).toBe(
      RENTAL_ANALYSIS_MAP_NO_DATA_COLOR
    )
  })
})

describe('map translations', () => {
  it('keeps keys and placeholders aligned across all three languages', () => {
    const base = rentalAnalysisMapMessages.es
    for (const translated of [rentalAnalysisMapMessages.en, rentalAnalysisMapMessages.pt]) {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(base).sort())
      for (const key of Object.keys(base) as Array<keyof typeof base>)
        expect((translated[key].match(/\{\w+\}/g) ?? []).sort()).toEqual(
          (base[key].match(/\{\w+\}/g) ?? []).sort()
        )
    }
  })
})
