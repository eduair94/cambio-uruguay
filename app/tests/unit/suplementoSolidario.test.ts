import { describe, expect, it } from 'vitest'

import {
  APPLY_STEPS,
  BASE_2026,
  DEDUCTION_PCT,
  ELIGIBLE,
  EXAMPLES,
  JUBILACION_MINIMA_2026,
  PENSION_VEJEZ_INVALIDEZ_2026,
  SUPLEMENTO_FAQ,
  SUPLEMENTO_SOURCES,
  SUPLEMENTO_VERIFIED_AT,
  estimateSupplement,
} from '../../utils/suplementoSolidario'

describe('suplemento solidario 2026', () => {
  it('valores oficiales', () => {
    expect(BASE_2026).toBe(17591)
    expect(DEDUCTION_PCT).toBe(33)
    expect(JUBILACION_MINIMA_2026).toBe(20935)
    expect(PENSION_VEJEZ_INVALIDEZ_2026).toBe(18575)
    expect(SUPLEMENTO_VERIFIED_AT).toBe('2026-09-15')
  })
  it('estimateSupplement descuenta el 33 % de la pasividad', () => {
    expect(estimateSupplement(15000)).toBe(12641)
    expect(estimateSupplement(30000)).toBe(7691)
    expect(estimateSupplement(53400)).toBe(0)
    expect(estimateSupplement(0)).toBe(17591)
  })
  it('otros ingresos: 33 % sobre el tope si tiene 65 o más, 100 % si no', () => {
    expect(estimateSupplement(30000, { otherIncome: 3000, age: 70 })).toBe(7691 - 990)
    expect(estimateSupplement(30000, { otherIncome: 3000, age: 60 })).toBe(7691 - 3000)
  })
  it('basura → null', () => {
    expect(estimateSupplement(Number.NaN)).toBeNull()
    expect(estimateSupplement(-5)).toBeNull()
    expect(estimateSupplement(30000, { otherIncome: Number.NaN })).toBeNull()
  })
  it('los ejemplos de la tabla salen de la misma función', () => {
    for (const e of EXAMPLES) expect(estimateSupplement(e.pension)).toBe(e.supplement)
  })
  it('catálogo', () => {
    expect(ELIGIBLE.length).toBeGreaterThanOrEqual(2)
    expect(APPLY_STEPS.length).toBeGreaterThanOrEqual(3)
    expect(SUPLEMENTO_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of SUPLEMENTO_FAQ) expect(f.answer.length).toBeGreaterThan(40)
    expect(SUPLEMENTO_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of SUPLEMENTO_SOURCES) expect(s.url).toMatch(/^https:\/\//)
  })
})
