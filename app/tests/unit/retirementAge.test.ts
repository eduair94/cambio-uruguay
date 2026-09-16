import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { formatNumber } from '../../utils/format'
import {
  DISABILITY_BENEFITS,
  EXTENDED_CAREER,
  INVALIDITY_PENSION_NOTE,
  NEW_SYSTEM_FIRST_BIRTH_YEAR,
  NEW_SYSTEM_NORMAL,
  PREVIOUS_SYSTEM_NORMAL,
  REDUCED_SERVICE_SCALE,
  RETIREMENT_ACCUMULATION_CAP_TRANSITION_2026,
  RETIREMENT_ADJUSTMENT_2026_PCT,
  RETIREMENT_AMOUNTS_2026,
  RETIREMENT_FAQ,
  RETIREMENT_MAX_INTERGENERATIONAL_2026,
  RETIREMENT_MAX_TRANSITION_2026,
  RETIREMENT_MIN_AGE_60_2026,
  RETIREMENT_MIN_AGE_70_2026,
  RETIREMENT_MIN_GENERAL_2026,
  RETIREMENT_SOURCES,
  retirementFor,
} from '../../utils/retirementAge'

describe('la frontera entre los dos regímenes', () => {
  // El dato que más se confunde de toda la reforma: "la jubilación pasó a los 65"
  // se publicó como si aplicara a todo el mundo, y a quien nació en 1972 no lo
  // toca. Un error de un año acá le agrega un año de trabajo a una persona real.
  it('1972 sigue en el régimen anterior y 1973 ya no', () => {
    expect(retirementFor(1972)).toMatchObject({ regime: 'previous', age: 60, years: 30 })
    expect(retirementFor(1973)).toMatchObject({ regime: 'new', age: 61, years: 30 })
  })

  it('todo lo anterior a 1973 se jubila con la misma causal común', () => {
    for (const year of [1940, 1955, 1968, 1972]) {
      expect(retirementFor(year)).toMatchObject({
        regime: 'previous',
        age: PREVIOUS_SYSTEM_NORMAL.age,
        years: PREVIOUS_SYSTEM_NORMAL.years,
      })
    }
  })
})

describe('la escala por generación del nuevo sistema', () => {
  it('sube un año por generación entre 1973 y 1977', () => {
    expect([1973, 1974, 1975, 1976, 1977].map(year => retirementFor(year).age)).toEqual([
      61, 62, 63, 64, 65,
    ])
  })

  it('se queda en 65 para todo lo posterior a 1977', () => {
    for (const year of [1978, 1990, 2005, 2026]) {
      expect(retirementFor(year).age).toBe(65)
    }
  })

  it('la tabla cubre cada año sin huecos ni solapes', () => {
    const rows = [...NEW_SYSTEM_NORMAL].sort((a, b) => a.fromYear - b.fromYear)
    expect(rows[0].fromYear).toBe(NEW_SYSTEM_FIRST_BIRTH_YEAR)
    expect(rows[rows.length - 1].toYear).toBeNull()
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].fromYear).toBe((rows[i - 1].toYear ?? 0) + 1)
    }
  })
})

describe('el año calendario en que se alcanza la edad', () => {
  it('es el año de nacimiento más la edad de su fila', () => {
    expect(retirementFor(1973).reachesAgeInYear).toBe(1973 + 61)
    expect(retirementFor(1990).reachesAgeInYear).toBe(1990 + 65)
    expect(retirementFor(1970).reachesAgeInYear).toBe(1970 + 60)
  })
})

