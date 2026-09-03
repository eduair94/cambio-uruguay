import { canonicalHostRedirect } from '../../utils/canonicalHost'

// 301 de `www.` al dominio sin www.
//
// EL SITIO EXISTÍA DOS VECES. Verificado el 2026-09-03: https://www.cambio-uruguay.com/ y
// https://www.cambio-uruguay.com/casa/santander devolvían 200 sin ningún Location, o sea que todo
// el sitio se servía igual bajo los dos hosts. La etiqueta canonical estaba bien puesta y apuntaba
// al apex, y Google la ignoró igual: el archivo propio de Search Console lista NUEVE URLs bajo
// www con 695 impresiones y 6 clics, encabezadas por /casa/santander (350 impresiones, posición
// 7,3). Es decir que parte de la autoridad y de los clics del sitio estaban en un host duplicado.
//
// El canonical es una sugerencia; el 301 no. Va acá, en el origen, y no en el borde, porque es
// donde este proyecto tiene control por código: la configuración de Cloudflare no vive en el repo
// y una regla que nadie puede leer en el diff es una regla que la próxima sesión no sabe que
// existe.
export default defineEventHandler(event => {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return

  const host = getRequestHeader(event, 'host') || ''
  const target = canonicalHostRedirect(host, event.path || '/')
  if (target) return sendRedirect(event, target, 301)
})
