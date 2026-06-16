import { describe, expect, it } from 'vitest'
import { rankExchanges, type RankableRate } from '../../utils/recommendation'

// Fixture: USD and EUR quotes from fictional houses, against UYU.
// buy = what the house pays you (you SELL the currency to them).
// sell = what the house charges you (you BUY the currency from them).
const rows: RankableRate[] = [
  { origin: 'houseA', code: 'USD', name: 'House A', buy: 40, sell: 42 },
  { origin: 'houseB', code: 'USD', name: 'House B', buy: 41, sell: 43 }, // best buy (sell USD)
  { origin: 'houseC', code: 'USD', name: 'House C', buy: 39, sell: 41 }, // best sell (buy USD)
  { origin: 'houseA', code: 'EUR', name: 'House A', buy: 44, sell: 46 },
  { origin: 'houseB', code: 'EUR', name: 'House B', buy: 45, sell: 47 },
]

describe('rankExchanges - buy', () => {
  it('ranks the lowest sell first (cheapest to buy)', () => {
    const res = rankExchanges(rows, 'USD', 'buy', 100)
    expect(res.ranked.map(r => r.origin)).toEqual(['houseC', 'houseA', 'houseB'])
    expect(res.ranked.map(r => r.rate)).toEqual([41, 42, 43])
  })

  it('computes total UYU spent = amount * sell', () => {
    const res = rankExchanges(rows, 'USD', 'buy', 100)
    expect(res.ranked[0]!.total).toBe(4100) // 100 * 41
    expect(res.ranked[1]!.total).toBe(4200)
  })

  it('market average is the mean of the sell prices', () => {
    const res = rankExchanges(rows, 'USD', 'buy', 100)
    expect(res.marketAverage).toBeCloseTo((41 + 42 + 43) / 3, 10) // 42
  })

  it('savingsVsAvg for the best house = (avg - rate) * amount (positive)', () => {
    const res = rankExchanges(rows, 'USD', 'buy', 100)
    // best sell 41, avg 42 -> save 1 UYU/unit * 100 = 100
    expect(res.ranked[0]!.savingsVsAvg).toBeCloseTo(100, 2)
    // most expensive (43) is worse than avg -> negative
    expect(res.ranked[2]!.savingsVsAvg).toBeCloseTo(-100, 2)
  })
})

describe('rankExchanges - sell', () => {
  it('ranks the highest buy first (best paid when selling)', () => {
    const res = rankExchanges(rows, 'USD', 'sell', 100)
    expect(res.ranked.map(r => r.origin)).toEqual(['houseB', 'houseA', 'houseC'])
    expect(res.ranked.map(r => r.rate)).toEqual([41, 40, 39])
  })

  it('computes total UYU received = amount * buy', () => {
    const res = rankExchanges(rows, 'USD', 'sell', 100)
    expect(res.ranked[0]!.total).toBe(4100) // 100 * 41
    expect(res.ranked[2]!.total).toBe(3900)
  })

  it('savingsVsAvg for the best house = (rate - avg) * amount (positive)', () => {
    const res = rankExchanges(rows, 'USD', 'sell', 100)
    // best buy 41, avg 40 -> +1 UYU/unit * 100 = 100
    expect(res.marketAverage).toBeCloseTo(40, 10)
    expect(res.ranked[0]!.savingsVsAvg).toBeCloseTo(100, 2)
    expect(res.ranked[2]!.savingsVsAvg).toBeCloseTo(-100, 2)
  })
})

describe('rankExchanges - currency filtering', () => {
  it('only considers rows matching the requested currency', () => {
    const res = rankExchanges(rows, 'EUR', 'buy', 10)
    expect(res.ranked.map(r => r.origin)).toEqual(['houseA', 'houseB'])
    expect(res.ranked.every(r => r.rate === 46 || r.rate === 47)).toBe(true)
  })

  it('returns empty for a currency with no quotes', () => {
    const res = rankExchanges(rows, 'JPY', 'buy', 100)
    expect(res.ranked).toEqual([])
    expect(res.marketAverage).toBe(0)
  })
})

describe('rankExchanges - ties', () => {
  it('breaks rate ties deterministically by origin ascending', () => {
    const tied: RankableRate[] = [
      { origin: 'zeta', code: 'USD', name: 'Zeta', buy: 40, sell: 42 },
      { origin: 'alpha', code: 'USD', name: 'Alpha', buy: 40, sell: 42 },
      { origin: 'mid', code: 'USD', name: 'Mid', buy: 41, sell: 41 },
    ]
    const buy = rankExchanges(tied, 'USD', 'buy', 100)
    // sell 41 (mid) first, then the two 42s ordered alpha < zeta
    expect(buy.ranked.map(r => r.origin)).toEqual(['mid', 'alpha', 'zeta'])

    const sell = rankExchanges(tied, 'USD', 'sell', 100)
    // buy 41 (mid) first, then the two 40s ordered alpha < zeta
    expect(sell.ranked.map(r => r.origin)).toEqual(['mid', 'alpha', 'zeta'])
  })
})

describe('rankExchanges - empty / insufficient data', () => {
  it('returns an empty ranking for no rows', () => {
    const res = rankExchanges([], 'USD', 'buy', 100)
    expect(res.ranked).toEqual([])
    expect(res.marketAverage).toBe(0)
    expect(res.amount).toBe(100)
  })

  it('skips rows where the relevant rate is missing or zero', () => {
    const partial: RankableRate[] = [
      { origin: 'noSell', code: 'USD', name: 'No Sell', buy: 40 }, // no sell -> excluded for buy
      { origin: 'ok', code: 'USD', name: 'Ok', buy: 41, sell: 43 },
      { origin: 'zeroSell', code: 'USD', name: 'Zero', buy: 39, sell: 0 }, // excluded for buy
    ]
    const buy = rankExchanges(partial, 'USD', 'buy', 100)
    expect(buy.ranked.map(r => r.origin)).toEqual(['ok'])
    expect(buy.marketAverage).toBe(43)
  })

  it('handles a single house (savings vs itself is zero)', () => {
    const single: RankableRate[] = [
      { origin: 'only', code: 'GBP', name: 'Only', buy: 50, sell: 52 },
    ]
    const res = rankExchanges(single, 'GBP', 'buy', 100)
    expect(res.ranked).toHaveLength(1)
    expect(res.ranked[0]!.savingsVsAvg).toBe(0)
    expect(res.marketAverage).toBe(52)
  })

  it('clamps a non-positive or non-finite amount to zero', () => {
    expect(rankExchanges(rows, 'USD', 'buy', 0).ranked[0]!.total).toBe(0)
    expect(rankExchanges(rows, 'USD', 'buy', -5).amount).toBe(0)
    expect(rankExchanges(rows, 'USD', 'buy', Number.NaN).amount).toBe(0)
  })
})
