import { defineEventHandler, sendRedirect, setResponseHeader, setResponseStatus } from 'h3'
import { spanishOgImage } from '../../utils/autoTranslate'
import { asLocation, ogImageRequestTarget } from '../../utils/ogImageGuard'

/**
 * The share-image endpoint, before nuxt-og-image sees the request.
 *
 * 1. Only the page's own card is drawn (utils/ogImageGuard.ts). The card asked with a query, or
 *    through the module's `static` prefix, gets a 301 to its clean URL, so the module never reads
 *    render input from the URL and each card is rendered and cached once instead of once per
 *    tracking parameter. Any other file or path under the rendering prefixes (the debugging views
 *    included) gets a fixed 404 that renders nothing and echoes nothing of the request. In dev the
 *    guard is off: the module's devtools tab asks for `og.json`/`og.html` and passes a query.
 * 2. `/__og-image__/image/<extra locale>/…` → the Spanish image, permanently: the PNG is the same
 *    byte for byte (utils/autoTranslate.ts, `spanishOgImage`), and pages no longer link the
 *    per-locale copies, but crawlers had already found thousands of them.
 *
 * h3 hands middleware the path percent-decoded, so every redirect goes out through `asLocation`:
 * a decoded character Node will not write in a header would otherwise turn the answer into a 500.
 */
export default defineEventHandler(event => {
  const path = event.path
  if (!path.startsWith('/__og-image__/')) return
  if (!import.meta.dev) {
    const target = ogImageRequestTarget(path)
    if (target?.status === 404) {
      setResponseStatus(event, 404, 'Not Found')
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      return 'Not Found'
    }
    if (target) return sendRedirect(event, target.location, 301)
  }
  if (!path.startsWith('/__og-image__/image/')) return
  const spanish = spanishOgImage(path)
  if (spanish !== path) return sendRedirect(event, asLocation(spanish), 301)
})
