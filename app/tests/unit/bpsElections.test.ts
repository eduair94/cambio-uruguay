import { describe, expect, it } from 'vitest'

import {
  BPS_ELECTIONS_FAQ,
  BPS_ELECTIONS_SOURCES,
  BPS_ELECTIONS_VERIFIED_AT,
  CALENDAR,
  ELECTION_DATE,
  EXEMPT,
  FINES,
  JUSTIFICATION_CAUSES,
  VOTERS,
  fineInPesos,
} from '../../utils/bpsElections'

describe('elecciones del BPS 2026', () => {
  it('fecha, calendario ordenado y verificación', () => {
    expect(ELECTION_DATE).toBe('2026-11-22')
    const dates = CALENDAR.map(c => c.from)
    expect(dates).toEqual([...dates].sort())
    expect(CALENDAR.some(c => c.from === '2026-11-23' && c.to === '2027-01-21')).toBe(true)
    expect(BPS_ELECTIONS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('tres órdenes, dos exenciones, multas en UR', () => {
    expect(VOTERS.map(v => v.orden)).toEqual([
      'Trabajadores activos',
      'Jubilados y pensionistas',
      'Empresas',
    ])
    expect(EXEMPT.length).toBe(2)
    expect(FINES.find(f => f.ur === 1)).toBeDefined()
    expect(FINES.find(f => f.ur === 2)).toBeDefined()
    expect(FINES.find(f => Array.isArray(f.ur) && f.ur.join() === '6,12,20')).toBeDefined()
  })
  it('fineInPesos redondea y no explota con basura', () => {
    expect(fineInPesos(1, 1921.36)).toBe(1921)
    expect(fineInPesos(2, 1921.36)).toBe(3843)
    expect(fineInPesos(1, null)).toBeNull()
    expect(fineInPesos(1, Number.NaN)).toBeNull()
    expect(fineInPesos(0, 1921.36)).toBeNull()
  })
  it('causales, FAQ y fuentes', () => {
    expect(JUSTIFICATION_CAUSES.length).toBeGreaterThanOrEqual(5)
    expect(BPS_ELECTIONS_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of BPS_ELECTIONS_FAQ) expect(f.answer.length).toBeGreaterThan(40)
    expect(BPS_ELECTIONS_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of BPS_ELECTIONS_SOURCES) expect(s.url).toMatch(/^https:\/\//)
  })
})
