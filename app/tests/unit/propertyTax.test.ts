import { describe, expect, it } from 'vitest'

import {
  CI_ADICIONALES,
  CI_CONTRIBUYENTES,
  CI_EDIFICACION_INAPROPIADA,
  CI_ESCALA_2026,
  CI_FAQ,
  CI_OPCIONES_DE_PAGO,
  CI_SOURCES,
  CI_TASA_ESPECIAL_TOPE,
  CI_TASA_GENERAL,
  CI_VENTANA_OPCION,
  contribucionBase,
  ventanaOpcionAbierta,
} from '../../utils/propertyTax'

describe('la escala publicada es la del documento oficial', () => {
  it('tiene los seis tramos del ejercicio 2026, contiguos y sin huecos', () => {
    expect(CI_ESCALA_2026).toHaveLength(6)
    expect(CI_ESCALA_2026[0]!.desde).toBe(1)
    expect(CI_ESCALA_2026.at(-1)!.hasta).toBeNull()
    for (let i = 1; i < CI_ESCALA_2026.length; i++) {
      // Un hueco de un peso entre dos tramos deja un valor imponible sin alícuota, y el bug sería
      // invisible: la liquidación simplemente no cobraría ese peso.
      expect(CI_ESCALA_2026[i]!.desde).toBe(CI_ESCALA_2026[i - 1]!.hasta! + 1)
    }
  })

  it('sube monótonamente, que es lo que hace que la escala sea progresiva', () => {
    for (let i = 1; i < CI_ESCALA_2026.length; i++) {
      expect(CI_ESCALA_2026[i]!.alicuota).toBeGreaterThan(CI_ESCALA_2026[i - 1]!.alicuota)
    }
  })

  it('las alícuotas son las seis del documento, de 0,25 % a 1,80 %', () => {
    expect(CI_ESCALA_2026.map(t => t.alicuota)).toEqual([
      0.0025, 0.0075, 0.01, 0.012, 0.0165, 0.018,
    ])
  })

  // El tope de la disposición especial es exactamente el `desde` del tercer tramo: un padrón que
  // toca el tercer tramo ya superó el tope, así que la especial no puede convivir con él.
  it('la tasa especial sólo existe donde el tope la alcanza', () => {
    const conEspecial = CI_ESCALA_2026.filter(t => t.alicuotaEspecial !== null)
    expect(conEspecial).toHaveLength(2)
    expect(CI_TASA_ESPECIAL_TOPE).toBe(CI_ESCALA_2026[2]!.desde)
    expect(conEspecial[0]!.alicuotaEspecial).toBe(0.0018)
    // El segundo tramo no cambia con la disposición: la especial es sólo para la primera franja.
    expect(conEspecial[1]!.alicuotaEspecial).toBe(conEspecial[1]!.alicuota)
  })
})

describe('la liquidación aplica la escala por tramos, no sobre el total', () => {
  it('no liquida nada ante un valor que no es un valor', () => {
    for (const malo of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(contribucionBase(malo)).toBeNull()
    }
  })

  it('dentro del primer tramo grava sólo lo que hay', () => {
    const l = contribucionBase(500_000)!
    expect(l.tramos).toHaveLength(1)
    expect(l.tramos[0]!.baseGravada).toBe(500_000)
    // Con la especial: 500.000 × 0,18 %.
    expect(l.conTasaEspecial).toBe(true)
    expect(l.impuesto).toBeCloseTo(900, 6)
  })

  it('cobra el tramo siguiente sólo sobre la diferencia, como dice el documento', () => {
    const l = contribucionBase(2_000_000)!
    expect(l.tramos.map(t => t.baseGravada)).toEqual([992_630, 1_007_370])
    // La prueba de que NO se aplica al total: 0,75 % de 2.000.000 serían 15.000.
    expect(l.impuesto).toBeCloseTo(992_630 * 0.0018 + 1_007_370 * 0.0075, 6)
    expect(l.impuesto).toBeLessThan(2_000_000 * 0.0075)
  })

  it('cruzar el tope devuelve el primer tramo a 0,25 %', () => {
    const debajo = contribucionBase(CI_TASA_ESPECIAL_TOPE - 1)!
    const encima = contribucionBase(CI_TASA_ESPECIAL_TOPE)!
    expect(debajo.conTasaEspecial).toBe(true)
    expect(encima.conTasaEspecial).toBe(false)
    expect(debajo.tramos[0]!.alicuota).toBe(0.0018)
    expect(encima.tramos[0]!.alicuota).toBe(0.0025)
    // Un peso más de valor imponible cuesta más que un peso de impuesto: es el escalón real que la
    // página explica, y la liquidación tiene que reproducirlo en vez de suavizarlo.
    expect(encima.impuesto).toBeGreaterThan(debajo.impuesto + 1)
  })

  it('la suma de las bases gravadas es el valor imponible entero', () => {
    for (const vi of [1, 992_630, 992_631, 2_481_576, 2_481_577, 9_000_000, 40_000_000]) {
      const l = contribucionBase(vi)!
      expect(l.tramos.reduce((s, t) => s + t.baseGravada, 0)).toBe(vi)
      expect(l.impuesto).toBeGreaterThan(0)
    }
  })

  it('el último tramo es abierto y no trunca un padrón caro', () => {
    const l = contribucionBase(40_000_000)!
    expect(l.tramos).toHaveLength(6)
    expect(l.tramos.at(-1)!.alicuota).toBe(0.018)
    expect(l.tramos.at(-1)!.baseGravada).toBe(40_000_000 - 17_103_509)
  })

  it('es monótona: más valor imponible nunca paga menos', () => {
    let previo = 0
    for (let vi = 100_000; vi <= 20_000_000; vi += 137_000) {
      const impuesto = contribucionBase(vi)!.impuesto
      expect(impuesto).toBeGreaterThanOrEqual(previo)
      previo = impuesto
    }
  })
})

