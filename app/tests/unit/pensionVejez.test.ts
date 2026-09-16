import { describe, expect, it } from 'vitest'

import {
  AGE_REQUIREMENT,
  AMOUNT_2026,
  APPLY_URL,
  INCOMPATIBILITIES,
  LAPSE_RULE,
  MEANS_TEST,
  PENSION_FAQ,
  PENSION_SOURCES,
  PENSION_VERIFIED_AT,
  RESIDENCY_RULE,
  VS_OTHERS,
} from '../../utils/pensionVejez'

describe('pensión a la vejez (BPS) 2026', () => {
  it('monto oficial 2026', () => {
    expect(AMOUNT_2026).toBe(18575)
  })

  it('requisito de edad, con la excepción por cuidados', () => {
    expect(AGE_REQUIREMENT.base).toBe(70)
    expect(AGE_REQUIREMENT.caregiverFrom).toBe(65)
    expect(AGE_REQUIREMENT.caregiverYears).toBe(7)
  })

  it('regla de residencia menciona 10 de los últimos 20 años', () => {
    expect(RESIDENCY_RULE).toContain('10')
    expect(RESIDENCY_RULE).toContain('20')
  })

  it('carencia de recursos cubre las tres reglas oficiales', () => {
    const detail = MEANS_TEST.map(rule => rule.detail).join(' ')
    // Ingreso propio: 50 % y el tope de dos pensiones.
    expect(detail).toContain('50 %')
    expect(detail).toContain('dos pensiones')
    // Núcleo conviviente: 4 BPC y 33 % de descuento sobre el excedente.
    expect(detail).toContain('4 BPC')
    expect(detail).toContain('33 %')
    // Familiares no convivientes: entre 10 y 13 BPC.
    expect(detail).toContain('10 y 13 BPC')
    expect(MEANS_TEST.length).toBe(3)
  })

  it('incompatibilidades menciona causal jubilatoria', () => {
    expect(INCOMPATIBILITIES).toContain('causal jubilatoria')
  })

  it('caducidad menciona los tres meses sin cobrar', () => {
    expect(LAPSE_RULE).toContain('tres meses')
  })

  it('distingue pensión a la vejez, asistencia a la vejez (MIDES) y jubilación', () => {
    const ids = VS_OTHERS.map(row => row.id)
    expect(ids).toContain('pension-vejez')
    expect(ids).toContain('asistencia-vejez')
    expect(ids).toContain('jubilacion')

    const mides = VS_OTHERS.find(row => row.id === 'asistencia-vejez')
    expect(mides?.managedBy).toBe('MIDES')
    const bps = VS_OTHERS.find(row => row.id === 'pension-vejez')
    expect(bps?.managedBy).toBe('BPS')
  })

  it('el trámite apunta al BPS', () => {
    expect(APPLY_URL).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
  })

  it('FAQ: al menos 6 preguntas, todas con respuesta sustancial', () => {
    expect(PENSION_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const item of PENSION_FAQ) {
      expect(item.answer.length).toBeGreaterThan(40)
    }
  })

  it('FAQ cubre las preguntas clave del brief', () => {
    const ids = PENSION_FAQ.map(item => item.id)
    expect(ids).toContain('tengo-jubilacion')
    expect(ids).toContain('es-lo-mismo-mides')

    const jubilacion = PENSION_FAQ.find(item => item.id === 'tengo-jubilacion')
    expect(jubilacion?.answer).toMatch(/no\b/i)
    const mides = PENSION_FAQ.find(item => item.id === 'es-lo-mismo-mides')
    expect(mides?.answer).toMatch(/no\b/i)
  })

  it('fuentes: al menos 4, todas https, al menos dos de bps.gub.uy', () => {
    expect(PENSION_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of PENSION_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
    }
    const bpsSources = PENSION_SOURCES.filter(source => source.url.includes('bps.gub.uy'))
    expect(bpsSources.length).toBeGreaterThanOrEqual(2)
  })

  it('fecha de verificación', () => {
    expect(PENSION_VERIFIED_AT).toBe('2026-09-16')
  })
})
