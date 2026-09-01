// Lo que este test cuida no es que las funciones «anden»: es que los números que la página publica
// sigan siendo los de la fuente.
//
// Dos riesgos concretos. El primero es la fórmula del art. 4 de la Ley 18.227, que es contraintuitiva
// (el monto por hijo BAJA cuando hay más hijos) y que alguien podría «arreglar» creyendo que es un
// bug. El segundo es el ajuste por IPC: los tres valores del art. 4 —$ 700, $ 300 y $ 1.000 de enero
// de 2008— se ajustan juntos, así que los tres importes vigentes tienen que salir del MISMO factor.
// Si al actualizar los montos alguien copia mal uno solo, ese invariante se rompe y el test lo dice,
// que es exactamente el error que una tabla escrita a mano no detecta.

import { describe, expect, it } from 'vitest'

import {
  ASIGNACION_FAMILIAR_FAQ,
  ASIGNACION_FAMILIAR_SOURCES,
  COMPARACION,
  EQUIDAD_BASE,
  EQUIDAD_COMPLEMENTO_MEDIA,
  EQUIDAD_DISCAPACIDAD,
  EQUIDAD_ESCALA,
  EQUIDAD_EXPONENTE,
  EQUIDAD_VALORES_ORIGINALES,
  FRANJAS_CONTRIBUTIVAS,
  TOPE_INCREMENTO_POR_BENEFICIARIO,
  equidadPorBeneficiario,
  equidadTotalHogar,
  topeDeIngresos,
} from '../../utils/asignacionFamiliar'

describe('la fórmula del art. 4 de la Ley 18.227', () => {
  it('paga el valor base cuando hay un solo beneficiario', () => {
    expect(equidadPorBeneficiario(1)).toBeCloseTo(EQUIDAD_BASE, 2)
    expect(equidadTotalHogar(1)).toBeCloseTo(EQUIDAD_BASE, 2)
  })

  it('reparte MENOS por cabeza a medida que el hogar crece', () => {
    // El punto entero de la página: no es un monto fijo por hijo.
    for (let n = 2; n <= 6; n++) {
      expect(equidadPorBeneficiario(n)).toBeLessThan(equidadPorBeneficiario(n - 1))
    }
  })

  it('paga MÁS al hogar a medida que crece, aunque menos que proporcionalmente', () => {
    for (let n = 2; n <= 6; n++) {
      expect(equidadTotalHogar(n)).toBeGreaterThan(equidadTotalHogar(n - 1))
      // Menos que proporcional: duplicar los hijos no duplica lo que entra al hogar.
      expect(equidadTotalHogar(n)).toBeLessThan(EQUIDAD_BASE * n)
    }
  })

  it('es exactamente base × n^0,6, y el reparto es ese total dividido entre n', () => {
    for (const n of [1, 2, 3, 5, 8]) {
      expect(equidadTotalHogar(n)).toBeCloseTo(EQUIDAD_BASE * Math.pow(n, EQUIDAD_EXPONENTE), 6)
      expect(equidadPorBeneficiario(n)).toBeCloseTo(equidadTotalHogar(n) / n, 6)
    }
  })

  it('devuelve cero, y no NaN ni Infinity, para entradas imposibles', () => {
    for (const bad of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(equidadTotalHogar(bad)).toBe(0)
      expect(equidadPorBeneficiario(bad)).toBe(0)
    }
  })
})

describe('los tres valores del Plan de Equidad salen del mismo ajuste por IPC', () => {
  // Art. 10: los importes del art. 4 están en valores constantes de enero de 2008 y se ajustan
  // juntos. Que los tres cocientes coincidan es la comprobación de que la lectura de la ley y los
  // importes publicados por BPS describen la misma prestación.
  // La tolerancia no puede ser más fina que el redondeo de la fuente: BPS publica cada importe al
  // centésimo, y medio centavo sobre el más chico de los tres ($ 300) ya mueve el cociente en
  // 1,7 × 10⁻⁵. Con tres decimales los tres factores siguen teniendo que coincidir en cuatro cifras
  // significativas, y un importe mal copiado —que corre el cociente en décimas o unidades— cae igual.
  it('los cocientes contra $ 700, $ 300 y $ 1.000 coinciden', () => {
    const factorBase = EQUIDAD_BASE / EQUIDAD_VALORES_ORIGINALES.base
    const factorMedia = EQUIDAD_COMPLEMENTO_MEDIA / EQUIDAD_VALORES_ORIGINALES.complementoMedia
    const factorDiscapacidad = EQUIDAD_DISCAPACIDAD / EQUIDAD_VALORES_ORIGINALES.discapacidad

    expect(factorMedia).toBeCloseTo(factorBase, 3)
    expect(factorDiscapacidad).toBeCloseTo(factorBase, 3)
    // Un ajuste acumulado que se fue por debajo de 1 significaría deflación desde 2008: imposible.
    expect(factorBase).toBeGreaterThan(1)
  })
})

