// El crédito fiscal de IRPF por alquiler: lo que no puede cambiar sin volver a las fuentes.
//
// Los tests de este archivo no verifican que el catálogo "tenga datos": fijan las afirmaciones que
// la página publica y que vienen de una norma concreta. Si una de ellas cambia, el test falla y
// obliga a volver a impo.com.uy o a la ficha de la DGI antes de publicar otra cosa — que es
// exactamente lo que queremos, porque el porcentaje viejo del 6 % sigue circulando por internet.

import { describe, expect, it } from 'vitest'

import {
  RENT_CREDIT_BASIS_LABEL,
  RENT_CREDIT_DGI_SHEET_DATE,
  RENT_CREDIT_FAQ,
  RENT_CREDIT_LIMITS,
  RENT_CREDIT_NOT_REQUIRED,
  RENT_CREDIT_PERCENT,
  RENT_CREDIT_PREVIOUS_PERCENT,
  RENT_CREDIT_PUBLISHED_EXERCISE,
  RENT_CREDIT_RATE_HISTORY,
  RENT_CREDIT_REQUIREMENTS,
  RENT_CREDIT_SOURCES,
  RENT_CREDIT_VERIFIED_AT,
  rentCreditCeiling,
  rentCreditCeilingFromMonthly,
  type RentCreditItem,
} from '../../utils/rentTaxCredit'

const ALL_ITEMS: readonly RentCreditItem[] = [
  ...RENT_CREDIT_REQUIREMENTS,
  ...RENT_CREDIT_NOT_REQUIRED,
  ...RENT_CREDIT_LIMITS,
]

describe('el porcentaje vigente', () => {
  // La Ley 20.124 lo subió de 6 a 8 y la Res. DGI 1132/024 lo escribió en la resolución vieja. El
  // 6 % sigue publicado en páginas de terceros y en fichas viejas de la propia DGI, así que el
  // número de hoy se fija acá.
  it('es el 8 % y no el 6 %', () => {
    expect(RENT_CREDIT_PERCENT).toBe(8)
    expect(RENT_CREDIT_PREVIOUS_PERCENT).toBe(6)
  })

  it('la historia del porcentaje marca vigente sólo al 8 %', () => {
    const current = RENT_CREDIT_RATE_HISTORY.filter(step => step.current)
    expect(current).toHaveLength(1)
    expect(current[0]!.percent).toBe(RENT_CREDIT_PERCENT)
    const previous = RENT_CREDIT_RATE_HISTORY.filter(step => !step.current)
    expect(previous.map(step => step.percent)).toEqual([RENT_CREDIT_PREVIOUS_PERCENT])
  })
})

describe('el techo del crédito es aritmética sobre el dato del lector', () => {
  it('calcula el 8 % del alquiler anual', () => {
    expect(rentCreditCeiling(120_000)).toBe(9_600)
    expect(rentCreditCeiling(1)).toBeCloseTo(0.08, 10)
  })

  it('calcula desde el alquiler mensual, con los meses que se pagaron', () => {
    // 30.000 por mes, doce meses: 360.000 de alquiler, 28.800 de techo.
    expect(rentCreditCeilingFromMonthly(30_000)).toBe(28_800)
    // Una mudanza en junio: siete meses pagados, no doce.
    expect(rentCreditCeilingFromMonthly(30_000, 7)).toBe(16_800)
  })

  // Un cero publicado se leería como «no te corresponde», que es una afirmación. Ante un monto que
  // no sirve para una cuenta la función se abstiene y la página no imprime nada.
  it('se abstiene en vez de devolver cero ante un monto que no sirve', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(rentCreditCeiling(bad)).toBeNull()
      expect(rentCreditCeilingFromMonthly(bad)).toBeNull()
    }
  })

  it('rechaza una cantidad de meses que no existe en un ejercicio', () => {
    for (const months of [0, -3, 13, 2.5, Number.NaN]) {
      expect(rentCreditCeilingFromMonthly(30_000, months)).toBeNull()
    }
  })
})

