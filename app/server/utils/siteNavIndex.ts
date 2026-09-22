/**
 * "Which page of the site is this?" — the navigation half of /api/site/search and all of
 * /api/site/sections, built from the same corpus and scorer as the header search and /buscar
 * (`buildSearchIndex` + `scoreDocs`), so the AI and a visitor typing in the search box land on the
 * same pages. Spanish only: it is the site's default language and the one its pages are indexed in.
 */
import es from '../../i18n/locales/json/es.json'
import { buildSearchIndex } from '../../utils/searchIndex'
import { NAV_SECTIONS, fold, scoreDocs, type SearchDoc, type SearchType } from '../../utils/siteNav'

export const SITE_ORIGIN = 'https://cambio-uruguay.com'

export interface SiteNavHit {
  title: string
  description: string
  type: SearchType
  section: string
  path: string
  url: string
}

export interface SiteNavSection {
  id: string
  title: string
  pages: Array<{ title: string; path: string; url: string }>
}

/**
 * A server-side `t()` over the Spanish messages: dotted keys, `{name}` parameters, `{'x'}` literal
 * escapes, and the first form of a `a | b` plural. A missing key comes back as the key, as in
 * vue-i18n.
 */
export function siteNavT(key: string, params: Record<string, unknown> = {}): string {
  let node: unknown = es
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return key
    node = (node as Record<string, unknown>)[part]
  }
  if (typeof node !== 'string') return key
  const [first = ''] = node.split(/\s\|\s/)
  return first
    .replace(/\{'([^']*)'\}/g, '$1')
    .replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
    .trim()
}

let docs: SearchDoc[] | null = null
/** Built once per process: it is static, derived from code. */
export function siteNavDocs(): SearchDoc[] {
  docs ??= buildSearchIndex({ locale: 'es', t: siteNavT, themeMode: 'dark' })
  return docs
}

const sectionTitles = new Map(NAV_SECTIONS.map(section => [section.id, section.titleKey]))
/** Index pages: a place to send someone only when that is what they asked for ("guías"). */
const HUBS = new Set([
  '/guias',
  '/temas',
  '/herramientas',
  '/glosario',
  '/mapa-del-sitio',
  '/buscar',
])

export function searchSiteNav(query: string, limit = 8): SiteNavHit[] {
  const hits: SiteNavHit[] = []
  const seen = new Set<string>()
  const scored = scoreDocs(query, siteNavDocs())
  // A question matches a hub ("Guías", "Temas") on one loose word; past half the best score a
  // result is that kind of noise, not a page to send someone to.
  const floor = (scored[0]?.score ?? 0) * 0.5
  for (const { doc, score } of scored) {
    if (score < floor) break
    // Quick actions (theme, language) and external links are not places on the site.
    if (!doc.to || doc.action || seen.has(doc.to)) continue
    if (HUBS.has(doc.to) && !fold(query).includes(fold(doc.title))) continue
    seen.add(doc.to)
    const titleKey = sectionTitles.get(doc.section)
    hits.push({
      title: doc.title,
      description: doc.description,
      type: doc.type,
      section: titleKey ? siteNavT(titleKey) : doc.section,
      path: doc.to,
      url: `${SITE_ORIGIN}${doc.to === '/' ? '' : doc.to}`,
    })
    if (hits.length >= limit) break
  }
  return hits
}

export function siteNavSections(): SiteNavSection[] {
  return NAV_SECTIONS.map(section => ({
    id: section.id,
    title: siteNavT(section.titleKey),
    pages: section.entries
      .filter(entry => entry.to && !entry.sitemapExclude)
      .map(entry => ({
        title: siteNavT(entry.labelKey),
        path: entry.to!,
        url: `${SITE_ORIGIN}${entry.to === '/' ? '' : entry.to}`,
      })),
  }))
}
