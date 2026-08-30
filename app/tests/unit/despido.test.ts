import { describe, expect, it } from 'vitest'

import {
  DESPIDO_ESCALONES,
  DESPIDO_FAQ,
  DESPIDO_REGLAS,
  DESPIDO_SOURCES,
  JORNADAS_POR_TRAMO,
  JORNALES_MINIMOS_EN_EL_ANIO,
  TOPE_CON_DERECHO_A_JUBILACION,
  TOPE_SIN_DERECHO_A_JUBILACION,
  diasDeIndemnizacionParcial,
  mensualidadesPorDespido,
  prescribeEl,
  tieneDerechoAJubilacion,
} from '../../utils/despido'

describe('mensualidadesPorDespido', () => {
  it('paga un mes por año de actividad', () => {
    expect(mensualidadesPorDespido(1)).toBe(1)
    expect(mensualidadesPorDespido(2)).toBe(2)
    expect(mensualidadesPorDespido(5)).toBe(5)
  })

  it('cuenta la fracción de año como año entero, que es lo que dice el art. 4', () => {
    // «por cada año o fracción de actividad»: dos meses de trabajo ya son una mensualidad.
    expect(mensualidadesPorDespido(0.2)).toBe(1)
    expect(mensualidadesPorDespido(1.01)).toBe(2)
    expect(mensualidadesPorDespido(3.5)).toBe(4)
  })

  it('topea en seis mensualidades a quien no tiene derecho a jubilación', () => {
    expect(mensualidadesPorDespido(6)).toBe(TOPE_SIN_DERECHO_A_JUBILACION)
    expect(mensualidadesPorDespido(20)).toBe(TOPE_SIN_DERECHO_A_JUBILACION)
    expect(mensualidadesPorDespido(40)).toBe(TOPE_SIN_DERECHO_A_JUBILACION)
  })

  it('topea en TRES mensualidades a quien sí lo tiene, que es el tope que nadie publica', () => {
    expect(mensualidadesPorDespido(3, true)).toBe(TOPE_CON_DERECHO_A_JUBILACION)
    expect(mensualidadesPorDespido(20, true)).toBe(TOPE_CON_DERECHO_A_JUBILACION)
    // La mitad, para la misma antigüedad: el punto entero de la página.
    expect(mensualidadesPorDespido(30, true) * 2).toBe(mensualidadesPorDespido(30, false))
  })

  it('no paga nada por una antigüedad nula, y no explota con entradas basura', () => {
    for (const anios of [0, -1, -100, Number.NaN]) expect(mensualidadesPorDespido(anios)).toBe(0)
  })

  it('nunca devuelve más que el tope aplicable', () => {
    for (let anios = 1; anios <= 50; anios++) {
      expect(mensualidadesPorDespido(anios, false)).toBeLessThanOrEqual(
        TOPE_SIN_DERECHO_A_JUBILACION
      )
      expect(mensualidadesPorDespido(anios, true)).toBeLessThanOrEqual(
        TOPE_CON_DERECHO_A_JUBILACION
      )
    }
  })
})

describe('tieneDerechoAJubilacion', () => {
  it('exige las dos condiciones juntas, no una u otra', () => {
    // Art. 5 de la Ley 12.597: más de diez años de servicios Y cuarenta de edad.
    expect(tieneDerechoAJubilacion(12, 45)).toBe(true)
    expect(tieneDerechoAJubilacion(12, 38)).toBe(false)
    expect(tieneDerechoAJubilacion(6, 55)).toBe(false)
  })

  it('lee «más de diez años» como estricto: diez exactos no alcanzan', () => {
    expect(tieneDerechoAJubilacion(10, 50)).toBe(false)
    expect(tieneDerechoAJubilacion(10.5, 50)).toBe(true)
  })

  it('deja pasar la vía de las leyes especiales sin mirar edad ni servicios', () => {
    expect(tieneDerechoAJubilacion(1, 25, true)).toBe(true)
  })

  it('trata las entradas no numéricas como cero en vez de conceder el derecho', () => {
    expect(tieneDerechoAJubilacion(Number.NaN, Number.NaN)).toBe(false)
  })
})

