// Pure helpers for checking OG images render correctly, extracted from the
// CLI script so they're independently unit-testable without a network call.

export const MIN_OG_IMAGE_BYTES = 1000

/** Explicit page paths bypass the large dynamic sitemaps during targeted release checks. */
export function explicitOgImagePaths(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  if (value.length > 32000) throw new Error('OG_PATHS exceeds the 32000 character limit')
  const entries = value.split(',').map(path => path.trim())
  if (entries.length > 500) throw new Error('OG_PATHS accepts at most 500 paths')
  const paths = new Set()
  for (const path of entries) {
    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      /[\\\s?#]/.test(path) ||
      path.length > 2048
    ) {
      throw new Error(
        'OG_PATHS must contain comma-separated site-relative paths without queries or fragments'
      )
    }
    const parsed = new URL(path, 'https://og-check.invalid')
    if (parsed.origin !== 'https://og-check.invalid') throw new Error('Invalid OG_PATHS origin')
    paths.add(parsed.pathname)
  }
  return [...paths]
}

/** Inspect the actual published preview: property pages may use an original advert photo. */
export function pageOgImageUrl(html, pageUrl) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [
        match[1].toLowerCase(),
        (match[2] ?? match[3]).replace(
          /&(?:amp|quot|apos|lt|gt);/g,
          entity =>
            ({
              '&amp;': '&',
              '&quot;': '"',
              '&apos;': "'",
              '&lt;': '<',
              '&gt;': '>',
            })[entity]
        ),
      ])
    )
    if ((attributes.property || attributes.name)?.toLowerCase() !== 'og:image') continue
    if (!attributes.content?.trim()) return null
    try {
      const url = new URL(attributes.content, pageUrl)
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
      return url.href
    } catch {
      return null
    }
  }
  return null
}

/** Spread a bounded smoke sample over the complete route list, including dynamic details. */
export function sampleOgImagePaths(paths, limit = 60) {
  if (paths.length <= limit) return paths
  if (limit < 2) return paths.slice(0, 1)
  return Array.from(
    { length: limit },
    (_, index) => paths[Math.floor((index * (paths.length - 1)) / (limit - 1))]
  )
}

/**
 * Build the nuxt-og-image URL for a given site-relative path. The module's
 * default URL pattern is `/__og-image__/image<path>/og.png`; the root path
 * ("/") would otherwise produce a double slash.
 */
export function ogImageUrl(base, path) {
  const suffix = path === '/' ? '' : path
  return `${base}/__og-image__/image${suffix}/og.png`
}

/**
 * Reduce the sitemap's full URL list (which repeats every path once per
 * locale, e.g. "/buscar", "/en/buscar", "/pt/buscar") down to unique
 * default-locale (unprefixed) paths. The satori OG template renders the same
 * layout for all three locales from the same props, so the default locale is
 * a representative sample.
 */
export function filterDefaultLocalePaths(urls) {
  const paths = new Set()
  for (const { loc } of urls) {
    if (/^\/(?:en|pt)(?:\/|$)/.test(loc)) continue
    paths.add(loc)
  }
  return [...paths]
}

/**
 * Decide whether a fetched OG image response looks healthy, without parsing
 * the PNG itself: right status, right content-type, non-trivial size.
 */
export function evaluateOgImageResponse({ ok, status, contentType, byteLength }) {
  if (!ok) return { ok: false, reason: `HTTP ${status}` }
  if (!contentType || !contentType.startsWith('image/')) {
    return { ok: false, reason: `bad content-type: ${contentType ?? '(none)'}` }
  }
  if (byteLength < MIN_OG_IMAGE_BYTES) {
    return { ok: false, reason: `body too small: ${byteLength} bytes` }
  }
  return { ok: true }
}
