import { describe, expect, it } from 'vitest'
import {
  carKeyValid,
  carMarketSlugValid,
  carsFiltered,
  carsMatch,
  carsQueryParams,
  carsSort,
  formatCarKm,
  formatCarUsd,
  normalizeCarsQuery,
  queryCarOpportunities,
} from '../../utils/cars'
import type { PublicCarListing, PublicCarOpportunitySnapshot } from '../../utils/carsPublic'

const NOW = new Date('2026-09-16T12:00:00.000Z')

describe('normalizeCarsQuery', () => {
  it('keeps valid filters and drops everything else', () => {
    const query = normalizeCarsQuery({
      q: '  onix lt ',
      brand: 'chevrolet',
      model: 'chevrolet-onix',
      yearMin: '2015',
      yearMax: '3000',
      kmMax: '120000',
      priceMax: '15000',
      fuel: 'nafta',
      transmission: 'robot',
      department: 'Montevideo',
      seller: 'private',
      sort: 'price_asc',
      page: '2',
    })
    expect(query).toEqual({
      q: 'onix lt',
      brand: 'chevrolet',
      model: 'chevrolet-onix',
      yearMin: 2015,
      yearMax: null,
      kmMax: 120000,
      priceMin: null,
      priceMax: 15000,
      fuel: 'nafta',
      transmission: '',
      department: 'Montevideo',
      seller: 'private',
      sort: 'price_asc',
      page: 2,
    })
    expect(carsFiltered(query)).toBe(true)
    expect(carsFiltered(normalizeCarsQuery({}))).toBe(false)
  })
  it('rejects operator injection and odd types', () => {
    const query = normalizeCarsQuery({
      brand: { $ne: 'x' },
      model: '../x',
      q: ['a', 'b'],
      page: '-1',
    })
    expect(query.brand).toBe('')
    expect(query.model).toBe('')
    expect(query.q).toBe('a')
    expect(query.page).toBe(1)
  })
  it('round-trips through URL params without defaults', () => {
    const query = normalizeCarsQuery({
      brand: 'peugeot',
      sort: 'recent',
      page: '1',
      kmMax: '90000',
    })
    expect(carsQueryParams(query)).toEqual({ brand: 'peugeot', kmMax: '90000' })
    expect(normalizeCarsQuery(carsQueryParams(query))).toEqual(query)
  })
})

describe('carsMatch / carsSort', () => {
  it('builds a bounded Mongo filter', () => {
    const match = carsMatch(
      normalizeCarsQuery({
        brand: 'peugeot',
        yearMin: '2015',
        priceMax: '12000',
        q: 'Allure',
        seller: 'dealer',
      }),
      NOW,
      4
    )
    expect(match).toMatchObject({
      lastSeen: { $gte: '2026-09-12T12:00:00.000Z' },
      brandSlug: 'peugeot',
      year: { $gte: 2015 },
      priceUsd: { $lte: 12000 },
      sellerType: 'dealer',
    })
    expect((match.title as { $regex: string }).$regex).toContain('[aáàä]')
  })
  it('escapes regex metacharacters in the text search', () => {
    const match = carsMatch(normalizeCarsQuery({ q: 'a.*(' }), NOW, 4)
    expect((match.title as { $regex: string }).$regex).toBe('[aáàä]\\.\\*\\(')
  })
  it('sorts deterministically', () => {
    expect(carsSort('price_asc')).toEqual({ priceUsd: 1, key: 1 })
    expect(carsSort('recent')).toEqual({ firstSeen: -1, key: 1 })
  })
})

describe('keys and formatting', () => {
  it('validates keys and slugs', () => {
    expect(carKeyValid('ml-MLU700355317')).toBe(true)
    expect(carKeyValid('ml-MLU1; drop')).toBe(false)
    expect(carMarketSlugValid('mercedes-benz-clase-c')).toBe(true)
    expect(carMarketSlugValid('Mercedes Benz')).toBe(false)
  })
  it('formats money and km the Uruguayan way', () => {
    expect(formatCarUsd(10600)).toBe('US$ 10.600')
    expect(formatCarKm(111000)).toBe('111.000 km')
    expect(formatCarKm(null)).toBe('km no informado')
  })
})

function item(
  key: string,
  overrides: Partial<PublicCarListing> = {},
  tier: 'strict' | 'exploratory' = 'strict'
) {
  return {
    subject: {
      key,
      brand: 'Peugeot',
      brandSlug: 'peugeot',
      model: '208',
      modelSlug: '208',
      marketSlug: 'peugeot-208',
      title: 'Peugeot 208',
      year: 2017,
      km: 100000,
      price: 7900,
      currency: 'USD',
      priceUsd: 7900,
      priceConverted: false,
      transmission: 'manual',
      fuel: 'nafta',
      engine: '1.5',
      trim: 'Allure',
      department: 'Montevideo',
      neighborhood: null,
      sellerType: 'private',
      dealerName: null,
      picture: null,
      pictureCount: 1,
      permalink: 'https://auto.mercadolibre.com.uy/MLU-1-x-_JM',
      firstSeen: NOW.toISOString(),
      lastSeen: NOW.toISOString(),
      priceDrop: null,
      flags: [],
      opportunity: { tier, gap: 0.25, median: 10600, n: 12 },
      ...overrides,
    },
    tier,
    gap: 0.25,
    conservativeGap: 0.2,
    sellerSensitivityGap: 0.22,
    sample: {
      n: 12,
      sellers: 12,
      dealers: 4,
      privates: 8,
      p25: 10000,
      median: 10600,
      p75: 11200,
      spread: 0.11,
      kmMedian: 110000,
      kmP75: 118000,
    },
    comparables: [],
    detailReadAt: NOW.toISOString(),
  }
}

describe('queryCarOpportunities', () => {
  const snapshot = {
    version: 1,
    algorithm: 'car-cohort-v1',
    generatedAt: NOW.toISOString(),
    usdUyu: 40,
    policy: {},
    stats: {},
    items: [
      item('ml-MLU1'),
      item(
        'ml-MLU2',
        { brandSlug: 'chevrolet', brand: 'Chevrolet', priceUsd: 15000 },
        'exploratory'
      ),
      item('ml-MLU3', { lastSeen: '2026-09-10T00:00:00.000Z' }),
      item('ml-MLU4', { department: 'Salto' }),
    ],
  } as unknown as PublicCarOpportunitySnapshot
  it('filters before paging and retires stale adverts even if the job failed', () => {
    const all = queryCarOpportunities(snapshot, {}, NOW)
    expect(all.items.map(entry => entry.subject.key)).toEqual(['ml-MLU1', 'ml-MLU4', 'ml-MLU2'])
    expect(
      queryCarOpportunities(snapshot, { tier: 'strict', department: 'Montevideo' }, NOW).total
    ).toBe(1)
    expect(queryCarOpportunities(snapshot, { priceMax: '10000' }, NOW).total).toBe(2)
    expect(queryCarOpportunities(snapshot, { brand: 'chevrolet' }, NOW).items[0]!.subject.key).toBe(
      'ml-MLU2'
    )
    expect(all.brands).toEqual([
      { slug: 'peugeot', name: 'Peugeot', count: 2 },
      { slug: 'chevrolet', name: 'Chevrolet', count: 1 },
    ])
  })
})
