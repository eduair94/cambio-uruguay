// Routes that must stay free of third-party scripts.
//
// Two pages deliberately render without site chrome, and both have a reason to
// load nothing from another origin:
//   /widget  — an embeddable iframe. A chat bubble or a session recorder
//              injected into somebody else's page is not ours to add.
//   /pizarra — the zero-friction board. Its whole value is that it paints
//              instantly and asks nothing of the reader; no analytics, no chat,
//              and therefore no cookie banner to dismiss.
//
// PURE (no Vue/Nuxt imports) so plugins and tests can both use it.

/** Path prefixes, locale-prefixed variants included (`/en/pizarra`). */
const BARE_PATHS = ['/widget', '/pizarra'] as const

/** Locale prefixes the router can put in front of a path. */
const LOCALE_PREFIXES = ['/en', '/pt'] as const

/**
 * True when `path` is a chrome-free route that must not load third-party
 * scripts. Matches the plain path and its locale-prefixed variants, with or
 * without a trailing slash or query string.
 */
export function isBareRoute(path: string): boolean {
  const clean = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
  return BARE_PATHS.some(
    bare => clean === bare || LOCALE_PREFIXES.some(prefix => clean === `${prefix}${bare}`)
  )
}
