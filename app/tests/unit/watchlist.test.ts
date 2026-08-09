import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WATCHLIST,
  MAX_CARDS,
  MAX_ORIGINS,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  decodeWatchlist,
  encodeWatchlist,
  isConfigured,
  mergeWatchlists,
  sanitizeWatchlist,
  type Watchlist,
} from '../../utils/watchlist'

const list = (patch: Partial<Watchlist> = {}): Watchlist => ({ ...DEFAULT_WATCHLIST, ...patch })

describe('sanitizeWatchlist', () => {
  it('returns the defaults for anything that is not an object', () => {
    expect(sanitizeWatchlist(null)).toEqual(DEFAULT_WATCHLIST)
    expect(sanitizeWatchlist('nope')).toEqual(DEFAULT_WATCHLIST)
    expect(sanitizeWatchlist(42)).toEqual(DEFAULT_WATCHLIST)
  })

  it('keeps a point zone and clamps its radius into range', () => {
    const tooBig = sanitizeWatchlist({
      zone: { mode: 'point', lat: -34.9, lng: -56.16, radiusKm: 9999, label: 'Mi ubicación' },
    })
    expect(tooBig.zone).toEqual({
      mode: 'point',
      lat: -34.9,
      lng: -56.16,
      radiusKm: MAX_RADIUS_KM,
      label: 'Mi ubicación',
    })
    const tooSmall = sanitizeWatchlist({
      zone: { mode: 'point', lat: -34.9, lng: -56.16, radiusKm: 0 },
    })
    expect(tooSmall.zone?.radiusKm).toBe(MIN_RADIUS_KM)
  })

  it('drops a point zone without usable coordinates', () => {
    expect(sanitizeWatchlist({ zone: { mode: 'point', radiusKm: 5 } }).zone).toBeNull()
    expect(sanitizeWatchlist({ zone: { mode: 'point', lat: 'x', lng: -56 } }).zone).toBeNull()
  })

  it('keeps a department zone and drops the coordinates it does not use', () => {
    const w = sanitizeWatchlist({
      zone: { mode: 'department', department: 'PAYSANDÚ', lat: -32, lng: -58, radiusKm: 5 },
    })
    expect(w.zone).toEqual({ mode: 'department', department: 'PAYSANDÚ', label: 'PAYSANDÚ' })
  })

  it('drops a zone with an unknown mode or an empty department', () => {
    expect(sanitizeWatchlist({ zone: { mode: 'galaxy', lat: 1, lng: 2 } }).zone).toBeNull()
    expect(sanitizeWatchlist({ zone: { mode: 'department', department: '  ' } }).zone).toBeNull()
  })

  it('dedupes and caps the followed origins, dropping non-strings', () => {
    const many = Array.from({ length: MAX_ORIGINS + 10 }, (_, i) => `casa${i}`)
    const w = sanitizeWatchlist({ origins: [...many, 'casa0', 7, null, '  '] })
    expect(w.origins).toHaveLength(MAX_ORIGINS)
    expect(new Set(w.origins).size).toBe(MAX_ORIGINS)
    expect(w.origins[0]).toBe('casa0')
  })

  it('caps the followed cards', () => {
    const w = sanitizeWatchlist({
      cards: Array.from({ length: MAX_CARDS + 5 }, (_, i) => `card${i}`),
    })
    expect(w.cards).toHaveLength(MAX_CARDS)
  })

  it('upper-cases currencies and drops the ones that are not currency codes', () => {
    const w = sanitizeWatchlist({ currencies: ['usd', 'BRL', 'not a code', '', 'usd'] })
    expect(w.currencies).toEqual(['USD', 'BRL'])
  })

  it('falls back to USD when every currency is invalid', () => {
    expect(sanitizeWatchlist({ currencies: ['', 123] }).currencies).toEqual(['USD'])
  })

  it('accepts only the two directions', () => {
    expect(sanitizeWatchlist({ direction: 'buy' }).direction).toBe('buy')
    expect(sanitizeWatchlist({ direction: 'sideways' }).direction).toBe(DEFAULT_WATCHLIST.direction)
  })

  it('clamps the reference amount and rejects nonsense', () => {
    expect(sanitizeWatchlist({ amountUsd: -5 }).amountUsd).toBe(DEFAULT_WATCHLIST.amountUsd)
    expect(sanitizeWatchlist({ amountUsd: 1e9 }).amountUsd).toBe(100000)
    expect(sanitizeWatchlist({ amountUsd: 49.99 }).amountUsd).toBe(49.99)
  })

  it('trims oversized origin ids instead of storing them whole', () => {
    const w = sanitizeWatchlist({ origins: ['x'.repeat(500)] })
    expect(w.origins[0]!.length).toBeLessThanOrEqual(60)
  })
})