describe('las tablas copiadas del BPS', () => {
  it('la escala por menos de 30 años va de 65/25 a 70/15', () => {
    expect(REDUCED_SERVICE_SCALE.map(row => [row.age, row.years])).toEqual([
      [65, 25],
      [66, 23],
      [67, 21],
      [68, 19],
      [69, 17],
      [70, 15],
    ])
    // Cada año de espera compra dos años menos de trabajo: si alguna fila se
    // desvía de eso, se copió mal.
    for (let i = 1; i < REDUCED_SERVICE_SCALE.length; i++) {
      expect(REDUCED_SERVICE_SCALE[i].age - REDUCED_SERVICE_SCALE[i - 1].age).toBe(1)
      expect(REDUCED_SERVICE_SCALE[i - 1].years - REDUCED_SERVICE_SCALE[i].years).toBe(2)
    }
  })

  it('extensa carrera laboral deja las DOS combinaciones de 1976 en adelante', () => {
    const open = EXTENDED_CAREER.filter(row => row.toYear === null)
    expect(open.map(row => [row.age, row.years])).toEqual([
      [63, 38],
      [64, 35],
    ])
  })

  // El canje de la causal anticipada: adelantás edad pagando años de trabajo.
  // Nunca puede pedir MÁS edad que la causal normal de la misma generación, que
  // es la forma de detectar una fila copiada en la columna equivocada.
  it('nunca pide más edad que la causal normal, y siempre más años de trabajo', () => {
    for (const row of EXTENDED_CAREER) {
      const normal = NEW_SYSTEM_NORMAL.find(entry => entry.fromYear === row.fromYear)
      if (!normal) continue
      expect(row.age).toBeLessThanOrEqual(normal.age)
      expect(row.years).toBeGreaterThan(normal.years)
    }
  })

  // La fila abierta `1976 en adelante` de 64 años empata con la causal normal de
  // 1976 (64 años) pidiendo 35 años de trabajo en vez de 30: para ESA generación
  // no adelanta nada, y recién sirve de 1977 en adelante, cuando la normal pasa a
  // 65. La página tiene que decirlo; el test lo fija para que nadie "arregle" la
  // tabla creyendo que es un error de copia.
  it('la fila de 64 años sólo adelanta algo a partir de 1977', () => {
    const row = EXTENDED_CAREER.find(entry => entry.toYear === null && entry.age === 64)
    expect(row).toBeDefined()
    expect(retirementFor(1976).age).toBe(64)
    expect(retirementFor(1977).age).toBe(65)
  })
})

describe('cada cifra de la página tiene su fuente', () => {
  it('cita a IMPO y al BPS, sólo con URLs oficiales', () => {
    expect(RETIREMENT_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of RETIREMENT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.impo\.com\.uy|www\.bps\.gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
    expect(RETIREMENT_SOURCES.some(source => source.url.includes('impo.com.uy'))).toBe(true)
  })
})

describe('mínima y máxima 2026 (BPS, Montos y aumentos de pasividades)', () => {
  it('fija las cifras confirmadas por el dossier', () => {
    expect(RETIREMENT_MIN_GENERAL_2026).toBe(20935)
    expect(RETIREMENT_MIN_AGE_60_2026).toBe(10795)
    expect(RETIREMENT_MIN_AGE_70_2026).toBe(23749)
    expect(RETIREMENT_MAX_INTERGENERATIONAL_2026).toBe(79430)
    expect(RETIREMENT_MAX_TRANSITION_2026).toBe(117460)
    expect(RETIREMENT_ACCUMULATION_CAP_TRANSITION_2026).toBe(166080)
    expect(RETIREMENT_ADJUSTMENT_2026_PCT).toBe(5.97)
  })

  it('la tabla de la página trae las seis filas, en pesos positivos', () => {
    expect(RETIREMENT_AMOUNTS_2026).toHaveLength(6)
    for (const row of RETIREMENT_AMOUNTS_2026) {
      expect(row.amount).toBeGreaterThan(0)
      expect(row.label.length).toBeGreaterThan(5)
    }
    // El mínimo a los 60 es menor que el general, que a su vez es menor que el
    // mínimo a los 70+: invertir cualquiera de los dos sería una fila copiada mal.
    expect(RETIREMENT_MIN_AGE_60_2026).toBeLessThan(RETIREMENT_MIN_GENERAL_2026)
    expect(RETIREMENT_MIN_GENERAL_2026).toBeLessThan(RETIREMENT_MIN_AGE_70_2026)
    // Los dos topes máximos son DISTINTOS a propósito (regímenes distintos).
    expect(RETIREMENT_MAX_INTERGENERATIONAL_2026).not.toBe(RETIREMENT_MAX_TRANSITION_2026)
    expect(RETIREMENT_MAX_TRANSITION_2026).toBeLessThan(RETIREMENT_ACCUMULATION_CAP_TRANSITION_2026)
  })
})

describe('las dos figuras contributivas de incapacidad', () => {
  it('trae jubilación por incapacidad total y subsidio transitorio parcial, nada más', () => {
    expect(DISABILITY_BENEFITS.map(b => b.id)).toEqual(['total', 'partial'])
  })

  it('la total es vitalicia y la parcial dura hasta 3 años o la causal jubilatoria', () => {
    const total = DISABILITY_BENEFITS.find(b => b.id === 'total')
    const partial = DISABILITY_BENEFITS.find(b => b.id === 'partial')
    expect(total?.duration).toMatch(/vitalicia/i)
    expect(partial?.duration).toMatch(/tres años/i)
    expect(partial?.duration).toMatch(/causal jubilatoria/i)
  })
})

// Fix round 1: la página interpolaba RETIREMENT_ADJUSTMENT_2026_PCT crudo, que
// en JS imprime "5.97" (punto) mientras la respuesta del FAQ, dos párrafos más
// abajo, escribe "5,97" (coma) a mano — dos formatos del mismo número en la
// misma pantalla. `formatNumber` (locale es-UY) es el que ya usa el resto del
// sitio para decimales; este test fija que el número siga siendo 5.97 en JS
// (no 5,97 como string) y que formatearlo con la utilidad compartida da la
// coma esperada, y el siguiente lee la página para asegurarse de que ES esa
// utilidad la que se usa ahí, no una interpolación cruda.
describe('el ajuste 2026 se imprime con coma, no con punto', () => {
  it('formatNumber(RETIREMENT_ADJUSTMENT_2026_PCT) da "5,97"', () => {
    expect(RETIREMENT_ADJUSTMENT_2026_PCT).toBe(5.97)
    expect(formatNumber(RETIREMENT_ADJUSTMENT_2026_PCT)).toBe('5,97')
  })

  it('la página usa formatNumber para el ajuste, no una interpolación cruda', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'pages', 'cuando-me-puedo-jubilar-uruguay.vue'),
      'utf8'
    )
    expect(source).toContain('formatNumber(RETIREMENT_ADJUSTMENT_2026_PCT)')
    expect(source).not.toMatch(/\{\{\s*RETIREMENT_ADJUSTMENT_2026_PCT\s*\}\}/)
  })
})