describe('diasDeIndemnizacionParcial', () => {
  it('paga dos días de salario por cada veinticinco jornadas trabajadas', () => {
    // Art. 1: 200 jornales -> 8 tramos de 25 -> 16 días de salario.
    expect(diasDeIndemnizacionParcial(200)).toBe(16)
    expect(diasDeIndemnizacionParcial(150)).toBe(12)
  })

  it('no da nada al año que no supera los cien jornales', () => {
    expect(diasDeIndemnizacionParcial(100)).toBe(0)
    expect(diasDeIndemnizacionParcial(80)).toBe(0)
    expect(diasDeIndemnizacionParcial(JORNALES_MINIMOS_EN_EL_ANIO + 1)).toBeGreaterThan(0)
  })

  it('exceptúa a las fracciones de año, que computan aunque no lleguen a cien', () => {
    // Art. 3: «aunque la fracción no llegue a cien jornales».
    expect(diasDeIndemnizacionParcial(50, true)).toBe(4)
    expect(diasDeIndemnizacionParcial(50, false)).toBe(0)
  })

  it('trunca los tramos incompletos: veinticuatro jornadas sueltas no pagan', () => {
    const base = diasDeIndemnizacionParcial(125, true)
    expect(diasDeIndemnizacionParcial(125 + JORNADAS_POR_TRAMO - 1, true)).toBe(base)
    expect(diasDeIndemnizacionParcial(125 + JORNADAS_POR_TRAMO, true)).toBe(base + 2)
  })

  it('no explota con entradas basura', () => {
    for (const j of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(diasDeIndemnizacionParcial(j, true)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('prescribeEl', () => {
  it('cuenta desde el día siguiente al cese, no desde el cese', () => {
    // Art. 1 de la Ley 18.091: «a partir del día siguiente a aquél en que haya cesado».
    expect(prescribeEl('2026-03-10')?.toISOString().slice(0, 10)).toBe('2027-03-11')
  })

  it('acepta un Date además de una fecha ISO', () => {
    const d = new Date('2026-01-01T12:00:00Z')
    expect(prescribeEl(d)?.toISOString().slice(0, 10)).toBe('2027-01-02')
  })

  it('devuelve null ante una fecha inválida en vez de inventar un vencimiento', () => {
    expect(prescribeEl('no-es-una-fecha')).toBeNull()
  })
})

describe('el catálogo que se muestra', () => {
  it('deriva la escala de la función, sin filas escritas a mano', () => {
    for (const e of DESPIDO_ESCALONES) {
      expect(e.sinJubilacion).toBe(mensualidadesPorDespido(e.anios, false))
      expect(e.conJubilacion).toBe(mensualidadesPorDespido(e.anios, true))
    }
  })

  it('muestra la escala hasta pasar los dos topes', () => {
    const anios = DESPIDO_ESCALONES.map(e => e.anios)
    expect(Math.max(...anios)).toBeGreaterThan(TOPE_SIN_DERECHO_A_JUBILACION)
    expect(DESPIDO_ESCALONES.some(e => e.conJubilacion === TOPE_CON_DERECHO_A_JUBILACION)).toBe(
      true
    )
    expect(DESPIDO_ESCALONES.some(e => e.sinJubilacion === TOPE_SIN_DERECHO_A_JUBILACION)).toBe(
      true
    )
  })

  it('cita una norma en cada regla y en cada fuente', () => {
    for (const r of DESPIDO_REGLAS) expect(r.source.length).toBeGreaterThan(0)
    expect(DESPIDO_SOURCES.length).toBeGreaterThanOrEqual(4)
  })

  it('sólo enlaza fuentes oficiales uruguayas', () => {
    // La regla del sitio: ninguna cifra legal sin una fuente primaria que la sostenga.
    for (const s of DESPIDO_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)\//)
    }
  })

  it('no repite preguntas en el FAQ', () => {
    const qs = DESPIDO_FAQ.map(f => f.question)
    expect(new Set(qs).size).toBe(qs.length)
  })

  it('no publica la cifra de jornales anuales que no se pudo verificar', () => {
    // Circula «25 jornales por año» como equivalente jornalero de la mensualidad, pero no está en
    // el texto de ninguna de las leyes ni en las páginas del MTSS que se verificaron. Mientras no
    // haya fuente, no se publica: este test es el que impide que vuelva a colarse.
    const texto = [
      ...DESPIDO_FAQ.map(f => `${f.question} ${f.short} ${f.answer}`),
      ...DESPIDO_REGLAS.map(r => `${r.label} ${r.detail}`),
    ]
      .join(' ')
      .toLowerCase()
    expect(texto).not.toMatch(/25 jornales/)
    expect(texto).not.toMatch(/veinticinco jornales/)
  })
})
