import { describe, expect, it } from 'vitest'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  rentalOfferMatchesQuery,
  rentalOfferStages,
  rentalOfferTermMatches,
  rentalQueryToParams,
  type RentalOffer,
} from '../../utils/rentals'
import { normalizeRentalAlertFilters } from '../../utils/rentalAlerts'
import { rentalDirectoryCacheKey } from '../../server/utils/rentalDirectoryWarm'

// A reader asked on 2026-10-09 to "separar por anuales, temporada, invernales, con y sin mueble".
const offer = (overrides: Partial<RentalOffer> = {}): RentalOffer => ({
  source: 'facebook',
  listingId: 'facebook:1',
  url: 'https://www.facebook.com/marketplace/item/1/',
  title: 'Apartamento',
  price: 30_000,
  currency: 'UYU',
  priceUyu: 30_000,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: '',
  sellerType: 'particular',
  image: null,
  publishedAt: null,
  firstSeen: '2026-10-09',
  lastSeen: '2026-10-09',
  parkingSpaces: null,
  furnished: null,
  ...overrides,
})

describe('furniture filter', () => {
  it('reads "sin muebles" from the URL, and asking both ways asks neither', () => {
    expect(normalizeRentalQuery({ sinMuebles: '1' })).toMatchObject({
      unfurnished: true,
      furnished: false,
    })
    expect(normalizeRentalQuery({ furnished: '1' })).toMatchObject({
      unfurnished: false,
      furnished: true,
    })
    expect(normalizeRentalQuery({ furnished: '1', sinMuebles: '1' })).toMatchObject({
      unfurnished: false,
      furnished: false,
    })
    expect(rentalQueryToParams(normalizeRentalQuery({ sinMuebles: '1' }))).toMatchObject({
      sinMuebles: '1',
    })
  })

  it('matches only adverts that SAY so: absence is never "sin muebles"', () => {
    const query = normalizeRentalQuery({ sinMuebles: '1' })
    expect(rentalOfferMatchesQuery(offer({ furnished: false }), query, 40)).toBe(true)
    expect(rentalOfferMatchesQuery(offer({ furnished: null }), query, 40)).toBe(false)
    expect(rentalOfferMatchesQuery(offer({ furnished: true }), query, 40)).toBe(false)
    expect(buildRentalFilter(query, 10).nonLocation).toMatchObject({
      furnished: false,
      offers: { $elemMatch: { furnished: false } },
    })
  })
})

describe('contract period filter', () => {
  it('normalizes the period and keeps it in the URL and the cache key', () => {
    expect(normalizeRentalQuery({ plazo: 'Invernal' }).term).toBe('invernal')
    expect(normalizeRentalQuery({ plazo: 'temporada' }).term).toBe('')
    expect(rentalQueryToParams(normalizeRentalQuery({ plazo: 'anual' }))).toMatchObject({
      plazo: 'anual',
    })
    expect(rentalDirectoryCacheKey({ plazo: 'invernal' })).not.toBe(rentalDirectoryCacheKey({}))
  })

  it('"anual" is everything but winter-only; "invernal" is what offers winter', () => {
    expect(rentalOfferTermMatches(undefined, 'anual')).toBe(true)
    expect(rentalOfferTermMatches(['invernal'], 'anual')).toBe(false)
    expect(rentalOfferTermMatches(['anual', 'invernal'], 'anual')).toBe(true)
    expect(rentalOfferTermMatches(['anual', 'invernal'], 'invernal')).toBe(true)
    expect(rentalOfferTermMatches([], 'invernal')).toBe(false)
    const winter = normalizeRentalQuery({ plazo: 'invernal' })
    expect(rentalOfferMatchesQuery(offer({ terms: ['invernal'] }), winter, 40)).toBe(true)
    expect(rentalOfferMatchesQuery(offer(), winter, 40)).toBe(false)
  })

  it('selects the matching advert inside Mongo too', () => {
    expect(rentalOfferStages(normalizeRentalQuery({}), 40)).toEqual([])
    expect(
      rentalOfferStages(normalizeRentalQuery({ plazo: 'invernal' }), 40).length
    ).toBeGreaterThan(0)
    expect(
      buildRentalFilter(normalizeRentalQuery({ plazo: 'anual' }), 10).nonLocation
    ).toMatchObject({
      offers: { $elemMatch: { $or: [{ terms: 'anual' }, { terms: { $ne: 'invernal' } }] } },
    })
  })
})

describe('rental alerts', () => {
  it('accept both new criteria as the directory button sends them', () => {
    expect(() =>
      normalizeRentalAlertFilters('rental-search', { sinMuebles: '1', plazo: 'invernal' })
    ).not.toThrow()
  })
})
