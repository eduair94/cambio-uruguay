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
 * Opting out of indexing is always a deliberate act, and every one of these has
 * a reason: the PWA fallback and the embeddable widget are not content, the
 * account area is private, the ops dashboard is not for readers, a search result
 * page with a query is infinite and thin, and page 2+ of the newsletter archive
 * would compete with page 1. Anything ELSE carrying `noindex` has silently
 * removed itself from search — which is the accident the last test catches.
 */
const NOINDEXED = [
  // The rental directory is INDEXABLE at its own URL; only its filtered and paginated views
  // opt out, for the same reason `buscar.vue` does — a facet combination is an infinite set of
  // thin copies of one page.
  'alquileres-uruguay.vue',
  'buscar.vue',
  'cuenta/index.vue',
  // La herramienta "¿tengo descuento acá?": la respuesta depende de la ubicación de quien la abre.
  'descuentos-con-tarjeta-uruguay/cerca-de-mi.vue',
  // The Search Console dashboard: private, gated server-side, and noindexed so a stray link can
  // never put the site's own keyword list into the index.
  'estadisticas-de-busqueda.vue',
  'estado.vue',
  'newsletter/archivo.vue',
  'offline.vue',
  'widget.vue',
]

/**
 * The two shells that declare the whole SEO set on their children's behalf:
 * `ToolShell` (every `herramientas/calculadora-*`, driven by `utils/tools.ts`)
 * and `CasasComparativa` (both `casas-de-cambio/*`). A page that mounts one of
 * them has its title, canonical and JSON-LD emitted by the shell, so grepping
 * the page file finds nothing — and that nothing means nothing.
 */
const SEO_SHELLS = ['ToolShell', 'CasasComparativa']
const SHELL_FILES = SEO_SHELLS.map(name => join(__dirname, '..', '..', 'components', `${name}.vue`))
const delegates = (source: string) =>
  SEO_SHELLS.some(name => new RegExp(`<${name}[\\s/>]`).test(source))

/**
 * The pages that owe their own SEO: not deliberately noindexed, not delegating.
 * The budget is how many of those are still missing each signal, and it may only
 * ever go DOWN.
 *
 * It is at ZERO on all three, which is the point — this stopped being a ratchet
 * counting down legacy debt and became a hard contract. Until now the counts were
 * grep over EVERY page file, so the nineteen shell children and the seven
 * deliberate `noindex` pages were counted as offenders and `canonical` sat at 23
 * with nothing underneath it left to fix. Slack in a ratchet is not harmless
 * headroom: a bound of 23 standing over a real debt of 0 would absorb three new
 * pages shipping with no canonical at all and stay green, which is the single
 * accident the whole file exists to catch.
 *
 * If you are here because CI failed, you added a page without its SEO
 * declarations. Fix the page; there is no number left to raise.
 */
const OWES_OWN_SEO = files.filter(file => !NOINDEXED.includes(file) && !delegates(read(file)))

const LEGACY_BUDGET = { seoMeta: 0, canonical: 0, structuredData: 0 }

function missing(predicate: (source: string) => boolean): string[] {
  return OWES_OWN_SEO.filter(file => predicate(read(file))).sort()
}

