import { describe, expect, it } from 'vitest'

import {
  AFAP_FAQ,
  AFAP_PATHS,
  AFAP_SOURCES,
  AFAP_AGE_MAX,
  AFAP_AGE_MIN,
  AFAP_CAUSAL_BEFORE_YEAR,
  AFAP_CONDITIONS,
  AFAP_DECISION_DAYS,
  AFAP_IRREVERSIBLE_WARNING,
  AFAP_NOT_THE_SAME,
  AFAP_STEPS,
  checkRevocation,
} from '../../utils/afapRevocation'

describe('la distinción que la página existe para hacer', () => {
  it('separa revocar el artículo 8 de desafiliarse', () => {
    expect(AFAP_PATHS).toHaveLength(2)
    const rev = AFAP_PATHS.find(p => p.id === 'revocacion')!
    const des = AFAP_PATHS.find(p => p.id === 'desafiliacion')!
    expect(rev.effect).toMatch(/no te vas de la afap/i)
    expect(des.effect).toMatch(/no es lo mismo/i)
  })

  it('lo dice explícito y citable', () => {
    expect(AFAP_NOT_THE_SAME).toMatch(/NO es desafiliarse/i)
    expect(AFAP_NOT_THE_SAME.length).toBeGreaterThan(120)
  })
})

describe('condiciones', () => {
  it('la franja de edad es 40 a 49', () => {
    expect(AFAP_AGE_MIN).toBe(40)
    expect(AFAP_AGE_MAX).toBe(49)
    expect(AFAP_AGE_MIN).toBeLessThan(AFAP_AGE_MAX)
  })

  it('acepta dentro de la franja y rechaza fuera, en los bordes', () => {
    expect(checkRevocation({ age: 40, mixedRegime: true }).possible).toBe(true)
    expect(checkRevocation({ age: 49, mixedRegime: true }).possible).toBe(true)
    expect(checkRevocation({ age: 39, mixedRegime: true }).possible).toBe(false)
    expect(checkRevocation({ age: 50, mixedRegime: true }).possible).toBe(false)
  })

  it('exige Régimen Mixto', () => {
    const r = checkRevocation({ age: 45, mixedRegime: false })
    expect(r.possible).toBe(false)
    expect(r.blockers.join(' ')).toMatch(/Mixto/i)
  })

  it('acumula los dos bloqueos cuando fallan los dos', () => {
    expect(checkRevocation({ age: 60, mixedRegime: false }).blockers).toHaveLength(2)
  })

  it('no rompe con una edad inválida', () => {
    const r = checkRevocation({ age: NaN, mixedRegime: true })
    expect(r.possible).toBe(false)
    expect(r.blockers[0]).not.toMatch(/NaN/)
  })

  // Honestidad: hay condiciones que sólo BPS puede verificar, y la página no finge un veredicto.
  it('nunca promete el trámite: siempre deja lo que BPS tiene que confirmar', () => {
    const r = checkRevocation({ age: 45, mixedRegime: true })
    expect(r.possible).toBe(true)
    expect(r.toConfirm.length).toBeGreaterThanOrEqual(4)
    expect(r.toConfirm.join(' ')).toMatch(/sin estar obligado/i)
    expect(r.toConfirm.join(' ')).toMatch(new RegExp(String(AFAP_CAUSAL_BEFORE_YEAR)))
  })

  it('las seis condiciones están documentadas', () => {
    expect(AFAP_CONDITIONS).toHaveLength(6)
    for (const c of AFAP_CONDITIONS) expect(c.detail.length).toBeGreaterThan(30)
  })
})

describe('el trámite', () => {
  it('tiene los cuatro pasos numerados en orden', () => {
    expect(AFAP_STEPS).toHaveLength(4)
    expect(AFAP_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4])
  })

  // El dato que más se pasa por alto y por el que se pierde la instancia.
  it('publica el plazo de 90 días corridos desde la descarga del asesoramiento', () => {
    expect(AFAP_DECISION_DAYS).toBe(90)
    const paso = AFAP_STEPS.find(s => s.title.includes(String(AFAP_DECISION_DAYS)))!
    expect(paso).toBeDefined()
    expect(paso.detail).toMatch(/descarg/i)
  })

  it('deja claro que el asesoramiento es obligatorio', () => {
    expect(AFAP_STEPS.some(s => /obligatorio/i.test(s.title + s.detail))).toBe(true)
  })

  it('advierte antes de decidir', () => {
    expect(AFAP_IRREVERSIBLE_WARNING).toMatch(/asesoramiento/i)
    expect(AFAP_IRREVERSIBLE_WARNING.length).toBeGreaterThan(100)
  })
})

describe('integridad', () => {
  it('el FAQ arranca por la pregunta tal como la hace la gente', () => {
    expect(AFAP_FAQ[0].question).toMatch(/desvinculo/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(AFAP_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of AFAP_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda regla publicada tiene fuente oficial', () => {
    expect(AFAP_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of AFAP_SOURCES) expect(s.url).toMatch(/^https:\/\/(www\.)?(bps|impo)\./)
    const urls = AFAP_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('12913') // condiciones
    expect(urls).toContain('12912') // plazo de 90 días
  })
})
