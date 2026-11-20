import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
// The sitemap used to be one big try/catch around a live API call: any upstream
// hiccup returned `[]` and the site silently submitted an empty sitemap. These
// tests pin the two properties that fix bought us — the static backbone survives
// an outage, and it is derived from the navigation model rather than a
// hand-written list that drifts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installNitroGlobals } from './helpers/nitro'
import { EXTRA_LOCALE_CODES, LOCALE_PREFIX_RE, hasExtraLocales } from '../../utils/locales'
import { splitLocalePath } from '../../utils/localizedRoutes'

// This file needs more than the default 5s per test, and that is a property of
// what it does rather than something to optimise away. Every scenario calls
// `runHandler`, which does `vi.resetModules()` and re-imports the sitemap route
// — and that route pulls in the whole navigation model and the content
// catalogues behind it. Ten scenarios, ten cold re-imports of a large graph.
//
// The isolation is the point: the healthy-API and API-down cases must not share
// module-level state, or the outage test could pass on values the healthy test
// left behind. So the cost stays and the budget accommodates it.
//
// Measured 2026-08-18: ~1.9s for the whole file run alone, but the slowest single
// test crossed 5s when the full suite ran its workers in parallel and the CPU was
// contended — green alone, red in CI, which reads as flakiness and is really just
// a budget set below the real cost.
vi.setConfig({ testTimeout: 30_000 })

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
  alternatives?: Array<{ hreflang: string; href: string }>
}

/** Import the handler fresh with `$fetch` stubbed, then run it. */
async function runHandler(fetchImpl: (url: string) => Promise<unknown>): Promise<SitemapUrl[]> {
  vi.resetModules()
  installNitroGlobals()
  // The source is cached across sitemaps (see the cache contract below); here it runs uncached.
  vi.stubGlobal('defineCachedFunction', (fn: unknown) => fn)
  vi.stubGlobal('$fetch', vi.fn(fetchImpl))
  const mod = await import('../../server/api/__sitemap__/urls.get')
  const handler = mod.default as unknown as (event: unknown) => Promise<SitemapUrl[]>
  return handler({})
}

const HEALTHY = async (url: string) => {
  if (url.endsWith('/localData')) {
    return { brou: { departments: ['MONTEVIDEO', 'TREINTA Y TRES'] } }
  }
  if (url === '/api/branches') {
    return { branches: [{ slug: 'brou-av-italia-4200' }], casas: {} }
  }
  return [{ origin: 'brou', code: 'USD', type: 'BILLETE' }]
}

