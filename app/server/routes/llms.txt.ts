// Sin sufijo de método a propósito (como `llms-full.txt.ts`): con `.get.ts` un HEAD devolvía 404;
// un handler sin sufijo responde GET y HEAD con el mismo cuerpo y las mismas cabeceras.
//
// NO puede haber un `public/llms.txt`: Nitro sirve `public/` antes que los routes y lo taparía
// (lo vigila `tests/unit/llmsIndex.test.ts`).
import { AI_TOOLSETS } from '../../utils/aiSearch'
import { DIRECTORIOS } from '../../utils/directorios'
import { guides } from '../../utils/guides'
import { LLMS_SITE_URL } from '../../utils/llmsFull'
import { renderLlmsIndex } from '../../utils/llmsIndex'
import { OPEN_DATA_ENDPOINTS } from '../../utils/openData'
import { tools } from '../../utils/tools'

/**
 * `/llms.txt`: el índice del sitio para asistentes de IA (formato de llmstxt.org) — directorios de
 * precios con su cadencia de actualización, cotizaciones, herramientas, guías, la API de datos
 * abiertos y el servidor MCP — generado de los mismos catálogos que dibujan las páginas.
 *
 * Se renderiza una vez por proceso: todos los catálogos son módulos estáticos, así que la salida
 * no cambia hasta el próximo deploy. Misma caché que `/llms-full.txt`: el navegador revalida
 * siempre, el borde lo guarda una hora (cuando la Cache Rule de Cloudflare lo cubre; ver
 * docs/app/SEO_README.md, «Superficie para agentes de IA»).
 */
let body: string | undefined

export default defineEventHandler(event => {
  body ??= renderLlmsIndex({
    siteUrl: LLMS_SITE_URL,
    directorios: DIRECTORIOS,
    tools,
    guideCount: guides.length,
    openDataEndpoints: OPEN_DATA_ENDPOINTS,
    mcpToolsets: AI_TOOLSETS,
  })
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=0, must-revalidate, s-maxage=3600')
  return body
})
