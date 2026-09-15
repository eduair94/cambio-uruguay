import { CharruaTextModel } from '../../models/CharruaText'
import { connectDb } from '../../utils/db'
import {
  buildSearchMatch,
  buildSearchSort,
  shapeFacets,
  type FacetRaw,
} from '../../utils/charruadevsSearch'
import {
  excerptAround,
  normalizeSearchQuery,
  queryTerms,
  SEARCH_PER_PAGE,
  type SearchItem,
  type SearchResponse,
} from '../../../utils/charruadevs'

// El buscador de /mercado-it-uruguay: posts y comentarios clasificados de r/CharruaDevs, con
// filtros de postura, tipo, tema, visión de la IA, relato y período. Devuelve también las facetas
// de ESTA búsqueda (reparto por postura y tono por año), que es lo que la vuelve útil para entender
// cómo cambió la conversación sobre un tema. Nunca devuelve autores ni lo borrado.
export default defineEventHandler(async (event): Promise<SearchResponse> => {
  const q = normalizeSearchQuery(getQuery(event) as Record<string, unknown>)
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=120, s-maxage=600, stale-while-revalidate=3600'
  )
  try {
    await connectDb()
    const match = buildSearchMatch(q)
    const projection: Record<string, unknown> = {
      _id: 0,
      rid: 1,
      kind: 1,
      url: 1,
      title: 1,
      body: 1,
      createdAt: 1,
      score: 1,
      stance: 1,
      themes: 1,
      ai: 1,
      event: 1,
    }
    if (q.q) projection.ts = { $meta: 'textScore' }
    const [docs, facetRows] = await Promise.all([
      CharruaTextModel.find(match, projection)
        // El cast es por los tipos de mongoose, que no aceptan { $meta: 'textScore' } como orden.
        .sort(buildSearchSort(q) as unknown as Record<string, 1 | -1>)
        .skip((q.page - 1) * SEARCH_PER_PAGE)
        .limit(SEARCH_PER_PAGE)
        .lean(),
      CharruaTextModel.aggregate<FacetRaw>([
        { $match: match },
        {
          $facet: {
            total: [{ $count: 'n' }],
            stance: [{ $group: { _id: '$stance', n: { $sum: 1 } } }],
            byYear: [
              {
                $group: {
                  _id: { y: { $year: '$createdAt' }, s: { $cmp: ['$stance', 0] } },
                  n: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
    ])
    const terms = queryTerms(q.q)
    const items: SearchItem[] = docs.map(d => ({
      rid: d.rid,
      kind: d.kind,
      url: d.url,
      title: d.title,
      excerpt: excerptAround(d.body || '', terms),
      createdAt: new Date(d.createdAt).toISOString(),
      score: d.score,
      stance: d.stance,
      themes: d.themes,
      ai: d.ai,
      event: d.event,
    }))
    const facets = shapeFacets(facetRows[0])
    return {
      total: facets.total,
      page: q.page,
      perPage: SEARCH_PER_PAGE,
      items,
      facets: { stance: facets.stance, byYear: facets.byYear },
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'El buscador no está disponible' })
  }
})
