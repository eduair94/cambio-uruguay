import { describe, expect, it } from 'vitest'
import {
  normalizePropertySalesQuery,
  propertySalesQueryToParams,
  propertySalesFiltered,
  propertySaleValidKey,
  propertySaleHasGeo,
  propertySaleHasPageQuality,
  propertySaleIndexable,
  type PropertySaleListing,
} from '../../utils/propertySales'
import {
  propertySaleSearchPattern,
  propertySalesStages,
  propertySalesSort,
  propertySalesVisibleFilter,
} from '../../utils/propertySalesQuery'

describe('sale search boundaries', () => {
  it('rejects query objects, arrays, regex operations and non-finite numbers', () => {
    const query = normalizePropertySalesQuery({
      department: { $ne: '' },
      q: ['raw'],
      minPrice: 'Infinity',
      maxArea: '-3',
      type: ['casa'],
      seller: { $where: 'evil()' },
      parking: 'false',
      page: '3.5',
      perPage: 9000,
      bedrooms: true,
    })
    expect(query).toMatchObject({
      department: '',
      q: '',
      minPrice: null,
      maxArea: null,
      type: 'all',
      seller: '',
      parking: false,
      page: 1,
      perPage: 48,
      bedrooms: '',
    })
  })
  it('retains monoambientes, explicit zero budgets and bounded source-qualified saved IDs', () => {
    const query = normalizePropertySalesQuery({
      bedrooms: '0',
      maxPrice: 0,
      keys: ['infocasas-123', 'casasweb-123', 'infocasas-123', '../private', { $ne: '' }],
    })
    expect(query.bedrooms).toBe(0)
    expect(query.maxPrice).toBe(0)
    expect(query.keys).toEqual(['infocasas-123', 'casasweb-123'])
    expect(propertySaleValidKey('casasweb-123?x')).toBe(false)
    expect(
      normalizePropertySalesQuery({ keys: Array.from({ length: 500 }, (_, i) => `infocasas-${i}`) })
        .keys
    ).toHaveLength(48)
  })
  it('round trips filters, separate area basis, sources and saved IDs through shareable URLs', () => {
    const query = normalizePropertySalesQuery({
      department: 'Montevideo',
      neighborhood: 'Cordón',
      currency: 'UYU',
      source: 'casasweb',
      minPrice: '3000000',
      bedrooms: '0',
      minArea: 40,
      areaBasis: 'total',
      amenity: 'pool',
      parking: true,
      keys: 'casasweb-12,infocasas-33',
      view: 'mapa',
      page: 2,
    })
    expect(normalizePropertySalesQuery(propertySalesQueryToParams(query))).toEqual(query)
    expect(propertySalesFiltered({ view: 'mapa' })).toBe(false)
    expect(propertySalesFiltered({ maxPrice: 120000 })).toBe(true)
    expect(propertySalesFiltered({ keys: 'infocasas-4' })).toBe(true)
  })
  it('finds accented location text but treats regex and brackets literally', () => {
    expect(new RegExp(propertySaleSearchPattern('cordon'), 'i').test('CORDÓN')).toBe(true)
    expect(
      new RegExp(propertySaleSearchPattern('pocitos (nuevo)'), 'i').test('Pocitos (Nuevo)')
    ).toBe(true)
    const pattern = new RegExp(propertySaleSearchPattern('.*'), 'i')
    expect(pattern.test('Anything')).toBe(false)
    expect(pattern.test('literal .*')).toBe(true)
  })
  it('restricts type, operation, known price, sources and original last-read at every query', () => {
    const now = Date.parse('2026-09-06T12:00:00.000Z')
    expect(propertySalesVisibleFilter(now)).toMatchObject({
      operation: 'sale',
      source: { $in: ['infocasas', 'casasweb'] },
      lastSeen: { $gte: '2026-08-16T12:00:00.000Z', $lte: '2026-09-06T12:05:00.000Z' },
      'price.amount': { $type: 'number', $gt: 0 },
    })
    const stages = propertySalesStages(
      normalizePropertySalesQuery({ recent: '3', source: 'casasweb' }),
      40,
      now
    )
    expect(stages[0].$match.lastSeen.$gte).toBe('2026-09-03T12:00:00.000Z')
    expect(stages[0].$match.source).toBe('casasweb')
    expect(stages[1].$addFields._freshAt).toEqual({
      $ifNull: ['$publishedAt', { $ifNull: ['$firstSeen', ''] }],
    })
    expect(propertySalesSort(normalizePropertySalesQuery({}))).not.toHaveProperty('lastSeen')
  })
  it('never compares a house lot as built area or converts with an absent exchange rate', () => {
    const query = normalizePropertySalesQuery({ minArea: 60, maxPrice: 100000, currency: 'USD' })
    const stages = propertySalesStages(query, 0)
    expect(stages[1].$addFields._area).toBe('$areas.built')
    expect(stages[1].$addFields._displayPrice.$cond[2]).toBeNull()
    expect(stages[2].$match._displayPrice).toMatchObject({ $type: 'number', $lte: 100000 })
    expect(
      propertySalesStages({ ...query, currency: 'UYU' }, 40)[1].$addFields._displayPrice.$cond[2]
    ).toEqual({ $multiply: ['$price.amount', 40] })
  })
  it('matches only affirmative published facility labels, not their absence or negation', () => {
    const stages = propertySalesStages(normalizePropertySalesQuery({ amenity: 'elevator' }), 40)
    const expression = new RegExp(stages[0].$match.amenities.$regex, 'i')
    expect(expression.test('Ascensor')).toBe(true)
    expect(expression.test('Sin ascensor')).toBe(false)
    expect(expression.test('No tiene ascensor')).toBe(false)
  })
  it('retains impossible min/max filters as empty ranges instead of silently widening them', () => {
    const stages = propertySalesStages(
      normalizePropertySalesQuery({ minPrice: 200000, maxPrice: 100000 }),
      40
    )
    expect(stages[2].$match._displayPrice).toMatchObject({ $gte: 200000, $lte: 100000 })
  })
  it('recognizes affirmative compound labels actually published by the source', () => {
    const matches = (amenity: string, label: string) => {
      const stages = propertySalesStages(normalizePropertySalesQuery({ amenity }), 40)
      return new RegExp(stages[0].$match.amenities.$regex, 'i').test(label)
    }
    expect(matches('terrace', 'Balcón / Terraza')).toBe(true)
    expect(matches('barbecue', 'Parrillero / Barbacoa')).toBe(true)
    expect(matches('barbecue', 'Parrillero abierto común')).toBe(true)
    expect(matches('garden', 'Jardin / Patio')).toBe(true)
    expect(matches('security', 'Cámaras de seguridad')).toBe(true)
    expect(matches('security', 'Portón eléctrico')).toBe(false)
    expect(matches('terrace', 'Sin balcón / terraza')).toBe(false)
    expect(matches('barbecue', 'Barbacoa opcional')).toBe(false)
    expect(matches('garden', 'No tiene jardín ni patio')).toBe(false)
  })
})

