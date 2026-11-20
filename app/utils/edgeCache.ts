// Cuánto puede guardar Cloudflare una página, cuando la página no lo dijo.
//
// MEDIDO EL 6/11/2026: de las 287 páginas estáticas del sitio, 254 salían `cf-cache-status:
// DYNAMIC` — cada visita, humana o de Googlebot, hacía un render completo en el VPS. Las 33 que
// declaran `s-maxage` (familias de `routeRules`) respondían en 0,2-0,4 s desde el borde; las demás
// tardaban 1-2,6 s en reposo y 3-6 s con diez pedidos en paralelo, y eso incluye los directorios
// que más se visitan (autos, alquileres, venta de viviendas, casas de cambio). Lighthouse móvil
// medía 9-12 puntos en todas.
//
// La caché de cada familia sigue en `routeRules` (nuxt.config.ts) con su propio TTL; esto es el
// valor POR DEFECTO para todo lo que no declara nada, y lo aplica `server/plugins/edge-cache.ts`
// recién al final del render, cuando ya se sabe el estado: sólo un 200 se guarda en el borde.
//
// EL HTML ANÓNIMO ES EL MISMO PARA TODOS. El idioma lo decide la URL (`detectBrowserLanguage:
// false`), la sesión es un token Bearer de Firebase que el render del servidor nunca ve (sólo
// `authFetch` en el navegador lo manda), y ningún render lee cookies salvo el aviso de
// consentimiento — el mismo asterisco aceptado para las familias, explicado en nuxt.config.ts.
// Una respuesta con `Set-Cookie` igual no la guarda Cloudflare.
//
// Lo que NO se guarda: las páginas que dependen de quién mira (cuenta, lista, asistente), las
// privadas del dueño (sus datos llegan por API con token, pero no tiene sentido que el borde guarde
// ni el cascarón) y las que existen para mostrar el estado de AHORA (estado de los scrapers,
// pizarra).

import { LOCALE_PREFIX_RE } from './locales'

/** TTL por defecto en el borde para una página pública que no declara el suyo. */
export const DEFAULT_EDGE_TTL = 600

/** Páginas que muestran cotizaciones en vivo: el mismo orden de magnitud que el scraper (5 min). */
export const LIVE_RATES_EDGE_TTL = 300

/** Nunca en el borde. Ruta exacta o subruta, sin prefijo de idioma. */
const NEVER = [
  '/cuenta',
  '/conectar',
  '/mi-lista',
  '/buscar',
  '/asistente-ia',
  '/offline',
  '/estado',
  '/pizarra',
  '/admin',
  '/server',
  '/api-reference',
  // Privadas del dueño (las mismas que robots.txt bloquea).
  '/estadisticas-de-busqueda',
  '/estadisticas-por-pagina',
  '/estadisticas-de-uso',
  '/opinion-alquileres',
  '/opiniones-alquileres',
  '/contactos-comerciales',
  '/ranking-usuarios-charruadevs',
  '/oportunidades-reddit',
]

/** Cotizaciones en vivo: TTL corto. Ruta exacta o subruta, sin prefijo de idioma. */
const LIVE_RATES = [
  '/dolar-hoy',
  '/dolar-blue-hoy',
  '/dolar',
  '/casas-de-cambio',
  '/casas-de-cambio-abiertas-fin-de-semana',
  '/mejor-casa-de-cambio',
  '/casa-de-cambio-cerca-de-mi',
  '/convertir',
  '/comparar',
  '/avanzado',
  '/frontera',
  '/mapa',
  '/cotizaciones-de-la-region',
  '/cotizacion-del-bcu',
  '/ultimos-cambios',
  '/herramientas/conversor-de-monedas',
]

/**
 * Familias de `routeRules` (nuxt.config.ts) que también muestran cotizaciones aunque su TTL sea
 * más largo: la home y el widget, cada casa y sucursal, el histórico y la cotización por moneda.
 * `/` es ruta EXACTA (si no, todo el sitio sería "cotización"); las demás, ruta o subruta.
 */