const DOWN = async () => {
  throw new Error('api.cambio-uruguay.com is unreachable')
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sitemap with a healthy API', () => {
  it('emits the static backbone plus the API-derived routes', async () => {
    const urls = await runHandler(HEALTHY)
    const counterparts = [
      { hreflang: 'es-ES', href: '/alquileres-uruguay' },
      { hreflang: 'en-US', href: '/en/alquileres-uruguay' },
      { hreflang: 'pt-PT', href: '/pt/alquileres-uruguay' },
      { hreflang: 'x-default', href: '/alquileres-uruguay' },
    ]
    for (const variant of counterparts.slice(0, 3)) {
      expect(urls.find(url => url.loc === variant.href)?.alternatives).toEqual(counterparts)
    }
    const locs = new Set(urls.map(u => u.loc))
    expect(locs.has('/')).toBe(true)
    expect(locs.has('/historico/brou')).toBe(true)
    expect(locs.has('/casa/brou')).toBe(true)
    expect(locs.has('/dolar/montevideo')).toBe(true)
    expect(locs.has('/dolar/treinta-y-tres')).toBe(true)
  })

  // The per-branch family is only worth submitting if the slugs come from the
  // same cached route the pages resolve against — otherwise the sitemap
  // advertises URLs that 404. Spanish-only, like the blog: the body is prose
  // about a Uruguayan street.
  it('emits one Spanish URL per branch, from the shared directory route', async () => {
    const urls = await runHandler(HEALTHY)
    const locs = new Set(urls.map(u => u.loc))
    expect(locs.has('/sucursal/brou-av-italia-4200')).toBe(true)
    expect(locs.has('/en/sucursal/brou-av-italia-4200')).toBe(false)
    expect(locs.has('/sucursal')).toBe(true)
  })

  // /sucursales/<casa>/<departamento> 404s unless the casa has a branch there in
  // /api/branches. localData listed departments the feed did not (ten 404s in the
  // sitemap on 2026-10-20), so the pairs come from the feed, spelled like the
  // page's canonical: the first branch's department, lower-cased.
  it('declares a casa/department pair only where the branch feed has a branch', async () => {
    const urls = await runHandler(async url => {
      if (url === '/api/branches') {
        return {
          branches: [
            { slug: 'brou-1', origin: 'brou', dept: 'MONTEVIDEO' },
            { slug: 'brou-2', origin: 'brou', dept: 'Montevideo' },
            { slug: 'ghost-1', origin: 'ghost', dept: 'SALTO' },
          ],
          casas: { brou: {} },
        }
      }
      return HEALTHY(url)
    })
    const locs = new Set(urls.map(u => u.loc))
    expect(locs.has('/sucursales/brou/montevideo')).toBe(true)
    expect(locs.has('/sucursales/brou/treinta y tres')).toBe(false)
    expect(locs.has('/sucursales/ghost/salto')).toBe(false)
    expect([...locs].filter(loc => loc.startsWith('/sucursales/brou/'))).toEqual([
      '/sucursales/brou/montevideo',
    ])
  })

  it('falls back to localData pairs when the branch feed is unavailable', async () => {
    const urls = await runHandler(async url => {
      if (url === '/api/branches') throw new Error('branch feed down')
      return HEALTHY(url)
    })
    const locs = new Set(urls.map(u => u.loc))
    expect(locs.has('/sucursales/brou/montevideo')).toBe(true)
    expect(locs.has('/sucursales/brou/treinta y tres')).toBe(true)
  })

  it('keeps the priority and changefreq the hand-written list used to emit', async () => {
    const urls = await runHandler(HEALTHY)
    const byLoc = new Map(urls.map(u => [u.loc, u]))
    expect(byLoc.get('/')).toMatchObject({ priority: 1, changefreq: 'hourly' })
    expect(byLoc.get('/')?.lastmod).toBeTruthy()
    expect(byLoc.get('/historico')).toMatchObject({ priority: 0.9, changefreq: 'daily' })
    expect(byLoc.get('/herramientas')).toMatchObject({ priority: 0.8, changefreq: 'weekly' })
    expect(byLoc.get('/privacidad')).toMatchObject({ priority: 0.4, changefreq: 'yearly' })
    // Not backed by live data, so it must not claim today's lastmod.
    expect(byLoc.get('/privacidad')?.lastmod).toBeUndefined()
  })

  it('dates every guide with its own last revision, in all three locales', async () => {
    const { guides } = await import('../../utils/guides')
    const urls = await runHandler(HEALTHY)
    const byLoc = new Map(urls.map(u => [u.loc, u]))
    for (const guide of guides.filter(guide => !guide.consolidatedInto)) {
      for (const prefix of ['', '/en', '/pt']) {
        expect(byLoc.get(`${prefix}/guias/${guide.slug}`)?.lastmod, guide.slug).toBe(
          guide.updatedAt
        )
      }
    }
  })

  // Una guía consolidada no se publica en ningún idioma: su canónica es otra URL (ver
  // `Guide.consolidatedInto` y `guideConsolidation.test.ts`). El destino sí tiene que estar.
  it('deja fuera del sitemap la guía consolidada, y publica la página que se quedó', async () => {
    const { guides } = await import('../../utils/guides')
    const consolidadas = guides.filter(guide => guide.consolidatedInto)
    expect(consolidadas.length).toBeGreaterThan(0)
    const locs = new Set((await runHandler(HEALTHY)).map(u => u.loc))
    for (const guide of consolidadas) {
      for (const prefix of ['', '/en', '/pt']) {
        expect(locs.has(`${prefix}/guias/${guide.slug}`), guide.slug).toBe(false)
      }
      expect(locs.has(guide.consolidatedInto!), guide.slug).toBe(true)
    }
  })

  it('emits every route for all three locales', async () => {
    const urls = await runHandler(HEALTHY)
    const locs = new Set(urls.map(u => u.loc))
    for (const loc of ['/prestamos-uruguay', '/en/prestamos-uruguay', '/pt/prestamos-uruguay']) {
      expect(locs.has(loc)).toBe(true)
    }
    // El media kit (/publicidad) es indexable y entra por NAV_SECTIONS (sección `site`), así que
    // sale en los tres idiomas como cualquier página del esqueleto.
    for (const loc of ['/publicidad', '/en/publicidad', '/pt/publicidad']) {
      expect(locs.has(loc), loc).toBe(true)
    }
    for (const prefix of ['', '/en', '/pt']) {
      expect(urls.filter(url => url.loc === `${prefix}/alquiler-ideal-uruguay`)).toHaveLength(1)
      expect(locs.has(`${prefix}/herramientas/alquiler-ideal-uruguay`)).toBe(false)
    }
  })

  it('emits the machine-translated locales only on their routes, with reciprocal hreflang', async () => {
    const urls = await runHandler(HEALTHY)
    const extra = urls.filter(url => {
      const { locale } = splitLocalePath(url.loc)
      return EXTRA_LOCALE_CODES.includes(locale)
    })
    for (const url of extra) {
      expect(hasExtraLocales(splitLocalePath(url.loc).path), url.loc).toBe(true)
    }
    const mapa = urls.find(url => url.loc === '/fr/mapa')
    expect(mapa).toBeTruthy()
    expect(mapa!.alternatives).toEqual(
      expect.arrayContaining([
        { hreflang: 'fr', href: '/fr/mapa' },
        { hreflang: 'zh-CN', href: '/zh/mapa' },
        { hreflang: 'es-ES', href: '/mapa' },
      ])
    )
    const guias = urls.find(url => url.loc === '/guias')
    expect(guias?.alternatives?.some(alt => alt.hreflang === 'fr')).toBe(false)
    expect(locsOf(urls).has('/fr/guias')).toBe(false)
  })
})

