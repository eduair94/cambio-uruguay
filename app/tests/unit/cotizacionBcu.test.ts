// La única aritmética que /cotizacion-del-bcu publica es la regla de conversión de la DGI: «el tipo
// de cambio interbancario del día anterior a la operación. Si el día anterior no hubiese cotización,
// se deberá ir a la del último día hábil anterior». Si esa función se equivoca, la página le dice a
// alguien que use la cotización de un día que no corresponde en una declaración de impuestos. Por
// eso se prueba contra el texto, caso por caso, y no contra un par de fechas de ejemplo.

import { describe, expect, it } from 'vitest'

import {
  BCU_COTIZACION_FAQ,
  BCU_COTIZACION_SOURCES,
  BCU_VS_MOSTRADOR,
  SERIES_BCU,
  diaDeCotizacionDgi,
  esFinDeSemana,
} from '../../utils/cotizacionBcu'

describe('el fin de semana no cotiza', () => {
  it.each([
    ['sábado', '2026-08-22'],
    ['domingo', '2026-08-23'],
  ])('%s', (_label, iso) => {
    expect(esFinDeSemana(iso)).toBe(true)
  })

  it.each([
    ['lunes', '2026-08-24'],
    ['martes', '2026-08-25'],
    ['miércoles', '2026-08-26'],
    ['jueves', '2026-08-27'],
    ['viernes', '2026-08-28'],
  ])('%s sí cotiza', (_label, iso) => {
    expect(esFinDeSemana(iso)).toBe(false)
  })

  it('rechaza algo que no es una fecha ISO', () => {
    expect(() => esFinDeSemana('27/08/2026')).toThrow(RangeError)
    expect(() => esFinDeSemana('2026-02-31')).toThrow(RangeError)
  })
})

describe('«el día anterior a la operación»', () => {
  // De martes a viernes el día anterior es hábil y la regla termina ahí, sin retroceder.
  it.each([
    ['martes 25 usa el lunes 24', '2026-08-25', '2026-08-24'],
    ['miércoles 26 usa el martes 25', '2026-08-26', '2026-08-25'],
    ['jueves 27 usa el miércoles 26', '2026-08-27', '2026-08-26'],
    ['viernes 28 usa el jueves 27', '2026-08-28', '2026-08-27'],
  ])('%s', (_label, operacion, esperado) => {
    const resultado = diaDeCotizacionDgi(operacion)
    expect(resultado.iso).toBe(esperado)
    expect(resultado.retrocesos).toBe(0)
    expect(resultado.motivo).toBeNull()
  })

  it('nunca devuelve el día de la operación', () => {
    for (const dia of ['2026-08-24', '2026-08-25', '2026-08-29', '2026-08-30']) {
      expect(diaDeCotizacionDgi(dia).iso).not.toBe(dia)
    }
  })
})

describe('«si el día anterior no hubiese cotización, la del último día hábil anterior»', () => {
  it('el lunes retrocede hasta el viernes, no hasta el sábado', () => {
    const resultado = diaDeCotizacionDgi('2026-08-24')
    expect(resultado.iso).toBe('2026-08-21')
    expect(resultado.retrocesos).toBe(2)
    expect(resultado.motivo).toBe('fin-de-semana')
  })

  it('el domingo usa el viernes: su día anterior es sábado', () => {
    expect(diaDeCotizacionDgi('2026-08-23').iso).toBe('2026-08-21')
  })

  it('el sábado usa el viernes sin retroceder', () => {
    const resultado = diaDeCotizacionDgi('2026-08-22')
    expect(resultado.iso).toBe('2026-08-21')
    expect(resultado.retrocesos).toBe(0)
  })

  it('salta también los días que el llamador declara sin cotización', () => {
    // Operación el miércoles 19; el martes 18 está declarado sin cotización.
    const resultado = diaDeCotizacionDgi('2026-08-19', ['2026-08-18'])
    expect(resultado.iso).toBe('2026-08-17')
    expect(resultado.retrocesos).toBe(1)
    expect(resultado.motivo).toBe('sin-cotizacion')
  })

  it('encadena feriado y fin de semana', () => {
    // Operación el martes 25; el lunes 24 es feriado, así que hay que llegar al viernes 21.
    const resultado = diaDeCotizacionDgi('2026-08-25', ['2026-08-24'])
    expect(resultado.iso).toBe('2026-08-21')
    expect(resultado.retrocesos).toBe(3)
    expect(resultado.motivo).toBe('sin-cotizacion')
  })

  it('cruza el cambio de mes y de año sin desfasarse', () => {
    expect(diaDeCotizacionDgi('2026-09-01').iso).toBe('2026-08-31')
    expect(diaDeCotizacionDgi('2027-01-01').iso).toBe('2026-12-31')
    // 1 de marzo de 2028: el año es bisiesto y el día anterior existe.
    expect(diaDeCotizacionDgi('2028-03-01').iso).toBe('2028-02-29')
  })

  it('se planta si nunca encuentra un día con cotización', () => {
    const todos = Array.from({ length: 500 }, (_unused, i) => {
      const d = new Date('2026-08-27T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - i)
      return d.toISOString().slice(0, 10)
    })
    expect(() => diaDeCotizacionDgi('2026-08-27', todos)).toThrow(RangeError)
  })
})

describe('lo que la página afirma sobre el BCU', () => {
  // El argumento central de la página es que el BCU informa UNA cotización, no dos puntas: si
  // alguna fila dijera lo contrario, la comparación con el mostrador dejaría de sostenerse.
  it('ninguna serie del BCU tiene dos puntas', () => {
    expect(SERIES_BCU.length).toBeGreaterThan(0)
    for (const serie of SERIES_BCU) expect(serie.puntas).toBe('una')
  })

  it('cada fuente citada es una URL oficial uruguaya', () => {
    const oficiales = ['bcu.gub.uy', 'gub.uy', 'impo.com.uy']
    expect(BCU_COTIZACION_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const fuente of BCU_COTIZACION_SOURCES) {
      const host = new URL(fuente.url).hostname
      expect(oficiales.some(dominio => host === dominio || host.endsWith(`.${dominio}`))).toBe(true)
      expect(fuente.label.length).toBeGreaterThan(0)
      expect(fuente.publisher.length).toBeGreaterThan(0)
    }
  })

  it('la comparación cubre los tres ejes y no repite claves', () => {
    const claves = BCU_VS_MOSTRADOR.map(d => d.key)
    expect(new Set(claves).size).toBe(claves.length)
    expect(claves).toEqual(['quien', 'puntas', 'cuando'])
  })

  it('las preguntas frecuentes son únicas y están respondidas', () => {
    const preguntas = BCU_COTIZACION_FAQ.map(f => f.question)
    expect(new Set(preguntas).size).toBe(preguntas.length)
    for (const faq of BCU_COTIZACION_FAQ) {
      expect(faq.question.endsWith('?')).toBe(true)
      expect(faq.answer.length).toBeGreaterThan(80)
    }
  })
})
