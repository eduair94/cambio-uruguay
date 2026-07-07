import { describe, it, expect } from 'vitest'
import { logReturns, alignByDate, pearson, rankDrivers, detectMoves } from '../../utils/correlation'

const S = (pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }))

describe('logReturns', () => {
  it('computes ln(v[i]/v[i-1]) keyed by the later date', () => {
    const out = logReturns(
      S([
        ['2026-06-01', 100],
        ['2026-06-02', 110],
      ])
    )
    expect(out).toHaveLength(1)
    expect(out[0]!.date).toBe('2026-06-02')
    expect(out[0]!.value).toBeCloseTo(Math.log(110 / 100), 10)
  })
  it('skips non-positive or non-finite values', () => {
    expect(
      logReturns(
        S([
          ['a', 0],
          ['b', 10],
        ])
      )
    ).toEqual([])
    expect(logReturns([])).toEqual([])
  })
})

describe('alignByDate', () => {
  it('keeps only dates present in both, in a-order', () => {
    const a = S([
      ['d1', 1],
      ['d2', 2],
      ['d3', 3],
    ])
    const b = S([
      ['d2', 20],
      ['d3', 30],
      ['d4', 40],
    ])
    expect(alignByDate(a, b)).toEqual({ a: [2, 3], b: [20, 30] })
  })

  it('joins on the calendar-day key across mixed date formats (ISO vs YYYY-MM-DD)', () => {
    const a = S([['2026-06-01T00:00:00.000Z', 1], ['2026-06-02T00:00:00.000Z', 2]])
    const b = S([['2026-06-01', 10], ['2026-06-02', 20]])
    expect(alignByDate(a, b)).toEqual({ a: [1, 2], b: [10, 20] })
  })
})

describe('pearson', () => {
  it('is 1 for a perfect positive linear relation', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
  })
  it('is -1 for a perfect negative relation', () => {
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10)
  })
  it('is 0 for zero variance or fewer than 2 points', () => {
    expect(pearson([5, 5, 5], [1, 2, 3])).toBe(0)
    expect(pearson([1], [1])).toBe(0)
  })
})

describe('rankDrivers', () => {
  it('ranks by absolute correlation of returns, descending, keeping sign', () => {
    // Base must have NON-constant returns, else every correlation is 0 (zero variance).
    const base = S([
      ['d1', 100],
      ['d2', 110],
      ['d3', 105],
      ['d4', 115],
    ])
    // strong = base scaled ×0.5 → identical ratios → identical log-returns → r = +1 exactly
    const strong = {
      key: 'strong',
      points: S([
        ['d1', 50],
        ['d2', 55],
        ['d3', 52.5],
        ['d4', 57.5],
      ]),
    }
    // anti moves opposite to base but imperfectly → r < 0 and |r| < 1
    const anti = {
      key: 'anti',
      points: S([
        ['d1', 100],
        ['d2', 90],
        ['d3', 95],
        ['d4', 88],
      ]),
    }
    const ranked = rankDrivers(base, [anti, strong])
    expect(ranked).toHaveLength(2)
    const strongR = ranked.find(c => c.key === 'strong')!
    const antiR = ranked.find(c => c.key === 'anti')!
    expect(strongR.r).toBeCloseTo(1, 6)
    expect(strongR.n).toBe(3)
    expect(antiR.r).toBeLessThan(0)
    expect(antiR.r).toBeGreaterThan(-1)
    // strong's |r| (1.0) exceeds anti's, so it ranks first
    expect(ranked[0]!.key).toBe('strong')
  })

  it('regression: correlates across mixed base(ISO)/driver(YYYY-MM-DD) date formats', () => {
    const base = S([
      ['2026-06-01T00:00:00.000Z', 100], ['2026-06-02T00:00:00.000Z', 110],
      ['2026-06-03T00:00:00.000Z', 105], ['2026-06-04T00:00:00.000Z', 115],
    ])
    const drv = { key: 'd', points: S([['2026-06-01', 50], ['2026-06-02', 55], ['2026-06-03', 52.5], ['2026-06-04', 57.5]]) }
    const ranked = rankDrivers(base, [drv])
    expect(ranked[0]!.n).toBeGreaterThan(0)
    expect(ranked[0]!.r).toBeCloseTo(1, 6)
  })
})

describe('detectMoves', () => {
  it('flags day-over-day moves above the threshold', () => {
    const moves = detectMoves(
      S([
        ['d1', 100],
        ['d2', 100.5],
        ['d3', 103],
      ]),
      1
    )
    expect(moves).toHaveLength(1)
    expect(moves[0]!.date).toBe('d3')
    expect(moves[0]!.direction).toBe('up')
    expect(moves[0]!.pctChange).toBeCloseTo(2.4876, 3)
  })
  it('detects down moves and respects a custom threshold', () => {
    const moves = detectMoves(
      S([
        ['d1', 100],
        ['d2', 97],
      ]),
      2
    )
    expect(moves[0]!.direction).toBe('down')
    expect(moves[0]!.pctChange).toBeCloseTo(-3, 6)
  })
})
