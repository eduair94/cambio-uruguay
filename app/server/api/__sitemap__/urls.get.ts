import type { BranchPage } from '../../../utils/branches'
import { intentsFor } from '../../../utils/casaIntents'
import { casaTypePaths } from '../../../utils/casasDirectory'
import { comparativaFamilySlugs, comparativaPaths } from '../../../utils/comparativas'
import { bankPageSlugs, categoryPageSlugs } from '../../../utils/bankosPages'
import { convertSlugs } from '../../../utils/convert'
import { listCurrencySlugs } from '../../../utils/currencyPages'
import { listFronteraSlugs } from '../../../utils/frontera'
import { glossarySlugs } from '../../../utils/glossary'
import { importCategoryIndexSlugs } from '../../../utils/importCategoryIndex'
import { hubSlugs } from '../../../utils/guideHubs'
import { guideSlugs } from '../../../utils/guides'
import { listIndicatorSlugs } from '../../../utils/indicators'
import { NAV_SECTIONS, UNLISTED_ROUTES } from '../../../utils/siteNav'
import { toolSlugs } from '../../../utils/tools'
import { videoTopicSlugs } from '../../../utils/videoTopics'
import { ChairCatalogProductModel } from '../../models/ChairCatalogProduct'
import { listPosts } from '../../utils/blog'
import { listIssueDates } from '../../utils/newsletterArchive'
import { connectDb, disconnectDbAfterPrerender } from '../../utils/db'

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
  importCategoryIndexSlugs().forEach(slug =>
    addUrlsForAllLocales(`/importar/${slug}`, 0.7, 'monthly')
  )
  hubSlugs().forEach(slug => addUrlsForAllLocales(`/temas/${slug}`, 0.7, 'weekly'))
  // Video topic pages. Priority 0.7 and `daily`, like the hub: the list under each one is rebuilt
  // every six hours. All of them are submitted, including a topic that happens to have no videos
  // right now — the URL is stable and carries its own editorial copy, and dropping it from the
  // sitemap on a quiet week is how a page loses the position it took months to earn.
  videoTopicSlugs().forEach(slug =>
    addUrlsForAllLocales(`/videos-de-economia-uruguay/${slug}`, 0.7, 'daily')
  )
  // Descuentos por emisor y por rubro. Español solamente, como las comparativas: el cuerpo es
  // prosa en español sobre comercios uruguayos, y tres locales serían tres URLs del mismo texto.
  // Se emiten SIEMPRE, aunque el proveedor esté caído: los slugs son catálogo puro y una página
  // que se cae del sitemap en una semana floja pierde la posición que tardó meses en ganar.
  bankPageSlugs().forEach(slug =>
    urls.push({
      loc: `/descuentos-con-tarjeta-uruguay/${slug}`,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: today,
    })
  )
  categoryPageSlugs().forEach(slug =>
    urls.push({
      loc: `/descuentos-con-tarjeta-uruguay/rubro/${slug}`,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: today,
    })
  )
  toolSlugs().forEach(slug => addUrlsForAllLocales(`/herramientas/${slug}`, 0.7, 'weekly'))
  glossarySlugs().forEach(slug => addUrlsForAllLocales(`/glosario/${slug}`, 0.6, 'monthly'))
  // Head-to-head pages: pure catalogue data, so they survive an upstream outage
  // like the rest of this block. Spanish only — the comparison prose is written
  // in Spanish and generated from Spanish catalogue copy.
  comparativaFamilySlugs().forEach(slug =>
    urls.push({ loc: `/comparativas/${slug}`, changefreq: 'monthly', priority: 0.6 })
  )
  comparativaPaths().forEach(path => urls.push({ loc: path, changefreq: 'monthly', priority: 0.6 }))
  convertSlugs().forEach(slug => addUrlsForAllLocales(`/convertir/${slug}`, 0.6, 'weekly'))
  // Curated border-department pages (real/peso argentino at the frontier). A
  // hand-picked allowlist, so — unlike the per-casa history — it is emitted from
  // pure data and survives an upstream outage. Frontier rates move daily.
  listFronteraSlugs().forEach(slug =>
    addUrlsForAllLocales(`/frontera/${slug}`, 0.7, 'daily', today)
  )
  listIndicatorSlugs().forEach(slug =>
    addUrlsForAllLocales(`/indicadores/${slug}`, 0.7, 'daily', today)
  )
  // The directory sliced by institution kind (casas / bancos / fintech). A
  // three-entry allowlist from pure data, so it survives an upstream outage.
  casaTypePaths().forEach(path => addUrlsForAllLocales(path, 0.7, 'daily', today))

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

  // --- Newsletter issues: server filesystem, independently fallible ---------
  // One archived issue per day. Spanish-only, same reasoning as the blog above.
  //
  // `listIssueDates()` reads storage KEYS, not issue bodies, so a year of
  // issues costs one directory listing rather than 365 JSON parses on every
  // sitemap rebuild. `lastmod` is the issue's own date: an archived day is a
  // permanent record and never changes after it is written, and claiming
  // otherwise would ask crawlers to re-fetch a static page forever.
  try {
    const dates = await listIssueDates()
    dates.forEach(date => {
      urls.push({
        loc: `/newsletter/${date}`,
        lastmod: `${date}T12:00:00-03:00`,
        changefreq: 'yearly',
        priority: 0.6,
      })
    })
  } catch (issueError) {
    console.warn('Failed to add newsletter issues to sitemap:', issueError)
  }

  // --- Desk-chair pages: Mongo-derived, independently fallible --------------
  // One URL per chair currently on sale. Chairs whose offers stopped appearing
  // are excluded by the same `lastSeen` window the directory uses, so the
  // sitemap never advertises a page that says "sin ofertas".
  try {
    await connectDb()
    const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
    const chairs = await ChairCatalogProductModel.find({ lastSeen: { $gte: cutoff } })
      .select({ slug: 1, lastSeen: 1 })
      .lean()
    chairs.forEach(chair => {
      addUrlsForAllLocales(
        `/sillas-escritorio-uruguay/${chair.slug}`,
        0.6,
        'weekly',
        chair.lastSeen
      )
    })
  } catch (chairError) {
    console.warn('Failed to add chair pages to sitemap:', chairError)
  } finally {
    // The sitemap is prerendered: leaving the pool open hangs `nuxt build`.
    await disconnectDbAfterPrerender()
  }

  // --- Per-branch pages: BCU feed, independently fallible -------------------
  // One URL per physical counter. Default locale only: the body (address, hours,
  // "cómo llegar") is Spanish prose about a Uruguayan street, so three locales
  // would be three URLs of the same content, same reasoning as the blog above.
  //
  // The slugs come from the SAME cached `/api/branches` route the pages and the
  // directory read, so the sitemap can never advertise a slug the page 404s.
  try {
    const directory = await $fetch<{
      branches: BranchPage[]
      casas: Record<string, { bcu?: string }>
      quotesUsd?: string[]
      quotes?: Record<string, string[]>
    }>('/api/branches')
    const branches = directory?.branches ?? []
    branches.forEach(branch => {
      urls.push({
        loc: `/sucursal/${branch.slug}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: today,
      })
    })
    if (branches.length) console.log(`- Branch pages: ${branches.length} routes`)

    // Per-casa intent pages, gated by the SAME availability rule the route guard
    // uses. Submitting `/casa/x/telefono` for a casa with no published phone
    // would be submitting a guaranteed 404.
    const quotesUsd = new Set(directory?.quotesUsd ?? [])
    let intentCount = 0
    for (const [origin, casa] of Object.entries(directory?.casas ?? {})) {
      const own = branches.filter(branch => branch.origin === origin)
      const intents = intentsFor({
        branches: own,
        quotesUsd: quotesUsd.has(origin),
        hasBcu: Boolean(casa?.bcu),
        // The sitemap has no review store; `hasBcu`/branches already cover the
        // opiniones gate, and a rating can only widen it.
        hasRating: false,
        quotedCurrencies: directory?.quotes?.[origin] ?? [],
      })
      for (const intent of intents) {
        urls.push({
          loc: `/casa/${origin}/${intent}`,
          changefreq: 'daily',
          priority: 0.7,
          lastmod: today,
        })
        intentCount++
      }
    }
    if (intentCount) console.log(`- Casa intent pages: ${intentCount} routes`)
  } catch (branchError) {
    console.warn('Failed to add branch pages to sitemap:', branchError)
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
