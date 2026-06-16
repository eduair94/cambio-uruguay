import { describe, expect, it } from 'vitest'
import type { EvolutionPoint } from '../../types/api'
import { buildComparisonChartData, pickPrice, type LabelledSeries } from '../../utils/comparison'

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
})
