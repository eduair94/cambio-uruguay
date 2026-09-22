// Sin sufijo de método a propósito: con `.get.ts` un HEAD (curl -I, algunos verificadores de
// enlaces) devolvía 404 (medido en producción el 22/9/2026); un handler sin sufijo responde
// GET y HEAD con el mismo cuerpo/cabeceras.
import { guides } from '../../utils/guides'
import { LLMS_SITE_URL, renderLlmsFull } from '../../utils/llmsFull'

/**
 * `/llms-full.txt`: la versión larga de `public/llms.txt` para agentes de IA — un bloque por guía
 * editorial (título, resumen, fecha de revisión y URL canónica), generado del catálogo.
 *
 * Es un route de Nitro y no una página a propósito: no es HTML, no lleva chrome ni OG image, no
 * va en el sitemap (no es una página indexable, es un índice para agentes) y no dispara el guard
 * de `tests/unit/siteNav-coverage.test.ts`, que sólo recorre `pages/**`.
 *
 * El cuerpo se renderiza una vez por proceso: el catálogo es un módulo estático, así que la salida
 * no cambia hasta el próximo deploy. La caché es la misma postura que el sitemap: el navegador
 * revalida siempre, el borde lo guarda una hora.
 */
let body: string | undefined

export default defineEventHandler(event => {
  body ??= renderLlmsFull(guides, LLMS_SITE_URL)
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=0, must-revalidate, s-maxage=3600')
  return body
})
