import { describe, expect, it } from 'vitest'
import { RentalListingModel } from '../../server/models/RentalListing'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  rentalCommonExpensesUyu,
  rentalMatchingOffer,
  rentalMongoSort,
  rentalOfferStages,
  rentalQueryToParams,
  rentalTextMatches,
  totalMonthlyUyu,
  type RentalOffer,
} from '../../utils/rentals'

const offer = (overrides: Partial<RentalOffer> = {}): RentalOffer => ({
  source: 'infocasas',
  listingId: 'infocasas:1',
  url: 'https://www.infocasas.com.uy/1',
  title: 'Apartamento',
  price: 30_000,
  currency: 'UYU',
  priceUyu: 30_000,
  commonExpenses: 5_000,
  commonExpensesCurrency: 'UYU',
  sellerName: '',
  sellerType: 'inmobiliaria',
  image: null,
  publishedAt: null,
  firstSeen: '2026-09-04',
  lastSeen: '2026-09-04',
  parkingSpaces: null,
  furnished: null,
  ...overrides,
})

describe('rental query bookmarks and browser history', () => {
  it('finds accented neighborhood labels from a keyboard without accents', () => {
    expect(rentalTextMatches('Cordón', 'cordon')).toBe(true)
    expect(rentalTextMatches('Malvín Norte', 'MALVIN')).toBe(true)
    expect(rentalTextMatches('José Ignacio', 'jose ignacio')).toBe(true)
    expect(rentalTextMatches('Cordón', 'pocitos')).toBe(false)
    expect(rentalTextMatches('Cordón', '')).toBe(true)
    expect(rentalTextMatches(null, 'cordon')).toBe(false)
  })

  it('round-trips every filter, including the previously dropped proximity and guarantee filters', () => {
    const query = normalizeRentalQuery({
      q: 'Luis Alberto',
      department: 'Montevideo',
      neighborhoods: ['Pocitos', 'Cordón'],
      type: 'apartamento',
      source: 'casasweb',
      bedrooms: 2,
      bedroomsExact: 1,
      bathrooms: 2,
      areaMin: 45.5,
      areaMax: 120,
      currency: 'USD',
      priceMin: 20_000,
      priceMax: 40_000,
      monthlyMax: 45_000,
      expensesMax: 0,
      multi: 1,
      pets: 1,
      parking: 1,
      furnished: 1,
      garantia: 'anda,contaduria',
      gc: 1,
      dueno: 1,
      sedes: '123,456',
      radio: 2.5,
      sort: 'precio',
      page: 3,
      perPage: 48,
    })
    expect(normalizeRentalQuery(rentalQueryToParams(query))).toEqual(query)
    expect(normalizeRentalQuery(query as unknown as Record<string, unknown>)).toEqual(query)
  })

  it('accepts existing singular neighborhood URLs and deduplicates multi-neighborhood input', () => {
    const old = normalizeRentalQuery({ neighborhood: 'Pocitos' })
    expect(old.neighborhoods).toEqual(['Pocitos'])
    expect(rentalQueryToParams(old)).toEqual({ neighborhood: 'Pocitos' })
    expect(
      normalizeRentalQuery({ neighborhoods: ['Pocitos,Cordón', ' Pocitos ', ''] }).neighborhoods
    ).toEqual(['Pocitos', 'Cordón'])
  })

  it('rejects malformed numeric input instead of silently stripping its letters', () => {
    for (const value of ['1e3', 'abc20', '30000 pesos', {}, Infinity, NaN]) {
      expect(normalizeRentalQuery({ monthlyMax: value }).monthlyMax).toBeNull()
    }
    expect(normalizeRentalQuery({ priceMax: ['30000', '50000'] }).priceMax).toBe(30_000)
    expect(normalizeRentalQuery({ type: '__proto__', source: 'constructor' })).toMatchObject({
      type: '',
      source: '',
    })
    expect(normalizeRentalQuery({ page: Number.MAX_SAFE_INTEGER }).page).toBe(10_000)
  })

  it('orders reversed ranges, preserves zero expenses, and defaults an empty radius', () => {
    expect(
      normalizeRentalQuery({
        areaMin: 100,
        areaMax: 40,
        priceMin: 40_000,
        priceMax: 20_000,
        expensesMax: 0,
        radio: '',
      })
    ).toMatchObject({
      areaMin: 40,
      areaMax: 100,
      priceMin: 20_000,
      priceMax: 40_000,
      expensesMax: 0,
      radioKm: 1.5,
    })
    expect(normalizeRentalQuery({ expensesMax: -1 }).expensesMax).toBeNull()
  })
})

