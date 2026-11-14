import { describe, expect, it } from 'vitest'
import {
  catalogQueryWithFilters,
  CHAIR_SHARE_QUERY_KEYS,
  chairFiltersFromQuery,
  chairFiltersToQuery,
  PHONE_SHARE_QUERY_KEYS,
  phoneFiltersFromQuery,
  phoneFiltersToQuery,
} from '../../utils/catalogShareQuery'
import { normalizeSharePath } from '../../utils/sharedLinks'

describe('catalog sharing round trips', () => {
  it('restores all chair filters and sorting exactly from a public share URL', () => {
    const filters = {
      query: 'lumbar',
      category: 'ergonomic' as const,
      brand: 'Steelcase',
      maxPrice: 15000,
      condition: 'used' as const,
      minStars: 4.5,
      sort: 'price-asc' as const,
    }
    const path = normalizeSharePath(
      '/sillas-escritorio-uruguay/precios?' + new URLSearchParams(chairFiltersToQuery(filters))
    )!
    expect(
      chairFiltersFromQuery(
        Object.fromEntries(new URL(path, 'https://cambio-uruguay.com').searchParams)
      )
    ).toEqual(filters)
  })

  it('restores phone brand and price, including an explicitly zero ceiling', () => {
    for (const maxPrice of [0, 15000, null]) {
      const filters = { brand: 'samsung', maxPrice }
      const path = normalizeSharePath(
        '/celulares-uruguay?' + new URLSearchParams(phoneFiltersToQuery(filters))
      )!
      expect(
        phoneFiltersFromQuery(
          Object.fromEntries(new URL(path, 'https://cambio-uruguay.com').searchParams)
        )
      ).toEqual(filters)
    }
  })

  it('omits default choices and rejects malformed or excessive prices', () => {
    expect(chairFiltersToQuery(chairFiltersFromQuery({}))).toEqual({})
    expect(phoneFiltersToQuery(phoneFiltersFromQuery({}))).toEqual({})
    for (const precioMax of ['-1', 'Infinity', 'NaN', '1000001', '4e2', '']) {
      expect(phoneFiltersFromQuery({ precioMax }).maxPrice).toBeNull()
      expect(chairFiltersFromQuery({ precioMax }).maxPrice).toBeNull()
    }
    expect(
      chairFiltersFromQuery({ categoria: 'other', rating: '5.5', condicion: 'wrong', orden: 'bad' })
    ).toMatchObject({ category: 'all', minStars: 0, condition: 'all', sort: 'relevance' })
    expect(phoneFiltersFromQuery({ marca: '<script>' }).brand).toBe('script')
  })

  it('replaces only owned parameters and preserves unrelated/repeated values', () => {
    expect(
      catalogQueryWithFilters(
        '?utm_source=chat&extra=a&extra=b&marca=lg&precioMax=100',
        PHONE_SHARE_QUERY_KEYS,
        { marca: 'samsung' }
      )
    ).toBe('utm_source=chat&extra=a&extra=b&marca=samsung')
    expect(catalogQueryWithFilters('?q=old&rating=3&camp=abc', CHAIR_SHARE_QUERY_KEYS, {})).toBe(
      'camp=abc'
    )
  })
})
