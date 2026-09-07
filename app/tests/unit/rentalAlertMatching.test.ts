import { describe, expect, it, vi } from 'vitest'
import {
  rentalAlertCandidateId,
  rentalAlertCandidatesFromRows,
  rentalAlertOpportunityMatches,
  matchRentalAlertCandidates,
} from '../../server/utils/rentalAlertMatching'
import { RentalListingModel } from '../../server/models/RentalListing'
import { RentalMetaModel } from '../../server/models/RentalMeta'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'
import type { PropertyOpportunitySnapshot } from '../../utils/propertyOpportunityQuery'
vi.mock('../../server/utils/rentalAvailability', () => ({
  loadRentalAvailabilityIndex: async () => ({
    byAdvertId: new Map([
      [
        'rent:infocasas:0',
        { count: 2, lastReportedAt: '2026-09-06T10:00:00Z', status: 'unconfirmed' },
      ],
    ]),
    excludedAdvertIds: () => ['rent:infocasas:0'],
  }),
}))

const now = Date.parse('2026-09-06T12:00:00Z')
const offer = (id: string, changes: Partial<RentalOffer> = {}): RentalOffer => ({
  source: 'infocasas',
  listingId: `infocasas:${id}`,
  url: 'https://www.infocasas.com.uy/a/1',
  title: 'Aviso',
  price: 30000,
  currency: 'UYU',
  priceUyu: 30000,
  commonExpenses: 5000,
  commonExpensesCurrency: 'UYU',
  sellerName: 'Agencia',
  sellerType: 'inmobiliaria',
  image: null,
  publishedAt: null,
  firstSeen: '2026-09-05',
  lastSeen: '2026-09-06',
  parkingSpaces: null,
  furnished: null,
  ...changes,
})
const property = (id: string, offers = [offer(id)]): RentalPublicProperty =>
  ({
    key: `property-${id}`,
    title: 'Aviso',
    offers,
    department: 'Montevideo',
    neighborhood: 'Cordón',
    bedrooms: 1,
  }) as RentalPublicProperty
const snapshot = (count: number): PropertyOpportunitySnapshot => ({
  version: 1,
  operation: 'rent',
  algorithm: 'test-v1',
  generatedAt: new Date(now).toISOString(),
  sourceReadAt: new Date(now).toISOString(),
  usdUyu: 40,
  coverage: [],
  stats: {} as PropertyOpportunitySnapshot['stats'],
  items: Array.from(
    { length: count },
    (_, i) =>
      ({
        subject: {
          id: `rent:infocasas:${i}`,
          source: 'infocasas',
          listingId: `infocasas:${i}`,
          operation: 'rent',
          department: 'Montevideo',
          neighborhood: 'Cordón',
          propertyType: 'apartamento',
          bedrooms: 1,
          comparisonPrice: 35000,
          lastSeen: '2026-09-06',
        },
        analysis: {
          oldestLastSeen: '2026-09-06',
          confidence: 'supported',
          evidenceTier: 'standard',
          conservativeGapPct: 15,
          distinctN: 8,
          median: 45000,
        },
        comparables: [],
        cautions: [],
      }) as unknown as PropertyOpportunitySnapshot['items'][number]
  ),
})

