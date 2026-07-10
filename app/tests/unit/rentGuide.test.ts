import { describe, expect, it } from 'vitest'
import {
  RENTAL_PORTALS,
  GUARANTEE_OPTIONS,
  STARTUP_COSTS,
  RENT_TIPS,
  RENT_RED_FLAGS,
  guaranteeById,
} from '../../utils/rentGuide'

describe('rent guide data', () => {
  it('lists portals with valid urls', () => {
    expect(RENTAL_PORTALS.length).toBeGreaterThanOrEqual(4)
    for (const p of RENTAL_PORTALS) {
      expect(p.name.trim()).not.toBe('')
      expect(p.url.startsWith('http')).toBe(true)
      expect(p.note.trim().length).toBeGreaterThan(15)
    }
  })

  it('has guarantee options with unique ids and full fields', () => {
    const ids = GUARANTEE_OPTIONS.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(GUARANTEE_OPTIONS.length).toBeGreaterThanOrEqual(4)
    for (const g of GUARANTEE_OPTIONS) {
      expect(g.name.trim()).not.toBe('')
      expect(g.howItWorks.trim().length).toBeGreaterThan(20)
      expect(g.cost.trim()).not.toBe('')
      expect(g.speed.trim()).not.toBe('')
      expect(g.bestFor.trim()).not.toBe('')
      expect(g.pros.length).toBeGreaterThan(0)
      expect(g.cons.length).toBeGreaterThan(0)
    }
    // the common ones are present
    expect(guaranteeById('anda')).toBeDefined()
    expect(guaranteeById('seguro-fianza')).toBeDefined()
    expect(guaranteeById('nope')).toBeUndefined()
  })

  it('has startup costs, tips (with a valid source) and red flags', () => {
    expect(STARTUP_COSTS.length).toBeGreaterThan(3)
    for (const s of STARTUP_COSTS) {
      expect(s.label.trim()).not.toBe('')
      expect(s.amount.trim()).not.toBe('')
    }
    expect(RENT_TIPS.length).toBeGreaterThanOrEqual(6)
    for (const t of RENT_TIPS) {
      expect(t.tip.trim().length).toBeGreaterThan(20)
      expect(['reddit', 'oficial', 'general']).toContain(t.source)
    }
    expect(RENT_TIPS.some(t => t.source === 'reddit')).toBe(true)
    expect(RENT_RED_FLAGS.length).toBeGreaterThanOrEqual(4)
    for (const r of RENT_RED_FLAGS) expect(r.flag.trim().length).toBeGreaterThan(20)
  })
})
