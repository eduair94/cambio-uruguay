import { anyMessagesLocale, currentMessagesPath } from '../../../utils/i18nMessagesCache'

// La red de los mensajes de una versión que ya no existe.
//
// La ruta de mensajes lleva la versión de su contenido (`i18n/messagesVersion.ts`). Un HTML que el
// borde todavía guarda de antes del deploy nombra la versión ANTERIOR, que este proceso ya no
// registra: sin esto ese pedido cae en el render de páginas, vuelve un 404 en HTML, el cliente se
// queda sin mensajes y pinta las claves crudas. Se lo manda a la versión vigente — un superconjunto
// de las claves que ese bundle conoce, salvo las que se borraron en el medio.
//
// Esta ruta comodín sólo recibe lo que la ruta del módulo (más específica) no tomó. `no-store`: el
// destino cambia en cada deploy.
export default defineEventHandler(event => {
  const locale = anyMessagesLocale(event.path || '')
  const version = String(useRuntimeConfig(event).i18nMessagesVersion || '')
  setResponseHeader(event, 'cache-control', 'no-store')
  const target = locale && version ? currentMessagesPath(version, locale) : ''
  // Ya ES la versión vigente y nadie la atendió: redirigir de nuevo sería un bucle.
  const alreadyCurrent = !!version && (event.path || '').startsWith(`/_i18n/${version}/`)
  if (!target || alreadyCurrent || !/^[\w-]{2,12}$/.test(locale || '')) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  return sendRedirect(event, target, 302)
})