describe('el régimen contributivo del Decreto Ley 15.084', () => {
  it('publica dos franjas, ordenadas de mayor a menor monto', () => {
    expect(FRANJAS_CONTRIBUTIVAS).toHaveLength(2)
    const [alta, baja] = FRANJAS_CONTRIBUTIVAS
    expect(alta!.montoMensual).toBeGreaterThan(baja!.montoMensual)
    // Un tope de ingresos más alto nunca puede dar derecho a cobrar más.
    expect(alta!.topeIngresos).toBeLessThan(baja!.topeIngresos)
  })

  it('deja el tope intacto hasta dos beneficiarios y lo sube a partir del tercero', () => {
    const base = FRANJAS_CONTRIBUTIVAS[1]!.topeIngresos
    expect(topeDeIngresos(base, 1)).toBe(base)
    expect(topeDeIngresos(base, 2)).toBe(base)
    // Los tres valores que BPS publica explícitamente para 3, 4 y 5 hijos.
    expect(topeDeIngresos(base, 3)).toBeCloseTo(93156.8, 2)
    expect(topeDeIngresos(base, 4)).toBeCloseTo(101625.6, 2)
    expect(topeDeIngresos(base, 5)).toBeCloseTo(110094.4, 2)
  })

  it('trata una cantidad imposible de beneficiarios como un hogar de uno', () => {
    const base = FRANJAS_CONTRIBUTIVAS[0]!.topeIngresos
    for (const bad of [0, -2, Number.NaN]) expect(topeDeIngresos(base, bad)).toBe(base)
  })

  it('sube el tope exactamente un incremento por cada beneficiario adicional', () => {
    const base = FRANJAS_CONTRIBUTIVAS[1]!.topeIngresos
    expect(topeDeIngresos(base, 4) - topeDeIngresos(base, 3)).toBeCloseTo(
      TOPE_INCREMENTO_POR_BENEFICIARIO,
      6
    )
  })
})

describe('la escala que muestra la página se deriva de la fórmula', () => {
  it('cubre de uno a cinco beneficiarios sin saltos', () => {
    expect(EQUIDAD_ESCALA.map(e => e.beneficiarios)).toEqual([1, 2, 3, 4, 5])
  })

  it('cada fila coincide con lo que devuelven las funciones', () => {
    for (const fila of EQUIDAD_ESCALA) {
      expect(fila.porBeneficiario).toBeCloseTo(equidadPorBeneficiario(fila.beneficiarios), 6)
      expect(fila.totalHogar).toBeCloseTo(equidadTotalHogar(fila.beneficiarios), 6)
      expect(fila.totalHogar).toBeCloseTo(fila.porBeneficiario * fila.beneficiarios, 6)
    }
  })

  it('el hogar de cinco cobra por cabeza bastante menos que el de uno', () => {
    const uno = EQUIDAD_ESCALA[0]!
    const cinco = EQUIDAD_ESCALA[4]!
    expect(cinco.porBeneficiario).toBeLessThan(uno.porBeneficiario * 0.6)
    expect(cinco.totalHogar).toBeGreaterThan(uno.totalHogar * 2)
  })
})

describe('el contenido que se publica', () => {
  it('compara los dos regímenes en las dos columnas, sin filas vacías', () => {
    expect(COMPARACION.length).toBeGreaterThanOrEqual(5)
    for (const fila of COMPARACION) {
      // Un piso bajo a propósito: la respuesta correcta de alguna fila es corta («Todos los
      // meses.»). Lo que tiene que atajar es la celda vacía o el marcador de posición.
      expect(fila.contributiva.length).toBeGreaterThan(10)
      expect(fila.equidad.length).toBeGreaterThan(10)
      // Una fila que dice lo mismo de los dos regímenes no es una comparación.
      expect(fila.contributiva).not.toBe(fila.equidad)
    }
  })

  it('no repite preguntas en el FAQ', () => {
    const preguntas = ASIGNACION_FAMILIAR_FAQ.map(f => f.question)
    expect(new Set(preguntas).size).toBe(preguntas.length)
    for (const f of ASIGNACION_FAMILIAR_FAQ) expect(f.answer.length).toBeGreaterThan(80)
  })

  it('cita solo fuentes oficiales uruguayas', () => {
    expect(ASIGNACION_FAMILIAR_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of ASIGNACION_FAMILIAR_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(bps\.gub\.uy|impo\.com\.uy|gub\.uy)\//)
      expect(s.label.length).toBeGreaterThan(30)
    }
  })

  it('nunca muestra un monto en pesos sin decir de qué vigencia es', () => {
    // La regla que hace que esta página envejezca de forma honesta: los importes se ajustan por IPC,
    // así que un número suelto miente apenas cambia el ajuste.
    for (const f of ASIGNACION_FAMILIAR_FAQ) {
      if (/\$\s?\d/.test(f.answer)) expect(f.answer).toMatch(/1\/2026|IPC|vigencia/i)
    }
  })
})
