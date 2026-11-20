// Renderizador PURO de `/llms-full.txt`, la versión larga de `/llms.txt`.
//
// `/llms.txt` (`utils/llmsIndex.ts` + `server/routes/llms.txt.ts`) describe el sitio y lista sus
// secciones. Un agente que lo lee sabe QUE hay guías, pero no cuáles ni de qué tratan: para eso
// tendría que rastrear `/guias` y cada guía. `/llms-full.txt` le ahorra ese rastreo: un bloque por
// guía con título, resumen, fecha de última revisión y la URL canónica, generado del mismo catálogo
// que dibuja `/guias/<slug>` (`utils/guides.ts`), así que no puede quedar desactualizado respecto
// de las páginas: una guía nueva que se agrega al catálogo aparece acá sola.
//
// Sin Vue ni Nuxt a propósito (app/AGENTS.md → utils/ es lógica pura): lo prueba vitest en Node y
// lo consume `server/routes/llms-full.txt.ts`. Determinista: mismo catálogo, misma salida
// byte a byte, sin fechas del reloj — la caché compartida de una hora del route depende de eso.
import type { Guide } from './guides'

/** El nombre del sitio, como abre `llms.txt`. */
export const LLMS_FULL_TITLE = 'Cambio Uruguay'

/** El origen canónico, el mismo literal que `pages/guias/[slug].vue` usa para `canonicalUrl`. */
export const LLMS_SITE_URL = 'https://cambio-uruguay.com'

/**
 * La línea de resumen (el `> ` del formato llmstxt.org) que abren `/llms.txt` y `/llms-full.txt`.
 * Vive acá y no en `llmsIndex.ts` para que la dependencia vaya en un solo sentido: el índice
 * importa de este módulo, nunca al revés.
 *
 * Nombra los directorios porque son lo que los asistentes abren: entre el 23/10 y el 19/11/2026,
 * de las sesiones que GA4 atribuye a asistentes de IA, las cotizaciones y las guías sumaron menos
 * de una de cada diez; el resto cayó en autos, alquileres, celulares, equipar, motos y el súper.
 */
export const LLMS_SITE_SUMMARY =
  'Cambio Uruguay compara precios de Uruguay con datos propios: la cotización del dólar en más de 40 casas de cambio y bancos, y directorios de autos y motos usados, alquileres y venta de viviendas, celulares, electrodomésticos, monopatines y bicicletas eléctricas y precios de supermercado, con la fecha de lectura que publica cada página.'

/** Colapsa saltos y espacios repetidos: cada campo ocupa UNA línea del bloque. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Quita la barra final para que `${siteUrl}/guias/<slug>` no salga con `//`. */
export function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '')
}

/**
 * La URL canónica de una guía, calcada de `pages/guias/[slug].vue` (`canonicalUrl`): sin prefijo
 * de idioma y sin barra final. Los cuerpos de las guías son sólo en español, así que la canónica
 * es siempre la ruta sin prefijo aunque la página exista bajo /en y /pt.
 */
export function guideCanonicalUrl(siteUrl: string, slug: string): string {
  return `${normalizeSiteUrl(siteUrl)}/guias/${slug}`
}

/** El resumen de una guía: la `description` y, si estuviera vacía, el cuerpo de la primera sección. */
export function guideSummary(guide: Pick<Guide, 'description' | 'sections'>): string {
  const description = oneLine(guide.description ?? '')
  if (description) return description
  return oneLine(guide.sections?.[0]?.body ?? '')
}

/**
 * Un bloque por guía. `Actualizado:` lleva `updatedAt` TAL CUAL (ISO `YYYY-MM-DD`): es el mismo
 * valor que la página emite como `datePublished`/`dateModified`, y reformatearlo o localizarlo
 * haría que las dos superficies dijeran fechas distintas de la misma guía.
 */
export function renderGuideBlock(guide: Guide, siteUrl: string): string {
  const lines = [`## ${oneLine(guide.title)}`]
  const summary = guideSummary(guide)
  if (summary) lines.push(`> ${summary}`)
  lines.push(`Actualizado: ${guide.updatedAt}`)
  lines.push(guideCanonicalUrl(siteUrl, guide.slug))
  return lines.join('\n')
}

/**
 * La cabecera de identidad, la misma que abre `llms.txt`, para que el archivo se sostenga solo
 * ante un rastreador que nunca pidió la versión corta. Sin `## `: el test de deriva cuenta los
 * `## ` del documento y los compara con `guideSlugs().length`.
 */
function renderHeader(siteUrl: string, guideCount: number): string {
  const site = normalizeSiteUrl(siteUrl)
  return [
    `# ${LLMS_FULL_TITLE} — guías completas`,
    '',
    `> ${LLMS_SITE_SUMMARY}`,
    '',
    `${LLMS_FULL_TITLE} (${site}) es una herramienta gratuita e independiente. Autor: Eduardo Airaudo (https://www.linkedin.com/in/eduardo-airaudo/). Código abierto (MIT). Versión corta: ${site}/llms.txt — ahí están los directorios de precios, las herramientas, la API de datos abiertos y el servidor MCP.`,
    '',
    `Este archivo lista las ${guideCount} guías editoriales del sitio, en el orden de ${site}/guias. Cada bloque trae el título, un resumen de una línea, la fecha de la última revisión (Actualizado, ISO) y la URL canónica. Las guías están escritas en español para Uruguay; el contenido es de libre cita para fines informativos, atribuyendo a ${LLMS_FULL_TITLE} (${site}).`,
  ].join('\n')
}

/**
 * Renderiza el documento completo: cabecera + un bloque por guía, en el orden del catálogo.
 *
 * Toma el catálogo por parámetro (y no importa `guides` directamente) para que ampliarlo mañana
 * a los hubs de `/temas` sea una línea en el route y un test, no un cambio acá.
 */
export function renderLlmsFull(guides: readonly Guide[], siteUrl: string): string {
  const blocks = guides.map(guide => renderGuideBlock(guide, siteUrl))
  return `${[renderHeader(siteUrl, guides.length), ...blocks].join('\n\n')}\n`
}
