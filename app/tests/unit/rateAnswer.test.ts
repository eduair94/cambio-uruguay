import { describe, expect, it } from 'vitest'
import {
  formatChangePct,
  formatRate,
  rateAnswerFacts,
  factsFromRows,
  selectTypeRows,
  type EvolutionRow,
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

// GET /evolution/brou/USD interleaves EVERY type the casa quotes: an EBROU row
// and a plain row for each day, in no stable order. Reading the "current" rate
// off the tail therefore returns whichever type sorted last.
const mixed: EvolutionRow[] = [
  { date: '2026-01-01T03:00:00.000Z', type: 'EBROU', buy: 39.1, sell: 40.5 },
  { date: '2026-01-01T03:00:00.000Z', type: '', buy: 38.6, sell: 41.0 },
  { date: '2026-01-02T03:00:00.000Z', type: '', buy: 38.7, sell: 41.2 },
  { date: '2026-01-02T03:00:00.000Z', type: 'EBROU', buy: 39.2, sell: 40.7 },
  { date: '2026-07-10T03:00:00.000Z', type: 'EBROU', buy: 39.5, sell: 40.9 },
  { date: '2026-07-10T03:00:00.000Z', type: '', buy: 39.0, sell: 41.4 },
]

describe('selectTypeRows', () => {
  it('picks the plain walk-in quote when no type is requested', () => {
    const rows = selectTypeRows(mixed)
    expect(rows).toHaveLength(3)
    expect(rows.every(r => r.type === '')).toBe(true)
  })

  it('picks the requested type, case-insensitively', () => {
    expect(selectTypeRows(mixed, 'ebrou').every(r => r.type === 'EBROU')).toBe(true)
    expect(selectTypeRows(mixed, 'EBROU')).toHaveLength(3)
  })

  it('returns everything when the casa quotes a single type (Prex)', () => {
    const single: EvolutionRow[] = [{ date: '2026-07-10', type: '', buy: 39.8, sell: 40.6 }]
    expect(selectTypeRows(single)).toHaveLength(1)
  })

  it('is empty for a type the casa does not quote', () => {
    expect(selectTypeRows(mixed, 'cable')).toEqual([])
  })
})

describe('factsFromRows', () => {
  // The bug this exists to prevent: /historico/brou/usd quoting eBROU's 40,90
  // while /casa/brou quotes the walk-in 41,40 — the same casa, two rates.
  it('quotes the walk-in rate, not eBROU, when no type is routed', () => {
    const facts = factsFromRows(mixed, undefined, 6)
    expect(facts).toMatchObject({ buy: 39.0, sell: 41.4 })
  })

  it('quotes eBROU on the eBROU route', () => {
    const facts = factsFromRows(mixed, 'ebrou', 6)
    expect(facts).toMatchObject({ buy: 39.5, sell: 40.9 })
  })

  it('takes min/max from one type only', () => {
    // Plain sells: 41.0, 41.2, 41.4 — eBROU's 40.5 must not become the minimum.
    expect(factsFromRows(mixed, undefined, 6)).toMatchObject({ minSell: 41.0, maxSell: 41.4 })
  })

  it('computes the period change from first to last of that type', () => {
    // plain: 41.0 -> 41.4 = +0.98%
    expect(factsFromRows(mixed, undefined, 6)?.changePct).toBe(0.98)
    expect(factsFromRows(mixed, undefined, 6)?.direction).toBe('up')
  })

  it('sorts by date before reading the ends', () => {
    const shuffled = [...mixed].reverse()
    expect(factsFromRows(shuffled, undefined, 6)).toMatchObject({ sell: 41.4, minSell: 41.0 })
  })

  it('returns null on empty rows, a missing period, or non-positive quotes', () => {
    expect(factsFromRows([], undefined, 6)).toBeNull()
    expect(factsFromRows(mixed, undefined, undefined)).toBeNull()
    expect(
      factsFromRows([{ date: '2026-07-10', type: '', buy: 0, sell: 41 }], undefined, 6)
    ).toBeNull()
  })
})
