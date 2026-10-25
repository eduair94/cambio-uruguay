// `/mutualista/<id>`: una página por institución del tarifario IAMC del MSP.
//
// Lo que se vigila acá es lo que la página AFIRMA, no cómo se ve. Son cuatro cosas, y cada una es
// una forma distinta de publicar un número que el archivo del MSP no dice:
//
//  1. El snippet. La regla medida del sitio es que la descripción lleve la cifra, y Google corta
//     cerca de los 155 caracteres: una descripción que se pasa pierde justamente la cola, que es
//     donde está el dato. El título va con el mismo criterio contra los 60 de `seoTitleBudget`.
//  2. El cero. Un $ 0,00 del archivo no es un precio barato ni una exoneración, así que no puede
//     puntuar en el puesto, no puede mover la mediana de los demás y no puede llegar al snippet.
//  3. El rango por régimen. Nunca se elige un importe como «el» precio, y un hueco no se cuenta
//     como cero.
//  4. El slug. Lo que el sitemap declara tiene que ser lo que la guarda de la ruta acepta; si se
//     separan, el sitemap manda a Google a un 404 o la ruta contesta 200 sobre una página vacía.

import { describe, expect, it } from 'vitest'

import { MUTUALISTA_COSTS, MUTUALISTA_COST_CONCEPTS } from '../../utils/mutualistaCosts'
import {
  getMutualistaPage,
  isMutualistaPageSlug,
  listMutualistaPages,
  mutualistaDayLabel,
  mutualistaDisplayName,
  mutualistaMonthLabel,
  mutualistaPagePath,
  mutualistaPageSlugs,
} from '../../utils/mutualistaPages'

const PAGES = listMutualistaPages()

/** Los mismos topes que miden `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts`. */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

describe('la familia cubre el archivo del MSP y nada más', () => {
  it('tiene una página por institución publicada', () => {
    expect(PAGES).toHaveLength(MUTUALISTA_COSTS.length)
    expect(PAGES.length).toBeGreaterThan(30)
  })

  it('acepta exactamente los slugs que declara', () => {
    for (const slug of mutualistaPageSlugs()) expect(isMutualistaPageSlug(slug)).toBe(true)
    expect(isMutualistaPageSlug('no-existe')).toBe(false)
    expect(isMutualistaPageSlug('')).toBe(false)
    expect(getMutualistaPage('no-existe')).toBeUndefined()
  })

  it('arma la ruta que el sitemap declara', () => {
    for (const page of PAGES) expect(page.path).toBe(mutualistaPagePath(page.slug))
    expect(mutualistaPagePath('casmu')).toBe('/mutualista/casmu')
  })

  it('no repite un slug ni un nombre impreso', () => {
    expect(new Set(PAGES.map(page => page.slug)).size).toBe(PAGES.length)
    expect(new Set(PAGES.map(page => page.name)).size).toBe(PAGES.length)
  })
})

describe('el snippet entra entero en el resultado de Google', () => {
  it(`ningún título pasa de ${MAX_TITLE} caracteres`, () => {
    const offenders = PAGES.filter(page => page.title.length > MAX_TITLE).map(
      page => `${page.slug}: ${page.title.length}`
    )
    expect(offenders).toEqual([])
  })

  it(`ninguna descripción pasa de ${MAX_DESCRIPTION} caracteres`, () => {
    const offenders = PAGES.filter(page => page.description.length > MAX_DESCRIPTION).map(
      page => `${page.slug}: ${page.description.length}`
    )
    expect(offenders).toEqual([])
  })

  it('cada descripción trae las dos cifras y el mes del tarifario', () => {
    for (const page of PAGES) {
      expect(page.description, page.slug).toContain(page.name)
      // Dos importes: el ticket de medicamentos y el especialista.
      expect(page.description.match(/\$\s[\d.]+,\d{2}/g)?.length, page.slug).toBe(2)
      expect(page.description, page.slug).toMatch(
        /\((enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|octubre|noviembre|diciembre) de \d{4}\)\.$/
      )
    }
  })

  it('ninguna descripción publica un $ 0,00 como si fuera un máximo autorizado', () => {
    // El contrapeso de la regla del cero, en el único lugar donde sería invisible: hoy las 34
    // publican un máximo positivo en los dos conceptos del snippet, y si un tarifario nuevo trae un
    // cero ahí, esto se pone rojo antes de que el SERP diga "el máximo es $ 0,00".
    const offenders = PAGES.filter(page => page.description.includes('$ 0,00')).map(
      page => page.slug
    )
    expect(offenders).toEqual([])
  })

  it('el título y el encabezado no son la misma cadena', () => {
    // Si el <title> y el <h1> fueran idénticos no habría dos señales, habría una repetida.
    for (const page of PAGES) expect(page.title, page.slug).not.toBe(page.heading)
  })
})

