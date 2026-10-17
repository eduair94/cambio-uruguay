import { describe, expect, it } from 'vitest'
import {
  isListingAlertKind,
  kindSupportsPriceDrops,
  listingAlertChips,
  listingAlertPath,
  normalizeListingAlertFilters,
} from '../../utils/listingAlerts'
import {
  RENTAL_ALERT_KINDS,
  RENTAL_ALERT_LIMIT,
  normalizeRentalAlertFilters,
  rentalAlertSearchUrl,
  rentalAlertSignature,
} from '../../utils/rentalAlerts'

const code = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    return (error as { code?: string }).code
  }
  return 'no-error'
}

describe('listing alert kinds', () => {
  it('knows the three listing directories and keeps rental kinds apart', () => {
    expect(RENTAL_ALERT_KINDS).toEqual([
      'rental-search',
      'rental-opportunity',
      'car-search',
      'moto-search',
      'sale-search',
    ])
    expect(isListingAlertKind('car-search')).toBe(true)
    expect(isListingAlertKind('rental-search')).toBe(false)
    expect(listingAlertPath('moto-search')).toBe('/motos-usadas-uruguay')
    expect(listingAlertPath('sale-search')).toBe('/venta-viviendas-uruguay')
    expect(kindSupportsPriceDrops('rental-opportunity')).toBe(false)
    expect(kindSupportsPriceDrops('rental-search')).toBe(true)
    expect(kindSupportsPriceDrops('car-search')).toBe(true)
    expect(RENTAL_ALERT_LIMIT).toBe(20)
  })
})

describe('car search filters', () => {
  it('keeps the search and drops presentation and age limits', () => {
    expect(
      normalizeRentalAlertFilters('car-search', {
        q: 'Xsara',
        brand: 'citroen',
        yearMin: '2010',
        sort: 'price_asc',
        page: '3',
        sinceDays: '7',
      })
    ).toEqual({ brand: 'citroen', q: 'Xsara', yearMin: '2010' })
  })
  it('rejects a value the directory would silently ignore and unknown keys', () => {
    expect(code(() => normalizeListingAlertFilters('car-search', { brand: 'Citroën!!' }))).toBe(
      'unsupported_filter'
    )
    expect(code(() => normalizeListingAlertFilters('car-search', { foo: '1' }))).toBe(
      'unsupported_filter'
    )
    expect(code(() => normalizeListingAlertFilters('car-search', { fuel: 'vapor' }))).toBe(
      'unsupported_filter'
    )
    expect(code(() => normalizeListingAlertFilters('car-search', 'brand=citroen'))).toBe(
      'invalid_alert'
    )
  })
  it('treats an explicit "off" switch as no filter', () => {
    expect(normalizeListingAlertFilters('car-search', { priceDrop: '0' })).toEqual({})
  })
  it('accepts thousands separators the way the page does', () => {
    expect(normalizeListingAlertFilters('car-search', { priceMax: '8.000' })).toEqual({
      priceMax: '8000',
    })
  })
})

describe('moto search filters', () => {
  it('orders a reversed year range like the page', () => {
    expect(
      normalizeListingAlertFilters('moto-search', {
        marca: 'honda',
        anioDesde: '2020',
        anioHasta: '2015',
      })
    ).toEqual({ anioDesde: '2015', anioHasta: '2020', marca: 'honda' })
  })
  it('rejects an unknown displacement band', () => {
    expect(code(() => normalizeListingAlertFilters('moto-search', { cilindrada: 'x' }))).toBe(
      'unsupported_filter'
    )
  })
})

describe('sale search filters', () => {
  it('drops recency, favourites and view, keeps the rest', () => {
    expect(
      normalizeListingAlertFilters('sale-search', {
        department: 'Montevideo',
        type: 'apartamento',
        bedrooms: '2',
        recent: '7',
        keys: 'infocasas-1',
        view: 'mapa',
      })
    ).toEqual({ bedrooms: '2', department: 'Montevideo', type: 'apartamento' })
  })
  it('treats defaults as no filter and maps the dueno alias', () => {
    expect(normalizeListingAlertFilters('sale-search', { type: 'all', currency: 'USD' })).toEqual(
      {}
    )
    expect(normalizeListingAlertFilters('sale-search', { dueno: '1' })).toEqual({ owner: '1' })
  })
  it('rejects an unknown amenity', () => {
    expect(code(() => normalizeListingAlertFilters('sale-search', { amenity: 'helipuerto' }))).toBe(
      'unsupported_filter'
    )
  })
})

describe('listing alert links and identity', () => {
  it('opens the localized directory with the stored filters', () => {
    expect(
      rentalAlertSearchUrl({ kind: 'car-search', filters: { brand: 'citroen' }, locale: 'en' })
    ).toBe('/en/autos-usados-uruguay?brand=citroen')
    expect(rentalAlertSearchUrl({ kind: 'sale-search', filters: {} })).toBe(
      '/venta-viviendas-uruguay'
    )
  })
  it('has one signature for the same search written in another order', () => {
    const a = normalizeRentalAlertFilters('car-search', { yearMin: '2010', brand: 'citroen' })
    const b = normalizeRentalAlertFilters('car-search', { brand: 'citroen', yearMin: '2010' })
    expect(rentalAlertSignature('car-search', a)).toBe(rentalAlertSignature('car-search', b))
  })
})

describe('listing alert summaries', () => {
  it('describes a car search with the directory chips', () => {
    expect(
      listingAlertChips('car-search', { brand: 'citroen', yearMin: '2010', priceMax: '8000' }, 'es')
    ).toEqual(['Citroen', 'Desde 2010', 'Hasta US$ 8.000'])
  })
  it('describes a moto search with the directory chips', () => {
    expect(listingAlertChips('moto-search', { cilindrada: 'hasta-125' }, 'es')).toEqual([
      'Hasta 125 cc',
    ])
  })
  it('describes a sale search in the subscriber language', () => {
    const es = listingAlertChips('sale-search', { department: 'Montevideo', parking: '1' }, 'es')
    const en = listingAlertChips('sale-search', { department: 'Montevideo', parking: '1' }, 'en')
    expect(es).toHaveLength(2)
    expect(es[0]).toContain('Montevideo')
    expect(en[0]).toContain('Montevideo')
    expect(en[1]).not.toBe(es[1])
  })
  it('returns nothing for an unfiltered search', () => {
    expect(listingAlertChips('car-search', {}, 'es')).toEqual([])
  })
})