describe('rental property filters', () => {
  it('a studio means zero bedrooms, while ordinary counts can be minimum or exact', () => {
    expect(buildRentalFilter(normalizeRentalQuery({ bedrooms: 0 }), 10).filter.bedrooms).toBe(0)
    expect(buildRentalFilter(normalizeRentalQuery({ bedrooms: 2 }), 10).filter.bedrooms).toEqual({
      $gte: 2,
    })
    expect(
      buildRentalFilter(normalizeRentalQuery({ bedrooms: 2, bedroomsExact: 1 }), 10).filter.bedrooms
    ).toBe(2)
  })

  it('keeps other neighborhoods available in the selected department, without dropping other filters', () => {
    const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(
      normalizeRentalQuery({
        department: 'Montevideo',
        neighborhoods: 'Pocitos,Cordón',
        bathrooms: 2,
        areaMin: 50,
        areaMax: 80,
        parking: 1,
        furnished: 1,
      }),
      10
    )
    expect(filter.neighborhood).toEqual({ $in: ['Pocitos', 'Cordón'] })
    expect(withoutNeighborhood).toMatchObject({
      department: 'Montevideo',
      bathrooms: { $gte: 2 },
      area: { $type: 'number', $gte: 50, $lte: 80 },
      parkingSpaces: { $gte: 1 },
      furnished: true,
    })
    expect(withoutNeighborhood.neighborhood).toBeUndefined()
    expect(nonLocation.department).toBeUndefined()
  })

  it('requires source, currency, publisher and published expenses on the same offer', () => {
    const { filter } = buildRentalFilter(
      normalizeRentalQuery({ source: 'elpais', currency: 'USD', dueno: 1, gc: 1 }),
      10
    )
    expect(filter.offers).toEqual({
      $elemMatch: {
        source: 'elpais',
        currency: 'USD',
        sellerType: 'particular',
        commonExpenses: { $type: 'number', $gte: 0 },
      },
    })
  })

  it('keeps indexed ordering for default searches and stable tie-breaks for every sort', () => {
    expect(rentalOfferStages(normalizeRentalQuery({}), 40)).toEqual([])
    for (const sort of ['recientes', 'precio', 'precio-desc', 'metros'] as const)
      expect(rentalMongoSort(sort).key).toBe(1)
  })

  it('the model can cast the budget expression used by countDocuments without changing its meaning', () => {
    const query = normalizeRentalQuery({
      monthlyMax: 40_000,
      expensesMax: 5_000,
      currency: 'UYU',
      dueno: 1,
    })
    const filter = buildRentalFilter(query, 10, 40).filter
    const cast = RentalListingModel.countDocuments(filter).cast()
    expect(cast.$expr).toEqual(filter.$expr)
  })
})

describe('published expenses and the advert that actually meets a budget', () => {
  it('distinguishes unknown, explicitly free, and expenses with an unknown currency', () => {
    expect(totalMonthlyUyu(offer({ commonExpenses: null }), 40)).toBeNull()
    expect(totalMonthlyUyu(offer({ commonExpenses: 0, commonExpensesCurrency: null }), 0)).toBe(
      30_000
    )
    expect(totalMonthlyUyu(offer({ commonExpensesCurrency: null }), 40)).toBeNull()
    expect(totalMonthlyUyu(offer({ commonExpenses: Number.NaN }), 40)).toBeNull()
    expect(totalMonthlyUyu(offer({ priceUyu: Infinity }), 40)).toBeNull()
  })

  it('converts expenses in their own currency and fails closed without an exchange rate', () => {
    expect(
      rentalCommonExpensesUyu(offer({ commonExpenses: 100, commonExpensesCurrency: 'USD' }), 40)
    ).toBe(4_000)
    expect(rentalCommonExpensesUyu(offer({ commonExpensesCurrency: 'USD' }), 0)).toBeNull()
    expect(rentalCommonExpensesUyu(offer({ commonExpensesCurrency: 'USD' }), Infinity)).toBeNull()
  })

  it('never combines cheap rent on one portal with cheaper expenses on another', () => {
    const offers = [
      offer({ priceUyu: 30_000, commonExpenses: 10_000 }),
      offer({ listingId: 'infocasas:2', priceUyu: 34_000, commonExpenses: 2_000 }),
    ]
    expect(
      rentalMatchingOffer(offers, normalizeRentalQuery({ monthlyMax: 33_000 }), 40)
    ).toBeUndefined()
    expect(
      rentalMatchingOffer(offers, normalizeRentalQuery({ monthlyMax: 37_000 }), 40)?.listingId
    ).toBe('infocasas:2')
  })

  it('does not use the owner on one advert to satisfy a budget found on an agency advert', () => {
    const offers = [
      offer({ sellerType: 'particular', commonExpenses: null }),
      offer({ listingId: 'infocasas:2', commonExpenses: 0 }),
    ]
    expect(
      rentalMatchingOffer(offers, normalizeRentalQuery({ dueno: 1, monthlyMax: 35_000 }), 40)
    ).toBeUndefined()
  })

  it('an explicit no-expenses filter cannot match missing expenses', () => {
    const query = normalizeRentalQuery({ expensesMax: 0 })
    expect(rentalMatchingOffer([offer({ commonExpenses: null })], query, 40)).toBeUndefined()
    expect(rentalMatchingOffer([offer({ commonExpenses: 0 })], query, 40)).toBeDefined()
  })
})
