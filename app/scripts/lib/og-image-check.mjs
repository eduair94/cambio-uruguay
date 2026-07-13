// Pure helpers for checking OG images render correctly, extracted from the
// CLI script so they're independently unit-testable without a network call.

export const MIN_OG_IMAGE_BYTES = 1000

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
