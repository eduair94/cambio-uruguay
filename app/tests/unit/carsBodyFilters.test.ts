import { describe, expect, it } from 'vitest'
import {
  carSubjectMatches,
  carsFiltered,
  carsMatch,
  carsQueryParams,
  formatCarBody,
  normalizeCarSubjectFilters,
  normalizeCarsQuery,
} from '../../utils/cars'
import type { PublicCarListing } from '../../utils/carsPublic'

const NOW = new Date('2026-09-20T12:00:00.000Z')
const FRESH_DAYS = 4

const car = (overrides: Partial<PublicCarListing> = {}): PublicCarListing =>
  ({
    key: 'ml-MLU1',
    source: 'mercadolibre',
    sourceName: 'Mercado Libre',
    brand: 'Nissan',
    brandSlug: 'nissan',
    model: 'Kicks',
    modelSlug: 'kicks',
    marketSlug: 'nissan-kicks',
    title: 'Nissan Kicks 1.6 Sense',
    year: 2019,
    km: 50_000,
    price: 20_000,
    listedPrice: null,
    currency: 'USD',
    priceUsd: 20_000,
    priceConverted: false,
    currencyInferred: false,
    transmission: 'manual',
    fuel: 'nafta',
    fuelEconomy: null,
    body: { type: 'suv', basis: 'advert' },
    doors: 5,
    color: 'blanco',
    engine: '1.6',
    trim: null,
    department: 'Montevideo',
    neighborhood: null,
    sellerType: 'private',
    dealerName: null,
    picture: null,
    pictureCount: null,
    permalink: 'https://auto.mercadolibre.com.uy/MLU-1',
    firstSeen: '2026-09-01T00:00:00.000Z',
    lastSeen: '2026-09-20T00:00:00.000Z',
    priceDrop: null,
    flags: [],
    risks: [],
    opportunity: null,
    reference: null,
    ...overrides,
  }) as PublicCarListing

describe('normalizeCarsQuery, body and the advanced filters', () => {
  it('keeps the values it knows and drops the rest', () => {
    const query = normalizeCarsQuery({
      body: 'suv',
      doors: '5',
      color: 'blanco',
      priceDrop: '1',
      opportunity: '1',
      noRisk: '1',
      sinceDays: '7',
    })
    expect(query.body).toBe('suv')
    expect(query.doors).toBe(5)
    expect(query.color).toBe('blanco')
    expect(query.priceDrop).toBe(true)
    expect(query.opportunity).toBe(true)
    expect(query.noRisk).toBe(true)
    expect(query.sinceDays).toBe(7)
  })

  it('refuses a body, a colour or a door count it does not publish', () => {
    const query = normalizeCarsQuery({ body: 'limusina', color: 'tornasol', doors: '40' })
    expect(query.body).toBe('')
    expect(query.color).toBe('')
    expect(query.doors).toBeNull()
  })

  it('only turns a switch on with "1", so ?priceDrop=0 filters nothing', () => {
    const query = normalizeCarsQuery({ priceDrop: '0', opportunity: 'false', noRisk: 'si' })
    expect([query.priceDrop, query.opportunity, query.noRisk]).toEqual([false, false, false])
    expect(carsFiltered(query)).toBe(false)
    expect(carsQueryParams(query)).toEqual({})
  })

  it('writes a switch back to the URL as "1" and leaves an unset one out', () => {
    expect(carsQueryParams(normalizeCarsQuery({ body: 'sedan', noRisk: '1' }))).toEqual({
      body: 'sedan',
      noRisk: '1',
    })
  })
})

describe('carsMatch', () => {
  it('filters by the body family, the doors and the colour', () => {
    const match = carsMatch(
      normalizeCarsQuery({ body: 'pickup', doors: '4', color: 'gris' }),
      NOW,
      FRESH_DAYS
    )
    expect(match['body.type']).toBe('pickup')
    expect(match.doors).toBe(4)
    expect(match.color).toBe('gris')
  })

  it('asks for a price drop, an opportunity and no declared risk', () => {
    const match = carsMatch(
      normalizeCarsQuery({ priceDrop: '1', opportunity: '1', noRisk: '1' }),
      NOW,
      FRESH_DAYS
    )
    expect(match.priceDrop).toEqual({ $ne: null })
    expect(match.opportunity).toEqual({ $ne: null })
    expect(match['risks.0']).toEqual({ $exists: false })
  })

  it('counts the days of "publicado" from when we first saw the advert', () => {
    const match = carsMatch(normalizeCarsQuery({ sinceDays: '3' }), NOW, FRESH_DAYS)
    expect(match.firstSeen).toEqual({ $gte: '2026-09-17T12:00:00.000Z' })
  })

  it('leaves the catalogue alone when nothing is asked', () => {
    const match = carsMatch(normalizeCarsQuery({}), NOW, FRESH_DAYS)
    expect(Object.keys(match)).toEqual(['lastSeen'])
  })
})

describe('carSubjectMatches', () => {
  it('filters the opportunity and risk lists by body too', () => {
    const filters = normalizeCarSubjectFilters({ body: 'suv' })
    expect(carSubjectMatches(car(), filters)).toBe(true)
    expect(carSubjectMatches(car({ body: { type: 'sedan', basis: 'advert' } }), filters)).toBe(
      false
    )
  })

  it('never lets an advert without a body pass a body filter', () => {
    expect(
      carSubjectMatches(car({ body: null }), normalizeCarSubjectFilters({ body: 'suv' }))
    ).toBe(false)
  })
})

describe('formatCarBody', () => {
  it('marks an estimated body the same way the estimated consumption is marked', () => {
    expect(formatCarBody({ type: 'suv', basis: 'advert' })).toBe('SUV o crossover')
    expect(formatCarBody({ type: 'suv', basis: 'model' })).toBe('≈ SUV o crossover')
    expect(formatCarBody(null)).toBeNull()
  })
})