const RATE_PAGES = ['/widget', '/casa', '/sucursal', '/sucursales', '/historico', '/cotizacion']

function underAny(path: string, roots: readonly string[]): boolean {
  return roots.some(root => path === root || path.startsWith(`${root}/`))
}

/** `null` para lo que no es un documento; si no, la ruta sin query, idioma ni barra final. */
function documentPath(rawPath: string): string | null {
  let path = (rawPath || '/').split('?')[0]!.split('#')[0]!
  // Rutas internas de Nuxt y módulos (/__nuxt_error, /__nuxt_island, /__og-image__) y archivos.
  if (path.startsWith('/__') || path.startsWith('/_nuxt/') || path.startsWith('/api/')) return null
  if (/\.[a-z0-9]{2,12}$/i.test(path)) return null
  path = path.replace(LOCALE_PREFIX_RE, '') || '/'
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

/**
 * Segundos que el borde puede guardar este documento, o `null` si no debe guardarlo.
 *
 * Recibe la ruta tal como llega (con prefijo de idioma y query); la query no cambia la decisión:
 * Cloudflare la incluye en la clave, así que cada combinación de filtros es su propia entrada.
 */
export function edgeTtlFor(rawPath: string): number | null {
  const path = documentPath(rawPath)
  if (path === null) return null
  if (underAny(path, NEVER)) return null
  if (underAny(path, LIVE_RATES)) return LIVE_RATES_EDGE_TTL
  return DEFAULT_EDGE_TTL
}

// ── La copia vieja mientras se revalida ────────────────────────────────────
//
// MEDIDO EL 20/11/2026: con el TTL vencido, el pedido que llega después espera el render entero
// (EXPIRED o MISS: 3-7 s de primer byte en /casas-de-cambio, /venta-viviendas-uruguay,
// /monopatines-electricos-uruguay, /casa/brou) contra 0,2 s en HIT. `stale-while-revalidate` haría
// que ese pedido reciba la copia que ya hay mientras el borde pide la nueva por atrás.
//
// NO PUEDE IR EN `Cache-Control`. Documentación de Cloudflare (cache/concepts/cache-control, leída
// el 20/11/2026): "`s-maxage` disables `stale-while-revalidate`", "Do not use `s-maxage` with
// `stale-while-revalidate`", `must-revalidate` "Does not serve stale", y `stale-if-error` "is
// ignored if ... an explicit in-protocol directive is passed" (las mismas dos). El HTML de este
// sitio necesita las dos: `max-age=0, must-revalidate` es la mitad del navegador (ver
// `htmlCacheControl.ts` y el incidente del HTML fijado un año), y `s-maxage` es la que lee la Cache
// Rule. Agregarles `stale-while-revalidate` no haría nada.
//
// VA EN `Cloudflare-CDN-Cache-Control` (cache/concepts/cdn-cache-control): "If both CDN headers
// are present, Cloudflare uses Cloudflare-CDN-Cache-Control", "Cloudflare-CDN-Cache-Control is not
// passed downstream" y el Browser Cache TTL "doesn't change either CDN header". El navegador sigue
// recibiendo el Cache-Control de siempre. Si alguna vez Cloudflare no lee esta cabecera, el
// `s-maxage` de Cache-Control sigue ahí: el peor caso es el comportamiento de antes.
//
// Hasta dónde puede llegar vieja una copia. La ventana corre DESDE que vence el TTL, así que la edad
// máxima es TTL + ventana. La reciben los pedidos que llegan mientras el origen re-renderiza
// (UPDATING: "All requests during revalidation are served stale"), que en una página lenta son
// todos los de esos 3-12 s, no uno solo:
//  - cotizaciones (LIVE_RATES, la home, casa, sucursal, histórico, cotización): TTL + 60 s, o sea
//    6 min en LIVE_RATES (300 s), 11 min en histórico/cotización (600 s) y 61 min en la home, casa
//    y sucursal (3600 s, que ya aceptan una hora). Ante un 5xx del origen, TTL + 15 min: 20 min en
//    LIVE_RATES, 25 en histórico/cotización, 75 en la home/casa/sucursal; la página trae su propia
//    hora de actualización, y la alternativa a esa copia es una página de error.
//  - el resto (directorios, herramientas, fichas): TTL + hasta 10 min; lo editorial de un día
//    (guías, comparativas, glosario), TTL + 1 h. Ante un 5xx, TTL + 24 h.
//  - nunca: lo de `NEVER` (personal, privado, /estado, /pizarra) y /api/*, que no es HTML.

export const EDGE_STALE = {
  rates: { revalidate: 60, ifError: 900 },
  other: { revalidateMax: 600, editorialRevalidate: 3600, ifError: 86400 },
} as const

/**
 * `Cloudflare-CDN-Cache-Control` para un documento que el borde va a guardar, o `null` si no
 * corresponde. Toma el TTL del `s-maxage` de su `Cache-Control` final (el por defecto o el de su
 * familia), así que el borde guarda lo mismo que antes y sólo se agrega la copia vieja.
 */
export function edgeCdnCacheControl(rawPath: string, cacheControl: string): string | null {
  if (edgeTtlFor(rawPath) === null) return null
  const path = documentPath(rawPath)!
  if (/no-store|no-cache|private/i.test(cacheControl)) return null
  const ttl = Number(/s-maxage=(\d+)/i.exec(cacheControl)?.[1] ?? 0)
  if (!(ttl > 0)) return null
  if (path === '/' || underAny(path, LIVE_RATES) || underAny(path, RATE_PAGES)) {
    return `public, max-age=${ttl}, stale-while-revalidate=${EDGE_STALE.rates.revalidate}, stale-if-error=${EDGE_STALE.rates.ifError}`
  }
  const revalidate =
    ttl >= 86400
      ? EDGE_STALE.other.editorialRevalidate
      : Math.min(ttl, EDGE_STALE.other.revalidateMax)
  return `public, max-age=${ttl}, stale-while-revalidate=${revalidate}, stale-if-error=${EDGE_STALE.other.ifError}`
}

export interface EdgeResponseInput {
  /** `event.path`: con prefijo de idioma y query. */
  path: string
  /** `Cache-Control` que la respuesta ya trae, o `undefined` si no trae ninguno. */
  current: string | undefined
  /** `Cache-Control` que pone `html-cache-control.ts` a todo HTML (el del navegador). */
  defaultCacheControl: string
  /** Si un handler ya puso `CDN-Cache-Control` o `Cloudflare-CDN-Cache-Control`. */
  hasCdnHeader: boolean
}

export interface EdgeResponseHeaders {
  /** `Cache-Control` nuevo; ausente = no se toca el que hay. */
  cacheControl?: string
  /** `Cloudflare-CDN-Cache-Control` a agregar; ausente = no se agrega. */
  cdn?: string
}

/**
 * La decisión entera de `server/plugins/edge-cache.ts` para una respuesta 200, sin Nitro, para poder
 * probarla:
 *  - Sólo se completa el `s-maxage` de un `Cache-Control` que sigue siendo el por defecto (o que
 *    no existe). Uno distinto lo decidió alguien —una familia de `routeRules`, una página que pidió
 *    `no-store`— y nunca se reescribe.
 *  - A lo que el borde va a guardar se le agrega `Cloudflare-CDN-Cache-Control`, salvo que un
 *    handler ya haya puesto su cabecera de CDN: Cloudflare lee la nuestra primero y la pisaría.
 */
export function edgeResponseHeaders(input: EdgeResponseInput): EdgeResponseHeaders {
  const out: EdgeResponseHeaders = {}
  let final: string
  if (input.current === undefined || input.current === input.defaultCacheControl) {
    const ttl = edgeTtlFor(input.path)
    if (ttl === null) return out
    final = `${input.defaultCacheControl}, s-maxage=${ttl}`
    out.cacheControl = final
  } else {
    final = input.current
  }
  if (input.hasCdnHeader) return out
  const cdn = edgeCdnCacheControl(input.path, final)
  if (cdn !== null) out.cdn = cdn
  return out
}
