// Lo que se testea acá es lo único que la página no puede permitirse tener mal:
// la aritmética que traduce una edad en un precio, y la disciplina de fuentes.
//
// El precio de la libreta no es un número suelto, es una cadena de tres pasos
// —edad → plazo máximo → tramo de la escala → UR— y cada eslabón vive en una
// fuente distinta. Un corte movido un mes en cualquiera de las dos tablas
// publica un importe equivocado sin romper nada a la vista.

import { describe, expect, it } from 'vitest'

import {
  DRIVING_LICENCE_AGE_BANDS,
  DRIVING_LICENCE_EXTRAS,
  DRIVING_LICENCE_FAQS,
  DRIVING_LICENCE_FEE_BRACKETS,
  DRIVING_LICENCE_MAX_COST_UR,
  DRIVING_LICENCE_REDUCTION_FROM_AGE,
  DRIVING_LICENCE_RELATED,
  DRIVING_LICENCE_RULES,
  DRIVING_LICENCE_SAMPLE_AGES,
  DRIVING_LICENCE_SOURCES,
  feeBracketForMonths,
  licenceCostInPesos,
  licenceQuoteForAge,
  maxValidityYearsForAge,
} from '../../utils/drivingLicence'

describe('la escala de precios es la del Texto Ordenado', () => {
  it('cada tramo cobra su porcentaje exacto del costo unificado', () => {
    for (const bracket of DRIVING_LICENCE_FEE_BRACKETS) {
      expect(bracket.ur).toBeCloseTo((DRIVING_LICENCE_MAX_COST_UR * bracket.share) / 100, 10)
    }
  })

  it('cubre la recta de los meses sin huecos ni solapamientos', () => {
    let expected = 0
    for (const bracket of DRIVING_LICENCE_FEE_BRACKETS) {
      expect(bracket.fromMonths).toBe(expected)
      if (bracket.toMonths === null) {
        expect(bracket).toBe(DRIVING_LICENCE_FEE_BRACKETS.at(-1))
        break
      }
      expect(bracket.toMonths).toBeGreaterThanOrEqual(bracket.fromMonths)
      expected = bracket.toMonths + 1
    }
  })

  // Los cortes son 2, 4, 6 y 8 años EXACTOS, y el borde importa: ocho años
  // justos son 96 meses y ya pagan la tarifa entera, no el 80 %.
  it.each([
    [0, 0.25],
    [23, 0.25],
    [24, 0.5],
    [47, 0.5],
    [48, 0.75],
    [71, 0.75],
    [72, 1],
    [95, 1],
    [96, 1.25],
    [120, 1.25],
  ])('%i meses pagan UR %f', (months, ur) => {
    expect(feeBracketForMonths(months)?.ur).toBe(ur)
  })

  it('no inventa un tramo para un plazo imposible', () => {
    expect(feeBracketForMonths(-1)).toBeNull()
    expect(feeBracketForMonths(Number.NaN)).toBeNull()
  })
})

describe('los plazos por edad', () => {
  it('no dejan ninguna edad adulta sin tramo y nunca suben con la edad', () => {
    let previous = Number.POSITIVE_INFINITY
    for (let age = 18; age <= 95; age++) {
      const years = maxValidityYearsForAge(age)
      expect(years, `sin plazo a los ${age}`).not.toBeNull()
      expect(years!).toBeLessThanOrEqual(previous)
      previous = years!
    }
  })

  it('van de los 10 años hasta el año único de los 80', () => {
    expect(maxValidityYearsForAge(30)).toBe(10)
    expect(maxValidityYearsForAge(55)).toBe(10)
    expect(maxValidityYearsForAge(56)).toBe(9)
    expect(maxValidityYearsForAge(60)).toBe(5)
    expect(maxValidityYearsForAge(70)).toBe(3)
    expect(maxValidityYearsForAge(79)).toBe(2)
    expect(maxValidityYearsForAge(80)).toBe(1)
    expect(maxValidityYearsForAge(97)).toBe(1)
  })

  it('devuelve null antes de la edad mínima y ante una edad absurda', () => {
    expect(maxValidityYearsForAge(15)).toBeNull()
    expect(maxValidityYearsForAge(140)).toBeNull()
    expect(maxValidityYearsForAge(Number.NaN)).toBeNull()
  })

  it('los tramos de edad son contiguos y ordenados', () => {
    let expected = 0
    for (const band of DRIVING_LICENCE_AGE_BANDS) {
      expect(band.fromAge).toBe(expected)
      if (band.toAge === null) break
      expect(band.toAge).toBeGreaterThanOrEqual(band.fromAge)
      expected = band.toAge + 1
    }
  })
})

