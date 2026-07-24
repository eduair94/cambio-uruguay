import { describe, expect, it } from 'vitest'
import type { RateAnalyticsSeries } from '../../types/api'
import { aggregateRateSeries, summarizeAnalyticsHouses } from '../../utils/rateAnalytics'

const series: RateAnalyticsSeries[] = [
  {
    origin: 'a',
    houseName: 'Casa A',
    type: '',
    currentBuy: 39,
    currentSell: 40,
    points: [
      { at: '2026-07-24T01:00:00.000Z', buy: 38, sell: 40 },
      { at: '2026-07-24T02:00:00.000Z', buy: 39, sell: 40 },
    ],
  },
  {
    origin: 'b',
    houseName: 'Casa B',
    type: '',
    currentBuy: 40,
    currentSell: 42,
    points: [
      { at: '2026-07-24T01:00:00.000Z', buy: 40, sell: 42 },
      { at: '2026-07-24T02:00:00.000Z', buy: 40, sell: 42 },
    ],
  },
]

describe('aggregateRateSeries', () => {
  it('averages selected houses without weighting duplicate branches', () => {
    expect(aggregateRateSeries(series, 4100)).toEqual([
      {
        at: '2026-07-24T01:00:00.000Z',
        buy: 39,
        sell: 41,
        purchasingPower: 100,
      },
      {
        at: '2026-07-24T02:00:00.000Z',
        buy: 39.5,
        sell: 41,
        purchasingPower: 100,
      },
    ])
  })
})

describe('summarizeAnalyticsHouses', () => {
  it('sorts by the cheapest current sell and calculates purchasing power', () => {
    const rows = summarizeAnalyticsHouses(series, 4000)
    expect(rows.map(row => row.origin)).toEqual(['a', 'b'])
    expect(rows[0]?.purchasingPower).toBe(100)
    expect(rows[0]?.sellChangePct).toBe(0)
  })
})
