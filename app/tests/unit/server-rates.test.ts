import { describe, it, expect } from 'vitest'
import { bestRateFor } from '../../server/utils/rates'

// quotesForCurrency keeps only plain/cash rows (type '' or 'BILLETE').
const rows = [
  { origin: 'brou', code: 'USD', type: '', buy: 39.0, sell: 41.5 },
  { origin: 'itau', code: 'USD', type: '', buy: 39.4, sell: 41.2 },
  { origin: 'prex', code: 'USD', type: '', buy: 38.5, sell: 41.0 },
]

describe('bestRateFor', () => {
  it('best buy across all casas (highest buy)', () => {
    expect(bestRateFor(rows, 'USD', 'bestBuy', 'any')).toBe(39.4)
  })

  it('best sell across all casas (lowest sell)', () => {
    expect(bestRateFor(rows, 'USD', 'bestSell', 'any')).toBe(41.0)
  })

  it('filters to a specific origin', () => {
    expect(bestRateFor(rows, 'USD', 'bestBuy', 'brou')).toBe(39.0)
  })

  it('returns null when no quotes for the currency', () => {
    expect(bestRateFor(rows, 'EUR', 'bestBuy', 'any')).toBeNull()
  })
})