describe('la cotización por edad encadena las dos tablas', () => {
  it.each([
    [30, 10, 1.25],
    [57, 8, 1.25],
    [59, 6, 1],
    [63, 5, 0.75],
    [69, 4, 0.75],
    [72, 3, 0.5],
    [79, 2, 0.5],
    [82, 1, 0.25],
  ])('a los %i años: %i años de plazo y UR %f', (age, years, ur) => {
    const quote = licenceQuoteForAge(age)
    expect(quote?.years).toBe(years)
    expect(quote?.months).toBe(years * 12)
    expect(quote?.bracket.ur).toBe(ur)
  })

  // La discrepancia que la página publica en su propio bloque: el Texto Ordenado
  // ata la rebaja a patología o a 65 años cumplidos, y los trámites la publican
  // sin condición. Un caso abajo de los 65 con rebaja tiene que quedar marcado
  // como amparado sólo por el trámite, no por la norma.
  it('marca cuándo la rebaja no está amparada por el texto nacional', () => {
    expect(licenceQuoteForAge(63)?.bracket.share).toBe(60)
    expect(licenceQuoteForAge(63)?.reductionInNationalText).toBe(false)
    expect(licenceQuoteForAge(69)?.reductionInNationalText).toBe(true)
    expect(DRIVING_LICENCE_REDUCTION_FROM_AGE).toBe(65)
  })

  it('la tarifa entera nunca se presenta como una rebaja a confirmar', () => {
    for (const age of [18, 30, 55, 57]) {
      const quote = licenceQuoteForAge(age)
      expect(quote?.bracket.share).toBe(100)
      expect(quote?.reductionInNationalText).toBe(true)
    }
  })

  it('la página muestra al menos un caso de cada lado de la discrepancia', () => {
    const quotes = DRIVING_LICENCE_SAMPLE_AGES.map(age => licenceQuoteForAge(age))
    expect(quotes.every(q => q !== null)).toBe(true)
    expect(quotes.some(q => q!.bracket.share === 100)).toBe(true)
    expect(quotes.some(q => !q!.reductionInNationalText)).toBe(true)
    expect(quotes.some(q => q!.bracket.share < 100 && q!.reductionInNationalText)).toBe(true)
  })
})

describe('la conversión a pesos no inventa importes', () => {
  it('multiplica por el valor de la UR', () => {
    expect(licenceCostInPesos(1.25, 2000)).toBe(2500)
    expect(licenceCostInPesos(0.25, 2000)).toBe(500)
  })

  it('devuelve null en vez de un número aproximado cuando la UR no sirve', () => {
    expect(licenceCostInPesos(1.25, null)).toBeNull()
    expect(licenceCostInPesos(1.25, 0)).toBeNull()
    expect(licenceCostInPesos(1.25, Number.NaN)).toBeNull()
    expect(licenceCostInPesos(0, 2000)).toBeNull()
  })
})

describe('el contenido publicado se sostiene en fuentes', () => {
  it('todas las fuentes son oficiales uruguayas y en https', () => {
    expect(DRIVING_LICENCE_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of DRIVING_LICENCE_SOURCES) {
      // Los subdominios llegan a dos niveles (`normativa.montevideo.gub.uy`), pero
      // el dominio de segundo nivel tiene que ser uno de los dos oficiales.
      expect(s.url).toMatch(/^https:\/\/([a-z-]+\.)*(impo\.com\.uy|gub\.uy)\//)
      expect(s.label.length).toBeGreaterThan(30)
      expect(s.publisher.length).toBeGreaterThan(5)
    }
  })

  it('cada regla cita textualmente una fuente que existe', () => {
    for (const rule of DRIVING_LICENCE_RULES) {
      expect(DRIVING_LICENCE_SOURCES[rule.sourceIndex]).toBeDefined()
      expect(rule.quote.length).toBeGreaterThan(40)
      expect(rule.article.length).toBeGreaterThan(10)
    }
  })

  // Los timbres NO están unificados: publicarlos sin decir de qué intendencia
  // son los convertiría en una cifra nacional que no existe.
  it('cada cargo no unificado nombra su departamento y su trámite', () => {
    for (const extra of DRIVING_LICENCE_EXTRAS) {
      expect(extra.department.length).toBeGreaterThan(2)
      expect(DRIVING_LICENCE_SOURCES[extra.sourceIndex]).toBeDefined()
      expect(extra.amount).toMatch(/\$/)
    }
  })

  it('cada pregunta frecuente es única y contesta con algo', () => {
    const questions = new Set(DRIVING_LICENCE_FAQS.map(f => f.q))
    expect(questions.size).toBe(DRIVING_LICENCE_FAQS.length)
    for (const faq of DRIVING_LICENCE_FAQS) expect(faq.a.length).toBeGreaterThan(100)
  })

  it('los enlaces relacionados son rutas internas absolutas', () => {
    for (const link of DRIVING_LICENCE_RELATED) {
      expect(link.to).toMatch(/^\/[a-z0-9/-]+$/)
      expect(link.label.length).toBeGreaterThan(10)
    }
  })
})
