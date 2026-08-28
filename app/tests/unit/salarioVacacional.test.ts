import { describe, expect, it } from 'vitest'

import {
  LICENCIA_BASE_DIAS,
  LICENCIA_ESCALONES,
  SALARIO_VACACIONAL_FAQ,
  SALARIO_VACACIONAL_HITOS,
  SALARIO_VACACIONAL_SOURCES,
  diasDeLicencia,
  jornalLiquidoDeVacaciones,
  salarioVacacionalMinimo,
} from '../../utils/salarioVacacional'

describe('diasDeLicencia', () => {
  it('da el mínimo legal de 20 días a quien no llegó a los cinco años', () => {
    for (const anios of [0, 1, 3, 4]) expect(diasDeLicencia(anios)).toBe(LICENCIA_BASE_DIAS)
  })

  it('suma el primer día complementario a los cinco años y otro cada cuatro', () => {
    // El escalón que describe el MTSS: 5 años -> 21, y de ahí uno más cada cuatro.
    expect(diasDeLicencia(5)).toBe(21)
    expect(diasDeLicencia(8)).toBe(21)
    expect(diasDeLicencia(9)).toBe(22)
    expect(diasDeLicencia(12)).toBe(22)
    expect(diasDeLicencia(13)).toBe(23)
    expect(diasDeLicencia(40)).toBe(29)
  })

  it('no tiene tope: la escala sigue creciendo con la antigüedad', () => {
    expect(diasDeLicencia(100)).toBeGreaterThan(diasDeLicencia(40))
  })

  it('nunca devuelve menos que el mínimo legal ante entradas basura', () => {
    for (const anios of [-1, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(diasDeLicencia(anios)).toBeGreaterThanOrEqual(LICENCIA_BASE_DIAS)
    }
  })

  it('trunca los años fraccionarios: el día se gana al cumplir, no antes', () => {
    expect(diasDeLicencia(4.9)).toBe(LICENCIA_BASE_DIAS)
    expect(diasDeLicencia(5.9)).toBe(21)
  })
})

describe('LICENCIA_ESCALONES', () => {
  it('deriva cada fila de la función, sin números escritos a mano', () => {
    for (const escalon of LICENCIA_ESCALONES) {
      expect(escalon.dias).toBe(diasDeLicencia(escalon.desdeAnios))
    }
  })

  it('empieza en el mínimo legal y crece de a un día', () => {
    expect(LICENCIA_ESCALONES[0]?.dias).toBe(LICENCIA_BASE_DIAS)
    for (let i = 1; i < LICENCIA_ESCALONES.length; i++) {
      expect(LICENCIA_ESCALONES[i]!.dias).toBe(LICENCIA_ESCALONES[i - 1]!.dias + 1)
      expect(LICENCIA_ESCALONES[i]!.desdeAnios).toBeGreaterThan(
        LICENCIA_ESCALONES[i - 1]!.desdeAnios
      )
    }
  })
})

describe('jornalLiquidoDeVacaciones', () => {
  it('resta los descuentos al jornal nominal (Decreto 615/989, art. 3)', () => {
    expect(jornalLiquidoDeVacaciones(1000, 250)).toBe(750)
  })

  it('no baja de cero aunque los descuentos superen al nominal', () => {
    expect(jornalLiquidoDeVacaciones(1000, 4000)).toBe(0)
  })

  it('trata las entradas no numéricas como cero', () => {
    expect(jornalLiquidoDeVacaciones(Number.NaN, 100)).toBe(0)
    expect(jornalLiquidoDeVacaciones(1000, Number.NaN)).toBe(1000)
  })
})

describe('salarioVacacionalMinimo', () => {
  it('es el 100 % del jornal líquido por cada día gozado (Ley 16.101, arts. 4 y 5)', () => {
    expect(salarioVacacionalMinimo(750, 20)).toBe(15000)
  })

  it('acompaña al fraccionamiento: dos tramos suman lo mismo que la licencia entera', () => {
    const entera = salarioVacacionalMinimo(750, 20)
    expect(salarioVacacionalMinimo(750, 10) + salarioVacacionalMinimo(750, 10)).toBe(entera)
  })

  it('devuelve cero sin días gozados o sin jornal', () => {
    expect(salarioVacacionalMinimo(750, 0)).toBe(0)
    expect(salarioVacacionalMinimo(0, 20)).toBe(0)
    expect(salarioVacacionalMinimo(-750, 20)).toBe(0)
  })
})

describe('el contenido citable', () => {
  it('cada hito dice qué norma lo fija', () => {
    expect(SALARIO_VACACIONAL_HITOS).toHaveLength(3)
    for (const hito of SALARIO_VACACIONAL_HITOS) {
      expect(hito.source.length).toBeGreaterThan(0)
      expect(hito.when.length).toBeGreaterThan(0)
    }
  })

  it('no repite preguntas en el FAQ (Google colapsa duplicados)', () => {
    const questions = SALARIO_VACACIONAL_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('toda fuente es un organismo oficial uruguayo', () => {
    const allowed = ['impo.com.uy', 'gub.uy']
    expect(SALARIO_VACACIONAL_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of SALARIO_VACACIONAL_SOURCES) {
      expect(source.url.startsWith('https://')).toBe(true)
      expect(allowed.some(host => source.url.includes(host))).toBe(true)
    }
  })
})
