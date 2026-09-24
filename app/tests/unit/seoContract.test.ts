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
import { parse as parseSfc } from '@vue/compiler-sfc'
import { baseParse, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom'

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
  // One page per catalogue entity, each next to the index that lists them all.
  { file: 'couriers-uruguay/index.vue', sitemapMarker: '/couriers-uruguay' },
  { file: 'couriers-uruguay/[courier].vue', sitemapMarker: '`/couriers-uruguay/${slug}`' },
  { file: 'tarjetas-de-credito-uruguay/index.vue', sitemapMarker: '/tarjetas-de-credito-uruguay' },
  {
    file: 'tarjetas-de-credito-uruguay/[programa].vue',
    sitemapMarker: '`/tarjetas-de-credito-uruguay/${slug}`',
  },
  { file: 'tarjetas-de-debito-uruguay/index.vue', sitemapMarker: '/tarjetas-de-debito-uruguay' },
  {
    file: 'tarjetas-de-debito-uruguay/[tarjeta].vue',
    sitemapMarker: '`/tarjetas-de-debito-uruguay/${slug}`',
  },
  // Una página por categoría del hub de equipar una casa: medianas, historia, modelos y FAQ.
  { file: 'equipar-casa-uruguay/index.vue', sitemapMarker: '/equipar-casa-uruguay' },
  {
    file: 'equipar-casa-uruguay/[categoria].vue',
    sitemapMarker: '`/equipar-casa-uruguay/${slug}`',
  },
  // Una página por tienda de /tiendas-online-uruguay: el índice es una URL fija (sin datos), la
  // ficha depende de que el backend haya escrito un perfil (Task 9).
  { file: 'tiendas-online-uruguay/index.vue', sitemapMarker: '/tiendas-online-uruguay' },
  {
    file: 'tiendas-online-uruguay/[tienda].vue',
    sitemapMarker: '`/tiendas-online-uruguay/${slug}`',
  },
  // El directorio de celulares y la ficha por modelo (marca+familia+almacenamiento).
  { file: 'celulares-uruguay/index.vue', sitemapMarker: '/celulares-uruguay' },
  {
    file: 'celulares-uruguay/[modelo].vue',
    sitemapMarker: '`/celulares-uruguay/${slug}`',
  },
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
  // Public property dossiers: only the reviewed, currently valid pilot is indexable.
  'alquileres/[key].vue',
  // Index the market analysis itself; user-selected filter combinations opt out.
  'analisis-alquileres-uruguay.vue',
  // Se indexa la lista de autos con riesgo declarado; las combinaciones de filtros se salen.
  'autos-chocados-y-con-deuda-uruguay.vue',
  // Autos usados: the directory and the model pages index at their own URL; filter combinations,
  // thin models and single adverts (they expire within weeks) opt out.
  'autos-usados-uruguay/[key].vue',
  'autos-usados-uruguay/index.vue',
  'autos-usados-uruguay/precios/[slug].vue',
  // Las dos páginas de movilidad eléctrica llevan su directorio de avisos ADENTRO (2026-09-22):
  // la URL limpia se indexa y cada combinación de filtros se sale, igual que equipar y autos.
  'bicicletas-electricas-uruguay.vue',
  'buscar.vue',
  // El tasador se indexa en su URL; cada combinación de marca, modelo y año se sale.
  'cuanto-vale-mi-auto-uruguay.vue',
  'cuenta/index.vue',
  // La herramienta "¿tengo descuento acá?": la respuesta depende de la ubicación de quien la abre.
  'descuentos-con-tarjeta-uruguay/cerca-de-mi.vue',
  // La lista del lector vive en su navegador: nada que indexar. Los dos directorios de avisos de
  // equipar se indexan en su URL limpia; cada combinación de filtros se sale, como autos.
  'equipar-casa-uruguay/mi-lista.vue',
  'equipar-casa-uruguay/productos/[categoria].vue',
  'equipar-casa-uruguay/productos/index.vue',
  // The Search Console dashboard: private, gated server-side, and noindexed so a stray link can
  // never put the site's own keyword list into the index.
  'estadisticas-de-busqueda.vue',
  'estado.vue',
  // Agency pages exclude empty/error states, thin profiles and filtered directory copies.
  'inmobiliarias-uruguay/[key].vue',
  'inmobiliarias-uruguay/index.vue',
  'monopatines-electricos-uruguay.vue',
  // Motos usadas: el directorio y la ficha por modelo se indexan en su URL limpia; una
  // combinación de filtros y un modelo sin grupo se salen, igual que autos usados.
  'motos-usadas-uruguay/[key].vue',
  'motos-usadas-uruguay/index.vue',
  'newsletter/archivo.vue',
  'offline.vue',
  // Index the used-car opportunity list itself; filter combinations opt out.
  'oportunidades-autos-usados-uruguay.vue',
  // Index the opportunity directory itself; query combinations opt out like rental filters.
  'oportunidades-inmobiliarias-uruguay.vue',
  // La ficha por articulo del SIPC es INDEXABLE cuando la muestra alcanza; opta
  // por salir solo cuando menos de 30 locales del pais declaran ese articulo,
  // porque ahi la pagina no puede prometer la comparacion que promete su titulo.
  'precio/[slug].vue',
  // El asesor de compra se indexa en su URL; cada combinación de respuestas se sale, como el tasador.
  'que-auto-comprar-uruguay.vue',
  // El ranking de autores de r/CharruaDevs nombra personas: se llega desde el termometro y no entra
  // al indice. La pagina que SI se indexa es /mercado-it-uruguay, con los mismos datos sin nombres.
  'ranking-usuarios-charruadevs.vue',
  // Sale dossiers use the same reviewed, fresh pilot gate as their sitemap entries.
  'venta-viviendas-uruguay/[key].vue',
  'widget.vue',
]

