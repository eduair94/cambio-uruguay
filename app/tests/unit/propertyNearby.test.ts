import { describe, expect, it } from 'vitest'
import {
  propertyNearbyOrigin,
  rentalNearbyOrigin,
  propertyNearbyDataState,
  publicPropertyNearbyItem,
  emptyPropertyNearby,
} from '../../utils/propertyNearby'
describe('nearby service location and privacy', () => {
  const origin = propertyNearbyOrigin(-34.9, -56.16)!
  const identity = { version: 1, latitude: -34.9, longitude: -56.16 }
  it.each([
    [null, null],
    ['-34.9', '-56.16'],
    [NaN, -56],
    [0, 0],
    [-34, Infinity],
  ])('rejects missing or synthetic location (%s,%s)', (lat, lng) => {
    expect(propertyNearbyOrigin(lat, lng)).toBeNull()
  })
  it('accepts only visible own evidence matching the public point', () => {
    expect(
      rentalNearbyOrigin({ latitude: -34.9, longitude: -56.16, offers: [{ identity }] })
    ).toEqual(origin)
    expect(rentalNearbyOrigin({ latitude: -34.9, longitude: -56.16, offers: [] })).toBeNull()
    expect(
      rentalNearbyOrigin({
        latitude: -34.9,
        longitude: -56.16,
        offers: [{ identity: { ...identity, addressHidden: true } }],
      })
    ).toBeNull()
  })
  it('abstains on contradictory live own points but does not expose a hidden point', () => {
    const row = {
      latitude: -34.9,
      longitude: -56.16,
      offers: [{ identity }, { identity: { ...identity, latitude: -34.91 } }],
    }
    expect(rentalNearbyOrigin(row)).toBeNull()
    row.offers[1].identity = { ...row.offers[1].identity, addressHidden: true } as any
    expect(rentalNearbyOrigin(row)).toEqual(origin)
  })
  it('rebuilds a POI without any future or contributor/contact fields', () => {
    const point = publicPropertyNearbyItem(
      {
        id: 'node/123',
        name: 'Almacén',
        location: { coordinates: [-56.16, -34.9], private: 'hidden' },
        distanceM: 17.8,
        pointKind: 'node',
        phone: '123',
        email: 'private',
        user: 'mapper',
        tags: { private: 'hidden' },
      },
      origin
    )!
    expect(Object.keys(point).sort()).toEqual(
      ['id', 'name', 'lat', 'lng', 'distanceM', 'pointKind', 'osmUrl', 'walkingUrl'].sort()
    )
    expect(point.distanceM).toBe(18)
    const link = new URL(point.walkingUrl)
    expect(link.hostname).toBe('www.google.com')
    expect(link.searchParams.get('origin')).toBe('-34.9,-56.16')
    expect(link.searchParams.get('travelmode')).toBe('walking')
    expect(point.osmUrl).toBe('https://www.openstreetmap.org/node/123')
  })
  it('does not create URLs from arbitrary IDs or distant/out-of-range results', () => {
    const row = {
      id: '../secret',
      pointKind: 'node',
      location: { coordinates: [-56.16, -34.9] },
      distanceM: 20,
    }
    expect(publicPropertyNearbyItem(row, origin)).toBeNull()
    expect(publicPropertyNearbyItem({ ...row, id: 'node/1', distanceM: 1001 }, origin)).toBeNull()
  })
  it('uses source data age, with a finite grace period', () => {
    const now = Date.parse('2026-09-07T00:00:00Z')
    expect(propertyNearbyDataState('2026-09-06T00:00:00Z', now)).toBe('ready')
    expect(propertyNearbyDataState('2026-08-20T00:00:00Z', now)).toBe('stale')
    expect(propertyNearbyDataState('2026-06-01T00:00:00Z', now)).toBe('unavailable')
    expect(propertyNearbyDataState('bad', now)).toBe('unavailable')
  })
  it('unlocated remains distinct from no mapped services', () => {
    const value = emptyPropertyNearby('rent', 'fixture', null, 'unlocated')
    expect(value.status).toBe('unlocated')
    expect(value.coverage).toBe('partial')
    expect(value.categories).toHaveLength(6)
    expect(value.dataAsOf).toBeNull()
  })
})
