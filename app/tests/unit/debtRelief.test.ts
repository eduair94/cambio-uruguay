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
