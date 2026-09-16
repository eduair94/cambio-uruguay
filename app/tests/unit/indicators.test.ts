import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import {
  EQUIVALENCE_AMOUNTS,
  changeOverDays,
  currentIndicatorValue,
  dayLabelEs,
  equivalenceTable,
  indicatorFromSlug,
  indicators,
  listIndicatorSlugs,
  liveIndicatorReading,
  monthLabelEs,
  montevideoMonthKey,
  monthlyHistory,
} from '../../utils/indicators'

const row = (origin: string, code: string, value: number): ExchangeRate => ({
  origin,
  date: '2026-06-20',
  type: '',
  code,
  name: code,
  buy: value,
  sell: value,
})

describe('indicatorFromSlug / listIndicatorSlugs', () => {
  it('resolves every catalogue slug', () => {
    for (const slug of listIndicatorSlugs()) {
      expect(indicatorFromSlug(slug)?.slug).toBe(slug)
    }
  })

  it('is case-insensitive and trims', () => {
    expect(indicatorFromSlug('  UNIDAD-INDEXADA ')?.code).toBe('UI')
  })

  it('returns null for unknown or empty slugs', () => {
    expect(indicatorFromSlug('zzz')).toBeNull()
    expect(indicatorFromSlug('')).toBeNull()
    expect(indicatorFromSlug('   ')).toBeNull()
  })

  it('includes UI, UR and BPC', () => {
    expect(listIndicatorSlugs()).toEqual(['unidad-indexada', 'unidad-reajustable', 'bpc'])
  })
})

describe('catalogue integrity', () => {
  it('gives every indicator non-empty copy and at least three FAQs', () => {
    for (const ind of indicators) {
      expect(ind.name.length).toBeGreaterThan(0)
      expect(ind.whatItIs.length).toBeGreaterThan(60)
      expect(ind.usedFor.length).toBeGreaterThanOrEqual(3)
      expect(ind.faqs.length).toBeGreaterThanOrEqual(3)
      expect(ind.referenceValue).toBeGreaterThan(0)
    }
  })

  it('only allows UI/UR/null as live codes', () => {
    for (const ind of indicators) {
      expect([null, 'UI', 'UR']).toContain(ind.code)
    }
  })
})

describe('currentIndicatorValue', () => {
  const ui = indicatorFromSlug('unidad-indexada')!
  const ur = indicatorFromSlug('unidad-reajustable')!
  const bpc = indicatorFromSlug('bpc')!

  it('prefers the authoritative BCU row', () => {
    const rows = [
      row('itau', 'UI', 6.5),
      row('bcu', 'UI', 6.5827),
      row('cambio_argentino', 'UI', 6.6),
    ]
    expect(currentIndicatorValue(rows, ui)).toBe(6.5827)
  })

  it('falls back to the first valid non-BCU row when no BCU row exists', () => {
    const rows = [row('itau', 'UI', 6.5), row('cambio_argentino', 'UI', 6.6)]
    expect(currentIndicatorValue(rows, ui)).toBe(6.5)
  })

  it('falls back to the static reference value when the code is absent', () => {
    expect(currentIndicatorValue([], ur)).toBe(ur.referenceValue)
  })

  it('ignores zero / non-positive quotes', () => {
    const rows = [row('cambio_argentino', 'UI', 0), row('bcu', 'UI', 6.59)]
    expect(currentIndicatorValue(rows, ui)).toBe(6.59)
  })

  it('always returns the reference value for statically-valued indicators (BPC)', () => {
    const rows = [row('bcu', 'UI', 6.5827)]
    expect(currentIndicatorValue(rows, bpc)).toBe(bpc.referenceValue)
  })
})

describe('liveIndicatorReading', () => {
  const ui = indicatorFromSlug('unidad-indexada')!
  const ur = indicatorFromSlug('unidad-reajustable')!
  const bpc = indicatorFromSlug('bpc')!

  it('returns the BCU value with its date', () => {
    const rows = [row('itau', 'UI', 6.64), row('bcu', 'UI', 6.6436)]
    expect(liveIndicatorReading(rows, ui)).toEqual({ value: 6.6436, date: '2026-06-20' })
  })

  it('returns null — never the reference value — when the code is absent', () => {
    // The regression this exists for: a failed API read used to reach the <title> as "hoy".
    expect(liveIndicatorReading([], ur)).toBeNull()
    expect(liveIndicatorReading([row('bcu', 'UI', 6.64)], ur)).toBeNull()
  })

  it('has no live reading for statically-valued indicators', () => {
    expect(liveIndicatorReading([row('bcu', 'UI', 6.64)], bpc)).toBeNull()
  })

  it('skips non-positive and non-finite quotes', () => {
    const rows = [row('brou', 'UI', 0), row('bcu', 'UI', Number.NaN), row('itau', 'UI', 6.64)]
    expect(liveIndicatorReading(rows, ui)?.value).toBe(6.64)
  })

  it('keeps currentIndicatorValue falling back to the reference for the calculator', () => {
    expect(currentIndicatorValue([], ui)).toBe(ui.referenceValue)
  })
})

