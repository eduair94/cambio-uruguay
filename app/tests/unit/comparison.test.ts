import { describe, expect, it } from 'vitest'
import type { EvolutionPoint } from '../../types/api'
import {
  buildComparisonChartData,
  datasetStats,
  filterSeriesByRange,
  parseRangeKey,
  pickPrice,
  type LabelledSeries,
} from '../../utils/comparison'

// Minimal EvolutionPoint factory: the alignment logic only reads date/buy/sell,
// but we satisfy the full strict shape so this stays a real contract test.
const point = (date: string, buy: number, sell: number): EvolutionPoint => ({
  date,
  buy,
  sell,
  origin: 'houseX',
  code: 'USD',
  type: '',
  name: 'House X',
})

describe('pickPrice', () => {
  it('selects the sell price', () => {
    expect(pickPrice(point('2024-01-01', 40, 42), 'sell')).toBe(42)
  })

  it('selects the buy price', () => {
    expect(pickPrice(point('2024-01-01', 40, 42), 'buy')).toBe(40)
  })
})

describe('buildComparisonChartData', () => {
  it('returns empty labels and no datasets for empty input', () => {
    expect(buildComparisonChartData([])).toEqual({ labels: [], datasets: [] })
  })

  it('keeps one empty dataset per series when every series is empty', () => {
    const series: LabelledSeries[] = [
      { label: 'A', points: [] },
      { label: 'B', points: [] },
    ]
    const result = buildComparisonChartData(series)
    expect(result.labels).toEqual([])
    expect(result.datasets).toEqual([
      { label: 'A', data: [] },
      { label: 'B', data: [] },
    ])
  })

  it('defaults to plotting the sell price', () => {
    const series: LabelledSeries[] = [{ label: 'A', points: [point('2024-01-01', 40, 42)] }]
    expect(buildComparisonChartData(series).datasets[0]?.data).toEqual([42])
  })

  it('plots the buy price when requested', () => {
    const series: LabelledSeries[] = [{ label: 'A', points: [point('2024-01-01', 40, 42)] }]
    expect(buildComparisonChartData(series, 'buy').datasets[0]?.data).toEqual([40])
  })

  it('builds a unified, ascending date axis from overlapping dates', () => {
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [point('2024-01-01', 40, 42), point('2024-01-03', 41, 43)],
      },
      {
        label: 'B',
        points: [point('2024-01-02', 39, 41), point('2024-01-03', 39.5, 41.5)],
      },
    ]
    const result = buildComparisonChartData(series, 'sell')
    expect(result.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
  })

  it('fills gaps with null where a house has no point for a date', () => {
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [point('2024-01-01', 40, 42), point('2024-01-03', 41, 43)],
      },
      {
        label: 'B',
        points: [point('2024-01-02', 39, 41), point('2024-01-03', 39.5, 41.5)],
      },
    ]
    const result = buildComparisonChartData(series, 'sell')
    // axis = [01, 02, 03]
    expect(result.datasets).toEqual([
      { label: 'A', data: [42, null, 43] },
      { label: 'B', data: [null, 41, 41.5] },
    ])
  })

  it('sorts out-of-order points onto the ascending axis', () => {
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [
          point('2024-03-01', 1, 11),
          point('2024-01-01', 2, 12),
          point('2024-02-01', 3, 13),
        ],
      },
    ]
    const result = buildComparisonChartData(series, 'sell')
    expect(result.labels).toEqual(['2024-01-01', '2024-02-01', '2024-03-01'])
    expect(result.datasets[0]?.data).toEqual([12, 13, 11])
  })

  it('lets the last duplicate point for a date win', () => {
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [point('2024-01-01', 40, 42), point('2024-01-01', 50, 52)],
      },
    ]
    const result = buildComparisonChartData(series, 'sell')
    expect(result.labels).toEqual(['2024-01-01'])
    expect(result.datasets[0]?.data).toEqual([52])
  })

  it('handles completely disjoint date sets across houses', () => {
    const series: LabelledSeries[] = [
      { label: 'A', points: [point('2024-01-01', 40, 42)] },
      { label: 'B', points: [point('2024-02-01', 39, 41)] },
    ]
    const result = buildComparisonChartData(series, 'buy')
    expect(result.labels).toEqual(['2024-01-01', '2024-02-01'])
    expect(result.datasets).toEqual([
      { label: 'A', data: [40, null] },
      { label: 'B', data: [null, 39] },
    ])
  })

  it('drops a gross outlier so one bad point cannot flatten the line', () => {
    // Real-world data-entry typo: sell=2981 among ~30-peso values (AUD/la_favorita).
    // Left in, it blows the shared y-axis up to ~3000 and squashes every line flat.
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [
          point('2024-01-01', 27, 30),
          point('2024-01-02', 23, 2981),
          point('2024-01-03', 25, 31),
        ],
      },
    ]
    const result = buildComparisonChartData(series, 'sell')
    expect(result.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
    expect(result.datasets[0]?.data).toEqual([30, null, 31])
  })

  it('treats a non-numeric price as a gap', () => {
    // Some houses (e.g. prex) emit evolution points with no buy/sell at all.
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [
          point('2024-01-01', 40, 42),
          point('2024-01-02', Number.NaN, Number.NaN),
          point('2024-01-03', 41, 43),
        ],
      },
    ]
    const result = buildComparisonChartData(series, 'sell')
    expect(result.datasets[0]?.data).toEqual([42, null, 43])
  })
})

