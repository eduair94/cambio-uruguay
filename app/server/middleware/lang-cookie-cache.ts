import { withoutDefaultLangCookie } from '../../utils/langCookie'

// Saca el `Set-Cookie: lang=es` de las respuestas, que es lo único que le impedía a Cloudflare
// cachear la home para Googlebot y para toda primera visita. El porqué, con los números medidos,
// está en `app/utils/langCookie.ts`.
//
// POR QUÉ ASÍ Y NO CON UN HOOK. La cookie la escribe @nuxtjs/i18n DESPUÉS de este middleware,
// durante el render, así que no alcanza con borrar la cabecera acá: hay que interceptar el
// momento en que se escribe. Se envuelve `setHeader` una sola vez por respuesta y se filtra sólo
// la cabecera `set-cookie`; todo lo demás pasa tal cual, incluidas las otras cookies.
//
// POR QUÉ EN EL ORIGEN Y NO EN CLOUDFLARE: por lo mismo que `canonical-host.ts` — la configuración
// del borde no vive en el repo, y una regla que nadie puede leer en el diff es una regla que la
// próxima sesión no sabe que existe.
export default defineEventHandler(event => {
  const res = event.node?.res
  if (!res || typeof res.setHeader !== 'function') return
  if ((res as unknown as { __langCookiePatched?: boolean }).__langCookiePatched) return
  ;(res as unknown as { __langCookiePatched?: boolean }).__langCookiePatched = true

  const original = res.setHeader.bind(res)
  res.setHeader = ((name: string, value: unknown) => {
    if (String(name).toLowerCase() !== 'set-cookie') {
      return original(name, value as never)
    }
    const values = Array.isArray(value) ? value.map(String) : [String(value)]
    const kept = withoutDefaultLangCookie(values)
    // Sin cookies que mandar, poner un arreglo vacío deja la cabecera presente y vacía en algunos
    // runtimes; borrarla es lo que de verdad la saca.
    if (!kept.length) {
      res.removeHeader('set-cookie')
      return res
    }
    return original(name, (Array.isArray(value) ? kept : kept[0]) as never)
  }) as typeof res.setHeader
})
