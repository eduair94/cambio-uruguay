import { describe, expect, it } from 'vitest'
import type { RentalOffer } from '../../utils/rentals'
import {
  emptyRentalAvailability,
  normalizeRentalAvailabilityFilter,
  rentalAvailabilityHidden,
} from '../../utils/rentalAvailability'
import {
  RentalAvailabilityReportModel,
  type RentalAvailabilityReportDoc,
} from '../../server/models/RentalAvailabilityReport'
import {
  availabilityEvidence,
  resolveAvailabilityOwners,
} from '../../server/utils/rentalAvailabilityIdentity'
import {
  annotateRentalAvailability,
  buildRentalAvailabilityIndex,
} from '../../server/utils/rentalAvailabilityIndex'

const now = new Date('2026-09-06T12:00:00.000Z')
const offer = (listingId: string, source = 'infocasas') =>
  ({
    source,
    listingId,
    title: 'Apartamento unidad 101',
    priceUyu: 20000,
    lastSeen: now.toISOString(),
  }) as RentalOffer
const a = offer('a'),
  b = offer('b', 'casasweb')
const owners = () => resolveAvailabilityOwners([{ key: 'group', offers: [a, b] }], now)
const report = (
  uid: string,
  own = a,
  overrides: Partial<RentalAvailabilityReportDoc> = {}
): RentalAvailabilityReportDoc => ({
  _id: uid + own.listingId,
  uid,
  advertId: `rent:${own.source}:${own.listingId}`,
  source: own.source,
  listingId: own.listingId,
  revision: 'revision',
  reportedAt: now,
  expiresAt: new Date('2026-10-06T12:00:00Z'),
  withdrawnAt: null,
  evidence: availabilityEvidence(own),
  ...overrides,
})

describe('rental availability safe aggregation', () => {
  it('each user counts once per advert and once across only the delivered property offers', () => {
    const index = buildRentalAvailabilityIndex(
      [report('u1'), report('u1', b), report('u2', b)],
      owners(),
      now
    )
    expect(index.byAdvertId.get('rent:infocasas:a')?.count).toBe(1)
    expect(index.byAdvertId.get('rent:casasweb:b')?.count).toBe(2)
    const all = annotateRentalAvailability(
      { key: 'group', offers: [a, b], matchingOffer: a },
      index
    )
    expect(all.availability.count).toBe(2)
    expect((all.offers[0] as any).availability.count).toBe(1)
    expect((all.matchingOffer as any).availability.count).toBe(1)
    const filtered = annotateRentalAvailability(
      { key: 'group', offers: [a], matchingOffer: a },
      index
    )
    expect(filtered.availability.count).toBe(1)
    expect(index.excludedAdvertIds('hide_multiple')).toEqual(['rent:casasweb:b'])
    expect(index.excludedAdvertIds('hide_any')).toHaveLength(2)
    expect(index.excludedAdvertIds('all')).toEqual([])
  })

  it('a sibling offer does not inherit any vote', () => {
    const index = buildRentalAvailabilityIndex([report('u1')], owners(), now)
    expect(index.summaryForOffers([b], 'group')).toEqual(emptyRentalAvailability())
  })

  it('active report expiry is independent of scraper dates and excluded at the exact boundary', () => {
    const index = buildRentalAvailabilityIndex(
      [
        report('expired', a, { expiresAt: now }),
        report('withdrawn', a, { withdrawnAt: now }),
        report('future', a, { reportedAt: new Date(now.getTime() + 1) }),
        report('invalid-expiry', a, { expiresAt: new Date('invalid') }),
        report('invalid-reported', a, { reportedAt: new Date('invalid') }),
        report('valid'),
      ],
      owners(),
      now
    )
    expect(index.byAdvertId.get('rent:infocasas:a')?.count).toBe(1)
  })

  it('does not transfer a report to contradictory or ambiguous owners', () => {
    const changed = { ...a, title: 'Apartamento unidad 102' }
    expect(
      buildRentalAvailabilityIndex(
        [report('u1')],
        resolveAvailabilityOwners([{ key: 'other', offers: [changed] }], now),
        now
      ).byAdvertId.size
    ).toBe(0)
    expect(
      buildRentalAvailabilityIndex(
        [report('u1')],
        resolveAvailabilityOwners(
          [
            { key: 'first', offers: [a] },
            { key: 'second', offers: [a] },
          ],
          now
        ),
        now
      ).byAdvertId.size
    ).toBe(0)
  })

  it('a grouping correction changes the link, but the report follows its unique compatible advert', () => {
    const moved = resolveAvailabilityOwners([{ key: 'new-group', offers: [a] }], now)
    const index = buildRentalAvailabilityIndex([report('u1')], moved, now)
    expect(index.summaryForOffers([a], 'new-group').count).toBe(1)
    expect(index.summaryForOffers([a], 'old-group').count).toBe(0)
  })

  it('public projections reveal no contributor IDs or physical evidence', () => {
    const index = buildRentalAvailabilityIndex([report('PRIVATE-UID')], owners(), now)
    const output = JSON.stringify(annotateRentalAvailability({ key: 'group', offers: [a] }, index))
    expect(output).not.toMatch(/PRIVATE-UID|evidence|revision|withdrawnAt|expiresAt/)
    expect(Object.keys(index.byAdvertId.get('rent:infocasas:a')!).sort()).toEqual([
      'count',
      'lastReportedAt',
      'status',
    ])
    expect(RentalAvailabilityReportModel.schema.path('uid').options.select).toBe(false)
    expect(RentalAvailabilityReportModel.schema.path('evidence').options.select).toBe(false)
    expect(
      RentalAvailabilityReportModel.schema
        .indexes()
        .some(([, config]) => config.expireAfterSeconds !== undefined)
    ).toBe(false)
  })

  it('normalizes unsupported filters to all and uses a minimum two-person multiple threshold', () => {
    expect(normalizeRentalAvailabilityFilter('hide_multiple')).toBe('hide_multiple')
    expect(normalizeRentalAvailabilityFilter(['hide_any'])).toBe('all')
    expect(
      rentalAvailabilityHidden(
        { count: 1, lastReportedAt: null, status: 'unconfirmed' },
        'hide_multiple'
      )
    ).toBe(false)
    expect(rentalAvailabilityHidden(undefined, 'hide_any')).toBe(false)
  })
})
