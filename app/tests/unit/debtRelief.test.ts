import { describe, it, expect } from 'vitest'
import {
  PRESCRIPTION_TYPES,
  checkPrescription,
} from '../../utils/debtRelief'

describe('PRESCRIPTION_TYPES', () => {
  it('every type has a positive month plazo, a norma and a nota', () => {
    expect(PRESCRIPTION_TYPES.length).toBeGreaterThanOrEqual(6)
    for (const t of PRESCRIPTION_TYPES) {
      expect(t.months).toBeGreaterThan(0)
      expect(t.norma.length).toBeGreaterThan(0)
      expect(t.nota.length).toBeGreaterThan(0)
    }
  })

  it('includes the key verified plazos (cheque 6m, pagaré 48m, préstamo 120m)', () => {
    const byId = Object.fromEntries(PRESCRIPTION_TYPES.map(t => [t.id, t.months]))
    expect(byId['cheque']).toBe(6)
    expect(byId['pagare_vale']).toBe(48)
    expect(byId['prestamo_personal']).toBe(120)
  })
})

describe('checkPrescription', () => {
  it('returns null for an unknown type', () => {
    expect(checkPrescription('nope', '2010-01-01', '2026-07-11')).toBeNull()
  })

  it('flags a 10-year debt untouched for 12 years as maybe-expired', () => {
    const r = checkPrescription('prestamo_personal', '2014-01-01', '2026-07-11')!
    expect(r.mayHaveExpired).toBe(true)
    expect(r.monthsRemaining).toBe(0)
    expect(r.months).toBe(120)
  })

  it('does NOT flag a 10-year debt only 3 years old', () => {
    const r = checkPrescription('prestamo_personal', '2023-07-11', '2026-07-11')!
    expect(r.mayHaveExpired).toBe(false)
    expect(r.monthsRemaining).toBeGreaterThan(0)
  })

  it('handles the cheque 6-month plazo', () => {
    expect(checkPrescription('cheque', '2026-06-01', '2026-07-11')!.mayHaveExpired).toBe(false)
    expect(checkPrescription('cheque', '2025-06-01', '2026-07-11')!.mayHaveExpired).toBe(true)
  })

  it('returns null when lastActionISO is in the future', () => {
    expect(checkPrescription('cheque', '2027-01-01', '2026-07-11')).toBeNull()
  })

  it('always carries a caveat about opposing prescription and not reconociendo the debt', () => {
    const r = checkPrescription('pagare_vale', '2000-01-01', '2026-07-11')!
    expect(r.caveat.toLowerCase()).toContain('recono')
  })
})

import {
  RELIEF_RUBRIC,
  RELIEF_SERVICES,
  computeReliefScore,
  rankedServices,
} from '../../utils/debtRelief'

describe('RELIEF_RUBRIC', () => {
  it('weights sum to 100', () => {
    expect(RELIEF_RUBRIC.reduce((s, d) => s + d.weight, 0)).toBe(100)
  })
})

describe('RELIEF_SERVICES', () => {
  it('every service scores every rubric dimension 0–100 and cites a source', () => {
    for (const s of RELIEF_SERVICES) {
      for (const d of RELIEF_RUBRIC) {
        const v = s.scores[d.id]
        expect(v, `${s.id}.${d.id}`).toBeGreaterThanOrEqual(0)
        expect(v, `${s.id}.${d.id}`).toBeLessThanOrEqual(100)
      }
      expect(s.sources.length).toBeGreaterThan(0)
      for (const src of s.sources) expect(src.url).toMatch(/^https?:\/\//)
    }
  })

  it('includes the negotiate-direct baseline and the two named platforms', () => {
    const ids = RELIEF_SERVICES.map(s => s.id)
    expect(ids).toContain('negociar_directo')
    expect(ids).toContain('chaudeudas')
    expect(ids).toContain('mideuda')
  })
})

describe('computeReliefScore + rankedServices', () => {
  it('computes the weighted average', () => {
    const flat = Object.fromEntries(RELIEF_RUBRIC.map(d => [d.id, 50])) as Record<
      'transparencia' | 'costo' | 'independencia' | 'privacidad' | 'utilidad' | 'constancia',
      number
    >
    expect(computeReliefScore(flat)).toBe(50)
  })

  it('ranks negociar_directo first (it dominates the rubric)', () => {
    const ranked = rankedServices()
    expect(ranked[0].id).toBe('negociar_directo')
    expect(ranked[0].rank).toBe(1)
    // ranks are strictly increasing and overall is descending
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].rank).toBe(i + 1)
      expect(ranked[i].overall).toBeLessThanOrEqual(ranked[i - 1].overall)
    }
  })
})
