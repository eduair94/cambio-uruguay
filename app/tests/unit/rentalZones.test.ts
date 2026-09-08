import { describe, expect, it } from 'vitest'
import {
  buildRentalZoneResponse,
  normalizeRentalZoneQuery,
  projectRentalZoneSnapshots,
  rentalZoneBoundaries,
} from '../../utils/rentalZones'

const NOW = Date.parse('2026-09-08T12:00:00Z')
const DATE = new Date(NOW).toISOString()
const DAY = 86_400_000
const distribution = (count = 8, value = 20000) => ({
  count,
  mean: value,
  median: value,
  p25: value,
  p75: value,
})
export function zoneMarketFixture() {
  return {
    _id: 'market',
    version: 1,
    generatedAt: DATE,
    rentalDataAsOf: DATE,
    sampleMinimum: 8,
    privateObservations: [{ advertId: 'PRIVATE_ADVERT_ID', address: 'PRIVATE_ADDRESS' }],
    buckets: [
      {
        department: 'Montevideo',
        neighborhood: 'Cordón',
        propertyType: 'apartamento',
        bedrooms: 'any',
        privateObservation: 'PRIVATE_PAYLOAD',
        prices: {
          rent: distribution(),
          commonExpenses: distribution(8, 0),
          monthlyTotal: distribution(),
          builtSquareMeter: distribution(8, 400),
          sources: 2,
          lastSeenFrom: DATE,
          lastSeenTo: DATE,
        },
      },
    ],
  }
}
const offenseCounts = (total = 0) => ({
  total,
  byOffense: { hurto: total, rapina: 0, lesiones: 0, 'violencia-domestica': 0, abigeato: 0 },
})
export function zoneContextFixture() {
  return {
    _id: 'context',
    version: 1,
    generatedAt: DATE,
    geometry: {
      source: {
        dataAsOf: '2011-12-31',
        fetchedAt: DATE,
        url: 'http://private.invalid/PRIVATE_TOKEN',
      },
      zones: Array.from({ length: 62 }, (_, index) => ({
        officialCode: String(index + 1),
        department: 'Montevideo',
        name: index === 3 ? 'Cordon' : index === 7 ? 'Pocitos' : `Barrio ${index + 1}`,
        privateGeometryProperty: 'PRIVATE_BOUNDARY',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-56.2, -34.9],
              [-56.19, -34.9],
              [-56.19, -34.89],
              [-56.2, -34.9],
            ],
          ],
          private: 'PRIVATE_COORDINATES',
        },
      })),
    },
    crime: {
      periodFrom: '2025-07-01',
      periodTo: '2026-06-30',
      includesAttempts: true,
      unassignedCount: 0,
      source: {
        dataAsOf: '2026-06-30',
        fetchedAt: DATE,
        name: 'PRIVATE_SOURCE_NAME',
        secret: 'PRIVATE_SECRET',
      },
      countsByOfficialCode: Object.fromEntries(
        Array.from({ length: 62 }, (_, index) => [
          String(index + 1),
          offenseCounts(index === 3 ? 12 : 0),
        ])
      ),
      countsByDepartment: { Montevideo: offenseCounts(12), Canelones: offenseCounts(5) },
      events: [{ id: 'PRIVATE_EVENT', victim: 'PRIVATE_VICTIM' }],
    },
    services: {
      dataAsOf: DATE,
      fetchedAt: DATE,
      sourceUrl: 'http://private.invalid',
      countsByOfficialCode: Object.fromEntries(
        Array.from({ length: 62 }, (_, index) => [
          String(index + 1),
          { supermarket: 1, grocery: 2, pharmacy: 3, healthcare: 4, transit: 5, education: 6 },
        ])
      ),
      privatePoints: 'PRIVATE_POINTS',
    },
  }
}
const response = (
  market: unknown = zoneMarketFixture(),
  context: unknown = zoneContextFixture(),
  now = NOW,
  query = {}
) =>
  buildRentalZoneResponse(
    projectRentalZoneSnapshots(market, context),
    normalizeRentalZoneQuery(query),
    now
  )
const cordon = (value: ReturnType<typeof response>) =>
  value.zones.find(zone => zone.id === 'uy-mo-barrio-4')!

describe('rental zone query validation', () => {
  it('supports national defaults and explicitly typed cohorts', () => {
    expect(normalizeRentalZoneQuery({})).toEqual({
      department: '',
      propertyType: 'apartamento',
      bedrooms: 'any',
    })
    expect(
      normalizeRentalZoneQuery({
        department: '  rio   NEGRO ',
        propertyType: 'casa',
        bedrooms: '4plus',
      })
    ).toEqual({ department: 'Río Negro', propertyType: 'casa', bedrooms: '4plus' })
  })
  it.each([
    { department: ['Montevideo'] },
    { department: { $ne: '' } },
    { department: 'Buenos Aires' },
    { propertyType: 'local' },
    { bedrooms: 1 },
    { bedrooms: '5' },
    { department: 'a'.repeat(1000) },
    { department: 'Montevideo\n' },
    { _id: 'source-cache' },
  ])('rejects malformed input without echoing it', query => {
    expect(() => normalizeRentalZoneQuery(query)).toThrow('Invalid zone query')
  })
})

