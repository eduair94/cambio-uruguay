// The SEO contract for programmatic page families.
//
// Adding a thousand URLs is only worth anything if each one can actually be
// indexed, so the requirements stop being a checklist somebody remembers and
// become a test: every page in a programmatic family must declare its title and
// description, point at a canonical URL, ship structured data, and be emitted by
// the sitemap route under a path the router can actually resolve.
//
// Two layers:
//
//  1. A HARD contract for the families listed in `PROGRAMMATIC_PAGES`. These are
//     the high-volume ones; a gap here is multiplied by hundreds of URLs.
//  2. A RATCHET for everything else. The site predates this contract and 19
//     pages still have no `useSeoMeta`; failing on those would just mean
//     deleting the test. Instead the counts may only ever go DOWN — a new page
//     that skips its meta turns CI red, and fixing a legacy one tightens the
//     bound for good.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import { DYNAMIC_ROUTE_KEYS } from '../../utils/siteNav'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')
const SITEMAP = readFileSync(
  join(__dirname, '..', '..', 'server', 'api', '__sitemap__', 'urls.get.ts'),
  'utf8'
)

function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    if (!name.endsWith('.vue')) return []
    return [relative(PAGES_DIR, full).split(sep).join('/')]
  })
}

const files = pageFiles()
const read = (file: string) => readFileSync(join(PAGES_DIR, file), 'utf8')

/**
 * The programmatic families, with the sitemap fragment that must emit them.
 *
 * `sitemapMarker` is deliberately the literal path template rather than the name
 * of a helper: what must be true is that the sitemap builds THIS url shape, and
 * a marker that tracked a function name would still pass if the template drifted.
 */
const PROGRAMMATIC_PAGES: Array<{ file: string; sitemapMarker: string }> = [
  { file: 'sucursal/index.vue', sitemapMarker: '/sucursal' },
  { file: 'sucursal/[slug].vue', sitemapMarker: '`/sucursal/${branch.slug}`' },
  { file: 'casa/[origin]/[intent].vue', sitemapMarker: '`/casa/${origin}/${intent}`' },
  { file: 'comparativas/index.vue', sitemapMarker: '/comparativas' },
  { file: 'comparativas/[familia]/index.vue', sitemapMarker: '`/comparativas/${slug}`' },
  { file: 'comparativas/[familia]/[par].vue', sitemapMarker: 'comparativaPaths()' },
]

describe('the programmatic families exist on disk', () => {
  it('finds every page the contract covers', () => {
    for (const page of PROGRAMMATIC_PAGES) expect(files).toContain(page.file)
  })
})