describe('rental alert matches preserve the directory semantics', () => {
  it('uses own source IDs regardless of property key, and rejects fabricated source names', () => {
    expect(rentalAlertCandidateId('infocasas', 'infocasas:123')).toBe('rent:infocasas:123')
    expect(rentalAlertCandidateId('infocasas', '123')).toBe('rent:infocasas:123')
    expect(rentalAlertCandidateId('unknown', '123')).toBeNull()
    expect(rentalAlertCandidateId('infocasas', 'https://example.com')).toBeNull()
  })

  it('requires the newly discovered offer itself to meet the currency, owner and monthly budget', () => {
    const rows = [
      property('1', [
        offer('1', { commonExpenses: null, sellerType: 'particular' }),
        offer('2', { commonExpenses: 0 }),
      ]),
    ]
    expect(
      rentalAlertCandidatesFromRows(
        rows,
        { dueno: '1', monthlyMax: '35000' },
        new Set(['rent:infocasas:1', 'rent:infocasas:2']),
        40
      )
    ).toEqual([])
    expect(
      rentalAlertCandidatesFromRows(
        rows,
        { monthlyMax: '35000' },
        new Set(['rent:infocasas:1']),
        40
      )
    ).toEqual([])
    expect(
      rentalAlertCandidatesFromRows(rows, { currency: 'USD' }, new Set(['rent:infocasas:2']), 40)
    ).toEqual([])
  })

  it('projects only permitted delivery fields with an internal, encoded detail URL', () => {
    const row = property('1', [
      Object.assign(offer('1'), {
        identity: { address: 'Private' },
        phone: 'secret',
        email: 'private',
      }),
    ])
    row.key = 'one?next=https://evil.example'
    const result = rentalAlertCandidatesFromRows([row], {}, new Set(['rent:infocasas:1']), 40)[0]
    expect(result.url).toBe('/alquileres/one%3Fnext%3Dhttps%3A%2F%2Fevil.example')
    expect(JSON.stringify(result)).not.toMatch(/Private|secret|identity|email/)
    expect(result.price).toEqual({ amount: 30000, currency: 'UYU' })
  })

  it('never sends a new advert using pets, parking, furnishing or guarantees from a different offer', () => {
    const terms = {
      petsAllowed: true as const,
      furnished: true as const,
      parkingSpaces: 1,
      guarantees: ['anda'] as RentalOffer['guarantees'],
    }
    const rows = [property('1', [offer('1'), offer('2', terms)])]
    const wanted = new Set(['rent:infocasas:1', 'rent:infocasas:2'])
    for (const filters of [
      { pets: '1' },
      { furnished: '1' },
      { parking: '1' },
      { garantia: 'anda,contaduria' },
      { pets: '1', furnished: '1', parking: '1', garantia: 'anda' },
    ])
      expect(
        rentalAlertCandidatesFromRows(rows, filters, wanted, 40).map(candidate => candidate.id)
      ).toEqual(['rent:infocasas:2'])
    expect(
      rentalAlertCandidatesFromRows(rows, { pets: '1' }, new Set(['rent:infocasas:1']), 40)
    ).toEqual([])
  })

  it('preserves a known zero common expense when its currency is immaterial', () => {
    const rows = [property('1', [offer('1', { commonExpenses: 0, commonExpensesCurrency: null })])]
    expect(
      rentalAlertCandidatesFromRows(
        rows,
        { monthlyMax: '30000' },
        new Set(['rent:infocasas:1']),
        40
      )[0].expenses
    ).toEqual({ amount: 0, currency: 'UYU' })
  })

  it('reads every opportunity page and preserves the saved comparison instead of recalculating', () => {
    const data = snapshot(113)
    const matches = rentalAlertOpportunityMatches(data, { maxPrice: '35000' }, now)
    expect(matches).toHaveLength(113)
    expect(new Set(matches.map(item => item.subject.id)).size).toBe(113)
    expect(matches.every(item => item.analysis.median === 45000)).toBe(true)
    expect(rentalAlertOpportunityMatches(data, { maxPrice: '34000' }, now)).toEqual([])
    expect(rentalAlertOpportunityMatches(data, { bedrooms: '2' }, now)).toEqual([])
  })

  it('does not alert on a stale snapshot or on expired comparison evidence', () => {
    const data = snapshot(1)
    expect(rentalAlertOpportunityMatches(data, {}, now + 7 * 3600000)).toEqual([])
    data.items[0].analysis.oldestLastSeen = '2026-09-01'
    expect(rentalAlertOpportunityMatches(data, {}, now)).toEqual([])
  })

  it('paginates more than 400 matching properties with the same filter pipeline', async () => {
    const rows = Array.from({ length: 401 }, (_, i) => property(String(i)))
    const aggregation = vi
      .spyOn(RentalListingModel, 'aggregate')
      .mockImplementation(
        () => ({ collation: () => ({ option: async () => rows.splice(0, 400) }) }) as never
      )
    const meta = vi
      .spyOn(RentalMetaModel, 'findOne')
      .mockReturnValue({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) } as never)
    try {
      const found = await matchRentalAlertCandidates(
        'rental-search',
        {},
        Array.from({ length: 401 }, (_, i) => `rent:infocasas:${i}`)
      )
      expect(found).toHaveLength(401)
      expect(aggregation).toHaveBeenCalledTimes(2)
      expect(aggregation.mock.calls[1][0]?.[0]).toMatchObject({
        $match: { key: { $gt: 'property-399' } },
      })
    } finally {
      aggregation.mockRestore()
      meta.mockRestore()
    }
  })
})