describe('un cero publicado no se compara con un precio', () => {
  it('no puntúa en el puesto', () => {
    for (const page of PAGES) {
      for (const concept of page.concepts) {
        if (concept.maximumUyu === null || concept.maximumUyu === 0) {
          expect(concept.rank, `${page.slug}/${concept.id}`).toBeNull()
        } else {
          expect(concept.rank, `${page.slug}/${concept.id}`).toBeGreaterThanOrEqual(1)
          expect(concept.rank!, `${page.slug}/${concept.id}`).toBeLessThanOrEqual(concept.of)
        }
      }
    }
  })

  it('CUDAM no sale como el más barato en urgencia centralizada', () => {
    // El caso real que motivó la regla: el MSP publica $ 0,00 en esa celda, y con el cero adentro
    // la página habría afirmado "puesto 1 de 34" sobre una prestación cuyo precio el archivo no da.
    const cudam = getMutualistaPage('cudam')
    const urgencia = cudam?.concepts.find(concept => concept.id === 'urgencia-centralizada')
    expect(urgencia?.maximumUyu).toBe(0)
    expect(urgencia?.rank).toBeNull()
  })

  it('no mueve la mediana de las demás', () => {
    // La mediana de cada concepto se calcula sobre los máximos POSITIVOS, así que el cero de CUDAM
    // no puede arrastrarla hacia abajo.
    for (const concept of MUTUALISTA_COST_CONCEPTS) {
      const positives = MUTUALISTA_COSTS.map(item => item.maxima[concept.id]).filter(
        (amount): amount is number => amount !== null && amount > 0
      )
      const published = PAGES[0]!.concepts.find(item => item.id === concept.id)!
      expect(published.of, concept.id).toBe(positives.length)
      expect(published.medianUyu, concept.id).not.toBeNull()
      expect(published.medianUyu!, concept.id).toBeGreaterThan(0)
    }
  })
})

describe('el rango por régimen no elige un precio', () => {
  it('el menor y el mayor son importes positivos del archivo, o nada', () => {
    for (const page of PAGES) {
      for (const concept of page.concepts) {
        for (const regime of concept.regimes) {
          expect(regime.columns, `${page.slug}/${concept.id}`).toBeGreaterThan(0)
          if (regime.lowestUyu === null) {
            expect(regime.highestUyu, `${page.slug}/${concept.id}`).toBeNull()
            continue
          }
          expect(regime.lowestUyu, `${page.slug}/${concept.id}`).toBeGreaterThan(0)
          expect(regime.highestUyu!, `${page.slug}/${concept.id}`).toBeGreaterThanOrEqual(
            regime.lowestUyu
          )
          // Un cero nunca puede ser el piso del rango.
          expect(regime.lowestUyu, `${page.slug}/${concept.id}`).not.toBe(0)
        }
      }
    }
  })

  it('los ceros y los huecos se cuentan aparte y nunca se mezclan', () => {
    for (const page of PAGES) {
      for (const concept of page.concepts) {
        for (const regime of concept.regimes) {
          // Las tres cuentas parten las columnas del régimen sin solaparse: con importe, en cero y
          // sin dato. Si no cerraran, el rango estaría hablando de columnas que no lo forman.
          expect(
            regime.pricedColumns + regime.zeroColumns + regime.missingColumns,
            `${page.slug}/${concept.id}`
          ).toBe(regime.columns)
          const hasRange = regime.lowestUyu !== null
          expect(regime.pricedColumns > 0, `${page.slug}/${concept.id}`).toBe(hasRange)
        }
      }
    }
  })

  it('conserva la contradicción del origen en vez de corregirla', () => {
    // CAMEDUR publica una columna por encima de su propio máximo autorizado. El dato no se toca:
    // lo que esta página hace es contarlo para poder decirlo.
    const camedur = getMutualistaPage('camedur')
    expect(camedur?.contradictions).toBeGreaterThan(0)
    const total = PAGES.reduce((sum, page) => sum + page.contradictions, 0)
    expect(total).toBe(camedur!.contradictions)
  })
})

describe('el nombre impreso es el del archivo', () => {
  it('sólo corrige la caja cuando el origen la escribió en minúscula', () => {
    expect(mutualistaDisplayName('comeflo')).toBe('COMEFLO')
    expect(mutualistaDisplayName('smqs')).toBe('SMQS')
    // No se toca un nombre que ya trae mayúsculas, ni se expande una sigla.
    expect(mutualistaDisplayName('CASMU')).toBe('CASMU')
    expect(mutualistaDisplayName('AM SAN JOSÉ')).toBe('AM SAN JOSÉ')
    expect(mutualistaDisplayName('MUTUALISTA HOSPITAL EVANGELICO')).toBe(
      'MUTUALISTA HOSPITAL EVANGELICO'
    )
  })

  it('no inventa un nombre para ninguna de las instituciones', () => {
    for (const page of PAGES) {
      expect(page.name.toUpperCase(), page.slug).toBe(page.sourceName.trim().toUpperCase())
      expect(page.name, page.slug).not.toBe('')
    }
  })
})

describe('las fechas se leen del día calendario del origen', () => {
  it('no usa Date para no correr la fecha por la zona horaria', () => {
    expect(mutualistaMonthLabel('2026-07-01')).toBe('julio de 2026')
    expect(mutualistaDayLabel('2026-07-01')).toBe('1 de julio de 2026')
    expect(mutualistaDayLabel('2026-09-14')).toBe('14 de setiembre de 2026')
    // Una cadena que no es una fecha se devuelve tal cual en vez de imprimir "NaN".
    expect(mutualistaDayLabel('')).toBe('')
    expect(mutualistaMonthLabel('sin-fecha')).toBe('sin-fecha')
  })

  it('cada página cita la planilla del MSP con sus tres fechas', () => {
    for (const page of PAGES) {
      expect(page.source.pageUrl, page.slug).toContain('gub.uy')
      expect(page.source.downloadUrl, page.slug).toContain('gub.uy')
      expect(page.effectiveFrom, page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(page.source.publishedAt, page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(page.source.verifiedAt, page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
