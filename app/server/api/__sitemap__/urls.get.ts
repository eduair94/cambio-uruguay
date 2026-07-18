import { convertSlugs } from '../../../utils/convert'
import { listCurrencySlugs } from '../../../utils/currencyPages'
import { glossarySlugs } from '../../../utils/glossary'
import { hubSlugs } from '../../../utils/guideHubs'
import { guideSlugs } from '../../../utils/guides'
import { listIndicatorSlugs } from '../../../utils/indicators'
import { NAV_SECTIONS, UNLISTED_ROUTES } from '../../../utils/siteNav'
import { toolSlugs } from '../../../utils/tools'
import { listPosts } from '../../utils/blog'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

const LOCALES = ['es', 'en', 'pt']
const DEFAULT_LOCALE = 'es'

/**
 * Only submit per-casa currency-history pages for currencies with real search
 * demand. Exotic pairs (gold, minor currencies × 36 casas) were pure index
 * bloat — Google discovered but never indexed them, diluting crawl budget. The
 * all-currency hub lives at /cotizacion/:moneda instead.
 */
const SITEMAP_CURRENCIES = new Set(['USD', 'EUR', 'BRL', 'ARS'])

/**
 * Build the sitemap URL set.
 *
 * The static backbone — every navigation route plus every catalogue slug — is
 * assembled from `siteNav.ts` and the pure catalogues with no I/O, and is
 * emitted whether or not the upstream API answers. Only the data-derived slices
 * (per-casa history, sucursales, departments) depend on the API, so an outage
 * costs those routes rather than the entire sitemap. This handler used to be one
 * big try/catch that returned `[]` whenever api.cambio-uruguay.com hiccuped.
 *
 * Deriving the backbone from the navigation model also means a page can no
 * longer be added to the site and forgotten here: /por-que-sube-el-dolar,
 * /dolar/records, /casa-de-cambio-cerca-de-mi and /newsletter were all missing
 * from the hand-written list this replaces.
 */
