import { describe, expect, it } from 'vitest'
import {
  convert,
  formatAmount,
  getExchangeRate,
  marketAverageSavings,
  parseAmount,
  type RateRow,
} from '../../utils/conversion'

// A small fixture: USD and EUR quotes from three fictional houses, against UYU.
// buy = what the house pays you (you SELL the currency to them).
// sell = what the house charges you (you BUY the currency from them).
const rows: RateRow[] = [
  { origin: 'houseA', code: 'USD', buy: 40, sell: 42 },
  { origin: 'houseB', code: 'USD', buy: 41, sell: 43 }, // best buy for selling USD
  { origin: 'houseC', code: 'USD', buy: 39, sell: 41 }, // best sell for buying USD
  { origin: 'houseA', code: 'EUR', buy: 44, sell: 46 },
  { origin: 'houseB', code: 'EUR', buy: 45, sell: 47 },
]

describe('getExchangeRate', () => {
  it('returns 1 for identical currencies', () => {
    expect(getExchangeRate(rows, 'USD', 'USD')).toBe(1)
  })

  it('returns 0 with no data', () => {
    expect(getExchangeRate([], 'USD', 'UYU')).toBe(0)
  })

  it('USD -> UYU uses the highest buy across houses (best for the seller)', () => {
    expect(getExchangeRate(rows, 'USD', 'UYU')).toBe(41)
  })

  it('UYU -> USD uses the lowest sell (best for the buyer) as 1/sell', () => {
    expect(getExchangeRate(rows, 'UYU', 'USD')).toBeCloseTo(1 / 41, 10)
  })

  it('restricts to a single house when houseOrigin is given', () => {
    expect(getExchangeRate(rows, 'USD', 'UYU', 'houseA')).toBe(40)
    expect(getExchangeRate(rows, 'UYU', 'USD', 'houseA')).toBeCloseTo(1 / 42, 10)
  })

  it('cross-currency USD -> EUR routes through UYU', () => {
    // USD->UYU (best buy 41) * UYU->EUR (1/best sell 46)
    const expected = 41 * (1 / 46)
    expect(getExchangeRate(rows, 'USD', 'EUR')).toBeCloseTo(expected, 10)
  })
})

describe('convert', () => {
  it('forward conversion converts the amount and rounds to 2 decimals', () => {
    const res = convert(rows, 100, 'USD', 'UYU')
    expect(res.rate).toBe(41)
    expect(res.convertedAmount).toBe(4100)
    expect(res.invertedRate).toBeCloseTo(1 / 41, 10)
  })

  it('reverse rate is the inverse direction rate', () => {
    const res = convert(rows, 100, 'USD', 'UYU')
    // reverse = UYU -> USD = 1 / 41
    expect(res.reverseRate).toBeCloseTo(1 / 41, 10)
  })

  it('returns zeros for an unknown currency', () => {
    const res = convert(rows, 100, 'JPY', 'UYU')
    expect(res.rate).toBe(0)
    expect(res.convertedAmount).toBe(0)
    expect(res.invertedRate).toBe(0)
  })
})

describe('marketAverageSavings', () => {
  it('sell direction: savings is (best buy - avg buy) * amount', () => {
    // USD buys: 40, 41, 39 -> avg 40, best 41
    const { savings, bestRate, averageRate } = marketAverageSavings(rows, 'USD', 100, 'sell')
    expect(bestRate).toBe(41)
    expect(averageRate).toBeCloseTo(40, 10)
    expect(savings).toBeCloseTo((41 - 40) * 100, 2) // 100
  })

  it('buy direction: savings is (avg sell - best sell) * quantity bought at best', () => {
    // USD sells: 42, 43, 41 -> avg 42, best 41
    const amount = 4100 // UYU
    const { savings, bestRate, averageRate } = marketAverageSavings(rows, 'USD', amount, 'buy')
    expect(bestRate).toBe(41)
    expect(averageRate).toBeCloseTo(42, 10)
    const quantity = amount / 41 // 100 USD
    expect(savings).toBeCloseTo((42 - 41) * quantity, 2) // 100
  })

  it('returns zero savings for the base currency', () => {
    expect(marketAverageSavings(rows, 'UYU', 100, 'sell').savings).toBe(0)
  })

  it('returns zero savings when fewer than two quotes exist', () => {
    const single: RateRow[] = [{ origin: 'only', code: 'GBP', buy: 50, sell: 52 }]
    expect(marketAverageSavings(single, 'GBP', 100, 'sell').savings).toBe(0)
  })
})

describe('formatAmount', () => {
  it('formats thousands with es-UY separators and 2 decimals', () => {
    expect(formatAmount(1000.5)).toBe('1.000,5')
    expect(formatAmount(1000)).toBe('1.000')
    expect(formatAmount(1234567.89)).toBe('1.234.567,89')
  })

  it('honours maximumFractionDigits = 0 for whole presets', () => {
    expect(formatAmount(5000, 0)).toBe('5.000')
  })

  it('returns empty string for non-finite input', () => {
    expect(formatAmount(Number.NaN)).toBe('')
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe('')
  })
})

describe('parseAmount', () => {
  it('parses es-UY formatted strings back to numbers', () => {
    expect(parseAmount('1.000,50')).toBe(1000.5)
    expect(parseAmount('1.234.567,89')).toBe(1234567.89)
  })

  it('parses plain numeric strings (dot decimals)', () => {
    expect(parseAmount('1234.5')).toBe(1234.5)
    expect(parseAmount('100')).toBe(100)
  })

  it('passes through numbers and handles empty/invalid input', () => {
    expect(parseAmount(42)).toBe(42)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('   ')).toBe(0)
    expect(parseAmount(null)).toBe(0)
    expect(parseAmount(undefined)).toBe(0)
  })

  it('round-trips formatAmount -> parseAmount', () => {
    const value = 12345.67
    expect(parseAmount(formatAmount(value))).toBeCloseTo(value, 2)
  })
})
