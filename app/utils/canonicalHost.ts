// A qué host pertenece el sitio, y qué hacer cuando llega por otro.
//
// Puro, sin Nitro, para que el middleware y los tests compartan la decisión. La regla es angosta a
// propósito: sólo el prefijo `www.` sobre el dominio del sitio. Un middleware que redirige por
// cualquier host que no reconoce rompe el desarrollo local, las vistas previas y cualquier
// despliegue futuro detrás de otro nombre — y lo rompe en producción, donde se nota tarde.

/** El host canónico del sitio, sin www. */
export const CANONICAL_HOST = 'cambio-uruguay.com'

/**
 * El destino del 301, o null si la petición ya viene por donde corresponde.
 *
 * @param hostHeader el `Host` tal como llega (puede traer puerto)
 * @param path la ruta con su query, tal como la expone Nitro en `event.path`
 */
export function canonicalHostRedirect(hostHeader: string, path: string): string | null {
  const host = String(hostHeader || '')
    .trim()
    .toLowerCase()
  if (!host) return null

  // El puerto se descarta para comparar: en producción no viene, y en local sí.
  const bare = host.split(':')[0]
  if (bare !== `www.${CANONICAL_HOST}`) return null

  const suffix = path && path.startsWith('/') ? path : `/${path || ''}`
  return `https://${CANONICAL_HOST}${suffix}`
}