const locsOf = (urls: SitemapUrl[]) => new Set(urls.map(url => url.loc))

describe('sitemap when the API is down', () => {
  it('still serves the full static backbone instead of an empty sitemap', async () => {
    const urls = await runHandler(DOWN)
    expect(urls.length).toBeGreaterThan(300)

    const locs = new Set(urls.map(u => u.loc))
    expect(locs.has('/')).toBe(true)
    expect(locs.has('/herramientas/calculadora-irpf')).toBe(true)
    expect(locs.has('/cotizacion/dolar')).toBe(true)
    expect(locs.has('/convertir/100-dolares-a-pesos-uruguayos')).toBe(true)
  })

  it('drops only the API-derived routes', async () => {
    const locs = new Set((await runHandler(DOWN)).map(u => u.loc))
    expect(locs.has('/historico/brou')).toBe(false)
    expect(locs.has('/casa/brou')).toBe(false)
  })
})

describe('sitemap coverage', () => {
  it('includes the routes the hand-written list had silently lost', async () => {
    const locs = new Set((await runHandler(HEALTHY)).map(u => u.loc))
    for (const loc of [
      '/por-que-sube-el-dolar',
      '/dolar/records',
      '/casa-de-cambio-cerca-de-mi',
      '/newsletter',
    ]) {
      expect(locs.has(loc)).toBe(true)
    }
  })

  it('includes the new search and sitemap pages', async () => {
    const locs = new Set((await runHandler(HEALTHY)).map(u => u.loc))
    expect(locs.has('/buscar')).toBe(true)
    expect(locs.has('/mapa-del-sitio')).toBe(true)
  })

  it('excludes the ops dashboard and the noindex pages', async () => {
    const locs = new Set((await runHandler(HEALTHY)).map(u => u.loc))
    for (const loc of ['/estado', '/offline', '/widget', '/cuenta']) {
      expect(locs.has(loc)).toBe(false)
    }
  })
})

