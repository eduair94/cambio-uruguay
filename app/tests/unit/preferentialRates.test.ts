import { describe, expect, it } from 'vitest'
import type { PreferentialRatesCatalog } from '../../types/api'
import { applyPreferentialRates, selectPreferentialRate } from '../../utils/preferentialRates'

const catalog: PreferentialRatesCatalog = {
  currency: null,
  amount: null,
  providerCount: 1,
  updatedAt: '2026-07-23T15:00:00.000Z',
  providers: [
    {
      provider: 'santander',
      displayName: 'Santander',
      source: 'https://supernet.santander.com.uy/Supernet_UI/',
      requiresAuthentication: true,
      currencies: ['USD'],
      boundaryRule: 'inclusive/exclusive',
      updatedAt: '2026-07-23T15:00:00.000Z',
      current: {
        date: '2026-07-23',
        scrapedAt: '2026-07-23T15:00:00.000Z',
        selectedRate: null,
        rates: [
          { currency: 'USD', buy: 39.35, sell: 41, minAmount: 0, maxAmount: 1001 },
          { currency: 'USD', buy: 39.4, sell: 40.95, minAmount: 1001, maxAmount: 10000 },
          { currency: 'USD', buy: 39.5, sell: 40.85, minAmount: 10000, maxAmount: null },
        ],
      },
      history: [],
    },
  ],
}

describe('preferential rates', () => {
  it('uses inclusive lower and exclusive upper band boundaries', () => {
    const rates = catalog.providers[0]?.current?.rates ?? []
    expect(selectPreferentialRate(rates, 'USD', 1000)?.buy).toBe(39.35)
    expect(selectPreferentialRate(rates, 'USD', 1001)?.buy).toBe(39.4)
    expect(selectPreferentialRate(rates, 'USD', 10000)?.buy).toBe(39.5)
  })

  it('replaces the provider quote while retaining the published values', () => {
    const rows = [
      {
        origin: 'santander',
        code: 'USD',
        buy: 39.2,
        sell: 41.1,
        condition: '',
      },
      { origin: 'brou', code: 'USD', buy: 39.3, sell: 41.05, condition: '' },
    ]

    const result = applyPreferentialRates(rows, catalog, '2026-07-23', 'USD', 5000)

    expect(result[0]).toMatchObject({
      buy: 39.4,
      sell: 40.95,
      condition: 'preferentialRates.condition',
      preferentialRate: {
        provider: 'santander',
        minAmount: 1001,
        maxAmount: 10000,
        publishedBuy: 39.2,
        publishedSell: 41.1,
      },
    })
    expect(result[1]).toMatchObject({ buy: 39.3, sell: 41.05 })
    expect(result[1]?.preferentialRate).toBeUndefined()
  })

  it('does not apply direct UYU bands to cross rates or a different day', () => {
    const rows = [{ origin: 'santander', code: 'USD', buy: 39.2, sell: 41.1 }]

    expect(
      applyPreferentialRates(rows, catalog, '2026-07-23', 'USD', 5000, 'EUR')[0]?.preferentialRate
    ).toBeUndefined()
    expect(
      applyPreferentialRates(rows, catalog, '2026-07-22', 'USD', 5000)[0]?.preferentialRate
    ).toBeUndefined()
  })
})
