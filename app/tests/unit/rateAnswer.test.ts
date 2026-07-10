import { describe, expect, it } from 'vitest'
import {
  formatChangePct,
  formatRate,
  rateAnswerFacts,
  type EvolutionStatistics,
} from '../../utils/rateAnswer'

// The real payload of GET /evolution/brou/USD?period=6 on 2026-07-10.
const brou: EvolutionStatistics = {
  totalDataPoints: 364,
  dateRange: {
    start: '2026-01-10T03:00:00.000Z',
    end: '2026-07-10T03:00:00.000Z',
    periodMonths: 6,
  },
  buy: { min: 36.1, max: 40, avg: 38.735164835164824, current: 39.5, change: 3.8107752956636083 },
  sell: { min: 38, max: 42, avg: 40.689010989010924, current: 40.9, change: 3.413400758533506 },
}

describe('rateAnswerFacts', () => {
  it('reduces the live BROU payload to the facts an answer block states', () => {
    expect(rateAnswerFacts(brou)).toEqual({
      buy: 39.5,
      sell: 40.9,
      changePct: 3.41,
      direction: 'up',
      minSell: 38,
      maxSell: 42,
      periodMonths: 6,
      asOf: '2026-07-10T03:00:00.000Z',
    })
  })

  it('carries the period in MONTHS — the API has no 30-day series', () => {
    for (const periodMonths of [3, 6, 12, 24]) {
      const facts = rateAnswerFacts({ ...brou, dateRange: { ...brou.dateRange, periodMonths } })
      expect(facts?.periodMonths).toBe(periodMonths)
    }
  })

  it('classifies direction, treating a negligible move as flat', () => {
    const withChange = (change: number) =>
      rateAnswerFacts({ ...brou, sell: { ...brou.sell, change } })
    expect(withChange(3.4)?.direction).toBe('up')
    expect(withChange(-1.2)?.direction).toBe('down')
    expect(withChange(0)?.direction).toBe('flat')
    expect(withChange(0.01)?.direction).toBe('flat')
    expect(withChange(-0.01)?.direction).toBe('flat')
  })

  it('defaults a missing change to zero rather than dropping the answer', () => {
    const facts = rateAnswerFacts({ ...brou, sell: { ...brou.sell, change: undefined } })
    expect(facts?.changePct).toBe(0)
    expect(facts?.direction).toBe('flat')
  })

  // A finance page must fall back to generic prose, never render "$0" or a
  // half-populated sentence, when a scraper gap leaves the payload incomplete.
  describe('returns null rather than a partial answer', () => {
    it.each([
      ['null stats', null],
      ['undefined stats', undefined],
      ['no buy', { ...brou, buy: undefined }],
      ['no sell', { ...brou, sell: undefined }],
      ['zero buy', { ...brou, buy: { ...brou.buy, current: 0 } }],
      ['negative sell', { ...brou, sell: { ...brou.sell, current: -1 } }],
      ['NaN current', { ...brou, sell: { ...brou.sell, current: Number.NaN } }],
      ['missing min/max', { ...brou, sell: { current: 40.9 } }],
      ['min above max', { ...brou, sell: { ...brou.sell, min: 43, max: 42 } }],
      ['no periodMonths', { ...brou, dateRange: { end: brou.dateRange!.end } }],
      ['no end date', { ...brou, dateRange: { periodMonths: 6 } }],
      ['unparseable end date', { ...brou, dateRange: { periodMonths: 6, end: 'not-a-date' } }],
    ])('%s', (_label, stats) => {
      expect(rateAnswerFacts(stats as EvolutionStatistics)).toBeNull()
    })
  })
})

describe('formatRate', () => {
  it('renders money the Uruguayan way: comma decimal, two places', () => {
    expect(formatRate(40.9)).toBe('40,90')
    expect(formatRate(38)).toBe('38,00')
    expect(formatRate(1234.5)).toBe('1.234,50')
  })
})

describe('formatChangePct', () => {
  it('signs the percent for a reader', () => {
    expect(formatChangePct(3.41)).toBe('+3,41')
    expect(formatChangePct(-1.2)).toBe('-1,20')
    expect(formatChangePct(0)).toBe('0,00')
  })
})