describe('cada afirmación lleva su norma', () => {
  it('no repite ids', () => {
    const ids = ALL_ITEMS.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada ítem cita una fuente oficial uruguaya', () => {
    const allowed = ['impo.com.uy', 'gub.uy']
    for (const item of ALL_ITEMS) {
      expect(item.url, item.id).toMatch(/^https:\/\//)
      expect(
        allowed.some(host => item.url.includes(host)),
        `${item.id}: ${item.url}`
      ).toBe(true)
      expect(item.cite.length, item.id).toBeGreaterThan(10)
      expect(item.detail.length, item.id).toBeGreaterThan(40)
      expect(RENT_CREDIT_BASIS_LABEL[item.basis], item.id).toBeTruthy()
    }
  })

  it('todas las fuentes de la lista son oficiales y únicas', () => {
    expect(RENT_CREDIT_SOURCES.length).toBeGreaterThanOrEqual(7)
    const urls = RENT_CREDIT_SOURCES.map(source => source.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const source of RENT_CREDIT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(?:www\.)?(?:impo\.com\.uy|gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(30)
    }
  })
})

describe('las tres cosas que se dan por sentadas al revés', () => {
  // 1. El plazo de un año — que es lo que más descarta — NO es de la ley: es de una resolución.
  // Si alguien lo reetiqueta como `ley`, la página empezaría a decir que la ley pide algo que no
  // pide, y el ángulo entero de la página se cae.
  it('el plazo de un año se atribuye a la resolución de la DGI, no a la ley', () => {
    const plazo = RENT_CREDIT_REQUIREMENTS.find(item => item.id === 'plazo-un-ano')
    expect(plazo).toBeDefined()
    expect(plazo!.basis).toBe('resolucion')
    expect(plazo!.url).toContain('702-2012')
  })

  // 2. Identificar al arrendador es el requisito que sí está en la ley.
  it('identificar al arrendador se atribuye a la ley', () => {
    const arrendador = RENT_CREDIT_REQUIREMENTS.find(item => item.id === 'identificar-arrendador')
    expect(arrendador).toBeDefined()
    expect(arrendador!.basis).toBe('ley')
  })

  // 3. Lo que sobra se pierde: no se arrastra ni se devuelve. Es la corrección más importante de
  // la página, porque «me devuelven el 8 % del alquiler» es la lectura por defecto.
  it('publica que el excedente no se arrastra ni da devolución', () => {
    const excedente = RENT_CREDIT_LIMITS.find(item => item.id === 'excedente')
    expect(excedente).toBeDefined()
    expect(excedente!.detail).toMatch(/no se guarda|no podrá ser imputado/i)
    expect(excedente!.detail).toMatch(/devolución/i)
  })

  it('la ausencia de requisitos también se publica, con su propia lista', () => {
    const ids = RENT_CREDIT_NOT_REQUIRED.map(item => item.id)
    expect(ids).toContain('inscripcion')
    expect(ids).toContain('vencido')
  })
})

describe('las abstenciones', () => {
  // La página NO publica fechas ni montos de una campaña que la DGI todavía no publicó, y no
  // publica cuánto le vuelve a una persona. Estos dos tests fijan esa abstención: lo único que se
  // declara del calendario es el ejercicio de la ficha oficial que se leyó, con su fecha.
  it('declara el ejercicio y la fecha de la ficha oficial que se leyó', () => {
    expect(RENT_CREDIT_PUBLISHED_EXERCISE).toBe(2025)
    expect(RENT_CREDIT_DGI_SHEET_DATE).toBe('2026-01-26')
    expect(RENT_CREDIT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('ningún texto del catálogo promete una devolución del 8 % del alquiler', () => {
    const texts = [
      ...ALL_ITEMS.map(item => `${item.label} ${item.detail}`),
      ...RENT_CREDIT_FAQ.map(faq => faq.answer),
    ]
    for (const text of texts) {
      expect(text, text.slice(0, 60)).not.toMatch(/te devuelven el 8/i)
    }
  })
})

describe('las preguntas frecuentes', () => {
  it('abren por la pregunta que se escribe y contestan con la norma', () => {
    expect(RENT_CREDIT_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const faq of RENT_CREDIT_FAQ) {
      expect(faq.question).toMatch(/\?$/)
      expect(faq.answer.length).toBeGreaterThan(60)
    }
    const questions = RENT_CREDIT_FAQ.map(faq => faq.question)
    expect(new Set(questions).size).toBe(questions.length)
  })

  // La primera pregunta es la corrección principal; si deja de serlo, el snippet y el `FAQPage`
  // dejan de abrir por el malentendido que trae al visitante.
  it('la primera es la del 8 % que no se devuelve', () => {
    expect(RENT_CREDIT_FAQ[0]!.question).toMatch(/8 %/)
    expect(RENT_CREDIT_FAQ[0]!.answer).toMatch(/^No\./)
  })
})