/**
 * The two shells that declare the whole SEO set on their children's behalf:
 * `ToolShell` (every `herramientas/calculadora-*`, driven by `utils/tools.ts`)
 * and `CasasComparativa` (both `casas-de-cambio/*`). A page that mounts one of
 * them has its title, canonical and JSON-LD emitted by the shell, so grepping
 * the page file finds nothing — and that nothing means nothing.
 */
const SEO_SHELL_COMPONENTS = {
  ToolShell: 'ToolShell.vue',
  CasasComparativa: 'CasasComparativa.vue',
  // The routing wrapper mounts either this directory or the independently checked dossier.
  PropertySalesDirectory: 'property-sales/Directory.vue',
}
const SEO_SHELLS = Object.keys(SEO_SHELL_COMPONENTS)
const SHELL_FILES = Object.values(SEO_SHELL_COMPONENTS).map(file =>
  join(__dirname, '..', '..', 'components', file)
)
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

/** Count headings that can coexist, including templates placed after script setup. */
function maximumHeadings(nodes: TemplateChildNode[]): number {
  const elements = nodes.filter((node): node is ElementNode => node.type === NodeTypes.ELEMENT)
  const has = (node: ElementNode, name: string) =>
    node.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === name)
  const count = (node: ElementNode): number =>
    (node.tag === 'h1' ||
    node.props.some(
      prop =>
        prop.type === NodeTypes.ATTRIBUTE &&
        prop.name === 'heading-tag' &&
        prop.value?.content === 'h1'
    )
      ? 1
      : 0) + maximumHeadings(node.children)
  let total = 0
  for (let i = 0; i < elements.length; i++) {
    let value = count(elements[i]!)
    if (has(elements[i]!, 'if')) {
      while (
        elements[i + 1] &&
        (has(elements[i + 1]!, 'else-if') || has(elements[i + 1]!, 'else'))
      ) {
        value = Math.max(value, count(elements[++i]!))
      }
    }
    total += value
  }
  return total
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
      const template = parseSfc(source).descriptor.template?.content ?? ''
      const count = maximumHeadings(baseParse(template).children)
      return count !== 1
    }).sort()
    expect(offenders).toEqual([])
  })

  it('noindexes only the pages meant to be invisible', () => {
    const noindexed = files.filter(file => /noindex/i.test(read(file)))
    expect(noindexed.sort()).toEqual(NOINDEXED)
  })
  it('counts mutually exclusive success/error headings once and rejects simultaneous duplicates', () => {
    expect(
      maximumHeadings(
        baseParse(
          '<section v-if="error"><h1>Error</h1></section><article v-else><header><h1>Property</h1></header></article>'
        ).children
      )
    ).toBe(1)
    expect(
      maximumHeadings(
        baseParse('<h1>Property</h1><section><h1>Second heading</h1></section>').children
      )
    ).toBe(2)
    expect(
      maximumHeadings(baseParse('<PageHeader heading-tag="h1" /><p>Details</p>').children)
    ).toBe(1)
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

// El mismo reparto, para el cluster UR/UI/BPC. Tres URLs propias reclamaban "unidad reajustable":
// /indicadores/unidad-reajustable ("Valor de la UR hoy"), /glosario/unidad-reajustable ("qué es y
// definición", con su propio DefinedTerm) y /guias/ui-ur-bpc-diferencias ("qué son y en qué se
// diferencian"). El registro de crecimiento (octava iteración, 16/9/2026) lo nombra como la mayor
// demanda ganable fuera del pozo de cero clic, y el sitio la repartía entre tres páginas.
//
// El reparto: el INDICADOR es dueño del valor ("valor" + "hoy") y del DefinedTerm; el GLOSARIO
// define a secas, sin "valor" ni "hoy", enlaza al valor y NO emite DefinedTerm cuando hay un
// indicador con su slug; la GUÍA compara y no reclama "qué es la UR" sola. Dos lados, como arriba:
// que nadie más lo reclame Y que alguien sí lo reclame.
describe('el cluster UR no se lo disputan tres páginas propias', () => {
  const glossaryPage = read('glosario/[termino].vue')
  const indicatorPage = read('indicadores/[indicador].vue')
  const VALUE_WORD = /\bvalor\b/i
  const TODAY_WORDS = /\bhoy\b|\bhoje\b|\btoday\b/i

  /** El bloque `useSeoMeta({...})` de una página, anclado al `})` en columna 0. */
  const seoMetaBlock = (source: string) => source.match(/useSeoMeta\(\{[\s\S]*?\n\}\)/)?.[0] ?? ''

  it('el indicador reclama "valor ... hoy" y es dueño del DefinedTerm', () => {
    const block = seoMetaBlock(indicatorPage)
    expect(block).not.toBe('')
    expect(block).toMatch(/Valor de la/)
    expect(TODAY_WORDS.test(block)).toBe(true)
    expect(indicatorPage).toContain("'@type': 'DefinedTerm'")
  })

  it('el glosario define sin "valor" ni "hoy", y para un indicador cede el DefinedTerm', async () => {
    const block = seoMetaBlock(glossaryPage)
    expect(block).not.toBe('')
    // El título del glosario se arma con `pageTitle`; ni la plantilla ni el término pueden meter
    // "valor"/"hoy" en el <title>.
    const titleSource = glossaryPage.match(/const pageTitle = computed\([\s\S]*?\n\)/)?.[0] ?? ''
    expect(titleSource).not.toBe('')
    expect(VALUE_WORD.test(titleSource)).toBe(false)
    expect(TODAY_WORDS.test(titleSource)).toBe(false)

    const { getTerm } = await import('../../utils/glossary')
    const { listIndicatorSlugs } = await import('../../utils/indicators')
    const shared = listIndicatorSlugs().filter(slug => getTerm(slug))
    expect(shared).toContain('unidad-reajustable')
    for (const slug of shared) {
      const term = getTerm(slug)!.term
      expect(VALUE_WORD.test(term), `${slug}: "${term}"`).toBe(false)
      expect(TODAY_WORDS.test(term), `${slug}: "${term}"`).toBe(false)
    }

    // El DefinedTerm sólo cuando NO hay indicador con ese slug; si lo hay, un WebPage que apunta
    // al indicador. Y el enlace grande al valor, con su data-cta.
    expect(glossaryPage).toContain('indicatorFromSlug(')
    expect(glossaryPage).toMatch(
      /indicator\.value\s*\?\s*\{\s*'@type':\s*'WebPage'[\s\S]*?significantLink[\s\S]*?:\s*\{\s*'@type':\s*'DefinedTerm'/
    )
    expect(glossaryPage).toContain('Ver el valor de hoy')
    expect(glossaryPage).toContain('/indicadores/${indicator.slug}')
  })

  it('la guía compara, no reclama "qué es la UR" sola ni el valor de hoy', async () => {
    const { getGuide } = await import('../../utils/guides')
    const title = getGuide('ui-ur-bpc-diferencias')?.title ?? ''
    expect(title).not.toBe('')
    expect(title).toMatch(/diferencia/i)
    expect(title).not.toMatch(/qu[ée] es la unidad reajustable/i)
    expect(VALUE_WORD.test(title) && TODAY_WORDS.test(title)).toBe(false)
  })
})
