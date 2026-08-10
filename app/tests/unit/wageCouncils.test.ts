import { describe, expect, it } from 'vitest'

import {
  WAGE_BEYOND_MINIMUM,
  WAGE_INDUSTRY_GROUPS,
  WAGE_LOOKUP_STEPS,
  WAGE_SMN_IS_NOT_YOUR_MINIMUM,
  WAGE_FAQ,
  WAGE_LAYERS,
  WAGE_SOURCES,
} from '../../utils/wageCouncils'

describe('la confusión que la página corrige', () => {
  it('deja escrito que el SMN no es tu mínimo', () => {
    expect(WAGE_SMN_IS_NOT_YOUR_MINIMUM).toMatch(/no tu m[ií]nimo/i)
    expect(WAGE_SMN_IS_NOT_YOUR_MINIMUM).toMatch(/laudo/i)
    expect(WAGE_SMN_IS_NOT_YOUR_MINIMUM.length).toBeGreaterThan(150)
  })

  it('explica las tres capas en orden', () => {
    expect(WAGE_LAYERS.map(l => l.n)).toEqual([1, 2, 3])
    expect(WAGE_LAYERS.map(l => l.label)).toEqual(['Grupo', 'Subgrupo', 'Categoría'])
  })

  // El error que hace que alguien busque en el grupo equivocado.
  it('aclara que el grupo lo define la actividad de la empresa, no la tarea', () => {
    const grupo = WAGE_LAYERS.find(l => l.label === 'Grupo')!
    expect(grupo.detail).toMatch(/EMPRESA/)
    expect(grupo.detail).toMatch(/no tu tarea/i)
  })
})

describe('el método de búsqueda', () => {
  it('tiene los cuatro pasos numerados', () => {
    expect(WAGE_LOOKUP_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4])
    for (const s of WAGE_LOOKUP_STEPS) expect(s.detail.length).toBeGreaterThan(40)
  })

  it('los pasos con enlace apuntan al MTSS', () => {
    const linked = WAGE_LOOKUP_STEPS.filter(s => s.url)
    expect(linked.length).toBeGreaterThanOrEqual(2)
    for (const s of linked) {
      expect(s.url).toMatch(/^https:\/\/www\.gub\.uy\/ministerio-trabajo-seguridad-social\//)
    }
  })

  // La salida cuando el laudo no aparece: el MTSS asesora gratis.
  it('el último paso ofrece la consulta gratuita del MTSS', () => {
    const last = WAGE_LOOKUP_STEPS[WAGE_LOOKUP_STEPS.length - 1]
    expect(last.title).toMatch(/gratis/i)
    expect(last.url).toMatch(/consultas-laborales-salariales/)
  })
})

describe('grupos publicados', () => {
  it('lista los diez de industria y comercio que publica el MTSS', () => {
    expect(WAGE_INDUSTRY_GROUPS).toHaveLength(10)
    expect(WAGE_INDUSTRY_GROUPS).toContain('Comercio en general')
    expect(WAGE_INDUSTRY_GROUPS.some(g => /construcci[oó]n/i.test(g))).toBe(true)
  })

  it('no hay grupos duplicados ni vacíos', () => {
    expect(new Set(WAGE_INDUSTRY_GROUPS).size).toBe(WAGE_INDUSTRY_GROUPS.length)
    for (const g of WAGE_INDUSTRY_GROUPS) expect(g.trim().length).toBeGreaterThan(4)
  })
})

describe('qué más da el laudo', () => {
  it('enumera lo que se suele dejar sin reclamar', () => {
    expect(WAGE_BEYOND_MINIMUM.length).toBeGreaterThanOrEqual(5)
    expect(WAGE_BEYOND_MINIMUM.join(' ')).toMatch(/prima|antig[üu]edad/i)
    expect(WAGE_BEYOND_MINIMUM.join(' ')).toMatch(/licencia/i)
  })
})

describe('integridad', () => {
  it('el FAQ arranca por la pregunta tal como se hace', () => {
    expect(WAGE_FAQ[0].question).toMatch(/cu[aá]nto/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(WAGE_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of WAGE_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  // Publicar tablas de laudos sería dato viejo garantizado; la página publica el método.
  it('no publica importes de laudos', () => {
    const all = [
      ...WAGE_FAQ.map(f => f.answer),
      ...WAGE_BEYOND_MINIMUM,
      WAGE_SMN_IS_NOT_YOUR_MINIMUM,
    ].join(' ')
    expect(all).not.toMatch(/\$\s?\d{1,3}[.,]\d{3}/)
  })

  it('toda fuente es del MTSS', () => {
    expect(WAGE_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of WAGE_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/www\.gub\.uy\/ministerio-trabajo-seguridad-social\//)
    }
  })
})
