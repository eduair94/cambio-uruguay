// Higiene del índice de las fichas de alquiler (`/alquileres/<slug>`). Lógica pura, sin Nuxt.
//
// EL PROBLEMA, medido en producción el 22/9/2026: 9.647 fichas `index, follow` en el sitemap y ~40
// con alguna impresión en Search Console en 28 días. La regla de corte viene del plan de directorios
// (docs/seo/2026-09-16-directorios-de-producto-plan.md §8): una ficha con más de 8 semanas de vida y
// menos de 5 impresiones en las últimas 8 semanas pasa a `noindex, follow` y sale del sitemap; el
// hub y las fichas jóvenes no se tocan.
//
// LA LISTA la escribe el backend (`currency-gsc`, classes/gsc/indexAllowlist.ts) en la APP DB
// `seoindexallowlists`: las rutas que SÍ tienen demanda. Acá sólo se decide, y se decide en una
// sola función para que la ficha (robots) y el sitemap digan siempre lo mismo.
//
// LA REGLA DE ORO: la ausencia nunca es un veredicto. Sin documento, con un documento vencido (el
// job dejó de correr), incompleto (la API cortó por tope de filas) o con una fecha de alta que no se
// puede leer, TODO queda indexable, que es exactamente lo que había antes. La única forma de que una
// ficha pase a `noindex` es que sea vieja Y que una lista fresca y completa no la nombre.

/** Días de vida que una ficha necesita antes de que sus impresiones digan algo (8 semanas). */
export const RENTAL_INDEX_MIN_AGE_DAYS = 56
/**
 * Días tras los cuales una lista deja de aplicarse. El job es diario; a las dos semanas sin correr
 * la lista ya describe otro mercado y seguir desindexando con ella sería juzgar con datos viejos.
 */
export const RENTAL_INDEX_ALLOWLIST_MAX_AGE_DAYS = 14
/** Motivo que la ficha suma a `seo.reasons` cuando sale del índice por falta de demanda. */
export const RENTAL_INDEX_NO_DEMAND_REASON = 'no_search_demand'

/** El documento tal como lo escribe el backend (espejo en app/server/models/SeoIndexAllowlist.ts). */
export interface RentalIndexAllowlistDoc {
  family: string
  /** Día de la corrida, `YYYY-MM-DD`. */
  asOf: string
  windowDays: number
  minImpressions: number
  /** Rutas (sin host ni query) con demanda medida. */
  urls: string[]
  rowCount: number
  /** `false` cuando la respuesta de la API llegó al tope de filas y puede faltar alguna ruta. */
  complete: boolean
}

/** La lista lista para consultar: sólo existe si es fresca y completa. */
export interface RentalIndexAllowlist {
  asOf: string
  windowDays: number
  minImpressions: number
  paths: ReadonlySet<string>
}

const DAY_MS = 86_400_000

/**
 * Convierte el documento guardado en una lista usable, o `null` cuando NO hay que aplicar nada:
 * documento ausente, incompleto, sin fecha legible o más viejo que `RENTAL_INDEX_ALLOWLIST_MAX_AGE_DAYS`.
 */
export function rentalIndexAllowlistFrom(
  doc: Partial<RentalIndexAllowlistDoc> | null | undefined,
  now: number = Date.now()
): RentalIndexAllowlist | null {
  if (!doc || doc.complete !== true || !Array.isArray(doc.urls)) return null
  const asOf = Date.parse(String(doc.asOf ?? ''))
  if (!Number.isFinite(asOf)) return null
  if (now - asOf > RENTAL_INDEX_ALLOWLIST_MAX_AGE_DAYS * DAY_MS) return null
  return {
    asOf: String(doc.asOf),
    windowDays: Number(doc.windowDays) || 0,
    minImpressions: Number(doc.minImpressions) || 0,
    paths: new Set(doc.urls.filter((url): url is string => typeof url === 'string')),
  }
}

/**
 * ¿La ficha conserva el `index`?
 *
 * `firstSeenAt` es el día en que NOSOTROS vimos la vivienda por primera vez (`firstSeen` de la
 * propiedad, no la fecha de publicación del portal): mide cuánto tiempo tuvo Google para rastrearla
 * desde que existe en este sitio, que es lo que el corte necesita.
 */
export function rentalListingIndexable(
  listing: { firstSeenAt: string | null | undefined; path: string },
  allowlist: RentalIndexAllowlist | null | undefined,
  now: number = Date.now()
): boolean {
  if (!allowlist) return true
  const firstSeen = Date.parse(String(listing.firstSeenAt ?? ''))
  // Sin fecha de alta legible no se puede afirmar que sea vieja: queda como estaba.
  if (!Number.isFinite(firstSeen)) return true
  if (now - firstSeen < RENTAL_INDEX_MIN_AGE_DAYS * DAY_MS) return true
  return allowlist.paths.has(listing.path)
}

/**
 * Aplica el veredicto a una ficha ya armada (`buildRentalPage`): si no pasa, `seo.indexable` baja a
 * `false` y `seo.reasons` suma `no_search_demand`. Devuelve la misma referencia cuando no cambia
 * nada, así una ficha joven o sin lista no se copia por pedido.
 */
export function withRentalIndexHygiene<
  T extends {
    canonicalPath: string
    property: { firstSeen?: string | null }
    seo: { indexable: boolean; reasons: string[] }
  },
>(page: T, allowlist: RentalIndexAllowlist | null | undefined, now: number = Date.now()): T {
  if (
    rentalListingIndexable(
      { firstSeenAt: page.property.firstSeen, path: page.canonicalPath },
      allowlist,
      now
    )
  )
    return page
  return {
    ...page,
    seo: {
      ...page.seo,
      indexable: false,
      reasons: [...page.seo.reasons, RENTAL_INDEX_NO_DEMAND_REASON],
    },
  }
}
