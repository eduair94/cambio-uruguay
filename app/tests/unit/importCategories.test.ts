// Guardarraíl del catálogo /importar/<categoria>.
//
// Estas fichas afirman cuánto paga cada mercadería y qué trámite necesita. El riesgo no es que se
// rompa el render: es que una ficha afirme una cifra sin fuente, o que quede huérfana del
// calculador. Esto lo chequea acá, no en producción.
import { describe, expect, it } from 'vitest'

import {
  IMPORT_CATEGORIES,
  categoryForProductType,
  getImportCategory,
  importCategorySlugs,
} from '../../utils/importCategories'
import { IMPORT_CATEGORY_INDEX, importCategoryIndexSlugs } from '../../utils/importCategoryIndex'
import { IMPORT_PRODUCT_TYPES, productTypeById } from '../../utils/importProductTypes'

/** Dominios oficiales. Una ficha no puede sostenerse en un blog ni en un courier. */
const OFFICIAL_HOSTS = [
  'impo.com.uy',
  'dgi.gub.uy',
  'aduanas.gub.uy',
  'gub.uy',
  'vuce.gub.uy',
  'ursec.gub.uy',
  'parlamento.gub.uy',
  'correo.com.uy',
  'dinacia.gub.uy',
]

const TONES = ['good', 'warn', 'bad']
const ORGANISMS = ['MSP', 'URSEC', 'MGAP', 'SMA']

/** Todo el texto de una ficha, para los chequeos de contenido. */
function allText(category: (typeof IMPORT_CATEGORIES)[number]): string {
  return JSON.stringify(category)
}

