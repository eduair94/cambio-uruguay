import { defaultHtmlCacheControl } from '../../utils/htmlCacheControl'
import { edgeTtlFor } from '../../utils/edgeCache'

// Caché de borde por defecto para las páginas que no declaran la suya. La decisión y el porqué
// viven en `utils/edgeCache.ts`; acá sólo el CUÁNDO: al final del render, que es el único momento
// en que se sabe el estado. Un middleware no sirve: corre antes de que la página decida que es un
// 404 o un 503, y Cloudflare guardaría ese error con el mismo TTL que una página sana.
//
// Sólo se toca una respuesta 200 cuya cabecera sigue siendo la que puso `html-cache-control.ts`
// (o ninguna, si el pedido no mandó `Accept: text/html`). Cualquier otra cosa ya la decidió alguien:
// una familia de `routeRules` con su TTL, o una página que pidió `no-store` porque su fuente falló.
//
// La otra mitad vive en Cloudflare: una Cache Rule en modo "bypass si el origen no manda s-maxage"
// sobre las rutas sin extensión. Sin ella esta cabecera no cambia nada; con ella, una ruta que no
// manda `s-maxage` sigue sin guardarse, así que la decisión sigue siendo de este repo.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (event.method !== 'GET' && event.method !== 'HEAD') return
    const status = response.statusCode ?? event.node.res.statusCode
    if (status !== 200) return

    const ttl = edgeTtlFor(event.path || '/')
    if (ttl === null) return

    const current = event.node.res.getHeader('cache-control')
    if (current !== undefined && String(current) !== defaultHtmlCacheControl) return

    response.headers = {
      ...response.headers,
      'cache-control': `${defaultHtmlCacheControl}, s-maxage=${ttl}`,
    }
  })
})
