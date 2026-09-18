import { describe, expect, it } from 'vitest'
import {
  CAR_RISK_CATEGORIES,
  CAR_RISK_GUIDE,
  carRiskQueryParams,
  formatCarRiskGap,
  normalizeCarRiskQuery,
  queryCarRisks,
} from '../../utils/carsRisk'
import type { PublicCarRiskItem, PublicCarRiskSnapshot } from '../../utils/carsPublic'

const NOW = new Date('2026-09-18T12:00:00.000Z')

const item = (overrides: Partial<PublicCarRiskItem> = {}): PublicCarRiskItem => ({
  subject: {
    key: 'ml-MLU1', source: 'mercadolibre', sourceName: 'Mercado Libre', brand: 'Chevrolet',
    brandSlug: 'chevrolet', model: 'Onix', modelSlug: 'onix', marketSlug: 'chevrolet-onix',
    title: 'Chevrolet Onix 1.4 LT', year: 2019, km: 90_000, price: 9_000, currency: 'USD',
    priceUsd: 9_000, priceConverted: false, currencyInferred: false, transmission: 'manual',
    fuel: 'nafta', engine: '1.4', trim: 'Lt', department: 'Montevideo', neighborhood: null,
    sellerType: 'private', dealerName: null, picture: null, pictureCount: null,
    permalink: 'https://auto.mercadolibre.com.uy/MLU-1-x-_JM', firstSeen: '2026-09-10T00:00:00.000Z',
    lastSeen: '2026-09-18T00:00:00.000Z', priceDrop: null, flags: [], opportunity: null,
    reference: null,
    ...overrides.subject,
  },
  risks: [{ category: 'deuda', severity: 'alta', quote: 'Tiene una deuda de 52000', from: 'description' }],
  severity: 'alta',
  gap: 0.25,
  median: 12_000,
  n: 8,
  sellers: 4,
  ...overrides,
})

const snapshot = (items: PublicCarRiskItem[]): PublicCarRiskSnapshot => ({
  version: 1,
  generatedAt: '2026-09-18T11:00:00.000Z',
  usdUyu: 40,
  items,
  categories: [
    { category: 'deuda', adverts: 9, measured: 6, medianGap: 0.21, p25Gap: 0.12, p75Gap: 0.3 },
    { category: 'uso_intensivo', adverts: 2, measured: 1, medianGap: null, p25Gap: null, p75Gap: null },
  ],
  stats: { input: 18_000, declared: 11, measured: 7, withoutDescription: 16_000 },
})

describe('queryCarRisks', () => {
  it('retires an advert nobody has seen in four days even if the job did not run', () => {
    const stale = item({ subject: { ...item().subject, key: 'ml-MLU2', lastSeen: '2026-09-01T00:00:00.000Z' } })
    const result = queryCarRisks(snapshot([item(), stale]), {}, NOW)
    expect(result.items.map(entry => entry.subject.key)).toEqual(['ml-MLU1'])
  })
  it('filters by what the advert declares', () => {
    const taxi = item({
      subject: { ...item().subject, key: 'ml-MLU3' },
      risks: [{ category: 'uso_intensivo', severity: 'media', quote: 'Ex taxi', from: 'title' }],
      severity: 'media',
      gap: null,
      median: null,
      n: null,
      sellers: null,
    })
    expect(queryCarRisks(snapshot([item(), taxi]), { category: 'uso_intensivo' }, NOW).total).toBe(1)
    expect(queryCarRisks(snapshot([item(), taxi]), { measured: '1' }, NOW).total).toBe(1)
  })
  it('puts the deepest measured discount first and never invents one', () => {
    const unmeasured = item({ subject: { ...item().subject, key: 'ml-MLU4' }, gap: null, median: null, n: null, sellers: null })
    const result = queryCarRisks(snapshot([unmeasured, item()]), {}, NOW)
    expect(result.items[0]!.subject.key).toBe('ml-MLU1')
    expect(formatCarRiskGap(result.items[1]!.gap)).toBe('sin comparables')
    expect(formatCarRiskGap(0.21)).toBe('−21 %')
  })
})

describe('the risk query string', () => {
  it('drops anything it does not recognise', () => {
    const query = normalizeCarRiskQuery({ category: 'inventada', brand: 'Chevrolet!!', priceMax: 'US$ 9.000', page: '3' })
    expect(query).toMatchObject({ category: '', brand: 'chevrolet', priceMax: 9_000, page: 3 })
    expect(carRiskQueryParams(query)).toEqual({ brand: 'chevrolet', priceMax: '9000', page: '3' })
  })
})

describe('the buyer guide', () => {
  it('covers every category the backend can publish, with what to ask for', () => {
    for (const category of CAR_RISK_CATEGORIES) {
      const entry = CAR_RISK_GUIDE[category]
      expect(entry.label.length).toBeGreaterThan(3)
      expect(entry.meaning.length).toBeGreaterThan(30)
      expect(entry.check.length).toBeGreaterThan(30)
    }
  })
})
