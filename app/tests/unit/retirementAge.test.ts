import { describe, expect, it } from 'vitest'

import {
  EXTENDED_CAREER,
  NEW_SYSTEM_FIRST_BIRTH_YEAR,
  NEW_SYSTEM_NORMAL,
  PREVIOUS_SYSTEM_NORMAL,
  REDUCED_SERVICE_SCALE,
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