// A prerendered route that leaves a Mongo pool open keeps `nuxt build`'s event
// loop alive: the build never exits, holds the deploy flock, and every later
// deploy is cancelled behind it. That is exactly how deploys stalled for hours
// once the chair pages started reading Mongo from here.
describe('sitemap during prerender', () => {
  it('always releases the Mongo pool, even when the chair query fails', async () => {
    vi.resetModules()
    installNitroGlobals()
    vi.stubGlobal('defineCachedFunction', (fn: unknown) => fn)
    vi.stubGlobal('$fetch', vi.fn(HEALTHY))

    const disconnect = vi.fn(async () => {})
    vi.doMock('../../server/utils/db', () => ({
      connectDb: vi.fn(async () => {
        throw new Error('MONGO_URI is not configured')
      }),
      disconnectDbAfterPrerender: disconnect,
    }))

    const mod = await import('../../server/api/__sitemap__/urls.get')
    await (mod.default as unknown as (event: unknown) => Promise<SitemapUrl[]>)({})

    expect(disconnect).toHaveBeenCalled()
    vi.doUnmock('../../server/utils/db')
  })
})

// Una entrada del sitemap que el router no resuelve es un 404 que NOSOTROS le mandamos a Google:
// gasta presupuesto de rastreo, aparece en Search Console como «URL enviada no encontrada» y su
// síntoma —la página no está en el índice— es idéntico al de una página que todavía no posiciona.
// Las pruebas de arriba verifican que el sitemap contenga lo que debe; ninguna verificaba que lo
// que contiene EXISTA. `internalLinks.test.ts` ya tiene este modelo de router, pero sólo mira los
// enlaces escritos a mano: el sitemap emite además las familias de catálogo
// (`/guias/*`, `/importar/*`, `/alquiler/*`, las fichas por sucursal), que son miles de URLs
// derivadas en código y por eso las que más fácil cambian de forma sin que nadie las abra.
//
// Alcance, igual que en `internalLinks.test.ts`: se verifica la FORMA del path contra los archivos
// de `pages/`, o sea el prefijo estático y la cantidad de segmentos. Un segmento dinámico matchea
// cualquier valor, así que esto no dice que `/casa/inventada` tenga datos; dice que
// `/casa/<algo>` es una ruta del router y que `/casa/brou/extra` no lo es. Es el defecto que se
// cuela al renombrar o mover una página y dejar el emisor del sitemap apuntando a la ruta vieja.
//
// Hoy hay 0; el test llega para que siga en cero.
describe('cada URL que el sitemap declara existe en el router', () => {
  const PAGES_DIR = join(__dirname, '..', '..', 'pages')

  function pageFilesOnDisk(dir: string = PAGES_DIR): string[] {
    return readdirSync(dir).flatMap(name => {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) return pageFilesOnDisk(full)
      if (!name.endsWith('.vue')) return []
      return [relative(PAGES_DIR, full).split(sep).join('/')]
    })
  }

  /** `herramientas/index.vue` -> `/herramientas`; `index.vue` -> `/`. */
  function fileToRoute(file: string): string {
    const route = file.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')
    return route ? `/${route}` : '/'
  }

  /** Optional Nuxt segments include their slash: `/foo/[[bar]]` also matches `/foo`. */
  function routeMatcher(route: string): RegExp {
    const pattern = route
      .split('/')
      .slice(1)
      .map(segment => {
        if (/^\[\[[^\]]+\]\]$/.test(segment)) return '(?:/[^/]+)?'
        if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '/.+'
        if (/^\[[^\]]+\]$/.test(segment)) return '/[^/]+'
        return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      })
      .join('')
    return new RegExp(`^${pattern}$`)
  }

  const files = pageFilesOnDisk()
  const staticRoutes = new Set(files.filter(file => !file.includes('[')).map(fileToRoute))
  const dynamicRoutes = files
    .filter(file => file.includes('['))
    .map(fileToRoute)
    .map(routeMatcher)

  const resolvesInRouter = (path: string): boolean =>
    staticRoutes.has(path) || dynamicRoutes.some(matcher => matcher.test(path))

  it('reconoce las rutas que existen y rechaza las que no', () => {
    // Guarda del guardarraíl: un modelo de router que dejara de matchear haría pasar el test de
    // abajo sobre un sitemap entero roto.
    expect(resolvesInRouter('/')).toBe(true)
    expect(resolvesInRouter('/casa/brou')).toBe(true)
    expect(resolvesInRouter('/historico/bcu/usd/billete')).toBe(true)
    expect(resolvesInRouter('/casa/brou/comprar-dolares/extra')).toBe(false)
    expect(resolvesInRouter('/pagina-que-no-existe')).toBe(false)
  })

  it('no declara ninguna URL que el router no resuelva', async () => {
    const urls = await runHandler(HEALTHY)
    // Los prefijos de idioma los agrega el emisor sobre la misma ruta española, así que se miden
    // una vez: comprobar `/en/x`, `/pt/x` o `/fr/x` repetiría el mismo hallazgo en cada idioma.
    const broken = [
      ...new Set(
        urls
          .map(url => url.loc)
          .filter(loc => !LOCALE_PREFIX_RE.test(loc))
          .filter(loc => !resolvesInRouter(loc))
      ),
    ].sort()
    expect(broken, broken.join('\n')).toEqual([])
  })
})