export default defineEventHandler(async _event => {
  const urls: SitemapUrl[] = []

  // Today (UTC) as the lastmod for live/dynamic pages whose data refreshes daily
  // or faster — a freshness hint that helps crawlers (and AI) prioritise re-crawl.
  const today = new Date().toISOString()

  const addUrlsForAllLocales = (
    path: string,
    priority: number,
    changefreq: string = 'daily',
    lastmod?: string
  ) => {
    LOCALES.forEach(locale => {
      const loc = locale === DEFAULT_LOCALE ? path : `/${locale}${path}`
      urls.push({ loc, changefreq, priority, ...(lastmod ? { lastmod } : {}) })
    })
  }

  // --- Static backbone: the navigation model is the source of truth ----------
  // /estado carries `sitemapExclude` (ops dashboard, not search content), while
  // /offline, /widget and /cuenta are absent from the model entirely (noindex).
  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      if (!entry.to || entry.sitemapExclude) continue
      addUrlsForAllLocales(
        entry.to,
        entry.priority ?? 0.6,
        entry.changefreq ?? 'weekly',
        entry.fresh ? today : undefined
      )
    }
  }

  // Indexable pages that belong in no menu (the /buscar landing).
  for (const route of UNLISTED_ROUTES) {
    addUrlsForAllLocales(route.to, route.priority, route.changefreq)
  }

  // --- Catalogue long tail: pure data, no I/O -------------------------------
  guideSlugs().forEach(slug => addUrlsForAllLocales(`/guias/${slug}`, 0.7, 'weekly'))
  hubSlugs().forEach(slug => addUrlsForAllLocales(`/temas/${slug}`, 0.7, 'weekly'))
  toolSlugs().forEach(slug => addUrlsForAllLocales(`/herramientas/${slug}`, 0.7, 'weekly'))
  glossarySlugs().forEach(slug => addUrlsForAllLocales(`/glosario/${slug}`, 0.6, 'monthly'))
  convertSlugs().forEach(slug => addUrlsForAllLocales(`/convertir/${slug}`, 0.6, 'weekly'))
  listIndicatorSlugs().forEach(slug =>
    addUrlsForAllLocales(`/indicadores/${slug}`, 0.7, 'daily', today)
  )

  // /cotizacion/:moneda — the four majors trade heavily (hourly); the rest (gold,
  // thin regional currencies) move daily at most, so don't over-promise freshness.
  const currencySlugs = listCurrencySlugs()
  const majorCurrencySlugs = new Set(['dolar', 'euro', 'real', 'peso-argentino'])
  currencySlugs.forEach(slug => {
    const isMajor = majorCurrencySlugs.has(slug)
    addUrlsForAllLocales(
      `/cotizacion/${slug}`,
      isMajor ? 0.8 : 0.7,
      isMajor ? 'hourly' : 'daily',
      today
    )
  })

  const staticCount = urls.length

  // --- Blog posts: server filesystem, independently fallible ----------------
  // Default locale only — posts are Spanish-only, so we avoid duplicate-content
  // URLs across locales.
  try {
    const posts = await listPosts()
    posts.forEach(post => {
      urls.push({
        loc: `/blog/${post.slug}`,
        lastmod: post.createdAt,
        changefreq: 'monthly',
        priority: 0.6,
      })
    })
  } catch (blogError) {
    console.warn('Failed to add blog posts to sitemap:', blogError)
  }

  // --- API-derived routes: best effort --------------------------------------
  try {
    const response = await $fetch('https://api.cambio-uruguay.com')
    const data = response as Array<{ origin?: string; code?: string; type?: string }>

    let localData: Record<string, { departments?: string[] }> = {}
    try {
      localData = (await $fetch('https://api.cambio-uruguay.com/localData')) as typeof localData
    } catch (localDataError) {
      console.warn('Failed to fetch localData for sucursales routes:', localDataError)
      // Continue without sucursales routes if localData fails
    }

    const origins = new Set<string>()
    const originCurrencyPairs = new Set<string>()
    const originTypePairs = new Set<string>()

    data.forEach(item => {
      if (!item.origin) return
      origins.add(item.origin)
      if (item.code && SITEMAP_CURRENCIES.has(item.code.toUpperCase())) {
        originCurrencyPairs.add(`${item.origin}/${item.code}`)
      }
      if (item.type && item.type.trim() !== '') {
        originTypePairs.add(`${item.origin}/${item.type}`)
      }
    })

    const sucursalesOrigins = new Set<string>()
    const sucursalesLocationPairs = new Set<string>()

    // Department slugs for the programmatic /dolar/:departamento pages. Built from
    // the union of all houses' departments, slugified the same way the page does
    // (lowercase, accent-stripped, spaces -> hyphens) so the routes resolve.
    const departmentSlugs = new Set<string>()
    const slugifyDepartment = (name: string): string =>
      name
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    Object.entries(localData).forEach(([origin, house]) => {
      sucursalesOrigins.add(origin)
      house.departments?.forEach(department => {
        // Pass the raw department — the sitemap serializer URL-encodes the loc
        // once. Pre-encoding here produced double-encoded URLs in the sitemap
        // (e.g. "TREINTA%2520Y%2520TRES"), which Google never indexed.
        sucursalesLocationPairs.add(`${origin}/${department}`)
        const deptSlug = slugifyDepartment(department)
        if (deptSlug) departmentSlugs.add(deptSlug)
      })
    })

    origins.forEach(origin => addUrlsForAllLocales(`/historico/${origin}`, 0.8, 'daily', today))
    originCurrencyPairs.forEach(pair =>
      addUrlsForAllLocales(`/historico/${pair}`, 0.7, 'daily', today)
    )
    originTypePairs.forEach(pair => addUrlsForAllLocales(`/historico/${pair}`, 0.7, 'daily', today))
    sucursalesOrigins.forEach(origin => addUrlsForAllLocales(`/sucursales/${origin}`, 0.8))
    sucursalesLocationPairs.forEach(pair => addUrlsForAllLocales(`/sucursales/${pair}`, 0.7))
    departmentSlugs.forEach(slug => addUrlsForAllLocales(`/dolar/${slug}`, 0.7, 'daily', today))
    // /casa/:origin origins come from localData keys, same source as sucursales.
    sucursalesOrigins.forEach(origin =>
      addUrlsForAllLocales(`/casa/${origin}`, 0.7, 'daily', today)
    )

    console.log(
      `Generated ${urls.length} sitemap URLs:`,
      `\n- Static + catalogue: ${staticCount} URLs`,
      `\n- Historico origins: ${origins.size} routes`,
      `\n- Historico currency pairs: ${originCurrencyPairs.size} routes`,
      `\n- Historico type pairs: ${originTypePairs.size} routes`,
      `\n- Sucursales origins: ${sucursalesOrigins.size} routes`,
      `\n- Sucursales location pairs: ${sucursalesLocationPairs.size} routes`,
      `\n- Dolar department pages: ${departmentSlugs.size} routes`,
      `\n- Cotizacion currency pages: ${currencySlugs.length} routes`,
      `\n- Casa pages: ${sucursalesOrigins.size} routes`,
      `\n- Total across ${LOCALES.length} locales: ${urls.length} URLs`
    )
  } catch (error) {
    console.error('Error adding API-derived sitemap URLs:', error)
    console.error(`Serving the ${urls.length} static URLs without live data.`)
  }

  return urls
})
