import { describe, expect, it } from 'vitest'
import { FERIADOS_FIJOS } from '../../utils/feriados'
import {
  FIN_DE_ANIO_FAQ,
  FIN_DE_ANIO_FECHAS,
  FIN_DE_ANIO_FERIADOS,
  FIN_DE_ANIO_LABORABLES,
  FIN_DE_ANIO_PASOS,
  FIN_DE_ANIO_SOURCES,
  FIN_DE_ANIO_VERIFIED_AT,
  feriadoDeFecha,
} from '../../utils/finDeAnioLaboral'

/**
 * La afirmación central de `/guias/trabajar-el-24-y-31-de-diciembre-uruguay` es una NEGACIÓN: el 24 y el
 * 31 de diciembre no están en la lista de feriados del artículo 2 de la Ley 16.805. Una negación
 * así no se puede escribir a mano en una plantilla y olvidarla, porque el día que la lista cambie
 * —una ley nueva declara feriado el 24, por ejemplo— la página seguiría diciendo lo contrario sin
 * que nada se ponga rojo. Por eso la pertenencia se deriva del catálogo de la ley y estos tests
 * cierran el círculo en los dos sentidos.
 */
describe('las cuatro fechas del fin de año', () => {
  it('son el 24, el 25 y el 31 de diciembre y el 1.º de enero, en orden de calendario', () => {
    expect(FIN_DE_ANIO_FECHAS.map(f => `${f.mes}-${f.dia}`)).toEqual([
      '12-24',
      '12-25',
      '12-31',
      '1-1',
    ])
  })

  it('el 24 y el 31 de diciembre NO están en la lista de la Ley 16.805', () => {
    expect(feriadoDeFecha(12, 24)).toBeNull()
    expect(feriadoDeFecha(12, 31)).toBeNull()
    expect(FIN_DE_ANIO_LABORABLES.map(f => f.etiqueta)).toEqual([
      '24 de diciembre',
      '31 de diciembre',
    ])
  })

  it('el 25 de diciembre y el 1.º de enero sí están, y los dos son feriados pagos', () => {
    expect(FIN_DE_ANIO_FERIADOS.map(f => f.etiqueta)).toEqual(['25 de diciembre', '1.º de enero'])
    for (const fecha of FIN_DE_ANIO_FERIADOS) {
      expect(fecha.feriado?.pago, fecha.etiqueta).toBe(true)
    }
  })

  // El otro sentido: que el catálogo de la ley sea el que manda y no una copia. Si alguien agregara
  // el 24 a `FERIADOS_FIJOS`, la fila de arriba cambiaría sola y este test lo delataría.
  it('la pertenencia sale de FERIADOS_FIJOS y no de una lista paralela', () => {
    for (const fecha of FIN_DE_ANIO_FECHAS) {
      const enLaLey = FERIADOS_FIJOS.find(f => f.mes === fecha.mes && f.dia === fecha.dia) ?? null
      expect(fecha.feriado, fecha.etiqueta).toBe(enLaLey)
    }
  })

  it('cada fila nombra la norma que la sostiene', () => {
    for (const fecha of FIN_DE_ANIO_FECHAS) {
      expect(fecha.norma, fecha.etiqueta).toMatch(/Ley 1[26]\.\d{3}/)
      expect(fecha.queSeCobra.length, fecha.etiqueta).toBeGreaterThan(20)
    }
  })

  it('no publica ningún monto: la página es la regla de pago, no una cifra', () => {
    const texto = [
      ...FIN_DE_ANIO_FECHAS.map(f => `${f.queSeCobra} ${f.norma}`),
      ...FIN_DE_ANIO_FAQ.map(f => `${f.question} ${f.answer}`),
      ...FIN_DE_ANIO_PASOS.map(p => p.texto),
    ].join(' ')
    // Un importe se escribe con signo de peso o de dólar, o con la palabra pesos/dólares.
    expect(texto).not.toMatch(/\$|US\$|\bpesos\b|\bd[óo]lares\b/i)
  })
})

describe('las preguntas y las fuentes', () => {
  it('contesta las dos preguntas que traen a la página', () => {
    const preguntas = FIN_DE_ANIO_FAQ.map(f => f.question.toLowerCase()).join(' | ')
    expect(preguntas).toMatch(/24 de diciembre es feriado/)
    expect(preguntas).toMatch(/31 de diciembre/)
  })

  it('no hay preguntas repetidas y todas tienen respuesta', () => {
    const preguntas = FIN_DE_ANIO_FAQ.map(f => f.question)
    expect(new Set(preguntas).size).toBe(preguntas.length)
    for (const f of FIN_DE_ANIO_FAQ) expect(f.answer.length, f.question).toBeGreaterThan(60)
  })

  it('la respuesta del medio día manda al convenio, nunca a una ley general', () => {
    const medioDia = FIN_DE_ANIO_FAQ.find(f => f.question.includes('medio día'))
    expect(medioDia).toBeDefined()
    expect(medioDia!.answer).toMatch(/convenio/i)
    expect(medioDia!.answer).toMatch(/Ley 10\.449/)
  })

  it('cada fuente es una URL oficial uruguaya', () => {
    expect(FIN_DE_ANIO_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of FIN_DE_ANIO_SOURCES) {
      expect(s.url, s.label).toMatch(/^https:\/\/www\.(impo\.com\.uy|gub\.uy)\//)
      expect(s.label.length, s.url).toBeGreaterThan(20)
    }
    const urls = FIN_DE_ANIO_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('las dos normas que sostienen la respuesta están citadas', () => {
    const urls = FIN_DE_ANIO_SOURCES.map(s => s.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/16805-1996')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/12590-1958')
  })

  it('la fecha de verificación es una fecha real', () => {
    expect(FIN_DE_ANIO_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(`${FIN_DE_ANIO_VERIFIED_AT}T00:00:00Z`))).toBe(false)
  })
})
