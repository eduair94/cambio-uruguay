const OG_IMAGE_PATH = /^\/__og-image__\/(image|static)(\/.*)?\/og\.(png|jpe?g|svg|html|json)$/

/**
 * Where the social image of a redirected page lives: the destination page's own image.
 *
 * `requestPath` is the OG image request (`/__og-image__/image/<page>/og.png?…`) and `location` the
 * `Location` the page answered with. Only a same-site path is followed — relative, or absolute on
 * cambio-uruguay.com — never another host, never another OG URL and never the same page again, so
 * a hostile or looping `Location` degrades to "no image" (`null`) instead of an open redirect.
 */
export function ogImageRedirectTarget(
  requestPath: string,
  location: string | null | undefined
): string | null {
  const [path = '', search = ''] = String(requestPath || '').split(/\?(.*)/s)
  const match = path.match(OG_IMAGE_PATH)
  if (!match || typeof location !== 'string' || !location.trim()) return null
  let target: URL
  try {
    target = new URL(location, 'https://cambio-uruguay.com')
  } catch {
    return null
  }
  if (
    !/^https?:$/.test(target.protocol) ||
    !/^(?:www\.)?cambio-uruguay\.com$/.test(target.hostname)
  )
    return null
  const page = target.pathname.replace(/\/+$/, '') || '/'
  const source = (match[2] || '/').replace(/\/+$/, '') || '/'
  if (page === source || page.startsWith('/__') || /[\s\\]/.test(page)) return null
  const imagePath = `/__og-image__/${match[1]}${page === '/' ? '' : page}/og.${match[3]}`
  return search ? `${imagePath}?${search}` : imagePath
}

/**
 * Network failures of an outbound request, as Node's fetch (undici) and DNS name them. The render
 * reaches outside the box for emoji: nuxt-og-image 5 swaps every emoji in the card's text for an
 * SVG from api.iconify.design (`retry: 3`, no timeout, not caught). A car advert titled
 * "Hyundai Hb20 ... 🛑 Crédito" answered 500 when that host timed out (Sentry
 * CAMBIO-URUGUAY-BACKEND-18, `og_source: 200`, `error_code: ETIMEDOUT`).
 */
const NETWORK_FAILURE_CODES: ReadonlySet<string> = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
])

/** The network code anywhere in the error's cause chain, or `null` when it is not one. */
export function ogImageNetworkFailure(error: unknown): string | null {
  const seen = new Set<unknown>()
  let current = error
  for (let depth = 0; depth < 6 && current && typeof current === 'object'; depth += 1) {
    if (seen.has(current)) return null
    seen.add(current)
    const candidate = current as { code?: unknown; cause?: unknown }
    if (typeof candidate.code === 'string' && NETWORK_FAILURE_CODES.has(candidate.code))
      return candidate.code
    current = candidate.cause
  }
  return null
}

/**
 * The site's static card for a social image that could not be drawn: the autos one for car
 * adverts (the same file their route rule names), the general one everywhere else. Only bitmap
 * requests get one; `null` for svg/html/json, which are debugging views, not cards.
 */
export function ogImageFallbackPath(requestPath: string): string | null {
  const [path = ''] = String(requestPath || '').split('?')
  const match = path.match(OG_IMAGE_PATH)
  if (!match || !['png', 'jpg', 'jpeg'].includes(match[3] ?? '')) return null
  return /^(?:\/(?:en|pt))?\/autos-usados-uruguay\//.test(match[2] || '')
    ? '/img/og-autos.png'
    : '/img/og.png'
}
