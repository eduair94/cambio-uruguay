import { describe, expect, it } from 'vitest'
import {
  applyDrift,
  buildWatchlistBoard,
  localitiesForDepartment,
  localityCenter,
  rankCardCosts,
  sanitizeStoredSnapshot,
  shouldRefreshSnapshot,
  takeSnapshot,
  zoneCenter,
  type WatchBranch,
  type WatchRateRow,
} from '../../utils/watchlistBoard'
import { DEFAULT_WATCHLIST, type Watchlist } from '../../utils/watchlist'

const MVD = { lat: -34.9011, lng: -56.1645 }

const branch = (p: Partial<WatchBranch> & { origin: string }): WatchBranch => ({
  dept: 'MONTEVIDEO',
  locality: 'MONTEVIDEO',
  lat: MVD.lat,
  lng: MVD.lng,
  name: `Sucursal ${p.origin}`,
  address: '',
  ...p,
})

const rate = (p: Partial<WatchRateRow> & { origin: string }): WatchRateRow => ({
  code: 'USD',
  type: '',
  buy: 39,
  sell: 41,
  ...p,
})

const list = (patch: Partial<Watchlist> = {}): Watchlist => ({ ...DEFAULT_WATCHLIST, ...patch })

describe('localitiesForDepartment', () => {
  const branches = [
    branch({ origin: 'a', dept: 'SALTO', locality: 'SALTO' }),
    branch({ origin: 'b', dept: 'SALTO', locality: 'SALTO' }),
    branch({ origin: 'c', dept: 'SALTO', locality: 'Daymán' }),
    branch({ origin: 'd', dept: 'RIVERA', locality: 'RIVERA' }),
  ]

  it('lists the localities of one department with their branch counts, busiest first', () => {
    expect(localitiesForDepartment(branches, 'SALTO')).toEqual([
      { locality: 'SALTO', count: 2 },
      { locality: 'Daymán', count: 1 },
    ])
  })

  it('matches the department ignoring case and accents', () => {
    const withAccent = [branch({ origin: 'x', dept: 'PAYSANDÚ', locality: 'PAYSANDU' })]
    expect(localitiesForDepartment(withAccent, 'PAYSANDU')).toEqual([
      { locality: 'PAYSANDU', count: 1 },
    ])
  })

  it('returns nothing for an unknown department', () => {
    expect(localitiesForDepartment(branches, 'NARNIA')).toEqual([])
  })
})

describe('localityCenter', () => {
  it('uses the real branches of that locality instead of inventing a coordinate', () => {
    const branches = [
      branch({ origin: 'a', dept: 'SALTO', locality: 'SALTO', lat: -31.4, lng: -57.9 }),
      branch({ origin: 'b', dept: 'SALTO', locality: 'SALTO', lat: -31.2, lng: -58.1 }),
      branch({ origin: 'c', dept: 'SALTO', locality: 'Daymán', lat: -31.6, lng: -57.9 }),
    ]
    const center = localityCenter(branches, 'SALTO', 'SALTO')!
    expect(center.lat).toBeCloseTo(-31.3, 5)
    expect(center.lng).toBeCloseTo(-58.0, 5)
  })

  it('ignores a branch whose coordinates are plainly wrong', () => {
    // A real row in `/api/locations` carries Montevideo with the signs flipped,
    // which lands it in China and drags an average 45 km off the city.
    const branches = [
      branch({ origin: 'a', dept: 'MONTEVIDEO', locality: 'MONTEVIDEO', lat: -34.9, lng: -56.17 }),
      branch({ origin: 'b', dept: 'MONTEVIDEO', locality: 'MONTEVIDEO', lat: -34.89, lng: -56.16 }),
      branch({ origin: 'c', dept: 'MONTEVIDEO', locality: 'MONTEVIDEO', lat: 34.88, lng: 56.08 }),
    ]
    const center = localityCenter(branches, 'MONTEVIDEO', 'MONTEVIDEO')!
    expect(center.lat).toBeLessThan(-34)
    expect(center.lng).toBeLessThan(-56)
  })

  it('is null when that locality has no branches', () => {
    expect(localityCenter([], 'SALTO', 'SALTO')).toBeNull()
  })
})