describe('la ventana para elegir modalidad tiene fecha de vencimiento', () => {
  it('abre el 1.º de octubre y cierra el 15 de diciembre de 2026', () => {
    expect(ventanaOpcionAbierta(new Date('2026-09-30T12:00:00Z'))).toBe(false)
    expect(ventanaOpcionAbierta(new Date('2026-10-01T00:00:00Z'))).toBe(true)
    expect(ventanaOpcionAbierta(new Date('2026-12-15T23:00:00Z'))).toBe(true)
    expect(ventanaOpcionAbierta(new Date('2026-12-16T00:00:00Z'))).toBe(false)
  })

  it('ofrece las tres modalidades, con la de doce cuotas como la nueva', () => {
    expect(CI_OPCIONES_DE_PAGO.map(o => o.cuotas)).toEqual([1, 3, 12])
    expect(CI_VENTANA_OPCION.rigeDesde).toContain('2027')
  })
})

describe('las cifras citadas no se publican sin fuente', () => {
  it('cada fuente es una URL oficial uruguaya', () => {
    expect(CI_SOURCES.length).toBeGreaterThanOrEqual(8)
    for (const source of CI_SOURCES) {
      expect(source.label.length).toBeGreaterThan(10)
      expect(source.url).toMatch(/^https:\/\/[^/]*(gub\.uy|impo\.com\.uy)\//)
    }
  })

  it('los adicionales van sobre el importe del impuesto y suman 22 puntos', () => {
    expect(CI_ADICIONALES.map(a => a.proporcion)).toEqual([0.1, 0.12])
    expect(CI_ADICIONALES.reduce((s, a) => s + a.proporcion, 0)).toBeCloseTo(0.22, 10)
  })

  it('la Tasa General es 1 por mil con piso mensual y rebaja por servicio ausente', () => {
    expect(CI_TASA_GENERAL.alicuota).toBe(0.001)
    expect(CI_TASA_GENERAL.minimoMensual).toBe(500)
    expect(CI_TASA_GENERAL.rebajaPorServicioAusente).toBe(0.25)
    // Cuatro servicios al 25 %: si no se presta ninguno la rebaja es del 100 %, que es lo que hace
    // consistente la regla del artículo.
    expect(CI_TASA_GENERAL.servicios).toHaveLength(4)
    expect(CI_TASA_GENERAL.servicios.length * CI_TASA_GENERAL.rebajaPorServicioAusente).toBe(1)
  })

  it('la edificación inapropiada se expresa como porcentaje de la propia contribución', () => {
    expect(CI_EDIFICACION_INAPROPIADA.proporcionMinima).toBe(0.1)
    expect(CI_EDIFICACION_INAPROPIADA.proporcionMaxima).toBe(0.75)
    expect(CI_EDIFICACION_INAPROPIADA.valorCatastralTope).toBe(889_281)
  })
})

describe('el contenido de la página', () => {
  it('nombra los cuatro sujetos pasivos del documento oficial', () => {
    expect(CI_CONTRIBUYENTES).toHaveLength(4)
    expect(CI_CONTRIBUYENTES.join(' ')).toMatch(/promesa inscripta o con fecha cierta/)
    expect(CI_CONTRIBUYENTES.join(' ')).toMatch(/remate judicialmente aprobado/)
  })

  it('tiene preguntas con id único y respuesta sustantiva', () => {
    expect(CI_FAQ.length).toBeGreaterThanOrEqual(8)
    expect(new Set(CI_FAQ.map(f => f.id)).size).toBe(CI_FAQ.length)
    for (const faq of CI_FAQ) {
      expect(faq.question.endsWith('?')).toBe(true)
      expect(faq.answer.length).toBeGreaterThan(80)
    }
  })

  // La página existe para contestar por qué no hay una sola cifra nacional: si la FAQ deja de
  // decirlo, la página pasa a leerse como si la escala de Montevideo rigiera en todo el país.
  it('explica que la escala es departamental y que el campo es la excepción', () => {
    const texto = CI_FAQ.map(f => f.answer).join(' ')
    expect(texto).toMatch(/art[íi]culo 297/)
    expect(texto).toMatch(/diecinueve/)
    expect(texto).toMatch(/Poder Legislativo/)
  })
})
