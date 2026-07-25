import { describe, expect, it } from 'vitest'
import type { RateAnalyticsSeries } from '../../types/api'
import {
  aggregateRateSeries,
  cleanRateAnalyticsSeries,
  detectRateAnomalies,
  prepareRateChartSeries,
  summarizeAnalyticsHouses,
} from '../../utils/rateAnalytics'

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

describe('rate analytics chart preparation', () => {
  const spikeSeries: RateAnalyticsSeries = {
    origin: 'maiorano',
    houseName: 'Cambio Maiorano',
    type: '',
    currentBuy: 39.1,
    currentSell: 41.5,
    points: [
      { at: '2026-04-07T03:00:00.000Z', buy: 39.4, sell: 41.8 },
      { at: '2026-04-08T03:00:00.000Z', buy: 39.4, sell: 41.9 },
      { at: '2026-04-09T03:00:00.000Z', buy: 39.25, sell: 49.65 },
      { at: '2026-04-10T03:00:00.000Z', buy: 39.1, sell: 41.5 },
      { at: '2026-04-11T03:00:00.000Z', buy: 39.05, sell: 41.55 },
    ],
  }

  it('identifies the isolated Cambio Maiorano spike without flagging the buy side', () => {
    const anomalies = detectRateAnomalies(spikeSeries, 'sell')

    expect(anomalies).toHaveLength(1)
    expect(anomalies[0]).toMatchObject({
      origin: 'maiorano',
      at: '2026-04-09T03:00:00.000Z',
      value: 49.65,
    })
    expect(anomalies[0]!.baseline).toBeCloseTo(41.675)
    expect(detectRateAnomalies(spikeSeries, 'buy')).toEqual([])
  })

  it('keeps a sustained market move instead of misclassifying it as a spike', () => {
    const sustained: RateAnalyticsSeries = {
      ...spikeSeries,
      points: [
        { at: '1', buy: 39, sell: 41 },
        { at: '2', buy: 39, sell: 41 },
        { at: '3', buy: 43, sell: 45 },
        { at: '4', buy: 43, sell: 45 },
        { at: '5', buy: 43, sell: 45 },
      ],
    }

    expect(detectRateAnomalies(sustained, 'sell')).toEqual([])
  })

  it('aligns houses by timestamp and leaves real gaps as null values', () => {
    const prepared = prepareRateChartSeries(
      [
        spikeSeries,
        {
          ...series[0]!,
          points: [
            { at: '2026-04-07T03:00:00.000Z', buy: 38, sell: 40 },
            { at: '2026-04-11T03:00:00.000Z', buy: 39, sell: 41 },
          ],
        },
      ],
      'sell'
    )

    expect(prepared.series[1]!.data).toEqual([40, null, null, null, 41])
    expect(prepared.series[1]!.gapCount).toBe(3)
    expect(prepared.series[0]!.data[2]).toBeNull()
  })

  it('removes isolated anomalies from aggregate inputs without mutating the source', () => {
    const cleaned = cleanRateAnalyticsSeries([spikeSeries])

    expect(cleaned[0]!.points[2]!.sell).toBeNull()
    expect(cleaned[0]!.points[2]!.buy).toBe(39.25)
    expect(spikeSeries.points[2]!.sell).toBe(49.65)
  })
})
