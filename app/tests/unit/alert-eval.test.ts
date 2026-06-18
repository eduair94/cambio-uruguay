import { describe, it, expect } from 'vitest'
import { compareOp, evaluateAlert, ALERT_COOLDOWN_MS } from '../../server/utils/alertEval'

const NOW = 1_000_000_000_000

describe('compareOp', () => {
  it('evaluates the four operators', () => {
    expect(compareOp('<', 39, 40)).toBe(true)
    expect(compareOp('<', 41, 40)).toBe(false)
    expect(compareOp('>', 41, 40)).toBe(true)
    expect(compareOp('<=', 40, 40)).toBe(true)
    expect(compareOp('>=', 40, 40)).toBe(true)
  })
})

describe('evaluateAlert', () => {
  const base = { op: '>=' as const, target: 41, armed: true, lastFiredAt: null as Date | null }

  it('does not fire when condition is unmet, stays armed', () => {
    expect(evaluateAlert(base, 40.5, NOW)).toEqual({ fire: false, armed: true })
  })

  it('fires when condition met and armed; disarms', () => {
    expect(evaluateAlert(base, 41.2, NOW)).toEqual({ fire: true, armed: false })
  })

  it('does not re-fire while still met but disarmed', () => {
    const a = { ...base, armed: false, lastFiredAt: new Date(NOW - 1000) }
    expect(evaluateAlert(a, 41.5, NOW)).toEqual({ fire: false, armed: false })
  })

  it('re-arms when condition becomes false again (no fire)', () => {
    const a = { ...base, armed: false, lastFiredAt: new Date(NOW - 1000) }
    expect(evaluateAlert(a, 40.0, NOW)).toEqual({ fire: false, armed: true })
  })

  it('does not fire within cooldown even if re-armed', () => {
    const a = { ...base, armed: true, lastFiredAt: new Date(NOW - 1000) }
    expect(evaluateAlert(a, 42, NOW)).toEqual({ fire: false, armed: true })
  })

  it('fires again after cooldown when re-armed and met', () => {
    const a = { ...base, armed: true, lastFiredAt: new Date(NOW - ALERT_COOLDOWN_MS - 1) }
    expect(evaluateAlert(a, 42, NOW)).toEqual({ fire: true, armed: false })
  })

  it('treats a null current rate as not-met and leaves arming unchanged', () => {
    expect(evaluateAlert(base, null, NOW)).toEqual({ fire: false, armed: true })
  })
})
