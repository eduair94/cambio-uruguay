import type { H3Event } from 'h3'
import { OPEN_DATA_PAGE } from '../../utils/openData'

/**
 * Cabeceras de toda respuesta de `/api/datos/*`: CORS abierto (es una API pública, sin cookies ni
 * credenciales), caché de borde y el enlace a la documentación. Las estadísticas cambian una vez
 * por día, así que una hora en el borde no esconde nada.
 *
 * La otra mitad vive en Cloudflare (desde 2026-11-27): una Cache Rule sobre `/api/datos` y
 * `/api/datos/*` en modo "bypass si el origen no manda s-maxage". Hasta ese día ninguna regla
 * cubría `/api/` y estas cabeceras no hacían nada: toda respuesta salía `DYNAMIC`. La decisión
 * sigue acá: una ruta nueva bajo `/api/datos` que no llame a esta función no se guarda, y un
 * error (`openDataError`, `no-store`) tampoco. La clave del borde incluye el query, así que
 * `?modelo=`, `?formato=csv` y `?minimo=` se guardan por separado.
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
