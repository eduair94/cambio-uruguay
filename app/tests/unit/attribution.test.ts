import { describe, it, expect } from 'vitest'
import { attributeMove, todaySummary } from '../../utils/attribution'

const S = (pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }))

describe('attributeMove', () => {
  it('computes each driver day-move vs its previous point, sorted by |move| desc', () => {
    const driverSeries = [
      { key: 'brl', points: S([['2026-06-01', 5.0], ['2026-06-02', 5.15]]) }, // +3%
      { key: 'dxy', points: S([['2026-06-01', 100], ['2026-06-02', 101]]) }, // +1%
    ]
    const out = attributeMove('2026-06-02', driverSeries)
    expect(out.map(d => d.key)).toEqual(['brl', 'dxy'])
    expect(out[0]!.dayMovePct).toBeCloseTo(3, 6)
    expect(out[1]!.dayMovePct).toBeCloseTo(1, 6)
  })
  it('skips a driver with no point on the date or no prior point', () => {
    const driverSeries = [
      { key: 'brl', points: S([['2026-06-02', 5.15]]) }, // no prior point
      { key: 'dxy', points: S([['2026-06-01', 100], ['2026-06-03', 101]]) }, // no 06-02 point
    ]
    expect(attributeMove('2026-06-02', driverSeries)).toEqual([])
  })
})

describe('todaySummary', () => {
  it('summarizes the latest base move and picks the strongest live driver', () => {
    const base = S([['2026-06-01', 40], ['2026-06-02', 40.8]]) // +2%
    const corr = [
      { key: 'us10y', r: 0.11, n: 800 },
      { key: 'brl', r: 0.36, n: 800 },
      { key: 'dead', r: 0.9, n: 0 }, // n=0 → excluded despite high r
    ]
    const s = todaySummary(base, corr)
    expect(s.date).toBe('2026-06-02')
    expect(s.direction).toBe('up')
    expect(s.pctChange).toBeCloseTo(2, 6)
    expect(s.top).toEqual({ key: 'brl', r: 0.36 })
  })
  it('is flat/null-safe for short input', () => {
    expect(todaySummary([], []).direction).toBe('flat')
    expect(todaySummary([], []).date).toBeNull()
    expect(todaySummary([{ date: 'd', value: 40 }], []).top).toBeNull()
  })
})
