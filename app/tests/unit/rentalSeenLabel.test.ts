import { describe, expect, it } from 'vitest'
import { rentalSeenLabel } from '../../utils/rentalSeenLabel'
import { rentalPageMessages } from '../../utils/rentalPageMessages'

// El render de la mañana del 8/11/2026 (hora de Montevideo): el mismo instante para servidor y
// navegador, así los dos escriben el mismo texto.
const renderedAt = Date.parse('2026-11-08T12:30:00Z')

describe('rentalSeenLabel', () => {
  it('says "today" for an advert read today', () => {
    expect(rentalSeenLabel('2026-11-08', renderedAt)).toMatchObject({
      days: 0,
      tone: 'fresh',
      key: 'seenToday',
      shortKey: 'seenTodayShort',
    })
  })

  it('says "yesterday" for one day, still in the fresh tone', () => {
    expect(rentalSeenLabel('2026-11-07', renderedAt)).toMatchObject({
      days: 1,
      tone: 'fresh',
      key: 'seenYesterday',
    })
  })

  it('says "not seen again" from 2 to 4 days: a sampled harvest does not prove removal', () => {
    expect(rentalSeenLabel('2026-11-05', renderedAt)).toMatchObject({
      days: 3,
      tone: 'quiet',
      key: 'seenQuiet',
      shortKey: 'seenDaysShort',
    })
    expect(rentalSeenLabel('2026-11-04', renderedAt)?.tone).toBe('quiet')
  })

  it('warns from 5 days on that it may be gone', () => {
    expect(rentalSeenLabel('2026-11-03', renderedAt)?.tone).toBe('warning')
    expect(rentalSeenLabel('2026-11-02', renderedAt)).toMatchObject({
      days: 6,
      tone: 'warning',
      key: 'seenStale',
    })
  })

  it('counts UTC days, the calendar the harvest writes lastSeen with', () => {
    // 23:30 en Montevideo = 02:30 UTC del día siguiente: un aviso leído en esa corrida es de hoy.
    expect(rentalSeenLabel('2026-11-09', Date.parse('2026-11-09T02:30:00Z'))?.days).toBe(0)
    expect(rentalSeenLabel('2026-11-08', new Date('2026-11-09T02:30:00Z'))?.days).toBe(1)
  })

  it('never says "tomorrow" and stays silent without a usable date', () => {
    expect(rentalSeenLabel('2026-11-10', renderedAt)?.days).toBe(0)
    expect(rentalSeenLabel(null, renderedAt)).toBeNull()
    expect(rentalSeenLabel('', renderedAt)).toBeNull()
    expect(rentalSeenLabel('ayer', renderedAt)).toBeNull()
  })

  it('has its texts in the three page languages', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      const messages = rentalPageMessages[locale] as Record<string, string>
      for (const key of [
        'seenToday',
        'seenYesterday',
        'seenQuiet',
        'seenStale',
        'seenTodayShort',
        'seenYesterdayShort',
        'seenDaysShort',
      ])
        expect(messages[key], `${locale}.${key}`).toBeTruthy()
    }
    expect(rentalPageMessages.es.seenStale).toBe('Visto hace {n} días: puede que ya no esté')
    expect(rentalPageMessages.es.seenQuiet).toBe('No lo volvimos a ver desde hace {n} días')
  })
})
