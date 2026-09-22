// El texto de una página del sitio tal como lo leyó el índice nocturno (MCP `read_page`), por
// tramos de 8.000 caracteres. Las cifras del texto son las del día de `crawledAt`.
import {
  normalizeSitePath,
  readSitePage,
  siteContentIndex,
  siteLocaleFallback,
} from '../../utils/siteContent'
import { SITE_ORIGIN } from '../../utils/siteNavIndex'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const path = normalizeSitePath(typeof query.path === 'string' ? query.path : '')
  if (!path) throw createError({ statusCode: 400, statusMessage: 'path inválido' })
  const offset = Math.max(0, Number.parseInt(String(query.offset ?? '0'), 10) || 0)

  let index
  try {
    index = await siteContentIndex()
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'El índice del sitio no está disponible' })
  }
  const fallback = siteLocaleFallback(path)
  const page =
    readSitePage(index, path, offset) ?? (fallback ? readSitePage(index, fallback, offset) : null)
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Página no indexada' })

  setResponseHeader(event, 'cache-control', 'public, max-age=600, s-maxage=3600')
  return { ...page, url: `${SITE_ORIGIN}${page.path === '/' ? '' : page.path}` }
})
