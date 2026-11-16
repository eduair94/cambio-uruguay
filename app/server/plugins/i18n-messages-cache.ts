import { I18N_MESSAGES_CACHE_CONTROL, versionedMessagesLocale } from '../../utils/i18nMessagesCache'

// Los mensajes de vue-i18n, guardables para siempre. El porqué está en `utils/i18nMessagesCache.ts`
// y en `i18n/messagesVersion.ts`; acá sólo el CUÁNDO.
//
// `beforeResponse` y no `routeRules`: el manejador del módulo escribe su propio `cache-control`
// (`max-age=-1` mientras su caché interna esté apagada, y lo está a propósito — con ella prendida
// los 35 idiomas que comparten cargador se pisarían, ver `i18n/locales/extra.ts`) DESPUÉS de que
// corren las reglas de ruta. Este gancho es el último que toca la respuesta.
//
// Sólo un 200: un error con `immutable` quedaría un año en el navegador de quien lo recibió.
//
// Y no hay 304: el manejador del módulo contesta un pedido condicional cerrando la respuesta él
// mismo, con su `max-age=-1`, antes de que este gancho pueda tocarla (medido sobre el build: 200 con
// `immutable`, 304 con `max-age=-1, s-maxage=-1`). Una URL que lleva el hash de su contenido no
// tiene nada que revalidar, así que el pedido entra sin sus condicionales y siempre sale el 200.
// Con el borde adelante esto pasa una vez por idioma y por versión, no por visita.
//
// La otra mitad vive en Cloudflare: una Cache Rule sobre `/_i18n/` (un .json no se guarda en el
// borde por extensión). Sin ella esto sólo ahorra el pedido a quien vuelve; con ella, también a
// quien llega por primera vez, que es el 80 % de las sesiones.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('request', event => {
    if (!versionedMessagesLocale(event.path || '')) return
    delete event.node.req.headers['if-none-match']
    delete event.node.req.headers['if-modified-since']
  })
  nitroApp.hooks.hook('beforeResponse', event => {
    if (event.method !== 'GET' && event.method !== 'HEAD') return
    if (!versionedMessagesLocale(event.path || '')) return
    if (event.node.res.statusCode !== 200) return
    event.node.res.setHeader('cache-control', I18N_MESSAGES_CACHE_CONTROL)
  })
})
