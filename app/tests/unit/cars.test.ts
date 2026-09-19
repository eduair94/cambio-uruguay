import { describe, expect, it } from 'vitest'
import {
  carFuelEconomySource,
  carListedPriceNote,
  carOpportunityQueryParams,
  formatCarFuelEconomy,
  normalizeCarOpportunityQuery,
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
      kmlMin: '14',
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
      kmlMin: 14,
      priceMin: null,
      priceMax: 15000,
      fuel: 'nafta',
      transmission: '',
      department: 'Montevideo',
      seller: 'private',
      source: '',
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
  it('filters by source', () => {
    const query = normalizeCarsQuery({ source: 'facebook' })
    expect(query.source).toBe('facebook')
    expect(carsMatch(query, new Date('2026-09-17T00:00:00Z'), 4).source).toBe('facebook')
    expect(normalizeCarsQuery({ source: 'olx' }).source).toBe('')
  })
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
    for (const key of [
      'fb-1268374875382121',
      'clasiautos-15715',
      'sda-153528',
      'carone-717444',
      'julio-49408',
      'carper-1',
      'fidocar-418633',
    ])
      expect(carKeyValid(key)).toBe(true)
    for (const key of ['fb-abc', 'x-1', 'ml-1', 'clasiautos-../x', 'sda-1-2'])
      expect(carKeyValid(key)).toBe(false)
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

// MLU700552753: listed at the down payment (US$ 8.990), the car costs US$ 12.990 cash.
describe('carListedPriceNote', () => {
  it('says what the portal shows when the price is the stated cash price', () => {
    expect(carListedPriceNote({ listedPrice: 8990, currency: 'USD' })).toBe(
      'Precio de contado que indica el aviso. En el portal figura US$ 8.990.'
    )
  })
  it('says nothing when the listed number is the price', () => {
    expect(carListedPriceNote({ listedPrice: null, currency: 'USD' })).toBeNull()
  })
})

describe('fuel economy', () => {
  it('filters and sorts the directory by km per litre, cars without the figure last', () => {
    const query = normalizeCarsQuery({ kmlMin: '14', sort: 'kml_desc' })
    expect(carsMatch(query, NOW, 3)['fuelEconomy.kmPerLiter']).toEqual({ $gte: 14 })
    expect(carsSort('kml_desc')).toEqual({ 'fuelEconomy.kmPerLiter': -1, priceUsd: 1, key: 1 })
  })

  it('says whether the figure is the advert or an estimate, and from how many sellers', () => {
    const advert = {
      kmPerLiter: 16,
      city: 14,
      highway: 18,
      combined: null,
      basis: 'advert',
      sellers: null,
    } as const
    expect(formatCarFuelEconomy(advert)).toBe('16 km/l')
    expect(carFuelEconomySource(advert)).toBe('Según el aviso: ciudad 14 km/l, ruta 18 km/l.')
    const estimate = {
      kmPerLiter: 13.5,
      city: null,
      highway: null,
      combined: null,
      basis: 'model_engine',
      sellers: 7,
    } as const
    expect(formatCarFuelEconomy(estimate)).toBe('≈ 13,5 km/l')
    expect(carFuelEconomySource(estimate)).toBe(
      'Estimado: lo que declaran 7 vendedores del mismo modelo y motor.'
    )
    expect(formatCarFuelEconomy(null)).toBeNull()
  })
})

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

  const economy = (kmPerLiter: number) =>
    ({ kmPerLiter, city: null, highway: null, combined: null, basis: 'model', sellers: 5 }) as const
  const rich = {
    ...snapshot,
    items: [
      item('ml-A', { year: 2015, km: 150000, priceUsd: 6000, fuelEconomy: economy(13) }),
      item('ml-B', {
        year: 2020,
        km: 40000,
        priceUsd: 12000,
        fuel: 'diesel',
        fuelEconomy: economy(17),
      }),
      item('ml-C', { year: 2018, km: null, priceUsd: 9000, transmission: 'automatica' }),
    ],
  } as unknown as PublicCarOpportunitySnapshot
  const keys = (input: Record<string, unknown>) =>
    queryCarOpportunities(rich, input, NOW).items.map(entry => entry.subject.key)

  it('filters by year, km, fuel, gearbox and km per litre', () => {
    expect(keys({ yearMin: '2018' })).toEqual(['ml-B', 'ml-C'])
    // Unknown km never passes a km ceiling.
    expect(keys({ kmMax: '100000' })).toEqual(['ml-B'])
    expect(keys({ fuel: 'diesel' })).toEqual(['ml-B'])
    expect(keys({ transmission: 'automatica' })).toEqual(['ml-C'])
    // Without a figure, a car cannot promise a minimum.
    expect(keys({ kmlMin: '14' })).toEqual(['ml-B'])
  })

  it('sorts by price, year, km and km per litre, with missing figures last', () => {
    expect(keys({ sort: 'price_asc' })).toEqual(['ml-A', 'ml-C', 'ml-B'])
    expect(keys({ sort: 'year_desc' })).toEqual(['ml-B', 'ml-C', 'ml-A'])
    expect(keys({ sort: 'km_asc' })).toEqual(['ml-B', 'ml-A', 'ml-C'])
    expect(keys({ sort: 'kml_desc' })).toEqual(['ml-B', 'ml-A', 'ml-C'])
    // The default order leaves the URL clean.
    expect(carOpportunityQueryParams(normalizeCarOpportunityQuery({ sort: 'gap' }))).toEqual({})
    expect(carOpportunityQueryParams(normalizeCarOpportunityQuery({ sort: 'nope' }))).toEqual({})
  })
})