// robots.txt anunciaba /sitemap.xml, que contesta 307 hacia /sitemap_index.xml: cada rastreador
// arrancaba con un salto que no hacia falta, y el archivo terminaba declarando dos URLs para lo
// mismo. Se declara el indice.
describe('la URL de sitemap que declara robots.txt', () => {
  it('lets crawlers load the public CSS and JavaScript used to render the rental pages', () => {
    const config = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
    for (const rule of config.matchAll(/disallow:\s*\[([^\]]*)\]/g)) {
      expect(rule[1]).not.toContain('/_nuxt/')
    }
  })
  it('es el indice y no la que redirige', () => {
    const config = readFileSync(resolve(__dirname, '../../nuxt.config.ts'), 'utf8')
    const declared = config.match(/sitemap: 'https:\/\/cambio-uruguay\.com\/([^']+)'/)
    expect(declared?.[1]).toBe('sitemap_index.xml')
  })
})

// Hasta el 2026-11-20 el `lastmod` de 56.866 de las 89.385 URLs de los sitemaps por idioma era el
// instante en que se había armado su propio archivo: cambiaba en cada reconstrucción, también en
// las sucursales y en páginas que declaran `monthly`, y eso le enseña al rastreador a ignorarlo.
// Un `lastmod` es el día en que cambiaron los datos de la página, o no está.
describe('lastmod con fecha real', () => {
  // 02:30 UTC = 23:30 del 19 en Montevideo: el día de las filas todavía es el 19.
  const NOW = new Date('2026-11-20T02:30:00Z')
  const MVD_DAY = '2026-11-19'

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const CASA_DIRECTORY = {
    casas: { brou: { bcu: 'x' } },
    quotesUsd: ['brou'],
    quotes: { brou: ['USD', 'EUR'] },
    branches: [
      { slug: 'brou-1', origin: 'brou', dept: 'MONTEVIDEO', hours: 'Lunes a viernes 13 a 18' },
    ],
  }

  it('never stamps the build instant', async () => {
    const urls = await runHandler(HEALTHY)
    const stamped = urls.filter(url => url.lastmod?.startsWith('2026-11-20T02:30'))
    expect(
      stamped.map(url => url.loc),
      stamped
        .slice(0, 10)
        .map(url => url.loc)
        .join('\n')
    ).toEqual([])
  })

  it('dates the live pages with the Montevideo day, without a time', async () => {
    const byLoc = new Map((await runHandler(HEALTHY)).map(url => [url.loc, url]))
    expect(byLoc.get('/')?.lastmod).toBe(MVD_DAY)
    expect(byLoc.get('/cotizacion/dolar')?.lastmod).toBe(MVD_DAY)
    expect(byLoc.get('/historico/brou')?.lastmod).toBe(MVD_DAY)
  })

  it('gives no lastmod to branch and card-discount pages, which carry no change date', async () => {
    const urls = await runHandler(HEALTHY)
    const undated = urls.filter(
      url =>
        url.loc.startsWith('/sucursal/') || url.loc.startsWith('/descuentos-con-tarjeta-uruguay/')
    )
    expect(undated.length).toBeGreaterThan(0)
    for (const url of undated) expect(url.lastmod, url.loc).toBeUndefined()
  })

  it('gives no lastmod to a fresh page that promises only a monthly change', async () => {
    const { NAV_SECTIONS } = await import('../../utils/siteNav')
    const monthly = NAV_SECTIONS.flatMap(section => section.entries).filter(
      entry => entry.to && !entry.sitemapExclude && entry.fresh && entry.changefreq === 'monthly'
    )
    expect(monthly.length).toBeGreaterThan(0)
    const byLoc = new Map((await runHandler(HEALTHY)).map(url => [url.loc, url]))
    for (const entry of monthly) {
      expect(byLoc.get(entry.to!), entry.to).toBeTruthy()
      expect(byLoc.get(entry.to!)?.lastmod, entry.to).toBeUndefined()
    }
  })

  it('dates only the quote intents of a casa', async () => {
    const urls = await runHandler(async url =>
      url === '/api/branches' ? CASA_DIRECTORY : HEALTHY(url)
    )
    const byLoc = new Map(urls.map(url => [url.loc, url]))
    expect(byLoc.get('/casa/brou/comprar-dolares')?.lastmod).toBe(MVD_DAY)
    expect(byLoc.get('/casa/brou/vender-dolares')?.lastmod).toBe(MVD_DAY)
    expect(byLoc.get('/casa/brou/euro')?.lastmod).toBe(MVD_DAY)
    expect(byLoc.has('/casa/brou/opiniones')).toBe(true)
    expect(byLoc.get('/casa/brou/opiniones')?.lastmod).toBeUndefined()
  })

  it('dates /precio/<slug> with the day of the SIPC catalogue', async () => {
    const { preciosSlug } = await import('../../utils/preciosCatalog')
    const urls = await runHandler(async url =>
      url.endsWith('/precios/articles')
        ? { day: '2026-11-18', articles: [{ name: 'Leche', n: 99 }] }
        : HEALTHY(url)
    )
    const precio = urls.find(url => url.loc === `/precio/${preciosSlug('Leche')}`)
    expect(precio?.lastmod).toBe('2026-11-18')
  })

  it('omits the /precio lastmod when the catalogue day is not a date', async () => {
    const { preciosSlug } = await import('../../utils/preciosCatalog')
    const urls = await runHandler(async url =>
      url.endsWith('/precios/articles')
        ? { day: '2026-11-18T03:12:00Z', articles: [{ name: 'Leche', n: 99 }] }
        : HEALTHY(url)
    )
    const precio = urls.find(url => url.loc === `/precio/${preciosSlug('Leche')}`)
    expect(precio).toBeTruthy()
    expect(precio?.lastmod).toBeUndefined()
  })
})

