import type { H3Event } from 'h3'

/**
 * La ruta y la query TAL COMO LAS MANDÓ EL CLIENTE, todavía con su porcentaje-encoding.
 *
 * `event.path` no sirve para armar un `Location`: h3 decodifica la ruta antes de correr el primer
 * middleware (`_decodePath` en `createAppEventHandler`), así que `/de/historico/%E4%B8%AD` llega
 * como `/de/historico/中`. Redirigir con eso hace que Node rechace la cabecera
 * (`ERR_INVALID_CHAR: Invalid character in header content ["location"]`) y la petición sale 500
 * (CAMBIO-URUGUAY-BACKEND-18, 263 eventos en /historico/:item desde 2026-11-06); y un `%3F`
 * decodificado se vuelve un `?` de verdad, que corta la ruta y la convierte en query.
 *
 * h3 guarda la URL cruda en `req.originalUrl` (y Node en `req.url` mientras ninguna capa con
 * prefijo la reescriba). Si no hay ninguna, se cae a `event.path`.
 */
export function rawRequestPath(event: H3Event): string {
  const req = event.node?.req as { originalUrl?: unknown; url?: unknown } | undefined
  for (const candidate of [req?.originalUrl, req?.url]) {
    if (typeof candidate === 'string' && candidate.startsWith('/')) return candidate
  }
  return event.path || '/'
}
