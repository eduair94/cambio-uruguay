import { describe, expect, it } from 'vitest'

import {
  DEADLINE_TRAP,
  DESCARGO_DIAS_HABILES,
  FINES_FAQ,
  FINES_SCOPE_NOTE,
  FINES_SOURCES,
  FINE_PRESCRIPTION_INTERRUPTS,
  FINE_PRESCRIPTION_RULE,
  FINE_PRESCRIPTION_YEARS,
  FINE_RECOGNITION_WARNING,
  FINE_REFUND_ROUTES,
  FINE_STEPS,
  RECURSO_DIAS_CORRIDOS,
} from '../../utils/trafficFines'

describe('la trampa de plazos', () => {
  // Los dos plazos son 10 pero NO son la misma unidad. Es el error que cuesta la instancia.
  it('el descargo va en hábiles y el recurso en corridos', () => {
    expect(DESCARGO_DIAS_HABILES).toBe(10)
    expect(RECURSO_DIAS_CORRIDOS).toBe(10)
    const descargo = FINE_STEPS.find(s => /descargos/i.test(s.title))!
    const recurso = FINE_STEPS.find(s => /recurr/i.test(s.title))!
    expect(descargo.businessDays).toBe(true)
    expect(recurso.businessDays).toBe(false)
    expect(descargo.deadline).toMatch(/hábiles/)
    expect(recurso.deadline).toMatch(/corridos/)
  })

  it('lo advierte explícitamente', () => {
    expect(DEADLINE_TRAP).toMatch(/hábiles/)
    expect(DEADLINE_TRAP).toMatch(/corridos/)
    expect(DEADLINE_TRAP.length).toBeGreaterThan(150)
  })

  it('los pasos están numerados en orden', () => {
    expect(FINE_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4])
    for (const s of FINE_STEPS) expect(s.detail.length).toBeGreaterThan(40)
  })
})

describe('prescripción de la multa', () => {
  it('son cinco años desde la infracción', () => {
    expect(FINE_PRESCRIPTION_YEARS).toBe(5)
    expect(FINE_PRESCRIPTION_RULE).toMatch(/cinco años/i)
    expect(FINE_PRESCRIPTION_RULE).toMatch(/se cometió la infracción/i)
  })

  // Mismo patrón que la prescripción tributaria nacional: no se aplica sola.
  it('deja claro que no opera sola: requiere resolución', () => {
    expect(FINE_PRESCRIPTION_RULE).toMatch(/no opera sola/i)
    expect(FINE_PRESCRIPTION_RULE).toMatch(/acto administrativo|resoluci[oó]n del intendente/i)
  })

  it('enumera qué interrumpe el plazo', () => {
    expect(FINE_PRESCRIPTION_INTERRUPTS.length).toBeGreaterThanOrEqual(3)
    const all = FINE_PRESCRIPTION_INTERRUPTS.join(' ')
    expect(all).toMatch(/convenio/i)
    expect(all).toMatch(/reconocimiento/i)
  })

  // La advertencia que evita resucitar una deuda vieja sin querer.
  it('advierte que pagar una cuota reinicia el reloj', () => {
    expect(FINE_RECOGNITION_WARNING).toMatch(/reinicia|interrumpir/i)
    expect(FINE_RECOGNITION_WARNING).toMatch(/asesorarte|asesorate/i)
  })
})

describe('devolución de lo pagado de más', () => {
  it('ofrece las dos vías y sus límites', () => {
    expect(FINE_REFUND_ROUTES).toHaveLength(2)
    const all = FINE_REFUND_ROUTES.map(r => r.detail).join(' ')
    expect(all).toMatch(/empadronados en Montevideo/i)
    expect(all).toMatch(/abril, agosto y diciembre/i)
  })
})

describe('alcance', () => {
  // Aplicar el plazo de Montevideo en otro departamento es un error caro.
  it('aclara que el procedimiento es departamental aunque el tributo esté unificado', () => {
    expect(FINES_SCOPE_NOTE).toMatch(/SUCIVE/)
    expect(FINES_SCOPE_NOTE).toMatch(/cada intendencia/i)
    expect(FINES_SCOPE_NOTE).toMatch(/Montevideo/)
  })

  it('el FAQ lo repite donde el lector lo va a buscar', () => {
    const f = FINES_FAQ.find(x => /todo el pa[ií]s/i.test(x.question))!
    expect(f).toBeDefined()
    expect(f.answer).toMatch(/otro departamento/i)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(FINES_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of FINES_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda fuente es oficial', () => {
    expect(FINES_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of FINES_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/([\w.]+\.)?(montevideo\.gub\.uy|gub\.uy)/)
    }
  })
})