describe('public zone projection and geography', () => {
  it('joins only an exact scoped name and keeps all known official areas independent of market coverage', () => {
    const result = response()
    expect(result.status).toBe('ready')
    expect(result.zones).toHaveLength(62)
    expect(cordon(result).prices.rent.median).toBe(20000)
    expect(cordon(result).services?.counts).toMatchObject({
      supermarket: 1,
      healthcare: 4,
      transit: 5,
    })
    expect(cordon(result).crime).toMatchObject({
      geography: 'neighborhood',
      total: 12,
      periodTo: '2026-06-30',
    })
    expect(result.boundaryUrl).toBe('/api/rentals/zone-boundaries')
  })
  it('does not map a subset or marketing neighborhood to an approximate official polygon', () => {
    const market = zoneMarketFixture()
    market.buckets[0]!.neighborhood = 'Pocitos Nuevo'
    const result = response(market)
    const advertised = result.zones.find(zone => zone.ref.neighborhood === 'Pocitos Nuevo')!
    expect(advertised.boundaryAvailable).toBe(false)
    expect(advertised.officialCode).toBeNull()
    expect(advertised.services).toBeNull()
    expect(advertised.crime).toBeNull()
    expect(result.zones.find(zone => zone.id === 'uy-mo-barrio-8')!.prices.rent.median).toBeNull()
  })
  it('labels department crime explicitly outside Montevideo and does not borrow same-name neighborhood counts', () => {
    const market = zoneMarketFixture()
    market.buckets[0]!.department = 'Canelones'
    const result = response(market, zoneContextFixture(), NOW, { department: 'Canelones' })
    expect(result.zones).toHaveLength(1)
    expect(result.zones[0]!.crime).toMatchObject({
      geography: 'department',
      geographyName: 'Canelones',
      total: 5,
    })
    expect(result.zones[0]!.boundaryAvailable).toBe(false)
    expect(result.zones[0]!.services).toBeNull()
    expect(result.boundaryUrl).toBeNull()
  })
  it('returns no source-cache fields, event rows, advert identities, private points or arbitrary source URLs', () => {
    const projected = projectRentalZoneSnapshots(zoneMarketFixture(), zoneContextFixture())
    expect(JSON.stringify(projected)).not.toContain('PRIVATE_')
    expect(JSON.stringify(response())).not.toContain('PRIVATE_')
    const boundary = rentalZoneBoundaries(projected)!
    expect(boundary.features[3]!.properties).toEqual({
      zoneId: 'uy-mo-barrio-4',
      officialCode: '4',
      name: 'Cordon',
      department: 'Montevideo',
    })
    expect(Object.keys(boundary.features[3]!.geometry).sort()).toEqual(['coordinates', 'type'])
    expect(JSON.stringify(boundary)).not.toContain('private.invalid')
  })
  it('does not emit unvalidated coordinates or a truncated/duplicate polygon collection', () => {
    for (const mutate of [
      (context: ReturnType<typeof zoneContextFixture>) => {
        context.geometry.zones[0]!.geometry.coordinates[0]![0]![0] = NaN
      },
      (context: ReturnType<typeof zoneContextFixture>) => {
        context.geometry.zones.pop()
      },
      (context: ReturnType<typeof zoneContextFixture>) => {
        context.geometry.zones[1]!.officialCode = '1'
      },
      (context: ReturnType<typeof zoneContextFixture>) => {
        context.geometry.zones[0]!.geometry.coordinates[0]!.pop()
      },
    ]) {
      const context = zoneContextFixture()
      mutate(context)
      const snapshots = projectRentalZoneSnapshots(zoneMarketFixture(), context)
      expect(rentalZoneBoundaries(snapshots)).toBeNull()
      expect(
        buildRentalZoneResponse(snapshots, normalizeRentalZoneQuery({}), NOW).zones[0]!.prices.rent
          .median
      ).toBe(20000)
    }
  })
  it('keeps price cohorts separate without computing a median of medians', () => {
    const market = zoneMarketFixture()
    market.buckets.push({
      ...market.buckets[0]!,
      bedrooms: '1',
      prices: { ...market.buckets[0]!.prices, rent: distribution(8, 25000) },
    })
    expect(cordon(response(market)).prices.rent.median).toBe(20000)
    expect(
      cordon(response(market, zoneContextFixture(), NOW, { bedrooms: '1' })).prices.rent.median
    ).toBe(25000)
    expect(
      cordon(response(market, zoneContextFixture(), NOW, { propertyType: 'casa' })).prices.rent
        .median
    ).toBeNull()
  })
  it('abstains on duplicate cohort buckets, invalid numbers or statistically inconsistent distributions', () => {
    const duplicate = zoneMarketFixture()
    duplicate.buckets.push({ ...duplicate.buckets[0]! })
    expect(cordon(response(duplicate)).prices.rent.count).toBe(0)
    for (const value of [NaN, Infinity, -1]) {
      const market = zoneMarketFixture()
      market.buckets[0]!.prices.rent.median = value
      expect(cordon(response(market)).prices.rent.median).toBeNull()
    }
  })
  it('keeps published unknown charges different from explicit zero and enforces sample minimum independently', () => {
    const market = zoneMarketFixture()
    market.buckets[0]!.prices.rent = distribution(7, 25000)
    market.buckets[0]!.prices.commonExpenses = distribution(0, 99999)
    market.buckets[0]!.prices.monthlyTotal = distribution(0, 99999)
    market.buckets[0]!.prices.builtSquareMeter = distribution(0, 99999)
    expect(cordon(response(market)).prices).toMatchObject({
      rent: { count: 7, median: null },
      commonExpenses: { count: 0, mean: null },
      monthlyTotal: { count: 0, median: null },
    })
    expect(cordon(response()).prices.commonExpenses.median).toBe(0)
  })
})

