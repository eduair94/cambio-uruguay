import { I18N_MESSAGES_CACHE_CONTROL, versionedMessagesLocale } from '../../utils/i18nMessagesCache'

// Los mensajes de vue-i18n, guardables para siempre. El porqué está en `utils/i18nMessagesCache.ts`
// y en `i18n/messagesVersion.ts`; acá sólo el CUÁNDO.
//
// `beforeResponse` y no `routeRules`: el manejador del módulo escribe su propio `cache-control`
// (`max-age=-1` mientras su caché interna esté apagada, y lo está a propósito — con ella prendida
// los 35 idiomas que comparten cargador se pisarían, ver `i18n/locales/extra.ts`) DESPUÉS de que
// corren las reglas de ruta. Este gancho es el último que toca la respuesta.
//
// Sólo un 200 o un 304: un error con `immutable` quedaría un año en el navegador de quien lo recibió.
//
// La otra mitad vive en Cloudflare: una Cache Rule sobre `/_i18n/` (un .json no se guarda en el
// borde por extensión). Sin ella esto sólo ahorra el pedido a quien vuelve; con ella, también a
// quien llega por primera vez, que es el 80 % de las sesiones.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('beforeResponse', event => {
    if (event.method !== 'GET' && event.method !== 'HEAD') return
    if (!versionedMessagesLocale(event.path || '')) return
    const status = event.node.res.statusCode
    if (status !== 200 && status !== 304) return
    event.node.res.setHeader('cache-control', I18N_MESSAGES_CACHE_CONTROL)
  })
})
