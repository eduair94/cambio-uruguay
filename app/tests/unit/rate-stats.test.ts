import { describe, it, expect } from 'vitest'
import { computeMomentum, computeRecords, computeSavings } from '../../utils/rateStats'

const S = (vals: number[]) =>
  vals.map((v, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, value: v }))

describe('computeMomentum', () => {
  it('reports an up move vs the previous point', () => {
    const r = computeMomentum(S([40, 41]))
    expect(r.latest).toBe(41)
    expect(r.prev).toBe(40)
    expect(r.direction).toBe('up')
    expect(r.changePct).toBeCloseTo(2.5, 5)
  })
  it('reports a down move', () => {
    expect(computeMomentum(S([41, 40])).direction).toBe('down')
  })
  it('flat when equal or single/empty', () => {
    expect(computeMomentum(S([40, 40])).direction).toBe('flat')
    expect(computeMomentum(S([40])).direction).toBe('flat')
    expect(computeMomentum([]).direction).toBe('flat')
    expect(computeMomentum([]).latest).toBeNull()
  })
  it('sparkline keeps the last N values', () => {
    expect(computeMomentum(S([1, 2, 3, 4, 5, 6, 7, 8]), 7).sparkline).toEqual([2, 3, 4, 5, 6, 7, 8])
  })
})

describe('computeRecords', () => {
  it('finds max/min and monthly average', () => {
    const r = computeRecords(S([40, 42, 38, 41]))
    expect(r.max).toEqual({ value: 42, date: '2026-06-02' })
    expect(r.min).toEqual({ value: 38, date: '2026-06-03' })
    expect(r.monthlyAvg).toBeCloseTo(40.25, 5)
  })
  it('returns nulls for an empty series', () => {
    const r = computeRecords([])
    expect(r.max).toBeNull()
    expect(r.min).toBeNull()
    expect(r.yearAgo).toBeNull()
  })
  it('finds the value ~1 year ago when present', () => {
    const series = [
      { date: '2025-06-18', value: 39.9 },
      { date: '2026-06-18', value: 41.3 },
    ]
    expect(computeRecords(series, new Date('2026-06-18')).yearAgo).toBe(39.9)
  })
})

describe('computeSavings', () => {
  it('savings = (avg - best) * (amount / best), never negative', () => {
    // buying USD 1000 worth: best sell 41.0, avg 41.3
    const r = computeSavings(1000, 41.0, 41.3)
    expect(r.savings).toBeGreaterThan(0)
    expect(r.pct).toBeCloseTo(((41.3 - 41.0) / 41.3) * 100, 4)
  })
  it('zero when best >= avg or inputs invalid', () => {
    expect(computeSavings(1000, 42, 41).savings).toBe(0)
    expect(computeSavings(0, 41, 42).savings).toBe(0)
    expect(computeSavings(1000, 0, 0).savings).toBe(0)
  })
})