describe('parseRangeKey', () => {
  it('accepts every known range key', () => {
    for (const key of ['7d', '1m', '3m', '6m', '1y', 'all']) {
      expect(parseRangeKey(key)).toBe(key)
    }
  })

  it('falls back to "all" for unknown or non-string input', () => {
    expect(parseRangeKey('90d')).toBe('all')
    expect(parseRangeKey('')).toBe('all')
    expect(parseRangeKey(undefined)).toBe('all')
    expect(parseRangeKey(42)).toBe('all')
  })
})

describe('filterSeriesByRange', () => {
  it('returns every point (cloned) for "all"', () => {
    const series: LabelledSeries[] = [
      { label: 'A', points: [point('2024-01-01', 1, 2), point('2024-06-01', 3, 4)] },
    ]
    const result = filterSeriesByRange(series, 'all')
    expect(result[0]?.points).toHaveLength(2)
    // Cloned, not the same array reference (page rebuilds datasets from these).
    expect(result[0]?.points).not.toBe(series[0]?.points)
  })

  it('keeps only points within the window of the latest date across series', () => {
    // Latest point is 2024-03-31; a 7-day window keeps only the last week.
    const series: LabelledSeries[] = [
      {
        label: 'A',
        points: [
          point('2024-01-01', 1, 2),
          point('2024-03-01', 3, 4),
          point('2024-03-28', 5, 6),
          point('2024-03-31', 7, 8),
        ],
      },
    ]
    const result = filterSeriesByRange(series, '7d')
    expect(result[0]?.points.map(p => p.date)).toEqual(['2024-03-28', '2024-03-31'])
  })

  it('anchors the window to the most recent point across ALL series, not each one', () => {
    // Series B lags. A 1-month window is measured from A's latest (2024-06-30),
    // so B (which ends 2024-03-01) contributes nothing and shows an empty line.
    const series: LabelledSeries[] = [
      { label: 'A', points: [point('2024-06-01', 1, 2), point('2024-06-30', 3, 4)] },
      { label: 'B', points: [point('2024-02-01', 5, 6), point('2024-03-01', 7, 8)] },
    ]
    const result = filterSeriesByRange(series, '1m')
    expect(result[0]?.points.map(p => p.date)).toEqual(['2024-06-01', '2024-06-30'])
    expect(result[1]?.points).toEqual([])
  })

  it('leaves series untouched when no date is parseable', () => {
    const series: LabelledSeries[] = [{ label: 'A', points: [point('not-a-date', 1, 2)] }]
    expect(filterSeriesByRange(series, '7d')[0]?.points).toHaveLength(1)
  })
})

describe('datasetStats', () => {
  it('reports null stats for an all-gap dataset', () => {
    expect(datasetStats([null, null])).toEqual({
      current: null,
      min: null,
      max: null,
      avg: null,
    })
    expect(datasetStats([])).toEqual({ current: null, min: null, max: null, avg: null })
  })

  it('computes min/max/avg and takes the last finite value as current', () => {
    expect(datasetStats([30, 32, 28, 31])).toEqual({
      current: 31,
      min: 28,
      max: 32,
      avg: 30.25,
    })
  })

  it('ignores gaps and uses the last non-null value for current', () => {
    // Trailing null must not blank out current; the most recent quote is 33.
    expect(datasetStats([30, null, 33, null])).toEqual({
      current: 33,
      min: 30,
      max: 33,
      avg: 31.5,
    })
  })
})
