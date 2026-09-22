import { describe, expect, it } from 'vitest'
import {
  RENTAL_INDEX_ALLOWLIST_MAX_AGE_DAYS,
  RENTAL_INDEX_MIN_AGE_DAYS,
  RENTAL_INDEX_NO_DEMAND_REASON,
  rentalIndexAllowlistFrom,
  rentalListingIndexable,
  withRentalIndexHygiene,
  type RentalIndexAllowlistDoc,
} from '../../utils/rentalIndexHygiene'

const NOW = Date.parse('2026-09-22T12:00:00Z')
const DAY = 86_400_000
const doc = (overrides: Partial<RentalIndexAllowlistDoc> = {}): RentalIndexAllowlistDoc => ({
  family: 'alquileres',
  asOf: '2026-09-22',
  windowDays: 56,
  minImpressions: 5,
  urls: ['/alquileres/pocitos-con-demanda'],
  rowCount: 40,
  complete: true,
  ...overrides,
})
const allowlist = rentalIndexAllowlistFrom(doc(), NOW)
const old = new Date(NOW - 90 * DAY).toISOString().slice(0, 10)
const young = new Date(NOW - 10 * DAY).toISOString().slice(0, 10)

describe('rentalListingIndexable', () => {
  it('leaves a young listing indexable whatever the allowlist says', () => {
    expect(
      rentalListingIndexable({ firstSeenAt: young, path: '/alquileres/nueva' }, allowlist, NOW)
    ).toBe(true)
    // Justo por debajo de las 8 semanas sigue siendo joven; a partir de 56 días ya no.
    const edge = (days: number) => new Date(NOW - days * DAY).toISOString()
    expect(
      rentalListingIndexable(
        { firstSeenAt: edge(RENTAL_INDEX_MIN_AGE_DAYS - 1), path: '/alquileres/x' },
        allowlist,
        NOW
      )
    ).toBe(true)
    expect(
      rentalListingIndexable(
        { firstSeenAt: edge(RENTAL_INDEX_MIN_AGE_DAYS), path: '/alquileres/x' },
        allowlist,
        NOW
      )
    ).toBe(false)
  })
  it('keeps an old listing that the allowlist names', () => {
    expect(
      rentalListingIndexable(
        { firstSeenAt: old, path: '/alquileres/pocitos-con-demanda' },
        allowlist,
        NOW
      )
    ).toBe(true)
  })
  it('sends an old listing without measured demand to noindex', () => {
    expect(
      rentalListingIndexable({ firstSeenAt: old, path: '/alquileres/sin-demanda' }, allowlist, NOW)
    ).toBe(false)
  })
  it('changes nothing without an allowlist — absence is never a verdict', () => {
    expect(
      rentalListingIndexable({ firstSeenAt: old, path: '/alquileres/sin-demanda' }, null, NOW)
    ).toBe(true)
    expect(
      rentalListingIndexable({ firstSeenAt: old, path: '/alquileres/sin-demanda' }, undefined, NOW)
    ).toBe(true)
  })
  it('changes nothing when the first-seen date cannot be read', () => {
    expect(
      rentalListingIndexable({ firstSeenAt: '', path: '/alquileres/sin-demanda' }, allowlist, NOW)
    ).toBe(true)
    expect(
      rentalListingIndexable(
        { firstSeenAt: undefined, path: '/alquileres/sin-demanda' },
        allowlist,
        NOW
      )
    ).toBe(true)
  })
})

describe('rentalIndexAllowlistFrom', () => {
  it('turns a fresh, complete document into a path set', () => {
    expect(allowlist).toEqual({
      asOf: '2026-09-22',
      windowDays: 56,
      minImpressions: 5,
      paths: new Set(['/alquileres/pocitos-con-demanda']),
    })
  })
  it('refuses a missing, stale, incomplete or malformed document', () => {
    expect(rentalIndexAllowlistFrom(null, NOW)).toBeNull()
    expect(rentalIndexAllowlistFrom(undefined, NOW)).toBeNull()
    expect(rentalIndexAllowlistFrom(doc({ complete: false }), NOW)).toBeNull()
    expect(rentalIndexAllowlistFrom(doc({ asOf: 'ayer' }), NOW)).toBeNull()
    expect(rentalIndexAllowlistFrom(doc({ urls: 'x' as unknown as string[] }), NOW)).toBeNull()
    const stale = new Date(NOW - (RENTAL_INDEX_ALLOWLIST_MAX_AGE_DAYS + 1) * DAY)
      .toISOString()
      .slice(0, 10)
    expect(rentalIndexAllowlistFrom(doc({ asOf: stale }), NOW)).toBeNull()
    const justInTime = new Date(NOW - (RENTAL_INDEX_ALLOWLIST_MAX_AGE_DAYS - 1) * DAY)
      .toISOString()
      .slice(0, 10)
    expect(rentalIndexAllowlistFrom(doc({ asOf: justInTime }), NOW)).not.toBeNull()
  })
})

describe('withRentalIndexHygiene', () => {
  const page = {
    canonicalPath: '/alquileres/sin-demanda',
    property: { firstSeen: old },
    seo: { indexable: true, reasons: [] as string[], contentUpdatedAt: null },
  }
  it('adds the reason and drops indexable for an old listing without demand', () => {
    expect(withRentalIndexHygiene(page, allowlist, NOW).seo).toEqual({
      indexable: false,
      reasons: [RENTAL_INDEX_NO_DEMAND_REASON],
      contentUpdatedAt: null,
    })
  })
  it('returns the same page object when nothing changes', () => {
    expect(withRentalIndexHygiene(page, null, NOW)).toBe(page)
    expect(
      withRentalIndexHygiene({ ...page, property: { firstSeen: young } }, allowlist, NOW).seo
        .indexable
    ).toBe(true)
  })
  it('keeps the quality reasons a page already carried', () => {
    const withIssue = {
      ...page,
      seo: { ...page.seo, indexable: false, reasons: ['missing_photo'] },
    }
    expect(withRentalIndexHygiene(withIssue, allowlist, NOW).seo.reasons).toEqual([
      'missing_photo',
      RENTAL_INDEX_NO_DEMAND_REASON,
    ])
  })
})