describe('isConfigured', () => {
  it('is false for an untouched list', () => {
    expect(isConfigured(DEFAULT_WATCHLIST)).toBe(false)
  })

  it('is true once there is a zone, an origin or a card', () => {
    expect(isConfigured(list({ zone: { mode: 'department', department: 'SALTO' } }))).toBe(true)
    expect(isConfigured(list({ origins: ['gales'] }))).toBe(true)
    expect(isConfigured(list({ cards: ['prex'] }))).toBe(true)
  })
})

describe('mergeWatchlists', () => {
  it('adopts the local list when the account has nothing', () => {
    const local = list({ origins: ['gales'], cards: ['prex'], amountUsd: 49.99 })
    expect(mergeWatchlists(local, DEFAULT_WATCHLIST)).toEqual(local)
  })

  it('unions origins, cards and currencies with the account first', () => {
    const local = list({ origins: ['gales'], cards: ['prex'], currencies: ['BRL'] })
    const remote = list({ origins: ['cambilex'], cards: ['oca-blue'], currencies: ['USD'] })
    const merged = mergeWatchlists(local, remote)
    expect(merged.origins).toEqual(['cambilex', 'gales'])
    expect(merged.cards).toEqual(['oca-blue', 'prex'])
    expect(merged.currencies).toEqual(['USD', 'BRL'])
  })

  it('keeps the account zone when it has one', () => {
    const local = list({ zone: { mode: 'department', department: 'SALTO' } })
    const remote = list({ zone: { mode: 'department', department: 'RIVERA' } })
    expect(mergeWatchlists(local, remote).zone?.department).toBe('RIVERA')
  })

  it('takes the local zone when the account has none', () => {
    const local = list({ zone: { mode: 'department', department: 'SALTO' } })
    expect(mergeWatchlists(local, DEFAULT_WATCHLIST).zone?.department).toBe('SALTO')
  })

  it('sanitizes both sides so a hostile stored payload cannot survive the merge', () => {
    const merged = mergeWatchlists(
      { origins: [1 as never], cards: [], currencies: [], direction: 'x' as never } as never,
      { amountUsd: -1 } as never
    )
    expect(merged.origins).toEqual([])
    expect(merged.direction).toBe(DEFAULT_WATCHLIST.direction)
    expect(merged.amountUsd).toBe(DEFAULT_WATCHLIST.amountUsd)
  })
})

describe('encodeWatchlist / decodeWatchlist', () => {
  it('round-trips a configured list, accents included', () => {
    const w = list({
      zone: { mode: 'department', department: 'PAYSANDÚ', label: 'PAYSANDÚ' },
      origins: ['gales', 'cambilex'],
      cards: ['prex'],
      currencies: ['USD', 'BRL'],
      direction: 'buy',
      amountUsd: 49.99,
    })
    expect(decodeWatchlist(encodeWatchlist(w))).toEqual(w)
  })

  it('produces a URL-safe token', () => {
    const token = encodeWatchlist(list({ origins: ['gales'] }))
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('returns null instead of throwing on junk', () => {
    expect(decodeWatchlist('')).toBeNull()
    expect(decodeWatchlist('!!!not base64!!!')).toBeNull()
    expect(decodeWatchlist(encodeWatchlist(list()).slice(0, 4))).toBeNull()
  })

  it('sanitizes what it decodes, so a crafted link cannot inject a huge list', () => {
    const hostile = Array.from({ length: 500 }, (_, i) => `o${i}`)
    const token = encodeWatchlist({ ...DEFAULT_WATCHLIST, origins: hostile } as Watchlist)
    expect(decodeWatchlist(token)!.origins).toHaveLength(MAX_ORIGINS)
  })
})
