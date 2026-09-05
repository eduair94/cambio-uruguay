import { describe, expect, it } from 'vitest'
import {
  rentalBudget,
  rentalDate,
  rentalHasLocation,
  rentalPhotos,
  rentalPropertyPath,
  rentalReturnPath,
  rentalStreet,
} from '../../utils/rentalPresentation'
import { rentalPageMessages } from '../../utils/rentalPageMessages'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

const offer = {
  source: 'infocasas',
  listingId: '123',
  title: 'Apartamento en alquiler',
  url: 'https://www.infocasas.com.uy/123',
  image: 'https://example.com/photo.jpg',
  price: 600,
  currency: 'USD',
  priceUyu: 24600,
  commonExpenses: 1000,
  commonExpensesCurrency: 'UYU',
} as RentalOffer
const property = {
  key: 'pocitos-one',
  title: offer.title,
  address: 'APARTAMENTO  EN ALQUILER!',
  offers: [offer],
  latitude: -34.9,
  longitude: -56.15,
} as RentalPublicProperty
const extras = { expenses: null, services: null, entry: null, budget: null }

describe('rental decision details', () => {
  it('adds only amounts from the selected offer and the user, using one exchange rate', () => {
    expect(
      rentalBudget(offer, 41, { ...extras, services: 2500, entry: 40000, budget: 30000 })
    ).toEqual({ monthly: 28100, firstMonth: 68100, remaining: 1900, estimatedExpenses: false })
    expect(
      rentalBudget({ ...offer, commonExpenses: 20, commonExpensesCurrency: 'USD' }, 41, extras)
        .monthly
    ).toBe(25420)
  })
  it('unknown expenses are never treated as zero; an explicit user estimate or published zero is different', () => {
    expect(rentalBudget({ ...offer, commonExpenses: null }, 41, extras).monthly).toBeNull()
    expect(
      rentalBudget({ ...offer, commonExpenses: null }, 41, { ...extras, expenses: 0 })
    ).toMatchObject({ monthly: 24600, estimatedExpenses: true })
    expect(
      rentalBudget({ ...offer, commonExpenses: 0, commonExpensesCurrency: null }, 41, extras)
    ).toMatchObject({ monthly: 24600, estimatedExpenses: false })
    expect(rentalBudget(offer, 41, { ...extras, expenses: 6000 }).monthly).toBe(25600)
  })
  it('refuses to invent a conversion and ignores invalid user amounts', () => {
    expect(rentalBudget(offer, 0, { ...extras, expenses: 1000 }).monthly).toBeNull()
    expect(
      rentalBudget({ ...offer, commonExpenses: null }, 41, { ...extras, expenses: Number.NaN })
        .monthly
    ).toBeNull()
    expect(
      rentalBudget(offer, 41, { ...extras, services: -1000, entry: Infinity, budget: -1 })
    ).toMatchObject({ monthly: 25600, firstMonth: null, remaining: null })
  })
  it('preserves useful search context and strips executable or foreign return destinations', () => {
    const url = rentalReturnPath(
      '/en/alquileres-uruguay?department=Montevideo&neighborhoods=Pocitos,Cord%C3%B3n&monthlyMax=40000&page=3&view=mapa&evil=yes'
    )!
    expect(url).toContain('monthlyMax=40000')
    expect(url).toContain('page=3')
    expect(url).toContain('view=mapa')
    expect(url).toContain('neighborhoods=')
    expect(url.endsWith('#rental-results')).toBe(true)
    expect(url).not.toContain('evil')
    for (const input of [
      '//evil.example/alquileres-uruguay',
      '/\\evil.example/alquileres-uruguay',
      'javascript:alert(1)',
      '/cuenta',
      'https://cambio-uruguay.com/alquileres-uruguay',
    ])
      expect(rentalReturnPath(input)).toBeNull()
  })
  it('does not relabel a headline as a street, render unsafe photos or move date-only readings to yesterday', () => {
    expect(rentalStreet(property)).toBe('')
    expect(rentalStreet({ ...property, address: 'Gestido 2450' })).toBe('Gestido 2450')
    expect(
      rentalPhotos({
        ...property,
        offers: [offer, offer, { ...offer, image: 'javascript:alert(1)' }],
      })
    ).toHaveLength(1)
    expect(rentalDate('2026-09-05')).toMatch(/5.*2026/)
    expect(rentalDate('not-a-date')).toBeNull()
    expect(rentalPropertyPath('property#one')).toBe('/alquileres/property%23one')
    expect(rentalHasLocation(property)).toBe(true)
    expect(rentalHasLocation({ ...property, latitude: 0 })).toBe(false)
    expect(rentalHasLocation({ ...property, longitude: NaN })).toBe(false)
  })
  it('translates the complete page and interpolation names in all supported languages', () => {
    const keys = Object.keys(rentalPageMessages.es).sort()
    for (const lang of ['en', 'pt'] as const) {
      expect(Object.keys(rentalPageMessages[lang]).sort()).toEqual(keys)
      for (const key of keys) {
        const a = rentalPageMessages.es[key as keyof typeof rentalPageMessages.es]
        const b = rentalPageMessages[lang][key as keyof typeof rentalPageMessages.es]
        expect(
          [...b.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(),
          `${lang}:${key}`
        ).toEqual([...a.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort())
      }
    }
  })
})
