import { describe, expect, it } from 'vitest'
import {
  normalizeRentalAlertFilters,
  rentalAlertSearchUrl,
  rentalAlertSignature,
} from '../../utils/rentalAlerts'
import { normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'
import { MUTUALISTA_SEDES } from '../../utils/mutualistaSedes'

describe('rental subscription criteria', () => {
  it('retains the full search semantics, including same-offer budgets and minimum bedrooms', () => {
    const input = {
      department: 'Montevideo',
      neighborhood: 'Cordón',
      bedrooms: '2',
      bedroomsExact: '1',
      bathrooms: '2',
      areaMin: '50',
      areaMax: '100',
      priceMin: '20000',
      priceMax: '35000',
      monthlyMax: '39000',
      expensesMax: '0',
      currency: 'USD',
      pets: '1',
      furnished: '1',
      parking: '1',
      gc: '1',
      dueno: '1',
      multi: '1',
      source: 'infocasas',
      type: 'apartamento',
      garantia: 'anda',
      q: 'patio',
      page: '9',
      perPage: '48',
      sort: 'precio',
      view: 'mapa',
    }
    const normalized = normalizeRentalAlertFilters('rental-search', input)
    const expected = rentalQueryToParams({
      ...normalizeRentalQuery(input),
      page: 1,
      perPage: 24,
      sort: 'recientes',
    })
    expect(normalized).toEqual(expected)
    expect(normalized.expensesMax).toBe('0')
    expect(normalized.monthlyMax).toBe('39000')
  })

  it('canonicalizes OR sets regardless of user selection order', () => {
    const first = normalizeRentalAlertFilters('rental-search', {
      neighborhoods: 'Pocitos,Cordón',
      garantia: 'anda,contaduria',
    })
    const second = normalizeRentalAlertFilters('rental-search', {
      neighborhoods: ['Cordón', 'Pocitos'],
      guarantees: ['contaduria', 'anda'],
      sort: 'precio',
    })
    expect(rentalAlertSignature('rental-search', first)).toBe(
      rentalAlertSignature('rental-search', second)
    )
  })

  it('retains supported reference points and radius', () => {
    const ids = MUTUALISTA_SEDES.slice(0, 2).map(row => row.osmId)
    const actual = normalizeRentalAlertFilters('rental-search', {
      sedes: ids.join(','),
      radio: '2',
    })
    expect(actual.sedes).toBe([...ids].sort((a, b) => a - b).join(','))
    expect(actual.radio).toBe('2')
  })

  it('keeps opportunity evidence and total-monthly budget separate from rental filters', () => {
    const filters = normalizeRentalAlertFilters('rental-opportunity', {
      operation: 'rent',
      department: 'Montevideo',
      bedrooms: '0',
      maxPrice: '25000',
      confidence: 'supported',
      evidence: 'exploratory',
      signal: 'price_per_m2',
      page: 2,
      sort: 'discount',
    })
    expect(filters).toEqual({
      department: 'Montevideo',
      bedrooms: '0',
      maxPrice: '25000',
      confidence: 'supported',
      evidence: 'exploratory',
      signal: 'price_per_m2',
    })
    expect(filters).not.toHaveProperty('priceMax')
    expect(rentalAlertSearchUrl({ kind: 'rental-opportunity', filters, locale: 'pt' })).toContain(
      '/pt/oportunidades-inmobiliarias-uruguay?'
    )
    expect(rentalAlertSearchUrl({ kind: 'rental-opportunity', filters })).toContain(
      'operation=rent'
    )
  })

  it.each([
    ['rental-search', { priceMax: { $gt: 1 } }],
    ['rental-search', { keys: 'known-house' }],
    ['rental-search', { priceMax: 'abc' }],
    ['rental-search', { source: 'unknown' }],
    ['rental-search', { pets: 'maybe' }],
    ['rental-search', { bedrooms: 99 }],
    ['rental-search', { garantia: 'deposito' }],
    ['rental-search', { sedes: '999999999999999' }],
    ['rental-opportunity', { operation: 'sale' }],
    ['rental-opportunity', { monthlyMax: 10000 }],
    ['rental-opportunity', { confidence: 'guaranteed' }],
  ] as const)('rejects unsupported criteria instead of widening: %s %j', (kind, filters) => {
    expect(() => normalizeRentalAlertFilters(kind, filters)).toThrow()
  })

  it('always links internally and safely encodes untrusted search text', () => {
    const filters = normalizeRentalAlertFilters('rental-search', {
      q: '<script>&redirect=https://evil.test',
    })
    const path = rentalAlertSearchUrl({
      kind: 'rental-search',
      filters,
      locale: 'https://evil.test',
    })
    expect(path).toMatch(/^\/alquileres-uruguay\?q=/)
    expect(path).not.toContain('<script>')
  })
})
