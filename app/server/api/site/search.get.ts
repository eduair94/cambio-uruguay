// Búsqueda en todo el sitio para asistentes de IA (MCP `search_site`) y cualquier cliente.
//
// Devuelve dos cosas que responden preguntas distintas y no se mezclan en un ranking:
// - `pages`: a qué página ir, con el mismo índice y puntaje que el buscador del encabezado y /buscar.
// - `content`: qué dice el sitio, pasajes del índice RAG nocturno (BM25, sin embeddings).
// La consulta no se registra: puede traer datos personales de quien pregunta.
import { searchSiteContent, siteContentIndex, type SiteContentHit } from '../../utils/siteContent'
import { SITE_ORIGIN, searchSiteNav } from '../../utils/siteNavIndex'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.normalize('NFC').replace(/\s+/g, ' ').trim() : ''
  if (q.length < 2 || q.length > 200)
    throw createError({ statusCode: 400, statusMessage: 'q: entre 2 y 200 caracteres' })
  const limit = Math.min(10, Math.max(1, Number.parseInt(String(query.limit ?? '6'), 10) || 6))

  const pages = searchSiteNav(q, Math.min(limit, 8))
  let content: Array<SiteContentHit & { url: string }> = []
  let indexedAt: string | null = null
  let contentAvailable = true
  try {
    const index = await siteContentIndex()
    content = searchSiteContent(index, q, limit).map(hit => ({
      ...hit,
      url: `${SITE_ORIGIN}${hit.path === '/' ? '' : hit.path}`,
    }))
    indexedAt = new Date(index.loadedAt).toISOString()
  } catch {
    // Sin la base, la mitad de navegación sigue sirviendo: es código, no datos.
    contentAvailable = false
  }

  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=3600')
  return { query: q, pages, content, contentAvailable, indexedAt }
})
