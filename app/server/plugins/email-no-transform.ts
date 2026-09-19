import { hasVisibleEmail, withNoTransform } from '../utils/emailNoTransform'

// Una página que muestra un email sale con `Cache-Control: no-transform`, para que la ofuscación de
// emails de Cloudflare no le cambie el texto que Vue va a hidratar. El porqué está en
// `server/utils/emailNoTransform.ts`. Va en el origen, como `html-cache-control.ts`: una regla del
// panel del borde no aparece en ningún diff.
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (typeof response.body !== 'string' || !hasVisibleEmail(response.body)) return
    const headers = (response.headers ??= {})
    const current = headers['cache-control'] ?? event.node?.res?.getHeader('cache-control')
    headers['cache-control'] = withNoTransform(current as string | undefined)
  })
})
