import { describe, expect, it } from 'vitest'
import {
  parseRentalReferencePoint,
  rentalDistanceKm,
  rentalDistanceStages,
} from '../../utils/rentalDistance'
import { buildRentalFilter, normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'
import { normalizeRentalAlertFilters } from '../../utils/rentalAlerts'
import { emptyRentalSaved, parseRentalSaved, saveRentalSearch } from '../../utils/rentalSaved'

const reference = { refLat: -34.9, refLng: -56.17 }
const located = (lat: unknown = -34.89, lng: unknown = -56.17) => ({
  latitude: lat,
  longitude: lng,
  offers: [{ identity: { version: 1, latitude: lat, longitude: lng } }],
})

describe('map reference query', () => {
  it('normalizes a full pair and round-trips it with all filters and distance sorting', () => {
    const query = normalizeRentalQuery({
      type: 'vivienda',
      source: 'infocasas',
      pets: '1',
      monthlyMax: '30000',
      refLat: '-34.900123456',
      refLng: '-56.171237',
      sort: 'distancia',
      page: '3',
    })
    expect(query).toMatchObject({ refLat: -34.90012, refLng: -56.17124, sort: 'distancia' })
    expect(normalizeRentalQuery(rentalQueryToParams(query))).toEqual(query)
    expect(rentalQueryToParams({ ...query, sort: 'precio' })).toMatchObject({
      refLat: '-34.90012',
      refLng: '-56.17124',
      sort: 'precio',
      type: 'vivienda',
    })
    const saved = saveRentalSearch(
      emptyRentalSaved(),
      'Cerca del trabajo',
      query,
      '2026-09-07T00:00:00Z'
    )
    expect(
      normalizeRentalQuery(parseRentalSaved(JSON.stringify(saved)).searches[0]!.params)
    ).toEqual({
      ...query,
      page: 1,
    })
  })

  it.each([
    {},
    { refLat: -34.9 },
    { refLng: -56.17 },
    { refLat: '', refLng: '' },
    { refLat: null, refLng: -56.17 },
    { refLat: false, refLng: -56.17 },
    { refLat: ['-34.9', '-34.8'], refLng: -56.17 },
    { refLat: '-3.49e1', refLng: -56.17 },
    { refLat: '-34.9x', refLng: -56.17 },
    { refLat: NaN, refLng: -56.17 },
    { refLat: -34.9, refLng: Infinity },
    { refLat: -35.500001, refLng: -56.17 },
    { refLat: -29.999999, refLng: -56.17 },
    { refLat: -34.9, refLng: -58.600001 },
    { refLat: -34.9, refLng: -52.999999 },
    { refLat: { $gte: -34.9 }, refLng: -56.17 },
  ])('rejects invalid reference %j without leaving an impossible distance sort', input => {
    expect(parseRentalReferencePoint(input)).toBeNull()
    expect(rentalDistanceStages(input)).toEqual([])
    const query = normalizeRentalQuery({ ...input, sort: 'distancia', type: 'oficina' })
    expect(query).toMatchObject({ refLat: null, refLng: null, sort: 'recientes', type: 'oficina' })
    expect(rentalQueryToParams(query)).toEqual({ type: 'oficina' })
  })

  it('changes only presentation, retaining the actual filter and subscription conditions', () => {
    const filters = {
      type: 'vivienda',
      source: 'casasweb',
      monthlyMax: '35000',
      pets: '1',
      neighborhood: 'Cordón',
      availability: 'hide_multiple',
    }
    const withDistance = {
      ...filters,
      ...reference,
      sort: 'distancia',
      refLabel: 'Hocquart y Democracia',
    }
    expect(buildRentalFilter(normalizeRentalQuery(withDistance), 10, 40)).toEqual(
      buildRentalFilter(normalizeRentalQuery(filters), 10, 40)
    )
    expect(normalizeRentalAlertFilters('rental-search', withDistance)).toEqual(
      normalizeRentalAlertFilters('rental-search', filters)
    )
  })
})

describe('reference labels', () => {
  it('retains a safe label with coordinates and discards orphaned or malformed labels', () => {
    const query = normalizeRentalQuery({
      ...reference,
      refLabel: '<b>Hocquart</b>\u0000 y Democracia',
      sort: 'distancia',
    })
    expect(query.refLabel).toBe('Hocquart y Democracia')
    expect(normalizeRentalQuery(rentalQueryToParams(query))).toEqual(query)
    expect(normalizeRentalQuery({ refLabel: 'Hocquart y Democracia' }).refLabel).toBe('')
    expect(normalizeRentalQuery({ ...reference, refLabel: ['Ambiguous'] }).refLabel).toBe('')
    expect(normalizeRentalQuery({ ...reference, refLabel: 'x'.repeat(200) }).refLabel).toHaveLength(
      160
    )
  })
})

describe('source-owned straight-line distance', () => {
  it('measures approximately 1.11 km per northward .01 degree and preserves true zero', () => {
    expect(rentalDistanceKm(located(), reference)).toBeCloseTo(1.111949, 5)
    expect(rentalDistanceKm(located(-34.9), reference)).toBe(0)
  })

  it.each([
    located(null),
    located('invalid'),
    located('-34.89'),
    located(NaN),
    located(Infinity),
    located(-40),
    located(-34.89, null),
    located(-34.89, 'invalid'),
    { ...located(), offers: [] },
    { ...located(), offers: [{ identity: { version: 0, latitude: -34.89, longitude: -56.17 } }] },
    { ...located(), offers: [{ identity: { version: 1, latitude: -34.88, longitude: -56.17 } }] },
    {
      ...located(),
      offers: [
        { identity: { version: 1, latitude: -34.89, longitude: -56.17, addressHidden: true } },
      ],
    },
  ])('does not invent distance for malformed, hidden or unowned location %j', row => {
    expect(rentalDistanceKm(row, reference)).toBeNull()
  })

  it('vetoes contradictory visible own coordinates beyond 100m, but allows slight point shifts', () => {
    const row = located()
    row.offers.push({ identity: { version: 1, latitude: -34.8895, longitude: -56.17 } })
    expect(rentalDistanceKm(row, reference)).not.toBeNull()
    row.offers[1]!.identity.latitude = -34.88
    expect(rentalDistanceKm(row, reference)).toBeNull()
  })
})
