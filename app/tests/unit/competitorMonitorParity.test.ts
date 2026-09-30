import { describe, expect, it } from 'vitest'
import { accessFor } from '../../../classes/monitor/access'
import {
  MAX_COMPETITORS as API_MAX,
  MONITOR_CURRENCIES as API_CURRENCIES,
  TRIAL_DAYS as API_TRIAL,
} from '../../../classes/monitor/types'
import {
  MAX_COMPETITORS,
  MONITOR_CURRENCIES,
  TRIAL_DAYS,
  monitorAccess,
} from '../../utils/competitorMonitor'

// El panel promete lo que el job cumple: si la prueba, el tope o las monedas cambian de un lado y no
// del otro, la cuenta ve "te quedan 3 días" mientras el job ya cortó.
describe('monitor: el app y el job dicen lo mismo', () => {
  it('constantes', () => {
    expect(TRIAL_DAYS).toBe(API_TRIAL)
    expect(MAX_COMPETITORS).toBe(API_MAX)
    expect([...MONITOR_CURRENCIES]).toEqual([...API_CURRENCIES])
  })

  it('el acceso da el mismo estado en los bordes', () => {
    const start = new Date('2026-09-01T12:00:00Z')
    for (const offsetDays of [0, 13.99, 14, 30]) {
      const now = new Date(start.getTime() + offsetDays * 86_400_000)
      for (const business of [false, true]) {
        expect(monitorAccess(start, business, now).status).toBe(
          accessFor(start, business, now).status
        )
      }
    }
  })
})