describe('every programmatic page declares its own SEO', () => {
  it.each(PROGRAMMATIC_PAGES.map(page => page.file))('%s sets title and description', file => {
    const source = read(file)
    expect(source).toMatch(/useSeoMeta\s*\(/)
    // Both are required: a page with a title and no description hands Google a
    // snippet scraped from whatever markup came first. `[,:]` because a page
    // with `const description = ...` passes it as an object shorthand.
    expect(source).toMatch(/\btitle[,:]/)
    expect(source).toMatch(/\bdescription[,:]/)
    expect(source).toMatch(/ogTitle:/)
    expect(source).toMatch(/ogDescription:/)
  })

  it.each(PROGRAMMATIC_PAGES.map(page => page.file))('%s declares a canonical URL', file => {
    const source = read(file)
    expect(source).toMatch(/rel:\s*'canonical'/)
    // Absolute, on our own host — a relative canonical is ignored by Google.
    expect(source).toMatch(/https:\/\/cambio-uruguay\.com/)
  })

  it.each(PROGRAMMATIC_PAGES.map(page => page.file))('%s ships structured data', file => {
    const source = read(file)
    expect(source).toContain('application/ld+json')
    expect(source).toContain('https://schema.org')
    // Every one of these pages sits at least two levels deep, so the crawler
    // needs the trail to know where it belongs.
    expect(source).toContain('BreadcrumbList')
  })

  it.each(PROGRAMMATIC_PAGES.map(page => page.file))('%s renders a single H1', file => {
    const template = read(file).split('<script setup')[0] ?? ''
    const h1s = template.match(/<h1[\s>]/g) ?? []
    expect(h1s).toHaveLength(1)
  })

  it.each(PROGRAMMATIC_PAGES.map(page => page.file))('%s is never noindexed', file => {
    const source = read(file)
    expect(source).not.toMatch(/noindex/i)
    expect(source).not.toMatch(/robots:\s*['"]none/i)
  })

  it.each(PROGRAMMATIC_PAGES)('$file is emitted by the sitemap route', ({ sitemapMarker }) => {
    expect(SITEMAP).toContain(sitemapMarker)
  })
})

describe('the dynamic families the sitemap submits are routable', () => {
  // The failure this prevents: submitting `/casa/x/euro` while the page file
  // that resolves it was renamed or deleted, so every URL in the sitemap 404s.
  it('has a page file behind every declared dynamic route key', () => {
    const keys = new Set(files.filter(file => file.includes('[')).map(f => f.replace(/\.vue$/, '')))
    for (const key of Object.keys(DYNAMIC_ROUTE_KEYS)) expect(keys.has(key)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The ratchet
// ---------------------------------------------------------------------------

/**
 * Pages predating this contract, by signal. These numbers may only ever go DOWN.
 *
 * If you are here because CI failed: you either added a page without its SEO
 * declarations (fix the page), or you fixed a legacy one (lower the number).
 *
 * These counts are grep over page files, so they read a page that DELEGATES its
 * SEO as a page that has none. Two shells declare the full set on their
 * children's behalf — `ToolShell` (every `herramientas/calculadora-*`, driven by
 * `utils/tools.ts`) and `CasasComparativa` (both `casas-de-cambio/*`) — and the
 * `$seo.setupPageSEO` plugin does the same for a handful more. Between them they
 * account for all 19 of the `seoMeta` count, which is why that number has not
 * moved: there is nothing left under it to fix. Spend the effort on `canonical`
 * and `structuredData`, where the remaining entries are real gaps.
 */
const LEGACY_BUDGET = { seoMeta: 19, canonical: 26, structuredData: 33 }

function missing(predicate: (source: string) => boolean): string[] {
  return files.filter(file => predicate(read(file))).sort()
}

describe('the legacy SEO debt only shrinks', () => {
  it(`has at most ${LEGACY_BUDGET.seoMeta} pages with no useSeoMeta`, () => {
    const offenders = missing(source => !/useSeoMeta\s*\(/.test(source))
    expect(offenders.length).toBeLessThanOrEqual(LEGACY_BUDGET.seoMeta)
  })

  it(`has at most ${LEGACY_BUDGET.canonical} pages with no canonical link`, () => {
    const offenders = missing(source => !/rel:\s*'canonical'/.test(source))
    expect(offenders.length).toBeLessThanOrEqual(LEGACY_BUDGET.canonical)
  })

  it(`has at most ${LEGACY_BUDGET.structuredData} pages with no JSON-LD`, () => {
    const offenders = missing(source => !source.includes('application/ld+json'))
    expect(offenders.length).toBeLessThanOrEqual(LEGACY_BUDGET.structuredData)
  })

  // Opting out of indexing is always a deliberate act, and every one of these
  // has a reason: the PWA fallback and the embeddable widget are not content,
  // the account area is private, the ops dashboard is not for readers, a search
  // result page with a query is infinite and thin, and page 2+ of the newsletter
  // archive would compete with page 1. Anything ELSE carrying `noindex` has
  // silently removed itself from search — which is the accident this catches.
  it('noindexes only the pages meant to be invisible', () => {
    const noindexed = files.filter(file => /noindex/i.test(read(file)))
    expect(noindexed.sort()).toEqual([
      // The rental directory is INDEXABLE at its own URL; only its filtered and paginated views
      // opt out, for the same reason `buscar.vue` does — a facet combination is an infinite set of
      // thin copies of one page.
      'alquileres-uruguay.vue',
      'buscar.vue',
      'cuenta/index.vue',
      'estado.vue',
      'newsletter/archivo.vue',
      'offline.vue',
      'widget.vue',
    ])
  })
})
