// La página de UNA marca: "¿qué descuento tengo en Farmashop, y con qué tarjeta?".
//
// POR QUÉ EXISTE. Las 26 páginas que ya hay contestan por EMISOR ("descuentos Itaú") y por RUBRO
// ("descuentos en farmacias"). Ninguna contesta por marca, y la marca es la única forma de estas
// consultas que todavía admite un clic. Medido en el archivo propio de Search Console (28 días al
// 2026-08-29): las 84 consultas de "descuento/beneficio/promo" suman 478 impresiones y CERO clics
// porque casi todas son preguntas larguísimas que Google contesta solo; las que sí tienen clic
// adentro son "descuento bbva tienda inglesa" (15 impresiones, posición 7,5), "bbva cine 2x1",
// "tu racion descuento bbva" y "las delicias 2x1" — esta última en POSICIÓN 1 sin tener página.
//
// EL CORTE, Y POR QUÉ NO SON LAS 2.068 MARCAS. Medido contra el catálogo vivo (2026-09-02): de
// 2.068 marcas, 1.698 tienen UN SOLO local. Una página por cada una sería 2.068 URLs de las que
// 1.698 dirían "esta marca tiene un local y un beneficio" — el caso de manual de la política de
// contenido a escala. El corte es la unión de dos condiciones, y cada una entra por un motivo
// distinto:
//
//   * >= 4 locales — la cadena. La página vale porque nadie sabe de memoria en cuáles de los 96
//     Farmashop aplica; el mapa de la marca ES la respuesta. Aporta 132 marcas por sí sola.
//   * >= 2 emisores — la comparación. LIFE Cinemas tiene 4 locales y CUATRO emisores: la página no
//     contesta "dónde", contesta "con cuál de mis tarjetas conviene", que es una pregunta que
//     ninguna otra página del sitio responde. Aporta 128 marcas por sí sola; 44 cumplen las dos.
//
// La unión son 304 marcas y cubre 2.333 de los 4.304 locales. Verificado: cero colisiones de slug
// y cero nombres que produzcan un slug vacío.
//
// EL UMBRAL DE LOCALES SE ELIGIÓ CONTRA LA DEMANDA MEDIDA, no por gusto. Las marcas que Search
// Console muestra con clic disponible son Tienda Inglesa (20 locales), Heladería Las Delicias (4),
// LIFE Cinemas (4 locales / 4 emisores) y Movie Montevideo (4/4). Con >= 5 locales el corte da 264
// páginas pero pierde Las Delicias, que ya está en POSICIÓN 1 para "las delicias 2x1" sin tener
// página propia. Con >= 3 da 347 y agrega 43 marcas de tres locales y un solo emisor, que es el
// tramo más delgado y ninguna con demanda observada. Cuatro es donde entra todo lo medido sin
// pagar por lo que no se busca.
//
// PURE (sin Vue, sin I/O) para que la ruta del servidor, la página, el sitemap y los tests
// compartan exactamente la misma definición de "qué marcas tienen página".

import { slugifyText } from './longform'
import type { BrandRow } from './bankosBrands'

/** Locales mínimos para que la página se justifique por "dónde". */
export const BRAND_PAGE_MIN_LOCATIONS = 4
/** Emisores mínimos para que se justifique por "con cuál conviene". */
export const BRAND_PAGE_MIN_ISSUERS = 2

/** Una marca merece página propia si contesta "dónde" o "con cuál", no por existir. */
export function qualifiesForBrandPage(brand: Pick<BrandRow, 'locations' | 'offers'>): boolean {
  const locations = brand.locations || 0
  const issuers = (brand.offers || []).length
  return locations >= BRAND_PAGE_MIN_LOCATIONS || issuers >= BRAND_PAGE_MIN_ISSUERS
}

export interface BrandPageEntry {
  slug: string
  brandId: string
  name: string
  locations: number
  /** Cuántos emisores publican beneficio sobre la marca. */
  issuers: number
  categories: string[]
}

/**
 * El índice de marcas con página, con slugs únicos y estables.
 *
 * ORDEN ESTABLE, y no es cosmético: el slug de una marca es su URL, y una URL que cambia de dueño
 * porque el catálogo devolvió las marcas en otro orden es un 404 para Google y un enlace roto para
 * quien lo guardó. Por eso el desempate de una colisión no depende del orden de llegada sino del
 * `brandId`, que es estable aguas arriba.
 */
export function buildBrandPageIndex(brands: readonly BrandRow[]): BrandPageEntry[] {
  const eligible = brands.filter(qualifiesForBrandPage)

  // Agrupar por slug base para detectar colisiones ANTES de asignar ninguna URL.
  const byBase = new Map<string, BrandRow[]>()
  for (const brand of eligible) {
    const base = slugifyText(brand.name) || slugifyText(brand.brandId) || 'marca'
    const list = byBase.get(base) || []
    list.push(brand)
    byBase.set(base, list)
  }

  const entries: BrandPageEntry[] = []
  for (const [base, list] of byBase) {
    // Una sola marca con ese nombre: se queda el slug limpio.
    if (list.length === 1) {
      entries.push(toEntry(list[0], base))
      continue
    }
    // Dos marcas con el mismo nombre. La de más locales se queda el slug limpio (es la que la gente
    // busca) y las demás llevan su brandId pegado. Desempate por brandId para que no dependa del
    // orden en que llegaron.
    const sorted = [...list].sort(
      (a, b) => (b.locations || 0) - (a.locations || 0) || a.brandId.localeCompare(b.brandId)
    )
    entries.push(toEntry(sorted[0], base))
    for (const brand of sorted.slice(1)) {
      entries.push(toEntry(brand, `${base}-${slugifyText(brand.brandId)}`))
    }
  }

  return entries.sort((a, b) => b.locations - a.locations || a.name.localeCompare(b.name, 'es'))
}

function toEntry(brand: BrandRow, slug: string): BrandPageEntry {
  return {
    slug,
    brandId: brand.brandId,
    name: brand.name,
    locations: brand.locations || 0,
    issuers: (brand.offers || []).length,
    categories: brand.categories || [],
  }
}

/** Busca una marca por slug. Devuelve null en vez de lanzar: la ruta contesta 404, no 500. */
export function findBrandBySlug(
  entries: readonly BrandPageEntry[],
  slug: string
): BrandPageEntry | null {
  const wanted = String(slug || '').toLowerCase()
  return entries.find(e => e.slug === wanted) || null
}

/**
 * Por qué esta marca tiene página, en una línea, para que el lector (y quien audite el sitio) sepa
 * que no es una URL generada por generar.
 */
export function brandPageRationale(entry: BrandPageEntry): string {
  const manyLocations = entry.locations >= BRAND_PAGE_MIN_LOCATIONS
  const manyIssuers = entry.issuers >= BRAND_PAGE_MIN_ISSUERS
  if (manyLocations && manyIssuers) return 'cadena con beneficio de varios emisores'
  if (manyIssuers) return 'varios emisores descuentan la misma marca'
  return 'cadena con varios locales'
}
