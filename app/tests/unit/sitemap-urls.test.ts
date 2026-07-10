// The sitemap used to be one big try/catch around a live API call: any upstream
// hiccup returned `[]` and the site silently submitted an empty sitemap. These
// tests pin the two properties that fix bought us — the static backbone survives
// an outage, and it is derived from the navigation model rather than a
// hand-written list that drifts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installNitroGlobals } from './helpers/nitro'

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
