import { spanishOgImage } from './autoTranslate'

/**
 * A share card is drawn from what its page declares, and from nothing in the URL.
 *
 * nuxt-og-image 5.1.6 writes every card URL with the page's request query appended
 * (`…/og.png?<query>&_query=…`, runtime/app/composables/defineOgImage.js, and a page cannot opt
 * out), and its endpoint lets the query of an image request override the page's own payload. So
 * every tracking parameter (a new `fbclid` per Facebook click) advertised a card URL of its own,
 * rendered from scratch together with an internal SSR of the page, and what the card showed was
 * no longer only the page's to decide.
 *
 * Two layers, without patching the module:
 * - the page never advertises a query on a card URL (`stripOgImageQuery`,
 *   plugins/01.og-image-head.ts);
 * - the endpoint renders exactly one shape of request, `/__og-image__/image/<page>/og.png` with
 *   nothing after it, and redirects or refuses everything else under its rendering prefixes
 *   (`ogImageRequestTarget`, server/middleware/og-image-locale.ts).
 *
 * No card of the site reads the query (none of the defineOgImage* calls does), so there is no
 * allow-list. A card that ever needs a value from the URL carries it in the path, in both layers.
 */

/** The meta tags that carry the share image URL. */
export const OG_IMAGE_META: ReadonlySet<string> = new Set([
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'twitter:image',
  'twitter:image:src',
])

/** `url` up to its query or fragment, and the index where that part starts (-1: none). */
function splitAtQuery(url: string): [string, number] {
  const at = url.search(/[?#]/)
  return [at === -1 ? url : url.slice(0, at), at]
}

/**
 * `url` without its query and fragment when it points at the site's card endpoint; any other URL
 * (a portal photo, a static card with a cache-busting `?v=`) exactly as it came. Idempotent.
 */
export function stripOgImageQuery(url: string): string {
  const [base, at] = splitAtQuery(url)
  return at !== -1 && base.includes('/__og-image__/') ? base : url
}

/** The two prefixes nuxt-og-image draws from; `static` is its prerender flavor, same handler. */
const RENDER_PREFIX = /^\/__og-image__\/(?:image|static)(?=[/?#]|$)/
/** The page's card as a PNG: group 1 is the flavor, group 2 the page path ('' for the home). */
const CARD_PNG = /^\/__og-image__\/(image|static)((?:\/.*)?)\/og\.png$/

export type OgImageRequestTarget = { status: 301; location: string } | { status: 404 }

/**
 * What the card endpoint does with a request path (`event.path`, query included):
 * - `null`: let the module answer it. That is `/__og-image__/image/<page>/og.png` with nothing
 *   after it, and every path outside the two rendering prefixes (`/__og-image__/font/…` is the
 *   module's own font loader, which calls itself with `?font=`).
 * - a 301 to the card's clean URL: the same card asked with a query or a fragment, or through the
 *   `static` prefix. For an extra locale the location is already the Spanish card
 *   (`spanishOgImage`), so a request with both is fixed in one hop.
 * - a 404: any other file or path under those prefixes — `og.html`, `og.svg`, `og.json`,
 *   `og.jpg`… are the module's debugging views and other encodings, and no page links them.
 */
export function ogImageRequestTarget(path: string): OgImageRequestTarget | null {
  if (!RENDER_PREFIX.test(path)) return null
  const [pathname, at] = splitAtQuery(path)
  const card = CARD_PNG.exec(pathname)
  if (!card) return { status: 404 }
  if (card[1] === 'image' && at === -1) return null
  return { status: 301, location: spanishOgImage(`/__og-image__/image${card[2]}/og.png`) }
}
