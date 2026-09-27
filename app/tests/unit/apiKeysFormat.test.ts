import { describe, expect, it } from 'vitest'
import { dailyText, quotaText } from '../../utils/apiKeys'

describe('lo que se muestra de una clave', () => {
  it('la cuota del plan, o la propia si tiene un acuerdo a medida', () => {
    expect(quotaText({ plan: 'free', limits: null })).toBe('600 por minuto · 20.000 por día')
    expect(quotaText({ plan: 'business', limits: { perDay: 800000 } })).toBe(
      '3.000 por minuto · 800.000 por día'
    )
    expect(quotaText({ plan: 'internal', limits: null })).toBe('sin límite')
  })

  it('el uso por día de la última semana, del más nuevo al más viejo, con ceros', () => {
    const summary = {
      total: 20,
      last7: 20,
      routes: [],
      daily: [
        { day: '2026-09-25', count: 5 },
        { day: '2026-09-27', count: 15 },
      ],
    }
    expect(dailyText(summary, '2026-09-27', 3)).toBe('27/9: 15 · 26/9: 0 · 25/9: 5')
    expect(dailyText(null, '2026-09-27', 2)).toBe('27/9: 0 · 26/9: 0')
  })
})