describe('zoneCenter', () => {
  it('returns a point zone unchanged', () => {
    const zone = { mode: 'point' as const, lat: -34.9, lng: -56.1, radiusKm: 5 }
    expect(zoneCenter([], zone)).toEqual({ lat: -34.9, lng: -56.1 })
  })

  it('returns the centroid of the department branches for a department zone', () => {
    const branches = [
      branch({ origin: 'a', dept: 'SALTO', lat: -31.4, lng: -57.9 }),
      branch({ origin: 'b', dept: 'SALTO', lat: -31.2, lng: -58.1 }),
    ]
    const center = zoneCenter(branches, { mode: 'department', department: 'SALTO' })!
    expect(center.lat).toBeCloseTo(-31.3, 5)
  })

  it('is null with no zone', () => {
    expect(zoneCenter([], null)).toBeNull()
  })
})

describe('buildWatchlistBoard reach', () => {
  // Rivera is ~500 km from Montevideo: nothing in the capital is "near" it.
  const RIVERA = { lat: -30.9, lng: -55.55 }

  it('keeps an online quote for a user in the interior even with no branch nearby', () => {
    // The whole point of the feature: Prex/eBROU/transfer prices are national.
    // Filtering them by distance would hide exactly what serves the interior.
    const rows = buildWatchlistBoard({
      branches: [branch({ origin: 'gales' })],
      rates: [rate({ origin: 'prex' }), rate({ origin: 'brou', type: 'EBROU' })],
      watchlist: list({
        zone: { mode: 'point', lat: RIVERA.lat, lng: RIVERA.lng, radiusKm: 5 },
      }),
    })
    expect(rows.map(r => r.origin).sort()).toEqual(['brou', 'prex'])
    expect(rows.every(r => r.channel === 'online')).toBe(true)
    expect(rows.every(r => r.distanceKm === null)).toBe(true)
  })

  it('drops a counter quote whose nearest branch is outside the radius', () => {
    const rows = buildWatchlistBoard({
      branches: [branch({ origin: 'gales' })],
      rates: [rate({ origin: 'gales' })],
      watchlist: list({
        zone: { mode: 'point', lat: RIVERA.lat, lng: RIVERA.lng, radiusKm: 5 },
      }),
    })
    expect(rows).toEqual([])
  })

  it('keeps a counter quote inside the radius and measures its nearest branch', () => {
    const rows = buildWatchlistBoard({
      branches: [
        branch({ origin: 'gales', lat: -34.95, lng: -56.2 }),
        branch({ origin: 'gales', lat: -34.9015, lng: -56.165 }), // a few hundred metres away
      ],
      rates: [rate({ origin: 'gales' })],
      watchlist: list({ zone: { mode: 'point', lat: MVD.lat, lng: MVD.lng, radiusKm: 5 } }),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.distanceKm).toBeLessThan(1)
    expect(rows[0]!.branch?.lat).toBeCloseTo(-34.9015, 4)
  })

  it('in department mode keeps the houses with a branch in that department, accents aside', () => {
    const rows = buildWatchlistBoard({
      branches: [
        branch({ origin: 'gales', dept: 'PAYSANDÚ' }),
        branch({ origin: 'cambilex', dept: 'MONTEVIDEO' }),
      ],
      rates: [rate({ origin: 'gales' }), rate({ origin: 'cambilex' })],
      watchlist: list({ zone: { mode: 'department', department: 'PAYSANDU' } }),
    })
    expect(rows.map(r => r.origin)).toEqual(['gales'])
  })

  it('in department mode measures the nearest branch inside that department', () => {
    const rows = buildWatchlistBoard({
      branches: [
        // Same house: two branches in the zone, and one in another department
        // sitting exactly on the zone centre. The reader is asking "where do I
        // go in MY department", so the out-of-zone branch must not win.
        branch({ origin: 'gales', dept: 'SALTO', locality: 'SALTO', lat: -31.4, lng: -57.96 }),
        branch({ origin: 'gales', dept: 'SALTO', locality: 'SALTO', lat: -31.44, lng: -57.96 }),
        branch({ origin: 'gales', dept: 'CANELONES', locality: 'PANDO', lat: -31.42, lng: -57.96 }),
      ],
      rates: [rate({ origin: 'gales' })],
      watchlist: list({ zone: { mode: 'department', department: 'SALTO' } }),
    })
    expect(rows[0]!.branch?.locality).toBe('SALTO')
  })

  it('falls back to the published department list for a house with no mapped branches', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'cambio_minas' })],
      watchlist: list({ zone: { mode: 'department', department: 'LAVALLEJA' } }),
      departmentsByOrigin: { cambio_minas: ['LAVALLEJA'] },
    })
    expect(rows.map(r => r.origin)).toEqual(['cambio_minas'])
  })

  it('shows every reachable house when no zone is set yet', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'gales' }), rate({ origin: 'prex' })],
      watchlist: list(),
    })
    expect(rows).toHaveLength(2)
  })
})

