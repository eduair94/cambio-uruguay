import { describe, it, expect } from 'vitest'
import {
  biggestMove,
  computeMomentum,
  computeRecords,
  computeSavings,
  computeStreak,
  daysSinceHigh,
  sanitizeSeries,
  type SeriesPoint,
} from '../../utils/rateStats'

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

// ---------------------------------------------------------------------------
// Records, streaks and the guards that keep a scraper gap from being published
// as a headline fact on a finance page.
// ---------------------------------------------------------------------------

const pt = (date: string, value: number): SeriesPoint => ({ date, value })

describe('sanitizeSeries', () => {
  it('drops non-finite and non-positive values', () => {
    const out = sanitizeSeries([
      pt('2026-01-01', 40),
      pt('2026-01-02', Number.NaN),
      pt('2026-01-03', 0),
      pt('2026-01-04', -1),
      pt('2026-01-05', 41),
    ])
    expect(out.map(p => p.value)).toEqual([40, 41])
  })

  // A scraper that returns a decimal-shifted or stale-mirror value must not
  // become "el máximo histórico". A dollar does not move 15% in a day.
  it('drops a spike more than 15% from the previous kept point', () => {
    const out = sanitizeSeries([
      pt('2026-01-01', 40),
      pt('2026-01-02', 400), // decimal shift
      pt('2026-01-03', 41),
    ])
    expect(out.map(p => p.value)).toEqual([40, 41])
  })

  it('keeps a large but plausible move', () => {
    const out = sanitizeSeries([pt('2026-01-01', 40), pt('2026-01-02', 45)]) // +12.5%
    expect(out).toHaveLength(2)
  })

  it('measures the jump against the last KEPT point, not the last raw one', () => {
    // Two consecutive bad points must both go, rather than the second being
    // judged plausible because it sits next to the first bad one.
    const out = sanitizeSeries([
      pt('2026-01-01', 40),
      pt('2026-01-02', 400),
      pt('2026-01-03', 401),
      pt('2026-01-04', 41),
    ])
    expect(out.map(p => p.value)).toEqual([40, 41])
  })

  it('keeps the first positive point and handles empty input', () => {
    expect(sanitizeSeries([])).toEqual([])
    expect(sanitizeSeries([pt('2026-01-01', 40)])).toHaveLength(1)
  })
})

describe('computeStreak', () => {
  // `days` counts MOVES, not points: [40,41,42] is two consecutive rises, and
  // the copy reads "subió 2 días seguidos".
  it('counts consecutive rises', () => {
    expect(computeStreak([pt('a', 40), pt('b', 41), pt('c', 42)])).toEqual({
      direction: 'up',
      days: 2,
    })
  })

  it('counts consecutive falls', () => {
    expect(computeStreak([pt('a', 42), pt('b', 41), pt('c', 40)])).toEqual({
      direction: 'down',
      days: 2,
    })
  })

  it('stops the streak at a reversal', () => {
    expect(computeStreak([pt('a', 30), pt('b', 45), pt('c', 41), pt('d', 42)])).toEqual({
      direction: 'up',
      days: 1,
    })
  })

  it('treats an unchanged last value as flat', () => {
    expect(computeStreak([pt('a', 40), pt('b', 41), pt('c', 41)])).toEqual({
      direction: 'flat',
      days: 0,
    })
  })

  it('is flat for a series too short to have a move', () => {
    expect(computeStreak([])).toEqual({ direction: 'flat', days: 0 })
    expect(computeStreak([pt('a', 40)])).toEqual({ direction: 'flat', days: 0 })
  })
})

describe('biggestMove', () => {
  it('finds the largest absolute day-over-day change', () => {
    const move = biggestMove([pt('a', 40), pt('b', 41), pt('c', 38), pt('d', 38.5)])
    expect(move).toEqual({ date: 'c', from: 41, to: 38, delta: -3, pct: -7.32 })
  })

  it('prefers the larger magnitude regardless of sign', () => {
    const move = biggestMove([pt('a', 40), pt('b', 44), pt('c', 42)])
    expect(move?.delta).toBe(4)
  })

  it('returns null without at least two points', () => {
    expect(biggestMove([])).toBeNull()
    expect(biggestMove([pt('a', 40)])).toBeNull()
  })
})

describe('daysSinceHigh', () => {
  it('counts days from the max to now', () => {
    const series = [pt('2026-01-01', 40), pt('2026-06-01', 45), pt('2026-07-01', 42)]
    expect(daysSinceHigh(series, new Date('2026-07-11T00:00:00Z'))).toBe(40)
  })

  it('is 0 when the high is the latest point', () => {
    const series = [pt('2026-07-01', 40), pt('2026-07-11', 45)]
    expect(daysSinceHigh(series, new Date('2026-07-11T00:00:00Z'))).toBe(0)
  })

  it('returns null for an empty series', () => {
    expect(daysSinceHigh([], new Date())).toBeNull()
  })
})