// El BCU publica dólar, real y peso argentino sólo los días hábiles, y las filas son del día de
// Montevideo: entre las 00:00 y el primer scrape bueno, y todo el fin de semana,
// `/historico/bcu/usd` (200, indexable) salía del sitemap. Los pares se toman de los últimos días.
describe('historico: pares de los últimos días', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const ROOT = 'https://api.cambio-uruguay.com'

  it('keeps a pair with no rows today, dated the last day it had them', async () => {
    const urls = await runHandler(async url => {
      if (url === ROOT) return [{ origin: 'brou', code: 'USD', type: 'BILLETE' }]
      if (url === `${ROOT}/?date=2026-11-19`) throw new Error('No results found')
      if (url === `${ROOT}/?date=2026-11-18`) {
        return [
          { origin: 'bcu', code: 'USD', type: 'BILLETE' },
          { origin: 'bcu', code: 'UI', type: '' },
          { origin: 'brou', code: 'USD', type: 'BILLETE' },
        ]
      }
      if (url === `${ROOT}/?date=2026-11-17`) return [{ origin: 'bcu', code: 'ARS', type: '' }]
      if (url.includes('/?date=')) return []
      return HEALTHY(url)
    })
    const byLoc = new Map(urls.map(url => [url.loc, url]))
    expect(byLoc.get('/historico/bcu/usd')?.lastmod).toBe('2026-11-18')
    expect(byLoc.get('/en/historico/bcu/usd')?.lastmod).toBe('2026-11-18')
    expect(byLoc.get('/historico/bcu/ars')?.lastmod).toBe('2026-11-17')
    // Today's rows win: the pair is dated today, not the older day.
    expect(byLoc.get('/historico/brou/usd')?.lastmod).toBe('2026-11-20')
    // Only the four currencies of the sitemap.
    expect(byLoc.has('/historico/bcu/ui')).toBe(false)
    // The hub 404s without today's rows, so it stays tied to them.
    expect(byLoc.has('/historico/bcu')).toBe(false)
    expect(byLoc.has('/historico/brou')).toBe(true)
  })

  it('changes nothing when every previous day fails', async () => {
    const baseline = await runHandler(async url => (url.includes('/?date=') ? [] : HEALTHY(url)))
    const failing = await runHandler(async url => {
      if (url.includes('/?date=')) throw new Error('No results found')
      return HEALTHY(url)
    })
    expect(failing).toEqual(baseline)
  })

  it('asks only for the days before today', async () => {
    const asked: string[] = []
    await runHandler(async url => {
      if (url.includes('/?date=')) asked.push(url.split('date=')[1]!)
      return HEALTHY(url)
    })
    // Ten days: the Wednesday of Carnival (Mon+Tue off) still reaches the BCU's last weekday.
    expect(asked.sort()).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
    ])
  })

  it('reaches a weekday across Carnival', async () => {
    vi.setSystemTime(new Date('2027-02-10T05:00:00Z')) // Wednesday 02:00 in Montevideo
    const urls = await runHandler(async url => {
      if (url === ROOT) return []
      // Monday 8 and Tuesday 9 are Carnival, 6-7 the weekend: the last BCU rows are Friday's.
      if (url === `${ROOT}/?date=2027-02-05`) return [{ origin: 'bcu', code: 'USD', type: '' }]
      if (url.includes('/?date=')) return []
      return HEALTHY(url)
    })
    expect(urls.find(url => url.loc === '/historico/bcu/usd')?.lastmod).toBe('2027-02-05')
  })
})

