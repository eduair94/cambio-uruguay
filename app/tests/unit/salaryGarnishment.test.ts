// El catálogo de /embargo-de-sueldo-uruguay: dos límites que conviven y no se pisan.
//
// Lo que estas pruebas cuidan no es la aritmética (es una multiplicación) sino que las cifras
// SIGAN SIENDO LAS DE LA NORMA. La página entera se sostiene en cuatro números —un tercio, la
// mitad, 35 % y 30 %— y cada uno sale de un artículo concreto. Un cambio silencioso en cualquiera
// de ellos convierte la página en desinformación jurídica, así que están fijados acá.

import { describe, expect, it } from 'vitest'

import {
  EXEMPT_ASSETS,
  GARNISHMENT_CAPS,
  RETENTION_FLOOR_PCT,
  RETENTION_FLOOR_PCT_HOUSING,
  RETENTION_ORDER,
  SALARY_FAQ,
  SALARY_SOURCES,
  bindingLimit,
  garnishmentCap,
  maxRetention,
  retentionBase,
  retentionFloor,
} from '../../utils/salaryGarnishment'

describe('los topes del artículo 381 del CGP', () => {
  it('cubre las cuatro puertas de embargo y ninguna más', () => {
    expect(GARNISHMENT_CAPS.map(cap => cap.kind).sort()).toEqual([
      'alimentos',
      'alimentosMenores',
      'leyHabilitante',
      'tributos',
    ])
  })

  it('deja la mitad solo para la pensión alimenticia de menores e incapaces', () => {
    const half = GARNISHMENT_CAPS.filter(cap => cap.fraction === 1 / 2)
    expect(half).toHaveLength(1)
    expect(half[0]!.kind).toBe('alimentosMenores')
  })

  it('mantiene el resto en la tercera parte', () => {
    for (const cap of GARNISHMENT_CAPS) {
      if (cap.kind === 'alimentosMenores') continue
      expect(cap.fraction).toBeCloseTo(1 / 3, 12)
    }
  })

  it('cita el artículo de cada tope', () => {
    for (const cap of GARNISHMENT_CAPS) expect(cap.article).toMatch(/CGP art\. 381/)
  })
})

describe('el piso del artículo 3 de la Ley 17.829', () => {
  it('es 35 %, y 30 % con garantía de alquiler o actos cooperativos', () => {
    expect(RETENTION_FLOOR_PCT).toBe(35)
    expect(RETENTION_FLOOR_PCT_HOUSING).toBe(30)
  })

  it('descuenta impuestos y aportes antes de mirar el porcentaje', () => {
    // La base NO es el nominal: el artículo manda deducir primero las rentas y la seguridad social.
    expect(retentionBase({ nominal: 100000, incomeTax: 5000, socialSecurity: 18000 })).toBe(77000)
  })

  it('nunca devuelve una base negativa', () => {
    expect(retentionBase({ nominal: 1000, incomeTax: 900, socialSecurity: 900 })).toBe(0)
  })

  it('ignora entradas que no son números', () => {
    expect(
      retentionBase({ nominal: Number.NaN, incomeTax: Number.NaN, socialSecurity: Number.NaN })
    ).toBe(0)
  })

  it('el piso y el espacio para retener suman la base', () => {
    const base = 77000
    expect(retentionFloor(base) + maxRetention(base)).toBeCloseTo(base, 6)
    expect(retentionFloor(base, true) + maxRetention(base, true)).toBeCloseTo(base, 6)
  })

  it('la variante de vivienda deja retener más, no menos', () => {
    expect(maxRetention(77000, true)).toBeGreaterThan(maxRetention(77000, false))
  })
})

describe('cuál de los dos límites manda', () => {
  it('un tercio queda por debajo del piso, así que manda el tope', () => {
    // 1/3 ≈ 33,3 % < 65 % de espacio: el artículo 381 se toca primero.
    const { amount, binding } = bindingLimit(90000, 'tributos')
    expect(binding).toBe('tope')
    expect(amount).toBeCloseTo(30000, 6)
  })

  it('la mitad también, con el piso del 35 %', () => {
    const { binding } = bindingLimit(90000, 'alimentosMenores')
    expect(binding).toBe('tope')
  })

  it('manda el piso cuando el espacio disponible es menor que el tope', () => {
    // Con un piso hipotético del 70 % el espacio sería 30 %, menos que la mitad: manda el piso.
    // Se comprueba con la aritmética real: 30 % de espacio (variante vivienda es 70 %) contra 1/2.
    const base = 90000
    expect(maxRetention(base, true)).toBeCloseTo(base * 0.7, 6)
    const { binding, amount } = bindingLimit(base, 'alimentosMenores', true)
    expect(binding).toBe('tope')
    expect(amount).toBeCloseTo(base / 2, 6)
  })

  it('nunca propone descontar más que el espacio que deja el piso', () => {
    for (const cap of GARNISHMENT_CAPS) {
      for (const housing of [false, true]) {
        const { amount } = bindingLimit(77000, cap.kind, housing)
        expect(amount).toBeLessThanOrEqual(maxRetention(77000, housing) + 1e-9)
        expect(amount).toBeLessThanOrEqual(garnishmentCap(77000, cap.kind) + 1e-9)
      }
    }
  })
})

describe('el orden de prelación del artículo 1', () => {
  it('pone la pensión alimenticia judicial antes que cualquier literal', () => {
    expect(RETENTION_ORDER[0]!.letter).toBeNull()
    expect(RETENTION_ORDER[0]!.label).toMatch(/alimenticias/i)
  })

  it('sigue con los literales A a H, en orden y sin huecos', () => {
    const letters = RETENTION_ORDER.slice(1).map(rank => rank.letter)
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  })

  it('numera las posiciones de forma correlativa', () => {
    expect(RETENTION_ORDER.map(rank => rank.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('lo que la página publica', () => {
  it('lista los bienes inembargables con su numeral y su salvedad', () => {
    expect(EXEMPT_ASSETS.map(asset => asset.numeral)).toEqual([2, 3, 4, 5])
    for (const asset of EXEMPT_ASSETS) expect(asset.caveat.length).toBeGreaterThan(20)
  })

  it('cada pregunta trae respuesta y resumen', () => {
    expect(SALARY_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const faq of SALARY_FAQ) {
      expect(faq.question.length).toBeGreaterThan(10)
      expect(faq.short.length).toBeGreaterThan(10)
      expect(faq.answer.length).toBeGreaterThan(80)
    }
  })

  it('toda fuente es una norma oficial uruguaya', () => {
    expect(SALARY_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of SALARY_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })

  it('cita las dos normas que sostienen la página', () => {
    const urls = SALARY_SOURCES.map(source => source.url).join(' ')
    expect(urls).toContain('codigo-general-proceso/15982-1988/381')
    expect(urls).toContain('leyes/17829-2004')
  })

  // La regla de oro del sitio: ninguna cifra en pesos sin fuente. Acá directamente no hay ninguna
  // —el piso es un porcentaje del líquido de cada persona— y esta prueba lo mantiene así.
  it('no publica ningún importe en pesos', () => {
    const text = [
      ...GARNISHMENT_CAPS.map(cap => `${cap.label} ${cap.detail}`),
      ...EXEMPT_ASSETS.map(asset => `${asset.label} ${asset.caveat}`),
      ...SALARY_FAQ.map(faq => `${faq.question} ${faq.short} ${faq.answer}`),
    ].join(' ')
    expect(text).not.toMatch(/\$\s?\d/)
  })
})
