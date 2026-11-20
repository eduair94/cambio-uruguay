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

function underAny(path: string, roots: readonly string[]): boolean {
  return roots.some(root => path === root || path.startsWith(`${root}/`))
}

/**
 * Segundos que el borde puede guardar este documento, o `null` si no debe guardarlo.
 *
 * Recibe la ruta tal como llega (con prefijo de idioma y query); la query no cambia la decisión:
 * Cloudflare la incluye en la clave, así que cada combinación de filtros es su propia entrada.
 */
export function edgeTtlFor(rawPath: string): number | null {
  let path = (rawPath || '/').split('?')[0]!.split('#')[0]!
  // Rutas internas de Nuxt y módulos (/__nuxt_error, /__nuxt_island, /__og-image__) y archivos.
  if (path.startsWith('/__') || path.startsWith('/_nuxt/') || path.startsWith('/api/')) return null
  if (/\.[a-z0-9]{2,12}$/i.test(path)) return null
  path = path.replace(LOCALE_PREFIX_RE, '') || '/'
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  if (underAny(path, NEVER)) return null
  if (underAny(path, LIVE_RATES)) return LIVE_RATES_EDGE_TTL
  return DEFAULT_EDGE_TTL
}
