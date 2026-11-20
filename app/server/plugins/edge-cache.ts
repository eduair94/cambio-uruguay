import { defaultHtmlCacheControl } from '../../utils/htmlCacheControl'
import { edgeResponseHeaders } from '../../utils/edgeCache'

// Caché de borde por defecto para las páginas que no declaran la suya. La decisión y el porqué
// viven en `utils/edgeCache.ts`; acá sólo el CUÁNDO: al final del render, que es el único momento
// en que se sabe el estado. Un middleware no sirve: corre antes de que la página decida que es un
// 404 o un 503, y Cloudflare guardaría ese error con el mismo TTL que una página sana.
//
// Sólo se completa el `s-maxage` de una respuesta 200 cuya cabecera sigue siendo la que puso
// `html-cache-control.ts` (o ninguna, si el pedido no mandó `Accept: text/html`). Cualquier otra
// cosa ya la decidió alguien: una familia de `routeRules` con su TTL, o una página que pidió
// `no-store` porque su fuente falló — esa cabecera no se toca.
//
// Después, a toda respuesta 200 que el borde va a guardar se le agrega
// `Cloudflare-CDN-Cache-Control` con el mismo TTL más la copia vieja mientras se revalida
// (`edgeCdnCacheControl`, que explica por qué no puede ir en Cache-Control; la decisión entera,
// probada caso por caso, es `edgeResponseHeaders`). Nunca si un handler
// ya puso su propia cabecera de CDN (p. ej. `CDN-Cache-Control: no-store` del 503 de admisión de
// `server/entry.ts`): la nuestra la pisaría, porque Cloudflare lee la suya primero.
//
// La otra mitad vive en Cloudflare: una Cache Rule en modo "bypass si el origen no manda s-maxage"
// sobre las rutas sin extensión. Sin ella esta cabecera no cambia nada; con ella, una ruta que no
// manda `s-maxage` sigue sin guardarse, así que la decisión sigue siendo de este repo.
const CDN_HEADERS = ['cdn-cache-control', 'cloudflare-cdn-cache-control'] as const

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (event.method !== 'GET' && event.method !== 'HEAD') return
    const status = response.statusCode ?? event.node.res.statusCode
    if (status !== 200) return

    const current = event.node.res.getHeader('cache-control')
    const ownHeaders = Object.keys(response.headers ?? {}).map(name => name.toLowerCase())
    const decision = edgeResponseHeaders({
      path: event.path || '/',
      current: current === undefined ? undefined : String(current),
      defaultCacheControl: defaultHtmlCacheControl,
      hasCdnHeader: CDN_HEADERS.some(
        name => event.node.res.hasHeader(name) || ownHeaders.includes(name)
      ),
    })
    if (decision.cacheControl !== undefined) {
      response.headers = { ...response.headers, 'cache-control': decision.cacheControl }
    }
    if (decision.cdn !== undefined) {
      response.headers = { ...response.headers, 'cloudflare-cdn-cache-control': decision.cdn }
    }
  })
})