describe('equivalenceTable', () => {
  it('lists amounts for every indicator in the catalogue', () => {
    for (const ind of indicators) {
      expect(EQUIVALENCE_AMOUNTS[ind.slug]?.length).toBeGreaterThanOrEqual(8)
    }
  })

  it('multiplies and rounds to cents', () => {
    expect(equivalenceTable([1, 1.25, 10], 1940.77)).toEqual([
      { units: 1, pesos: 1940.77 },
      { units: 1.25, pesos: 2425.96 },
      { units: 10, pesos: 19407.7 },
    ])
    expect(equivalenceTable([1000], 6.6436)).toEqual([{ units: 1000, pesos: 6643.6 }])
  })

  it('returns nothing for a missing or invalid value', () => {
    expect(equivalenceTable([1, 2], 0)).toEqual([])
    expect(equivalenceTable([1, 2], Number.NaN)).toEqual([])
  })
})

describe('monthlyHistory', () => {
  const p = (date: string, value: number) => ({ date, buy: value, sell: value })

  it('keeps the last observation of each Montevideo month, oldest first', () => {
    const points = [
      p('2026-07-01T03:00:00.000Z', 1900),
      p('2026-07-31T03:00:00.000Z', 1910),
      p('2026-08-15T03:00:00.000Z', 1920),
      p('2026-09-16T03:00:00.000Z', 1940.77),
    ]
    const months = monthlyHistory(points)
    expect(months.map(m => [m.month, m.value])).toEqual([
      ['2026-07', 1910],
      ['2026-08', 1920],
      ['2026-09', 1940.77],
    ])
    expect(months[0]!.changePct).toBeNull()
    expect(months[2]!.changePct).toBeCloseTo(((1940.77 - 1920) / 1920) * 100, 6)
  })

  it('puts a row written before local midnight on the 1st in the previous month', () => {
    expect(montevideoMonthKey('2026-09-01T01:00:00.000Z')).toBe('2026-08')
    expect(montevideoMonthKey('2026-09-01T03:00:00.000Z')).toBe('2026-09')
    expect(montevideoMonthKey('nope')).toBeNull()
  })

  it('computes the first kept month against the month before the window', () => {
    const points = [
      p('2026-06-10T03:00:00.000Z', 100),
      p('2026-07-10T03:00:00.000Z', 110),
      p('2026-08-10T03:00:00.000Z', 121),
    ]
    const months = monthlyHistory(points, 2)
    expect(months.map(m => m.month)).toEqual(['2026-07', '2026-08'])
    expect(months[0]!.changePct).toBeCloseTo(10, 6)
  })

  it('ignores invalid dates and non-positive values, falling back to buy', () => {
    const months = monthlyHistory([
      { date: 'bad', sell: 5 },
      { date: '2026-08-10T03:00:00.000Z', sell: 0, buy: 0 },
      { date: '2026-08-11T03:00:00.000Z', sell: null, buy: 7 },
    ])
    expect(months).toEqual([
      { month: '2026-08', date: '2026-08-11T03:00:00.000Z', value: 7, changePct: null },
    ])
  })
})

describe('changeOverDays', () => {
  const p = (date: string, value: number) => ({ date, sell: value })

  it('compares the newest point with the one a year earlier', () => {
    const points = [p('2025-09-16T03:00:00.000Z', 1835.93), p('2026-09-16T03:00:00.000Z', 1940.77)]
    expect(changeOverDays(points)).toBeCloseTo(5.7105, 3)
  })

  it('refuses to label a shorter window as twelve months', () => {
    const points = [p('2026-01-16T03:00:00.000Z', 1880), p('2026-09-16T03:00:00.000Z', 1940.77)]
    expect(changeOverDays(points)).toBeNull()
    expect(changeOverDays([p('2026-09-16T03:00:00.000Z', 1)])).toBeNull()
  })
})

describe('date labels', () => {
  it('writes the Uruguayan "setiembre"', () => {
    expect(monthLabelEs('2026-09')).toBe('setiembre de 2026')
    expect(monthLabelEs('garbage')).toBe('garbage')
  })

  it('formats the day in Montevideo time', () => {
    expect(dayLabelEs('2026-09-16T03:00:00.000Z')).toBe('16 de setiembre de 2026')
    // 01:00 UTC on the 16th is still the 15th in Montevideo.
    expect(dayLabelEs('2026-09-16T01:00:00.000Z')).toBe('15 de setiembre de 2026')
    expect(dayLabelEs('nope')).toBeNull()
  })
})