describe('independent layer availability and clocks', () => {
  it('keeps context when market is absent, and prices when context is absent', () => {
    expect(response(null).status).toBe('ready')
    expect(response(null).zones).toHaveLength(62)
    expect(cordon(response(null)).crime?.total).toBe(12)
    expect(response(zoneMarketFixture(), null).status).toBe('ready')
    expect(response(zoneMarketFixture(), null).zones[0]!.prices.rent.median).toBe(20000)
    expect(response(null, null).status).toBe('unavailable')
  })
  it('marks market stale after36h and hides all price figures after72h without refreshing their date from context', () => {
    const stale = response(zoneMarketFixture(), zoneContextFixture(), NOW + 36 * 3_600_000 + 1)
    expect(stale.status).toBe('stale')
    expect(cordon(stale).prices.rent.median).toBe(20000)
    const expired = response(zoneMarketFixture(), zoneContextFixture(), NOW + 72 * 3_600_000 + 1)
    expect(expired.status).toBe('stale')
    expect(cordon(expired).prices.rent).toEqual({
      count: 0,
      mean: null,
      median: null,
      p25: null,
      p75: null,
    })
    expect(cordon(expired).crime?.total).toBe(12)
    expect(expired.rentalDataAsOf).toBe(DATE)
  })
  it('requires freshness of the rental data itself, not just the latest aggregation timestamp', () => {
    const market = zoneMarketFixture()
    market.rentalDataAsOf = new Date(NOW - 73 * 3_600_000).toISOString()
    expect(cordon(response(market)).prices.rent.median).toBeNull()
  })
  it('retains selectable places across property types and bedroom cohorts with missing prices', () => {
    const market = zoneMarketFixture()
    market.buckets.push({
      ...market.buckets[0]!,
      department: 'Canelones',
      neighborhood: 'Las Piedras',
      propertyType: 'casa',
      bedrooms: '3',
    })
    const place = response(market, zoneContextFixture(), NOW, {
      propertyType: 'apartamento',
      bedrooms: '1',
    }).zones.find(zone => zone.ref.neighborhood === 'Las Piedras')
    expect(place).toBeDefined()
    expect(place!.prices.rent.count).toBe(0)
    expect(place!.prices.rent.median).toBeNull()
    expect(place!.crime?.geography).toBe('department')
  })
  it('uses service dataAsOf with14/45day thresholds and preserves unknown counts after expiry', () => {
    expect(cordon(response(undefined, undefined, NOW + 14 * DAY)).services?.status).toBe('ready')
    expect(cordon(response(undefined, undefined, NOW + 14 * DAY + 1)).services?.status).toBe(
      'stale'
    )
    expect(cordon(response(undefined, undefined, NOW + 45 * DAY + 1)).services).toMatchObject({
      status: 'unavailable',
      counts: {},
    })
  })
  it('uses the historical crime period end with180/365day thresholds, never the daily context generatedAt', () => {
    const end = Date.parse('2026-06-30')
    expect(cordon(response(undefined, undefined, end + 180 * DAY)).crime?.status).toBe('ready')
    expect(cordon(response(undefined, undefined, end + 180 * DAY + 1)).crime?.status).toBe('stale')
    expect(cordon(response(undefined, undefined, end + 365 * DAY + 1)).crime).toMatchObject({
      status: 'unavailable',
      total: null,
      byOffense: {},
      periodTo: '2026-06-30',
    })
  })
  it('rejects impossible future market dates instead of treating negative age as fresh', () => {
    const market = zoneMarketFixture()
    market.generatedAt = new Date(NOW + DAY).toISOString()
    expect(cordon(response(market)).prices.rent.median).toBeNull()
  })
  it('does not use malformed periods or invalid service categories, while retaining the other layers', () => {
    const context = zoneContextFixture()
    context.crime.periodFrom = '2026-01-01'
    expect(cordon(response(undefined, context)).crime).toBeNull()
    expect(cordon(response(undefined, context)).services?.counts.supermarket).toBe(1)
  })
})
