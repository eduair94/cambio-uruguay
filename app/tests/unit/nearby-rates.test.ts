import { describe, it, expect } from 'vitest'
import { haversineKm, buildRatesByOrigin, rankNearby } from '../../utils/nearbyRates'

const user = { lat: -34.9011, lng: -56.1645 } // central Montevideo

const branches = [
  { origin: 'itau', lat: -34.9055, lng: -56.1922, id: 'a' },   // ~1.7 km
  { origin: 'brou', lat: -34.9080, lng: -56.2100, id: 'b' },   // ~4.2 km
  { origin: 'gales', lat: -34.8350, lng: -55.9500, id: 'c' },  // ~21 km (out of 10km radius)
  { origin: 'norate', lat: -34.9012, lng: -56.1646, id: 'd' }, // ~0 km but no USD rate
]

const rows = [
  { origin: 'itau', code: 'USD', buy: 39.8, sell: 41.0 },
  { origin: 'brou', code: 'USD', buy: 39.7, sell: 40.5 },
  { origin: 'gales', code: 'USD', buy: 40.1, sell: 40.2 },
  { origin: 'itau', code: 'EUR', buy: 44.0, sell: 46.0 },
]

describe('haversineKm', () => {
  it('is ~0 for identical points', () => {
    expect(haversineKm(user, user)).toBeCloseTo(0, 5)
  })
  it('computes a known distance within tolerance', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(d).toBeGreaterThan(111) // ~111.3 km per degree of longitude at equator
    expect(d).toBeLessThan(112)
  })
})

describe('buildRatesByOrigin', () => {
  it('indexes by origin then code', () => {
    const r = buildRatesByOrigin(rows)
    expect(r.itau.USD.buy).toBe(39.8)
    expect(r.itau.EUR.sell).toBe(46.0)
  })
})

describe('rankNearby', () => {
  const rates = buildRatesByOrigin(rows)

  it('buy direction: within radius, sorted by highest buy, excludes far + no-rate', () => {
    const out = rankNearby(branches, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['itau', 'brou'])
    expect(out[0].rate).toBe(39.8)
    expect(out[0].distanceKm).toBeGreaterThan(0)
  })

  it('sell direction: sorted by lowest sell', () => {
    const out = rankNearby(branches, rates, user, 10, 'USD', 'sell')
    expect(out.map(o => o.branch.origin)).toEqual(['brou', 'itau'])
    expect(out[0].rate).toBe(40.5)
  })

  it('excludes branches whose casa has no rate for the currency', () => {
    const out = rankNearby(branches, rates, user, 10, 'USD', 'buy')
    expect(out.find(o => o.branch.origin === 'norate')).toBeUndefined()
  })

  it('empty when radius is tiny', () => {
    expect(rankNearby(branches, rates, user, 0.0001, 'USD', 'buy')).toEqual([])
  })
})
