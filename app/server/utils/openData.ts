import type { H3Event } from 'h3'
import { OPEN_DATA_PAGE } from '../../utils/openData'

/**
 * Cabeceras de toda respuesta de `/api/datos/*`: CORS abierto (es una API pública, sin cookies ni
 * credenciales), caché de borde y el enlace a la documentación. Las estadísticas cambian una vez
 * por día, así que una hora en el borde no esconde nada.
 */
export function openDataHeaders(event: H3Event, seconds = 3600): void {
  setResponseHeaders(event, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-max-age': '86400',
    'cache-control': `public, max-age=${Math.min(seconds, 600)}, s-maxage=${seconds}, stale-while-revalidate=86400`,
    link: `<${OPEN_DATA_PAGE}>; rel="describedby"`,
    'x-robots-tag': 'noindex',
  })
}

/** Un error de la API pública: sin caché, con CORS para que el que llama pueda leer el motivo. */
export function openDataError(event: H3Event, statusCode: number, message: string): never {
  setResponseHeaders(event, {
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  })
  throw createError({ statusCode, statusMessage: message })
}