describe('sale location and indexing gates', () => {
  it('accepts published coordinates in Uruguay only; absence cannot become zero or a neighborhood pin', () => {
    expect(propertySaleHasGeo(null)).toBe(false)
    expect(propertySaleHasGeo({ lat: 0, lng: 0, precision: 'approximate' })).toBe(false)
    expect(propertySaleHasGeo({ lat: -34.9, lng: -56.1, precision: 'approximate' })).toBe(true)
    expect(propertySaleHasGeo({ lat: NaN, lng: -56.1, precision: 'exact' })).toBe(false)
  })
  it('does not automatically index rich source-copy dossiers outside the reviewed pilot', () => {
    const listing = {
      key: 'infocasas-99999999999',
      title: 'Apartamento en venta en Cordón',
      description: 'Descripción con datos propios. '.repeat(20),
      image: 'https://example.com/photo.jpg',
      department: 'Montevideo',
      locality: 'Montevideo',
      neighborhood: 'Cordón',
      price: { amount: 100000, currency: 'USD' },
      bedrooms: 2,
      bathrooms: 1,
      areas: { built: 60, total: null, land: null, terrace: null, reported: null },
      lastSeen: '2026-09-06T08:00:00.000Z',
    } as PropertySaleListing
    const now = Date.parse('2026-09-06T12:00:00.000Z')
    expect(propertySaleHasPageQuality(listing, now)).toBe(true)
    expect(propertySaleIndexable(listing, now)).toBe(false)
    expect(propertySaleHasPageQuality({ ...listing, lastSeen: '2026-07-01T00:00:00Z' }, now)).toBe(
      false
    )
    expect(propertySaleHasPageQuality({ ...listing, bedrooms: null }, now)).toBe(false)
  })
})