/** Cada string de la ficha por separado, para poder exigir el contexto de una frase. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(allStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings)
  return []
}

describe('el catálogo de categorías', () => {
  it('cubre todas las categorías del calculador', () => {
    const slugs = new Set(importCategorySlugs())
    const missing = IMPORT_PRODUCT_TYPES.filter(
      t => t.categorySlug && !slugs.has(t.categorySlug)
    ).map(t => t.id)
    expect(missing).toEqual([])
  })

  it('no deja ninguna categoría del calculador sin ficha', () => {
    const withoutSheet = IMPORT_PRODUCT_TYPES.filter(t => !t.categorySlug).map(t => t.id)
    expect(withoutSheet).toEqual([])
  })

  it('cada ficha apunta a una categoría real del calculador', () => {
    for (const category of IMPORT_CATEGORIES) {
      expect(productTypeById(category.productTypeId).id).toBe(category.productTypeId)
    }
  })

  it('tiene slugs únicos y aptos para una URL', () => {
    const slugs = importCategorySlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('resuelve por slug y por categoría del calculador', () => {
    expect(getImportCategory('libros')?.productTypeId).toBe('libros')
    expect(getImportCategory('no-existe')).toBeUndefined()
    expect(categoryForProductType('libros')?.slug).toBe('libros')
  })
})

describe('el índice liviano', () => {
  // El buscador y el sitemap leen `importCategoryIndex.ts` para no arrastrar ~300 kB de fichas al
  // bundle de búsqueda. Si los dos módulos se desfasan, una página existe pero no se encuentra.
  it('tiene exactamente las mismas fichas, en el mismo orden', () => {
    expect(importCategoryIndexSlugs()).toEqual(importCategorySlugs())
  })

  it('copia título, bajada e icono sin desfasarse', () => {
    for (const entry of IMPORT_CATEGORY_INDEX) {
      const category = getImportCategory(entry.slug)!
      expect(entry.title).toBe(category.title)
      expect(entry.navLabel).toBe(category.navLabel)
      expect(entry.description).toBe(category.description)
      expect(entry.icon).toBe(category.icon)
      expect(entry.keywords.length).toBeGreaterThan(0)
    }
  })
})

describe('cada ficha', () => {
  it.each(IMPORT_CATEGORIES.map(c => [c.slug, c] as const))(
    '%s está completa',
    (_slug, category) => {
      expect(category.title.length).toBeGreaterThan(10)
      expect(category.navLabel.length).toBeGreaterThan(2)
      expect(category.description.length).toBeGreaterThan(60)
      expect(category.icon).toMatch(/^mdi-/)
      expect(category.examples.length).toBeGreaterThanOrEqual(3)
      expect(category.taxes.length).toBeGreaterThanOrEqual(2)
      expect(category.declare.steps.length).toBeGreaterThanOrEqual(3)
      expect(category.declare.pitfalls.length).toBeGreaterThanOrEqual(2)
      expect(category.considerations.length).toBeGreaterThanOrEqual(3)
      expect(category.faqs.length).toBeGreaterThanOrEqual(3)
      expect(category.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  )

  it.each(IMPORT_CATEGORIES.map(c => [c.slug, c] as const))(
    '%s describe los tres regímenes con un tono válido',
    (_slug, category) => {
      for (const outcome of [
        category.regimes.franquicia,
        category.regimes.prestacionUnica,
        category.regimes.general,
      ]) {
        expect(TONES).toContain(outcome.tone)
        expect(outcome.verdict.length).toBeGreaterThan(3)
        expect(outcome.detail.length).toBeGreaterThan(20)
      }
    }
  )

  it.each(IMPORT_CATEGORIES.map(c => [c.slug, c] as const))(
    '%s cita fuentes oficiales y sólo oficiales',
    (_slug, category) => {
      expect(category.sources.length).toBeGreaterThanOrEqual(3)
      const urls = [
        ...category.sources.map(s => s.url),
        ...category.benefits.map(b => b.url),
        ...(category.procedures ?? []).map(p => p.url),
        ...category.taxes.flatMap(t => (t.source ? [t.source.url] : [])),
      ]
      for (const url of urls) {
        expect(url).toMatch(/^https:\/\//)
        const host = new URL(url).hostname.replace(/^www\./, '')
        expect(
          OFFICIAL_HOSTS.some(official => host === official || host.endsWith(`.${official}`)),
          `${url} no es una fuente oficial`
        ).toBe(true)
      }
    }
  )

  it.each(IMPORT_CATEGORIES.map(c => [c.slug, c] as const))(
    '%s nombra la norma en cada beneficio y organismos válidos en cada trámite',
    (_slug, category) => {
      for (const benefit of category.benefits) {
        expect(benefit.norm.length).toBeGreaterThan(5)
        expect(benefit.detail.length).toBeGreaterThan(30)
      }
      for (const procedure of category.procedures ?? []) {
        expect(ORGANISMS).toContain(procedure.organism)
        expect(procedure.when.length).toBeGreaterThan(15)
        expect(procedure.how.length).toBeGreaterThan(15)
      }
    }
  )
})

describe('las cifras que no se pueden publicar', () => {
  // El límite en Wh de las baterías de litio NO tiene fuente oficial uruguaya: la DNA remite a
  // IATA/OACI y el Correo prohíbe sin fijar umbral. Publicar "hasta 100 Wh" sería inventar una
  // norma nacional. Sí se puede NOMBRAR la cifra para desmentirla, que es lo único útil que se
  // puede decir de ella — así que la frase que la contiene tiene que negarla en la misma oración.
  it('sólo nombra los Wh de las baterías de litio para desmentirlos', () => {
    const claimsWh = /\d+\s?(?:Wh|watt)/i
    const debunks = /no (?:existe|hay|salen?)/i
    for (const category of IMPORT_CATEGORIES) {
      for (const text of allStrings(category).filter(s => claimsWh.test(s))) {
        expect(text, `"${text}" nombra una cifra en Wh sin desmentirla`).toMatch(debunks)
      }
    }
  })

  // Los topes por modalidad (US$ 50 no exprés / US$ 200 exprés) y el mínimo de US$ 10 son del
  // Decreto 356/014, derogado por el art. 19 del Decreto 50/026. Sólo se pueden nombrar para
  // advertir que están derogados.
  it('sólo menciona el Decreto 356/014 para decir que está derogado', () => {
    for (const category of IMPORT_CATEGORIES) {
      const text = allText(category)
      if (text.includes('356/014')) expect(text).toMatch(/derogad/i)
    }
  })

  it('no afirma que un libro pague la prestación única', () => {
    const libros = getImportCategory('libros')!
    expect(libros.regimes.franquicia.tone).toBe('good')
    expect(allText(libros)).toMatch(/exonerad/i)
  })
})
