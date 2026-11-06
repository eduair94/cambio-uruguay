import { spanishOgImage } from '../../utils/autoTranslate'

/**
 * `/__og-image__/image/<extra locale>/…` → the Spanish image, permanently: the PNG is the same
 * byte for byte (utils/autoTranslate.ts, `spanishOgImage`), and pages no longer link the
 * per-locale copies, but crawlers had already found thousands of them.
 */
export default defineEventHandler(event => {
  if (!event.path.startsWith('/__og-image__/image/')) return
  const target = spanishOgImage(event.path)
  if (target !== event.path) return sendRedirect(event, target, 301)
})
