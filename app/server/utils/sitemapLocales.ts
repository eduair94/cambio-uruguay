import { isLocalizedRoute, splitLocalePath } from '../../utils/localizedRoutes'

type Alternative = { hreflang: string; href: string }
type SitemapInput = string | { loc?: string; alternatives?: Alternative[]; [key: string]: unknown }

const pathOf = (loc: string) => {
  try {
    return /^https?:\/\//.test(loc) ? new URL(loc).pathname : loc
  } catch {
    return loc
  }
}

/**
 * Drop the /en and /pt variants of Spanish-only routes, and the hreflang alternates that point to
 * them. Those pages render, but their canonical is the Spanish URL: listing them told crawlers
 * that 836 non-canonical URLs per language were pages of their own (Bing: "important pages" and
 * "not canonical" at the same time). Localized routes keep all three languages untouched.
 */
export function keepCanonicalLocales<T extends SitemapInput>(urls: T[]): T[] {
  const kept: T[] = []
  for (const entry of urls) {
    const loc = typeof entry === 'string' ? entry : entry.loc
    if (typeof loc !== 'string') {
      kept.push(entry)
      continue
    }
    const { locale, path } = splitLocalePath(pathOf(loc))
    if (isLocalizedRoute(path)) {
      kept.push(entry)
      continue
    }
    if (locale !== 'es') continue
    if (typeof entry === 'string' || !entry.alternatives) {
      kept.push(entry)
      continue
    }
    const alternatives = entry.alternatives.filter(
      alternative => splitLocalePath(pathOf(alternative.href)).locale === 'es'
    )
    kept.push({ ...entry, alternatives } as T)
  }
  return kept
}
