// Las cuentas de /limite-de-efectivo-uruguay.
//
// El artículo 35 de la Ley 19.210 no fija UN tope sino dos condiciones alternativas, y la frase que
// decide es «el uso de efectivo será válido cuando se cumpla alguna de las dos condiciones
// anteriores»: hay que tomar la que más habilita, no la que menos. Leerlo como un mínimo en vez de
// como un máximo da la mitad del efectivo permitido en las operaciones grandes, así que los dos
// quiebres de la curva —dónde el 5 % le gana al tope fijo, y dónde el techo de 450.000 UI congela
// todo— están fijados acá y no en la página.

import { describe, expect, it } from 'vitest'

import {
  ARTICULOS_DEROGADOS,
  CASH_LIMIT_FAQ,
  CASH_LIMIT_SOURCES,
  MULTA_PISO_UI,
  QUIEBRE_PORCENTAJE_UI,
  QUIEBRE_TECHO_UI,
  TOPE_FIJO_UI,
  TOPE_PORCENTAJE_MAXIMO_UI,
  multaMaximaUi,
  topeEfectivo,
  uiAPesos,
} from '../../utils/cashLimit'

describe('topeEfectivo', () => {
  it('deja pagar toda la operación en efectivo cuando es más chica que el tope fijo', () => {
    const tope = topeEfectivo(50_000)
    expect(tope.efectivoUi).toBe(50_000)
    expect(tope.saldoUi).toBe(0)
    expect(tope.literal).toBe('fijo')
  })

  it('aplica el tope fijo mientras el 5 % quede por debajo', () => {
    // 1.000.000 UI × 5 % = 50.000 UI, muy por debajo de las 200.000 del literal a.
    const tope = topeEfectivo(1_000_000)
    expect(tope.efectivoUi).toBe(TOPE_FIJO_UI)
    expect(tope.saldoUi).toBe(800_000)
    expect(tope.literal).toBe('fijo')
  })

  it('empata exactamente en el quiebre de 4.000.000 UI', () => {
    expect(QUIEBRE_PORCENTAJE_UI).toBe(4_000_000)
    // Justo en el quiebre el 5 % da 200.000: iguala al literal a, todavía no lo supera.
    expect(topeEfectivo(QUIEBRE_PORCENTAJE_UI).efectivoUi).toBe(TOPE_FIJO_UI)
    expect(topeEfectivo(QUIEBRE_PORCENTAJE_UI).literal).toBe('fijo')
  })

  it('pasa al 5 % apenas la operación supera el quiebre', () => {
    const tope = topeEfectivo(6_000_000)
    expect(tope.efectivoUi).toBe(300_000)
    expect(tope.literal).toBe('porcentaje')
  })

  it('congela el techo en 450.000 UI por encima de 9.000.000 UI', () => {
    expect(QUIEBRE_TECHO_UI).toBe(9_000_000)
    expect(topeEfectivo(9_000_000).efectivoUi).toBe(TOPE_PORCENTAJE_MAXIMO_UI)
    // Una operación del doble no habilita un peso más de efectivo.
    const enorme = topeEfectivo(18_000_000)
    expect(enorme.efectivoUi).toBe(TOPE_PORCENTAJE_MAXIMO_UI)
    expect(enorme.literal).toBe('porcentaje-topeado')
    expect(enorme.saldoUi).toBe(17_550_000)
  })

  it('el efectivo permitido nunca decrece al crecer la operación', () => {
    let previo = 0
    for (let operacion = 0; operacion <= 20_000_000; operacion += 250_000) {
      const actual = topeEfectivo(operacion).efectivoUi
      expect(actual).toBeGreaterThanOrEqual(previo)
      previo = actual
    }
  })

  it('efectivo y saldo siempre suman la operación', () => {
    for (const operacion of [0, 1, 199_999, 200_001, 4_000_001, 9_000_001, 30_000_000]) {
      const { efectivoUi, saldoUi } = topeEfectivo(operacion)
      expect(efectivoUi + saldoUi).toBeCloseTo(Math.max(operacion, 0), 6)
      expect(saldoUi).toBeGreaterThanOrEqual(0)
    }
  })

  it('lee como cero lo que no es un monto', () => {
    for (const malo of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(topeEfectivo(malo).efectivoUi).toBe(0)
      expect(topeEfectivo(malo).saldoUi).toBe(0)
    }
  })
})

describe('multaMaximaUi', () => {
  it('usa el piso de 10.000 UI cuando el 25 % queda por debajo', () => {
    expect(multaMaximaUi(1_000)).toBe(MULTA_PISO_UI)
    expect(multaMaximaUi(0)).toBe(MULTA_PISO_UI)
  })

  it('usa el 25 % cuando supera el piso', () => {
    expect(multaMaximaUi(200_000)).toBe(50_000)
  })

  it('toma el mayor de los dos justo en el cruce', () => {
    // 40.000 UI × 25 % = 10.000 UI: los dos valores coinciden.
    expect(multaMaximaUi(40_000)).toBe(MULTA_PISO_UI)
    expect(multaMaximaUi(40_001)).toBeGreaterThan(MULTA_PISO_UI)
  })
})

describe('uiAPesos', () => {
  it('multiplica el monto por el valor de la UI', () => {
    expect(uiAPesos(200_000, 6.5)).toBe(1_300_000)
  })

  it('devuelve 0 ante valores imposibles en vez de propagar NaN a la pantalla', () => {
    expect(uiAPesos(200_000, 0)).toBe(0)
    expect(uiAPesos(200_000, Number.NaN)).toBe(0)
    expect(uiAPesos(-5, 6.5)).toBe(0)
  })
})

describe('el contenido citable', () => {
  it('nombra los tres artículos derogados con la norma que los derogó', () => {
    expect(ARTICULOS_DEROGADOS).toHaveLength(3)
    for (const art of ARTICULOS_DEROGADOS) {
      expect(art.derogadoPor).toContain('19.889')
      expect(art.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
    }
  })

  it('respalda cada fuente con una URL oficial de impo', () => {
    expect(CASH_LIMIT_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of CASH_LIMIT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(40)
    }
  })

  it('no repite preguntas en el FAQ', () => {
    const preguntas = CASH_LIMIT_FAQ.map(f => f.question)
    expect(new Set(preguntas).size).toBe(preguntas.length)
  })
})