// La fuente se arma una vez y la comparten los 56 sitemaps hijos y los dos workers: cada hijo la
// volvía a pedir (9–20 s) y de ahí salían 56 fotos distintas, con huérfanas entre idiomas.
describe('la fuente del sitemap se cachea, y nunca recortada', () => {
  type CacheOptions = {
    name?: string
    base?: string
    maxAge?: number
    swr?: boolean
    getKey?: () => string
    validate?: (entry: {
      value?: { complete?: boolean; urls?: unknown[] }
      mtime?: number
    }) => boolean
  }

  async function importCaptured() {
    vi.resetModules()
    installNitroGlobals()
    let captured: { fn?: () => Promise<{ urls: SitemapUrl[]; complete: boolean }> } & {
      opts?: CacheOptions
    } = {}
    vi.stubGlobal('defineCachedFunction', (fn: never, opts: CacheOptions) => {
      captured = { fn, opts }
      return fn
    })
    return { mod: await import('../../server/api/__sitemap__/urls.get'), captured: () => captured }
  }

  it('lives in the shared on-disk mount, one key, and refuses an incomplete run', async () => {
    vi.stubGlobal('$fetch', vi.fn(HEALTHY))
    const { captured } = await importCaptured()
    const opts = captured().opts!
    expect(opts.base).toBe('sitemap')
    expect(opts.swr).toBe(true)
    expect(opts.maxAge).toBeGreaterThan(0)
    expect(opts.getKey?.()).toBe('all')
    expect(opts.validate?.({ value: { complete: false, urls: [] } })).toBe(false)
    expect(opts.validate?.({})).toBe(false)
    expect(opts.validate?.({ value: { complete: true, urls: [] }, mtime: Date.now() })).not.toBe(
      false
    )
  })

  // Con `swr`, Nitro sirve una entrada guardada que pasa `validate` y reconstruye por detrás; una
  // corrida incompleta no se guarda, así que sin techo un bloque caído para siempre congelaba la
  // última foto completa. Pasadas seis horas la foto deja de valer y se sirve lo recién armado.
  it('stops serving a stored snapshot once it is too old', async () => {
    vi.stubGlobal('$fetch', vi.fn(HEALTHY))
    const { mod, captured } = await importCaptured()
    const validate = captured().opts!.validate!
    const hour = 3600_000
    expect(validate({ value: { complete: true, urls: [] }, mtime: Date.now() - 25 * hour })).toBe(
      false
    )
    expect(validate({ value: { complete: true, urls: [] }, mtime: Date.now() - 7 * hour })).toBe(
      false
    )
    expect(
      validate({ value: { complete: true, urls: [] }, mtime: Date.now() - 5 * hour })
    ).not.toBe(false)
    // A stored entry with no mtime is not trusted either.
    expect(validate({ value: { complete: true, urls: [] } })).toBe(false)
    const now = 1_800_000_000_000
    expect(
      mod.isUsableSitemapSource({ value: { complete: true }, mtime: now - 6 * hour }, now)
    ).toBe(false)
    expect(
      mod.isUsableSitemapSource({ value: { complete: true }, mtime: now - 6 * hour + 1 }, now)
    ).toBe(true)
    expect(mod.isUsableSitemapSource({ value: { complete: false }, mtime: now }, now)).toBe(false)
  })

  it('logs an incomplete run from the builder itself, so a background refresh reports it', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/branches') throw new Error('branch feed down')
        return HEALTHY(url)
      })
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { captured } = await importCaptured()
      await captured().fn!()
      expect(warn.mock.calls.some(call => String(call[0]).includes('fuente incompleta'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it('marks the run incomplete when a block fails, and the handler still returns the list', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/branches') throw new Error('branch feed down')
        return HEALTHY(url)
      })
    )
    const { mod, captured } = await importCaptured()
    const result = await captured().fn!()
    expect(result.complete).toBe(false)
    expect(result.urls.length).toBeGreaterThan(300)
    const served = await (mod.default as unknown as (event: unknown) => Promise<SitemapUrl[]>)({})
    expect(Array.isArray(served)).toBe(true)
    expect(served.length).toBe(result.urls.length)
  })

  // Un bloque nuevo que olvide marcar la corrida como incompleta dejaría guardar media hora de
  // lista recortada en una caída. Cada `catch (` del armado tiene que hacerlo primero.
  it('every catch of the builder marks the run incomplete', () => {
    const source = readFileSync(
      resolve(__dirname, '../../server/api/__sitemap__/urls.get.ts'),
      'utf8'
    )
    const catches = source.match(/\bcatch \(\w+\) \{/g) ?? []
    const marked = source.match(/\bcatch \(\w+\) \{\n(?:\s*\/\/[^\n]*\n)*\s*complete = false\n/g)
    expect(catches.length).toBeGreaterThanOrEqual(17)
    expect(marked?.length).toBe(catches.length)
  })
})

describe('sitemap: cada traducción tiene su página en español', () => {
  it('lists the Spanish path of every translated URL in the same output', async () => {
    const urls = await runHandler(HEALTHY)
    const locs = locsOf(urls)
    const orphans = urls
      .map(url => splitLocalePath(url.loc))
      .filter(({ locale, path }) => locale !== 'es' && !locs.has(path))
      .map(({ locale, path }) => `/${locale}${path}`)
    expect(orphans, orphans.slice(0, 10).join('\n')).toEqual([])
  })
})
