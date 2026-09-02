// One page, one URL — for the two families where that was not true.
//
// WHAT WAS BROKEN (medido 2026-09-02 contra el sitio en vivo). `/historico/brou/usd` y
// `/historico/brou/USD` devuelven las dos 200 con el mismo contenido, y cada una se declara canónica
// de sí misma. `/sucursales/brou/CERRO%20LARGO`, `/sucursales/brou/cerro%20largo` y
// `/sucursales/brou/cerro-largo` son TRES URLs indexables de la misma página, cada una canónica de
// sí misma. La etiqueta canonical existe —la pone el módulo de i18n— pero la deriva de la ruta
// pedida, así que no consolida absolutamente nada.
//
// No es teórico: el sitemap declaraba 154 URLs de `/sucursales` en mayúsculas y 163 de `/historico`
// con la moneda en mayúsculas, mientras el tráfico medido está en minúsculas
// (`/sucursales/brou/montevideo`, 11.303 impresiones; `/historico/brou/usd`, 8.592). O sea que el
// sitemap venía señalando la mitad que no rankea, y Google indexaba las dos.
//
// LA GRAFÍA CANÓNICA ES LA MINÚSCULA, porque es la que tiene el tráfico y la que ya usa
// `/dolar/<departamento>`. El redirect 301 (server/middleware/lowercase-routes.ts) es lo que
// consolida de verdad; el canonical se arregla solo cuando hay una sola URL que responde 200.
//
// Sólo estas dos familias. No es una regla global de minúsculas: `/casa/<origin>/<intent>` y el
// resto del sitio ya nacen en minúscula, y una regla que toque todo es una regla que algún día
// rompe una ruta que necesitaba su mayúscula.

/** Familias cuya cola de segmentos se normaliza a minúscula. */
export const LOWERCASE_ROUTE_FAMILIES: readonly string[] = Object.freeze([
  'historico',
  'sucursales',
])

/** Prefijos de idioma que el router puede anteponer. */
const LOCALE_PREFIXES = new Set(['en', 'pt'])

/**
 * Baja a minúscula un segmento de URL **decodificándolo primero**.
 *
 * La trampa: el porcentaje-encoding es insensible a mayúsculas en sus dígitos hex, así que un
 * `.toLowerCase()` crudo convierte `PAYSAND%C3%9A` en `paysand%c3%9a`, que sigue decodificando a
 * «PAYSANDÚ» con la Ú mayúscula — una URL distinta, fea, y que no es la que queríamos. Hay que
 * decodificar, bajar, y volver a codificar: `%C3%9A` → «Ú» → «ú» → `%C3%BA`, que es exactamente la
 * URL que el sitio ya sirve con 200.
 */
function lowerSegment(segment: string): string {
  let decoded: string
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    // Porcentaje malformado: no es nuestro problema y no vamos a inventarle una forma canónica.
    return segment
  }
  const lowered = decoded.toLocaleLowerCase('es')
  if (lowered === decoded) return segment
  return encodeURIComponent(lowered)
}

/**
 * La grafía canónica de una ruta. Devuelve la misma cadena cuando ya lo es.
 *
 * Acepta la ruta tal como viene del router (sin query), con o sin prefijo de idioma.
 */
export function canonicalRoutePath(path: string): string {
  if (!path || path[0] !== '/') return path
  const parts = path.split('/')
  // parts[0] siempre es '' por el slash inicial.
  let i = 1
  if (LOCALE_PREFIXES.has(parts[i])) i++
  const family = parts[i]
  if (!family || !LOWERCASE_ROUTE_FAMILIES.includes(family)) return path

  let changed = false
  for (let j = i + 1; j < parts.length; j++) {
    const next = lowerSegment(parts[j])
    if (next !== parts[j]) {
      parts[j] = next
      changed = true
    }
  }
  return changed ? parts.join('/') : path
}
