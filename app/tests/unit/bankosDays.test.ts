// The Bankos catalog carries `availableDays` as bare numbers with no documented meaning.
// The mapping below (ISO-8601: 1 = lunes … 7 = domingo) was established empirically against the
// live catalog: every discount row whose TEXT also names its days was compared with its numbers —
// 190 rows, 190 agreements, 0 mismatches ("los miércoles, sábados y domingos" → [3,6,7],
// "de lunes a jueves" → [1,2,3,4]). These cases pin that mapping so a wrong guess can never ship:
// showing "hoy" discounts on the wrong day is worse than not showing them at all.
import { describe, expect, it } from 'vitest'
import {
  appliesOnDay,
  dayRestrictionLabel,
  isoWeekdayToday,
  BANKOS_DAY_LABELS,
} from '../../utils/bankos'

describe('Bankos weekday mapping (1 = lunes … 7 = domingo)', () => {
  it('labels each ISO weekday', () => {
    expect(BANKOS_DAY_LABELS[1]).toBe('lunes')
    expect(BANKOS_DAY_LABELS[3]).toBe('miércoles')
    expect(BANKOS_DAY_LABELS[6]).toBe('sábados')
    expect(BANKOS_DAY_LABELS[7]).toBe('domingos')
  })

  it('derives ISO weekday from a Date (Sunday is 7, not 0)', () => {
    // 2026-08-17 is a Monday; 2026-08-23 a Sunday.
    expect(isoWeekdayToday(new Date(2026, 7, 17))).toBe(1)
    expect(isoWeekdayToday(new Date(2026, 7, 22))).toBe(6)
    expect(isoWeekdayToday(new Date(2026, 7, 23))).toBe(7)
  })

  it('applies on the listed days only', () => {
    const brou = { availableDays: [3, 6, 7] } // "los miércoles, sábados y domingos"
    expect(appliesOnDay(brou, 3)).toBe(true)
    expect(appliesOnDay(brou, 6)).toBe(true)
    expect(appliesOnDay(brou, 7)).toBe(true)
    expect(appliesOnDay(brou, 1)).toBe(false)
    expect(appliesOnDay(brou, 5)).toBe(false)
  })

  it('treats null/empty as an everyday benefit, never as "no days"', () => {
    for (let d = 1; d <= 7; d++) {
      expect(appliesOnDay({ availableDays: null }, d)).toBe(true)
      expect(appliesOnDay({ availableDays: [] }, d)).toBe(true)
    }
  })

  it('describes the restriction in Spanish, and says nothing when it applies daily', () => {
    expect(dayRestrictionLabel([3])).toBe('solo miércoles')
    expect(dayRestrictionLabel([2, 6])).toBe('solo martes y sábados')
    expect(dayRestrictionLabel([3, 6, 7])).toBe('solo miércoles, sábados y domingos')
    expect(dayRestrictionLabel([1, 2, 3, 4])).toBe('solo lunes, martes, miércoles y jueves')
    expect(dayRestrictionLabel(null)).toBe('')
    expect(dayRestrictionLabel([])).toBe('')
    expect(dayRestrictionLabel([1, 2, 3, 4, 5, 6, 7])).toBe('')
  })
})