describe('the legacy SEO debt only shrinks', () => {
  it(`has at most ${LEGACY_BUDGET.seoMeta} pages with no useSeoMeta`, () => {
    const offenders = missing(source => !/useSeoMeta\s*\(/.test(source))
    expect(offenders).toHaveLength(LEGACY_BUDGET.seoMeta)
  })

  it(`has at most ${LEGACY_BUDGET.canonical} pages with no canonical link`, () => {
    const offenders = missing(source => !/rel:\s*'canonical'/.test(source))
    expect(offenders).toHaveLength(LEGACY_BUDGET.canonical)
  })

  it(`has at most ${LEGACY_BUDGET.structuredData} pages with no JSON-LD`, () => {
    const offenders = missing(source => !source.includes('application/ld+json'))
    expect(offenders).toHaveLength(LEGACY_BUDGET.structuredData)
  })

  // The loophole guard, and the reason excusing the shell children is safe.
  // Without it, deleting the `useHead` block from `ToolShell` would silently
  // un-SEO fifteen pages AND keep the three counts above sitting at zero.
  it.each(SHELL_FILES)('%s carries the SEO its children delegate to it', shell => {
    const source = readFileSync(shell, 'utf8')
    expect(source).toMatch(/useSeoMeta\s*\(/)
    expect(source).toMatch(/rel:\s*'canonical'/)
    expect(source).toContain('application/ld+json')
    expect(source).toContain('BreadcrumbList')
    expect(source).toContain('https://cambio-uruguay.com')
  })

  // El H1 es la única señal de la página que Google lee sin depender de nadie: el title lo puede
  // reescribir, la description la puede ignorar, el H1 es el encabezado que la página se pone a sí
  // misma. `/historico` — indexable, en el sitemap, con `useSeoMeta` completo y canonical — no tenía
  // NINGUNO: su encabezado visible era un `<span class="text-h5">` dentro del `v-card-title`, que se
  // ve igual y para el crawler no existe. Justamente por verse igual nadie lo iba a notar mirando la
  // página, y por eso el chequeo va acá y no en una revisión a ojo.
  //
  // `heading-tag="h1"` cuenta: varias páginas delegan el encabezado en un componente de catálogo
  // (`ChairsChairMarketDirectory`) al que le pasan la etiqueta, y el `<h1>` sale igual en el HTML.
  it('cada página que se declara su propio SEO renderiza exactamente un H1', () => {
    const offenders = OWES_OWN_SEO.filter(file => {
      const source = read(file)
      const template = source.split('<script setup')[0] ?? ''
      const count =
        (template.match(/<h1[\s>]/g) ?? []).length +
        (template.match(/heading-tag="h1"/g) ?? []).length
      return count !== 1
    }).sort()
    expect(offenders).toEqual([])
  })

  it('noindexes only the pages meant to be invisible', () => {
    const noindexed = files.filter(file => /noindex/i.test(read(file)))
    expect(noindexed.sort()).toEqual(NOINDEXED)
  })
})

// Dos páginas del sitio que reclaman la misma intención se la quitan entre sí. No es teoría:
// medido sobre 28 días al 2026-09-02, "cotizacion brou" (6.574 impresiones, 0 clics), "brou
// cotizaciones" (3.865, 2) y "dolar brou" (3.017, 0) los repartía Google entre tres URLs propias,
// y la familia /historico competía consigo misma en 9 consultas: 18.911 impresiones, 6 clics.
// Parte de eso eran títulos casi iguales: el hub de la casa se llamaba "BROU: cotización del dólar
// hoy e histórico" y la página de la moneda "BROU Dólar hoy: cotización y evolución".
describe('ninguna familia le disputa a otra la misma intención de marca', () => {
  const LOCALES = ['es', 'en', 'pt'] as const
  const seoStrings = (locale: string): Record<string, string> => {
    const raw = readFileSync(
      join(__dirname, '..', '..', 'i18n', 'locales', 'json', `${locale}.json`),
      'utf8'
    )
    return (JSON.parse(raw).seo ?? {}) as Record<string, string>
  }

  // "dólar/dollar" + "hoy/today" es la intención de la página de la MONEDA. El hub de la casa
  // lista todas, así que no puede reclamarla.
  const CURRENCY_WORDS = /d[óo]lar|dollar/i
  const TODAY_WORDS = /\bhoy\b|\bhoje\b|\btoday\b/i

  it.each(LOCALES)('en %s el hub de la casa no reclama "dólar hoy"', locale => {
    const seo = seoStrings(locale)
    const hub = seo.historicalOriginTitle ?? ''
    expect(hub, `falta seo.historicalOriginTitle en ${locale}.json`).not.toBe('')
    expect(CURRENCY_WORDS.test(hub) && TODAY_WORDS.test(hub)).toBe(false)
  })

  it.each(LOCALES)('en %s la página de la moneda sí la reclama', locale => {
    // El contrapeso del test de arriba: si la intención no la reclama NADIE, el arreglo dejó al
    // sitio sin página para la consulta de marca, que es peor que la cannibalización.
    const detail = seoStrings(locale).historicalDetailTitle ?? ''
    expect(detail).not.toBe('')
    expect(TODAY_WORDS.test(detail)).toBe(true)
  })
})