describe('la pensión por invalidez, distinta de las dos contributivas', () => {
  it('se marca no contributiva y dice quién la evalúa', () => {
    expect(INVALIDITY_PENSION_NOTE.eligibility).toMatch(/no contributiva/i)
    expect(INVALIDITY_PENSION_NOTE.evaluator).toMatch(/BPS/)
    expect(INVALIDITY_PENSION_NOTE.amountNote.length).toBeGreaterThan(5)
  })
})

// El dossier marca tres cifras como NO confirmadas con cita textual oficial, y
// pide explícitamente no publicarlas: el tope del sueldo básico jubilatorio
// ($288.288), la renovación "180 días antes" y cualquier tasa de reemplazo del
// 65/66 % para la incapacidad total. Este test es el tripwire: si alguna vuelve
// a aparecer en las cifras o en el FAQ de la página, tiene que fallar acá.
describe('lo que el dossier marca sin confirmar no se publica', () => {
  const haystacks = [
    ...RETIREMENT_AMOUNTS_2026.map(r => r.label),
    ...DISABILITY_BENEFITS.flatMap(b => [b.eligibility, b.duration, b.amountNote]),
    INVALIDITY_PENSION_NOTE.eligibility,
    INVALIDITY_PENSION_NOTE.evaluator,
    INVALIDITY_PENSION_NOTE.amountNote,
    ...RETIREMENT_FAQ.flatMap(f => [f.question, f.answer]),
  ].join(' \n ')

  it('no menciona el tope de $288.288 del SBJ', () => {
    expect(haystacks).not.toContain('288.288')
    expect(haystacks).not.toContain('288288')
  })

  it('no menciona la renovación de "180 días antes"', () => {
    expect(haystacks.toLowerCase()).not.toContain('180 días')
  })

  it('no menciona una tasa de reemplazo del 65 % ni del 66 % para incapacidad', () => {
    expect(haystacks).not.toMatch(/65\s?%/)
    expect(haystacks).not.toMatch(/66\s?%/)
  })
})

describe('las dos preguntas frecuentes nuevas', () => {
  it('trae exactamente las dos preguntas del brief, con sus cifras', () => {
    expect(RETIREMENT_FAQ.map(f => f.question)).toEqual([
      '¿Cuál es la jubilación mínima en 2026?',
      '¿Qué diferencia hay entre jubilación por incapacidad y pensión por invalidez?',
    ])
  })

  it('la de la mínima cita el monto general, los dos topes y el ajuste', () => {
    const answer = RETIREMENT_FAQ[0]!.answer
    expect(answer).toContain('20.935')
    expect(answer).toContain('79.430')
    expect(answer).toContain('117.460')
    expect(answer).toContain('5,97')
  })

  it('la de incapacidad vs. invalidez distingue contributiva de no contributiva', () => {
    const answer = RETIREMENT_FAQ[1]!.answer
    expect(answer).toMatch(/contributiva/i)
    expect(answer).toMatch(/no contributiva/i)
  })
})
