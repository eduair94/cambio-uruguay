import { canonicalRoutePath } from '../../utils/routeCase'
import { rawRequestPath } from '../utils/rawRequestPath'

// 301 hacia la grafía canónica de `/historico/**` y `/sucursales/**`.
//
// Es lo que consolida de verdad las tres copias indexables que tenía cada página de sucursales y
// las dos de cada página de histórico (ver utils/routeCase.ts para la medición). Un canonical no
// alcanzaba: el módulo de i18n lo deriva de la ruta pedida, así que cada grafía se declaraba
// canónica de sí misma.
//
// 301 y no 302 a propósito: es permanente y queremos que Google transfiera las señales, no que
// mantenga las dos vivas. Sólo GET y HEAD — redirigir un POST le cambiaría el método al cliente.
//
// Corre en TODAS las peticiones, así que la ruta rápida importa: `canonicalRoutePath` sale sin
// asignar nada cuando el primer segmento no es una de las dos familias, que es el 99 % del tráfico.
export default defineEventHandler(event => {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return

  // Cruda y no `event.path`: h3 la decodifica, y `canonicalRoutePath` espera la ruta codificada
  // (decodifica, baja y vuelve a codificar cada segmento). Con la decodificada, un segmento con
  // caracteres fuera de latin1 viajaba tal cual al Location y Node respondía 500.
  const raw = rawRequestPath(event)
  const queryAt = raw.indexOf('?')
  const path = queryAt === -1 ? raw : raw.slice(0, queryAt)
  const query = queryAt === -1 ? '' : raw.slice(queryAt)

  const canonical = canonicalRoutePath(path)
  if (canonical !== path) {
    return sendRedirect(event, canonical + query, 301)
  }
})