describe('buildWatchlistBoard selection', () => {
  it('honours the followed origins and ignores the rest', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'gales' }), rate({ origin: 'cambilex' })],
      watchlist: list({ origins: ['cambilex'] }),
    })
    expect(rows.map(r => r.origin)).toEqual(['cambilex'])
  })

  it('keeps only the followed currencies', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'gales' }), rate({ origin: 'gales', code: 'BRL', sell: 8 })],
      watchlist: list({ currencies: ['BRL'] }),
    })
    expect(rows.map(r => r.code)).toEqual(['BRL'])
  })

  it('drops the BCU reference and the interbank quotes nobody can transact at', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [
        rate({ origin: 'bcu' }),
        rate({ origin: 'brou', type: 'INTERBANCARIO' }),
        rate({ origin: 'gales' }),
      ],
      watchlist: list(),
    })
    expect(rows.map(r => r.origin)).toEqual(['gales'])
  })

  it('drops a quote with no usable price in the chosen direction', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'gales', sell: 0 }), rate({ origin: 'cambilex', sell: 41 })],
      watchlist: list({ direction: 'sell' }),
    })
    expect(rows.map(r => r.origin)).toEqual(['cambilex'])
  })

  it('marks the cheapest sell as best when the user is buying foreign currency', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'caro', sell: 42 }), rate({ origin: 'barato', sell: 40.5 })],
      watchlist: list({ direction: 'sell' }),
    })
    expect(rows[0]!.origin).toBe('barato')
    expect(rows[0]!.best).toBe(true)
    expect(rows[1]!.best).toBe(false)
  })

  it('marks the highest buy as best when the user is selling foreign currency', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'poco', buy: 38 }), rate({ origin: 'mucho', buy: 39.5 })],
      watchlist: list({ direction: 'buy' }),
    })
    expect(rows[0]!.origin).toBe('mucho')
    expect(rows[0]!.best).toBe(true)
  })

  it('puts the dollar first, the way the rest of the site orders currencies', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [
        rate({ origin: 'a', code: 'BRL', sell: 8 }),
        rate({ origin: 'b', code: 'USD', sell: 41 }),
        rate({ origin: 'c', code: 'ARS', sell: 0.04 }),
      ],
      watchlist: list({ currencies: ['USD', 'BRL', 'ARS'] }),
    })
    expect(rows.map(r => r.code)).toEqual(['USD', 'ARS', 'BRL'])
  })

  it('marks one best per currency, not one for the whole board', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [
        rate({ origin: 'a', code: 'USD', sell: 41 }),
        rate({ origin: 'b', code: 'BRL', sell: 8 }),
      ],
      watchlist: list({ currencies: ['USD', 'BRL'] }),
    })
    expect(rows.filter(r => r.best)).toHaveLength(2)
  })

  it('keeps the operation and account-required flags so a transfer is never sold as cash', () => {
    const rows = buildWatchlistBoard({
      branches: [],
      rates: [rate({ origin: 'itau', type: 'TRANSFERENCIA' })],
      watchlist: list(),
    })
    expect(rows[0]!.operation).toBe('transfer')
    expect(rows[0]!.requiresAccount).toBe(true)
  })
})

