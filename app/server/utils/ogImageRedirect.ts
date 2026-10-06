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
