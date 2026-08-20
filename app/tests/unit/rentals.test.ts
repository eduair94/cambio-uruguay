// The rental directory's query contract and its labels.
//
// `normalizeRentalQuery` is read by BOTH the page and /api/rentals, so a filter that means one
// thing in the URL and another in the request is a class of bug this file exists to prevent — and
// the clamps below are also what stops a hand-typed `perPage=100000` from asking Mongo for the
// whole collection.
import { describe, expect, it } from 'vitest'

import {
  RENTAL_PER_PAGE,
  RENTAL_PER_PAGE_MAX,
  normalizeRentalQuery,
  rentalAgeLabel,
  rentalPriceLabel,
  rentalQueryToParams,
  rentalSpecsLabel,
} from '../../utils/rentals'

describe('normalizeRentalQuery', () => {
  it('defaults to the newest first page', () => {
    const query = normalizeRentalQuery({})
    expect(query).toMatchObject({
      sort: 'recientes',
      page: 1,
      perPage: RENTAL_PER_PAGE,
      multi: false,
    })
  })

  it('clamps the page size so a URL cannot ask for the whole collection', () => {
    expect(normalizeRentalQuery({ perPage: '100000' }).perPage).toBe(RENTAL_PER_PAGE_MAX)
    expect(normalizeRentalQuery({ perPage: '1' }).perPage).toBe(6)
    expect(normalizeRentalQuery({ page: '-4' }).page).toBe(1)
  })

  it('drops a sort it does not know instead of passing it to Mongo', () => {
    expect(normalizeRentalQuery({ sort: 'drop table' }).sort).toBe('recientes')
  })

  it('keeps a monoambiente filter, which is zero dormitorios and not "unset"', () => {
    expect(normalizeRentalQuery({ bedrooms: '0' }).bedrooms).toBe(0)
    expect(normalizeRentalQuery({}).bedrooms).toBeNull()
    expect(normalizeRentalQuery({ bedrooms: '99' }).bedrooms).toBeNull()
  })

  it('ignores prices that are not prices', () => {
    expect(normalizeRentalQuery({ priceMin: 'abc' }).priceMin).toBeNull()
    expect(normalizeRentalQuery({ priceMin: '-5' }).priceMin).toBeNull()
    expect(normalizeRentalQuery({ priceMax: '45000' }).priceMax).toBe(45_000)
  })

  it('round-trips through the URL without the defaults', () => {
    const query = normalizeRentalQuery({
      department: 'Montevideo',
      bedrooms: '2',
      multi: '1',
      page: '3',
    })
    expect(rentalQueryToParams(query)).toEqual({
      department: 'Montevideo',
      bedrooms: '2',
      multi: '1',
      page: '3',
    })
  })
})

describe('rentalPriceLabel', () => {
  it('shows the advert currency first and the other one in brackets', () => {
    expect(rentalPriceLabel(32_000, 'UYU', 40)).toBe('$ 32.000 (U$S 800)')
    expect(rentalPriceLabel(800, 'USD', 40)).toBe('U$S 800 ($ 32.000)')
  })

  it('omits the conversion when there is no rate rather than dividing by zero', () => {
    expect(rentalPriceLabel(32_000, 'UYU', 0)).toBe('$ 32.000')
  })
})

describe('rentalSpecsLabel', () => {
  it('says monoambiente instead of "0 dorm"', () => {
    expect(rentalSpecsLabel({ bedrooms: 0, bathrooms: 1, area: 32 })).toBe(
      'monoambiente · 1 baño · 32 m²'
    )
  })

  it('skips whatever the portal never published', () => {
    expect(rentalSpecsLabel({ bedrooms: 2, bathrooms: null, area: null })).toBe('2 dorm')
    expect(rentalSpecsLabel({ bedrooms: null, bathrooms: null, area: null })).toBe('')
  })
})

describe('rentalAgeLabel', () => {
  const today = new Date('2026-08-20T12:00:00Z')

  it('reads recent dates the way a person says them', () => {
    expect(rentalAgeLabel('2026-08-20', today)).toBe('hoy')
    expect(rentalAgeLabel('2026-08-19', today)).toBe('ayer')
    expect(rentalAgeLabel('2026-08-15', today)).toBe('hace 5 días')
    expect(rentalAgeLabel('2026-06-20', today)).toBe('hace 2 meses')
  })

  it('says nothing when there is no date', () => {
    expect(rentalAgeLabel(null, today)).toBe('')
    expect(rentalAgeLabel('pronto', today)).toBe('')
  })
})