describe('drift since the last visit', () => {
  const rows = buildWatchlistBoard({
    branches: [],
    rates: [rate({ origin: 'gales', sell: 41 })],
    watchlist: list({ direction: 'sell' }),
  })

  it('reports no delta the first time, when there is nothing to compare against', () => {
    const drifted = applyDrift(rows, {})
    expect(drifted[0]!.prev).toBeNull()
    expect(drifted[0]!.deltaPct).toBeNull()
  })

  it('reports the move against the price seen last time', () => {
    const drifted = applyDrift(rows, takeSnapshot([{ ...rows[0]!, price: 40 }]))
    expect(drifted[0]!.prev).toBe(40)
    expect(drifted[0]!.deltaPct).toBeCloseTo(2.5, 5)
  })

  it('snapshots by origin, type and currency so two quotes of one house never collide', () => {
    const snap = takeSnapshot(
      buildWatchlistBoard({
        branches: [],
        rates: [
          rate({ origin: 'brou', type: '', sell: 41 }),
          rate({ origin: 'brou', type: 'EBROU', sell: 40 }),
        ],
        watchlist: list(),
      })
    )
    expect(Object.keys(snap)).toHaveLength(2)
  })
})

describe('snapshot freshness', () => {
  const HOUR = 60 * 60 * 1000

  it('takes a first snapshot when there is none stored', () => {
    expect(shouldRefreshSnapshot(null, 1_000_000)).toBe(true)
  })

  it('keeps a recent snapshot, so a reload does not erase "since your last visit"', () => {
    const now = 100 * HOUR
    expect(shouldRefreshSnapshot({ at: now - HOUR, prices: { k: 41 } }, now)).toBe(false)
  })

  it('refreshes once the stored snapshot is older than the window', () => {
    const now = 100 * HOUR
    expect(shouldRefreshSnapshot({ at: now - 7 * HOUR, prices: { k: 41 } }, now)).toBe(true)
  })

  it('refreshes when the stored timestamp is in the future (clock changed)', () => {
    const now = 100 * HOUR
    expect(shouldRefreshSnapshot({ at: now + 5 * HOUR, prices: { k: 41 } }, now)).toBe(true)
  })

  it('reads back a stored snapshot and drops corrupt entries', () => {
    const parsed = sanitizeStoredSnapshot({
      at: 123,
      prices: { good: 41, bad: 'x', zero: 0, negative: -3 },
    })
    expect(parsed).toEqual({ at: 123, prices: { good: 41 } })
  })

  it('returns null for anything that is not a stored snapshot', () => {
    expect(sanitizeStoredSnapshot(null)).toBeNull()
    expect(sanitizeStoredSnapshot({ prices: {} })).toBeNull()
    expect(sanitizeStoredSnapshot('nope')).toBeNull()
  })
})

describe('rankCardCosts', () => {
  it('ranks the cards the user actually carries, cheapest first', () => {
    const ranked = rankCardCosts(['prex', 'oca-blue'], 49.99, 41.6, 40.5)
    expect(ranked).toHaveLength(2)
    expect(ranked[0]!.cost.totalPesos).toBeLessThanOrEqual(ranked[1]!.cost.totalPesos)
  })

  it('ignores ids that are not real cards', () => {
    expect(rankCardCosts(['prex', 'not-a-card'], 100, 41).map(r => r.card.id)).toEqual(['prex'])
  })

  it('returns nothing without a usable selling rate, rather than a made-up cost', () => {
    expect(rankCardCosts(['prex'], 100, 0)).toEqual([])
  })

  it('flags a card whose commission the issuer does not publish', () => {
    const ranked = rankCardCosts(['prex'], 100, 41)
    expect(ranked[0]!.unknownFee).toBe(false)
  })
})
