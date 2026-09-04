import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// The sitemap used to be one big try/catch around a live API call: any upstream
// hiccup returned `[]` and the site silently submitted an empty sitemap. These
// tests pin the two properties that fix bought us — the static backbone survives
// an outage, and it is derived from the navigation model rather than a
// hand-written list that drifts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installNitroGlobals } from './helpers/nitro'

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
}

/** Import the handler fresh with `$fetch` stubbed, then run it. */
async function runHandler(fetchImpl: (url: string) => Promise<unknown>): Promise<SitemapUrl[]> {
  vi.resetModules()
  installNitroGlobals()
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

  it('emits every route for all three locales', async () => {
    const locs = new Set((await runHandler(HEALTHY)).map(u => u.loc))
    for (const loc of ['/prestamos-uruguay', '/en/prestamos-uruguay', '/pt/prestamos-uruguay']) {
      expect(locs.has(loc)).toBe(true)
    }
  })
})

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

// robots.txt anunciaba /sitemap.xml, que contesta 307 hacia /sitemap_index.xml: cada rastreador
// arrancaba con un salto que no hacia falta, y el archivo terminaba declarando dos URLs para lo
// mismo. Se declara el indice.
describe('la URL de sitemap que declara robots.txt', () => {
  it('es el indice y no la que redirige', () => {
    const config = readFileSync(resolve(__dirname, '../../nuxt.config.ts'), 'utf8')
    const declared = config.match(/sitemap: 'https:\/\/cambio-uruguay\.com\/([^']+)'/)
    expect(declared?.[1]).toBe('sitemap_index.xml')
  })
})
