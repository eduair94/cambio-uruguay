// Lo que comparten los catálogos de modelos de monopatín y de bicicleta: en qué hub vive cada uno y
// cómo se pide una sola categoría a `movilidadmodels`.
//
// Desde el 4/11/2026 la colección tiene las dos categorías (classes/movilidad/models/category.ts). Un
// documento sin `category` es de antes de las bicis y siempre de monopatín: por eso el filtro de
// monopatín incluye `null`. Una lectura que no filtra por categoría mezclaría bicis en la tabla de
// monopatines, en su sitemap y en sus "Comparalo con".

export const MOVILIDAD_MODEL_CATEGORIES = ['monopatin-electrico', 'bicicleta-electrica'] as const
export type MovilidadModelCategoria = (typeof MOVILIDAD_MODEL_CATEGORIES)[number]

/** El hub de cada categoría: la página de un modelo es `<hub>/<slug>`, el comparador `<hub>/comparar`. */
export const MOVILIDAD_MODEL_HUBS: Readonly<Record<MovilidadModelCategoria, string>> = {
  'monopatin-electrico': '/monopatines-electricos-uruguay',
  'bicicleta-electrica': '/bicicletas-electricas-uruguay',
}

export const isMovilidadModelCategoria = (value: unknown): value is MovilidadModelCategoria =>
  typeof value === 'string' && (MOVILIDAD_MODEL_CATEGORIES as readonly string[]).includes(value)

/** La categoría de `?categoria=`; cualquier otra cosa (o nada), monopatín: la API de antes de las bicis. */
export function movilidadModelCategoria(raw: unknown): MovilidadModelCategoria {
  const value = Array.isArray(raw) ? raw[0] : raw
  return isMovilidadModelCategoria(value) ? value : 'monopatin-electrico'
}

/** El filtro de Mongo de una categoría: la de monopatín incluye los documentos sin categoría. */
export function movilidadModelCategoryFilter(
  categoria: MovilidadModelCategoria
): Record<string, unknown> {
  return categoria === 'monopatin-electrico'
    ? { category: { $in: ['monopatin-electrico', null] } }
    : { category: categoria }
}

/** La página del modelo; null si la categoría no tiene catálogo de modelos. */
export function movilidadModelPath(categoria: string, slug: string): string | null {
  return isMovilidadModelCategoria(categoria) ? `${MOVILIDAD_MODEL_HUBS[categoria]}/${slug}` : null
}
