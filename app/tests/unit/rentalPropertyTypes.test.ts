import { describe, expect, it } from 'vitest'
import {
  buildRentalFilter,
  isRentalTypeFilter,
  normalizeRentalQuery,
  rentalQueryToParams,
  rentalTypeMatches,
  RENTAL_TYPE_LABEL,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import {
  normalizeRentalAlertFilters,
  rentalAlertSearchUrl,
  rentalAlertSignature,
} from '../../utils/rentalAlerts'
import { emptyRentalSaved, parseRentalSaved, saveRentalSearch } from '../../utils/rentalSaved'
import {
  rentalAlertCandidatesFromRows,
  rentalAlertSearchStages,
} from '../../server/utils/rentalAlertMatching'
import { rentalDetailStages } from '../../server/utils/rentalDetail'

const propertyTypes = [
  'apartamento',
  'casa',
  'habitacion',
  'oficina',
  'garaje',
  'local',
  'terreno',
  'otro',
]
const homeTypes = ['apartamento', 'casa', 'habitacion']

const rows = propertyTypes.map((propertyType, index) => {
  const offer: RentalOffer = {
    source: 'infocasas',
    listingId: String(index),
    url: `https://www.infocasas.com.uy/aviso/${index}`,
    title: 'Apartamento, oficina o local en alquiler',
    price: 20000,
    currency: 'UYU',
    priceUyu: 20000,
    commonExpenses: 3000,
    commonExpensesCurrency: 'UYU',
    sellerName: '',
    sellerType: 'inmobiliaria',
    image: null,
    parkingSpaces: null,
    furnished: null,
    publishedAt: null,
    firstSeen: '2026-09-07',
    lastSeen: '2026-09-07',
  }
  return {
    key: propertyType,
    title: offer.title,
    propertyType,
    department: 'Montevideo',
    neighborhood: 'Centro',
    bedrooms: 1,
    offers: [offer],
  } as RentalPublicProperty
})

describe('homes and offices share one rental type filter contract', () => {
  it('groups only known residential types, regardless of an ambiguous advert title', () => {
    expect(
      rows.filter(row => rentalTypeMatches(row.propertyType, 'vivienda')).map(row => row.key)
    ).toEqual(homeTypes)
    expect(
      rows.filter(row => rentalTypeMatches(row.propertyType, 'oficina')).map(row => row.key)
    ).toEqual(['oficina'])
    for (const type of [null, undefined, '', 'unknown', 'vivienda']) {
      expect(rentalTypeMatches(type, 'vivienda')).toBe(false)
    }
    expect(rows.filter(row => rentalTypeMatches(row.propertyType, ''))).toHaveLength(rows.length)
    expect(RENTAL_TYPE_LABEL).not.toHaveProperty('vivienda')
  })

  it.each(['vivienda', ...propertyTypes])(
    'retains %s through URL normalization and serialization',
    type => {
      const query = normalizeRentalQuery({ type, department: 'Montevideo', page: '3' })
      expect(query.type).toBe(type)
      expect(normalizeRentalQuery(rentalQueryToParams(query))).toEqual(query)
    }
  )

  it.each(['constructor', '__proto__', 'viviendas', 'office', { $ne: 'oficina' }])(
    'does not accept an unknown or injected property filter: %j',
    type => {
      expect(isRentalTypeFilter(type)).toBe(false)
      expect(normalizeRentalQuery({ type }).type).toBe('')
      expect(() => normalizeRentalAlertFilters('rental-search', { type })).toThrow()
    }
  )

  it.each([
    ['vivienda', { $in: homeTypes }],
    ['oficina', 'oficina'],
    ['apartamento', 'apartamento'],
  ])('uses the same %s condition for list/map, facets, details and alerts', (type, expected) => {
    const query = normalizeRentalQuery({ type, department: 'Montevideo', neighborhood: 'Centro' })
    const filters = buildRentalFilter(query, 10, 40)
    for (const filter of Object.values(filters)) expect(filter.propertyType).toEqual(expected)
    expect(rentalDetailStages('one-property', query, 10, 40)[0]).toEqual({
      $match: expect.objectContaining({ propertyType: expected, key: 'one-property' }),
    })
    expect(rentalAlertSearchStages({ type: String(type) }, ['1'], 40)[1]).toEqual({
      $match: expect.objectContaining({ propertyType: expected }),
    })
  })

  it('keeps homes and offices distinct when selecting newly discovered alert candidates', () => {
    const wanted = new Set(
      rows.flatMap(row => row.offers.map(offer => `rent:infocasas:${offer.listingId}`))
    )
    const select = (type: string) =>
      rentalAlertCandidatesFromRows(rows, { type, monthlyMax: '25000' }, wanted, 40).map(
        candidate => candidate.propertyKey
      )
    expect(select('vivienda')).toEqual(homeTypes)
    expect(select('oficina')).toEqual(['oficina'])
    expect(select('')).toEqual(propertyTypes)
    expect(
      rentalAlertCandidatesFromRows(rows, { type: 'vivienda', monthlyMax: '22000' }, wanted, 40)
    ).toEqual([])
  })

  it('applies multiple categories as OR, retaining the same budget on each offer', () => {
    const query = normalizeRentalQuery({
      types: ['oficina', 'vivienda', 'garaje', 'oficina'],
      monthlyMax: '25000',
    })
    expect(query.types).toEqual(['garaje', 'oficina', 'vivienda'])
    expect(query.type).toBe('')
    expect(rentalQueryToParams(query)).toEqual({
      types: 'garaje,oficina,vivienda',
      monthlyMax: '25000',
    })
    const wanted = new Set(
      rows.flatMap(row => row.offers.map(offer => `rent:infocasas:${offer.listingId}`))
    )
    const candidates = rentalAlertCandidatesFromRows(rows, rentalQueryToParams(query), wanted, 40)
    expect(candidates.map(candidate => candidate.propertyKey)).toEqual([
      'apartamento',
      'casa',
      'habitacion',
      'oficina',
      'garaje',
    ])
    expect(buildRentalFilter(query, 10, 40).filter.propertyType).toEqual({
      $in: ['garaje', 'oficina', 'apartamento', 'casa', 'habitacion'],
    })
    expect(normalizeRentalQuery(rentalQueryToParams(query))).toEqual(query)
  })

  it('clears the multi-select without reviving a copied legacy singleton', () => {
    const previous = normalizeRentalQuery({ type: 'oficina' })
    const cleared = normalizeRentalQuery({ ...previous, types: [] })
    expect(cleared.types).toEqual([])
    expect(cleared.type).toBe('')
    expect(rentalQueryToParams(cleared)).not.toHaveProperty('type')
    expect(buildRentalFilter(cleared, 10).filter).not.toHaveProperty('propertyType')
  })

  it('canonicalizes OR subscriptions and saved searches independent of selection order', () => {
    const first = normalizeRentalAlertFilters('rental-search', { types: ['oficina', 'garaje'] })
    const second = normalizeRentalAlertFilters('rental-search', { types: 'garaje,oficina,garaje' })
    expect(first).toEqual({ types: 'garaje,oficina' })
    expect(rentalAlertSignature('rental-search', first)).toBe(
      rentalAlertSignature('rental-search', second)
    )
    expect(normalizeRentalAlertFilters('rental-search', { types: ['garaje'] })).toEqual({
      type: 'garaje',
    })
    expect(() =>
      normalizeRentalAlertFilters('rental-search', { types: ['garaje', 'unknown'] })
    ).toThrow()
    expect(() =>
      normalizeRentalAlertFilters('rental-search', { types: { $nin: ['oficina'] } })
    ).toThrow()
    const state = saveRentalSearch(
      emptyRentalSaved(),
      'Trabajo',
      normalizeRentalQuery(first),
      '2026-09-07T12:00:00Z'
    )
    const restored = parseRentalSaved(JSON.stringify(state)).searches[0]!
    expect(restored.params).toEqual(first)
    expect(normalizeRentalQuery(restored.params).types).toEqual(['garaje', 'oficina'])
    expect(
      new URL(
        rentalAlertSearchUrl({ kind: 'rental-search', filters: first }),
        'https://example.invalid'
      ).searchParams.get('types')
    ).toBe('garaje,oficina')
  })

  it.each(['vivienda', 'oficina', 'garaje'])(
    'persists and reopens %s in saved searches and subscriptions',
    type => {
      const query = normalizeRentalQuery({
        type,
        department: 'Montevideo',
        priceMax: '25000',
        page: 3,
      })
      const state = saveRentalSearch(
        emptyRentalSaved(),
        'Mi búsqueda',
        query,
        '2026-09-07T12:00:00Z'
      )
      const restored = parseRentalSaved(JSON.stringify(state)).searches[0]!
      expect(normalizeRentalQuery(restored.params)).toEqual({ ...query, page: 1 })

      const filters = normalizeRentalAlertFilters('rental-search', {
        ...restored.params,
        sort: 'precio',
      })
      expect(filters.type).toBe(type)
      const searchUrl = new URL(
        rentalAlertSearchUrl({ kind: 'rental-search', filters }),
        'https://example.invalid'
      )
      expect(normalizeRentalQuery(Object.fromEntries(searchUrl.searchParams)).type).toBe(type)
      expect(rentalAlertSignature('rental-search', filters)).not.toBe(
        rentalAlertSignature('rental-search', { department: 'Montevideo', priceMax: '25000' })
      )
    }
  )
})
