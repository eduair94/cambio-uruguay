import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ChairCatalogProduct } from '../../utils/chairCatalog'
import { chairProductJsonLd } from '../../utils/chairProductLd'

/**
 * Las estrellas de una silla son un compuesto de compradores de Mercado Libre y de Reddit: ninguna
 * la puso un lector de este sitio. La guía de fragmentos de reseña de Google prohíbe agregar
 * calificaciones de otros sitios, así que el JSON-LD de la ficha no puede llevar `aggregateRating`
 * ni `review` — y sin oferta, un `Product` sin ninguno de los tres no es válido y no se publica.
 */

const URL = 'https://cambio-uruguay.com/sillas-escritorio-uruguay/corsair-t3-rush-charcoal'

// Con la forma de la ficha real de corsair-t3-rush-charcoal (20/11/2026).
const rated = (overrides: Partial<ChairCatalogProduct> = {}): ChairCatalogProduct => ({
  slug: 'corsair-t3-rush-charcoal',
  key: 'corsair|t3-rush-charcoal',
  name: 'Corsair T3 Rush Charcoal',
  brand: 'Corsair',
  model: 'T3 Rush',
  category: 'gamer' as ChairCatalogProduct['category'],
  stars: 4.8,
  ratingCount: 1149,
  ratingSignals: [
    {
      source: 'mercadolibre',
      stars: 4.9,
      sampleSize: 1148,
      weight: 0.905,
      detail: '1148 opiniones de compradores',
    },
    { source: 'reddit', stars: 3.6, sampleSize: 1, weight: 0.095, detail: '1 mención' },
  ],
  confidence: 'high',
  redditSlug: null,
  tier: null,
  price: {
    min: 15277,
    max: 15277,
    median: 15277,
    currency: 'UYU',
    samples: 1,
    bestNew: 15277,
    bestUsed: null,
  },
  offers: [{ id: 'a' } as ChairCatalogProduct['offers'][number]],
  sellers: 1,
  specs: [],
  verdict: 'Calificada 4.8 sobre 5.',
  pros: [],
  cons: [],
  evidence: [],
  reviews: [
    {
      source: 'mercadolibre',
      sourceUrl: 'https://articulo.mercadolibre.com.uy/MLU-1',
      rating: 5,
      text: 'Muy cómoda',
      date: '2026-10-01',
    },
  ],
  images: [
    { url: 'https://img/1.jpg', alt: '', sourceName: '', sourceUrl: '' },
    { url: 'https://img/2.jpg', alt: '', sourceName: '', sourceUrl: '' },
  ],
  history: [],
  firstSeen: '2026-09-01',
  lastSeen: '2026-11-20',
  ...overrides,
})

function keysDeep(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach(item => keysDeep(item, out))
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      out.push(key)
      keysDeep(inner, out)
    }
  }
  return out
}

describe('chairProductJsonLd', () => {
  it('una silla con estrellas y precio no publica calificación ni reseña', () => {
    const ld = chairProductJsonLd(rated(), URL)
    const json = JSON.stringify(ld)
    for (const banned of [
      'aggregateRating',
      'AggregateRating',
      'ratingValue',
      'reviewCount',
      '"review"',
      '"Review"',
    ]) {
      expect(json).not.toContain(banned)
    }
    const keys = keysDeep(ld)
    expect(keys).not.toContain('review')
    expect(keys).not.toContain('aggregateRating')
  })

  it('sigue siendo un Product con su AggregateOffer', () => {
    const ld = chairProductJsonLd(rated(), URL) as Record<string, any>
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Product')
    expect(ld.name).toBe('Corsair T3 Rush Charcoal')
    expect(ld.brand).toEqual({ '@type': 'Brand', name: 'Corsair' })
    expect(ld.url).toBe(URL)
    expect(ld.image).toEqual(['https://img/1.jpg', 'https://img/2.jpg'])
    expect(ld.offers).toEqual({
      '@type': 'AggregateOffer',
      priceCurrency: 'UYU',
      lowPrice: 15277,
      highPrice: 15277,
      offerCount: 1,
      availability: 'https://schema.org/InStock',
    })
  })

  it('sin precio no hay Product, aunque la silla tenga estrellas (cougar-one-precio, 3.6 de 3)', () => {
    expect(chairProductJsonLd(rated({ price: null, stars: 3.6, ratingCount: 3 }), URL)).toBeNull()
    expect(chairProductJsonLd(rated({ price: null, stars: null, ratingCount: 0 }), URL)).toBeNull()
  })

  it('omite marca, modelo y descripción vacíos en vez de publicar cadenas vacías', () => {
    const ld = chairProductJsonLd(rated({ brand: '', model: '', verdict: '' }), URL) as Record<
      string,
      unknown
    >
    expect(ld.brand).toBeUndefined()
    expect(ld.model).toBeUndefined()
    expect(ld.description).toBeUndefined()
  })
})

/** Mismo `stripComments` que `motosPages.test.ts`: el comentario que explica la regla se conserva. */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('pages/sillas-escritorio-uruguay/[slug].vue', () => {
  const src = readFileSync(
    resolve(__dirname, '../../pages/sillas-escritorio-uruguay/[slug].vue'),
    'utf8'
  )
  const code = stripComments(src)

  it('arma el JSON-LD con el helper y no vuelve a declarar una calificación en línea', () => {
    expect(code).toContain('chairProductJsonLd')
    expect(code).not.toContain('aggregateRating')
    expect(code).not.toContain('AggregateRating')
    expect(code).not.toContain('ratingValue')
  })

  it('la nota visible nombra sus fuentes y lleva a cómo se calcula', () => {
    expect(code).toContain('href="#signals-title"')
    expect(code).toContain('chairDetail.signal.')
  })
})
