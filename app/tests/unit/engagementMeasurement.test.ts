import { afterEach, describe, expect, it, vi } from 'vitest'
import guideMeasurementSlugs from '../../utils/guideMeasurementSlugs.json'
import { getGuide } from '../../utils/guides'
import {
  contentScrollPercent,
  createReadingProgress,
  measurementContext,
  measurementLinkArea,
  measurementPath,
} from '../../utils/engagementMeasurement'

const route = (path: string, pattern = path, middleware?: unknown) => ({
  path,
  matched: [{ path: pattern }],
  meta: { middleware },
})

describe('analytics route privacy', () => {
  it('keeps every catalog-verified guide distinct without accepting arbitrary slugs', () => {
    const allowed = new Set(guideMeasurementSlugs)
    expect(allowed.size).toBeGreaterThan(0)
    for (const slug of allowed) {
      expect(getGuide(slug)?.slug).toBe(slug)
      for (const locale of ['', '/en', '/pt']) {
        const path = `${locale}/guias/${slug}`
        expect(
          measurementPath(route(`${path}?private=value#secret`, `${locale}/guias/:slug()`))
        ).toBe(path)
      }
    }
    expect(measurementPath(route('/guias/private-email', '/guias/:slug()'))).toBe('/guias/:item')
    expect(measurementPath(route('/guias/private%40email.test', '/guias/:slug()'))).toBe(
      '/guias/:item'
    )
  })

  it('uses router-owned paths, never URL queries, titles or dynamic user values', () => {
    expect(measurementPath(route('/buscar?q=private@example.com', '/buscar'))).toBe('/buscar')
    expect(measurementPath(route('/alquileres/private-address', '/alquileres/:key()'))).toBe(
      '/alquileres/:item'
    )
    expect(measurementPath(route('/en/guias/a-private-slug', '/en/guias/:slug()'))).toBe(
      '/en/guias/:item'
    )
    expect(measurementPath(route('/sucursales/a/b', '/sucursales/:origin()/:location()?'))).toBe(
      '/sucursales/:item/:item'
    )
  })

  it.each([
    '/pizarra',
    '/en/widget',
    '/cuenta',
    '/conectar',
    '/pt/mi-lista',
    '/estadisticas-de-busqueda',
    '/estadisticas-por-pagina',
    '/oportunidades-reddit',
  ])('does not add global measurement on %s', path => {
    expect(measurementPath(route(path))).toBeNull()
  })

  it('rejects authenticated routes, unmatched paths and catchalls', () => {
    expect(measurementPath(route('/private', '/private', ['auth']))).toBeNull()
    expect(measurementPath(route('/private', '/private', 'auth'))).toBeNull()
    expect(measurementPath({ path: '/private@email.test', matched: [] })).toBeNull()
    expect(measurementPath(route('/unknown', '/:pathMatch(.*)*'))).toBeNull()
    expect(measurementPath(route('/unknown', '/:slug()'))).toBeNull()
  })

  it('preserves public static routes and overrides implicit GA URL metadata', () => {
    expect(measurementPath(route('/'))).toBe('/')
    expect(measurementPath(route('/cuenta-remunerada-uruguay'))).toBe('/cuenta-remunerada-uruguay')
    expect(measurementContext('/buscar', 'https://cambio-uruguay.com')).toEqual({
      content_path: '/buscar',
      page_location: 'https://cambio-uruguay.com/buscar',
      page_title: '/buscar',
      page_referrer: '',
    })
    expect(measurementLinkArea('guide_next_steps')).toBe('guide_next_steps')
    expect(measurementLinkArea('private@example.com')).toBe('content')
  })
})

describe('reading milestones', () => {
  it('requires visible time as well as depth, and sends each milestone once', () => {
    const progress = createReadingProgress()
    progress.visit('/a', '/a', 0, true)
    expect(progress.scroll(100, 1000)).toEqual([])
    expect(progress.scroll(49, 15_000)).toEqual([])
    expect(progress.scroll(80, 15_000)).toEqual([
      { content_path: '/a', read_percent: 50, non_interaction: true },
    ])
    expect(progress.scroll(100, 29_999)).toEqual([])
    expect(progress.scroll(100, 30_000).map(mark => mark.read_percent)).toEqual([90])
    expect(progress.scroll(100, 60_000)).toEqual([])
  })

  it('excludes hidden time and hidden scrolling', () => {
    const progress = createReadingProgress()
    progress.visit('/a', '/a', 0, true)
    progress.setVisible(false, 5000)
    expect(progress.scroll(100, 100_000)).toEqual([])
    progress.setVisible(true, 100_000)
    expect(progress.scroll(100, 109_999)).toEqual([])
    expect(progress.scroll(100, 110_000).map(mark => mark.read_percent)).toEqual([50])
  })

  it('resets on pathname visits, including two listings with the same masked path', () => {
    const progress = createReadingProgress()
    progress.visit('/alquileres/a', '/alquileres/:item', 0, true)
    expect(progress.scroll(100, 30_000)).toHaveLength(2)
    progress.visit('/alquileres/b', '/alquileres/:item', 30_000, true)
    expect(progress.scroll(100, 31_000)).toEqual([])
    expect(progress.scroll(100, 60_000)).toHaveLength(2)
    progress.visit('/alquileres/a', '/alquileres/:item', 60_000, true)
    expect(progress.scroll(100, 90_000)).toHaveLength(2)
  })

  it('does not reset on filters or hash changes; never measures excluded routes', () => {
    const progress = createReadingProgress()
    progress.visit('/a', '/a', 0, true)
    expect(progress.scroll(100, 30_000)).toHaveLength(2)
    progress.visit('/a', '/a', 30_000, true)
    expect(progress.scroll(100, 60_000)).toEqual([])
    progress.visit('/cuenta', null, 60_000, true)
    expect(progress.scroll(100, 90_000)).toEqual([])
  })

  it('does not label a screen-sized or collapsed page a completed read', () => {
    expect(contentScrollPercent(0, 800, 800)).toBeNull()
    expect(contentScrollPercent(0, 0, 800)).toBeNull()
    expect(contentScrollPercent(0, NaN, 800)).toBeNull()
    expect(contentScrollPercent(0, 1600, 800)).toBe(50)
    expect(contentScrollPercent(-800, 1600, 800)).toBe(100)
  })
})

// Exercise the actual plugins with small browser surfaces: no Nuxt boot, DOM
// dependency, Google requests or build, but real listener and route behavior.
function surface() {
  const listeners = new Map<string, Set<(event: any) => void>>()
  return {
    addEventListener(name: string, callback: (event: any) => void) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)!.add(callback)
    },
    removeEventListener(name: string, callback: (event: any) => void) {
      listeners.get(name)?.delete(callback)
    },
    emit(name: string, event: any = {}) {
      for (const callback of listeners.get(name) ?? []) callback({ type: name, ...event })
    },
  }
}

function browser() {
  let now = 0
  let frame: (() => void) | undefined
  let afterRoute: (to: any, from: any, failure?: unknown) => void = () => {}
  const cleanup: (() => void)[] = []
  const gtag = vi.fn()
  const location = {
    href: 'https://cambio-uruguay.com/a',
    origin: 'https://cambio-uruguay.com',
    pathname: '/a',
  }
  const currentRoute = { value: route('/a') }
  const router = {
    currentRoute,
    resolve: (path: string) => route(path),
    afterEach(callback: typeof afterRoute) {
      afterRoute = callback
      return vi.fn()
    },
  }
  const page = { matches: () => true, getBoundingClientRect: () => ({ top: -1000, height: 2000 }) }
  const document = {
    ...surface(),
    visibilityState: 'visible',
    querySelector: () => ({ children: [page] }),
  }
  const window = { ...surface(), innerHeight: 800 }
  vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
  vi.stubGlobal('useGtag', () => ({ gtag }))
  vi.stubGlobal('useRouter', () => router)
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('location', location)
  vi.stubGlobal('document', document)
  vi.stubGlobal('window', window)
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined
  })
  return {
    app: { vueApp: { onUnmount: (callback: () => void) => cleanup.push(callback) } },
    document,
    window,
    gtag,
    router,
    time(value: number) {
      now = value
    },
    scroll() {
      window.emit('scroll')
      frame?.()
      frame = undefined
    },
    navigate(path: string) {
      const from = currentRoute.value
      currentRoute.value = route(path)
      location.pathname = path
      location.href = `${location.origin}${path}`
      afterRoute(currentRoute.value, from)
    },
    cleanup() {
      cleanup.forEach(callback => callback())
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('reading browser lifecycle', () => {
  it('requires user scroll intent, pauses when hidden, resets after SPA navigation and cleans up', async () => {
    const runtime = browser()
    const plugin = (await import('../../plugins/track-reading.client')).default
    plugin(runtime.app as never)
    runtime.time(30_000)
    runtime.scroll() // A restored scroll position is not evidence of reading.
    expect(runtime.gtag).not.toHaveBeenCalled()
    runtime.document.emit('wheel')
    runtime.scroll()
    expect(runtime.gtag.mock.calls.map(call => call[2].read_percent)).toEqual([50, 90])
    expect(runtime.gtag.mock.calls[0][1]).toBe('read_progress')
    runtime.navigate('/b')
    runtime.document.visibilityState = 'hidden'
    runtime.document.emit('visibilitychange')
    runtime.time(500_000)
    runtime.document.emit('wheel')
    runtime.scroll()
    expect(runtime.gtag).toHaveBeenCalledTimes(2)
    runtime.document.visibilityState = 'visible'
    runtime.document.emit('visibilitychange')
    runtime.time(515_000)
    runtime.document.emit('touchmove')
    runtime.scroll()
    expect(runtime.gtag).toHaveBeenCalledTimes(3)
    expect(runtime.gtag.mock.calls[2][2].content_path).toBe('/b')
    runtime.cleanup()
    runtime.time(530_000)
    runtime.document.emit('wheel')
    runtime.scroll()
    expect(runtime.gtag).toHaveBeenCalledTimes(3)
    for (const [, name, parameters] of runtime.gtag.mock.calls) {
      expect(['page_view', 'user_engagement']).not.toContain(name)
      expect(parameters).not.toHaveProperty('engagement_time_msec')
      expect(parameters).not.toHaveProperty('session_id')
    }
  })
})

describe('delegated navigation clicks', () => {
  it('counts destinations without filters; excludes same-page jumps and private routes; strips outbound PII', async () => {
    const runtime = browser()
    const plugin = (await import('../../plugins/track-clicks.client')).default
    plugin(runtime.app as never)
    const click = (href: string, area = 'guide_next_steps', type = 'click', button = 0) => {
      const anchor = {
        getAttribute: () => href,
        hasAttribute: () => false,
        closest: (selector: string) =>
          selector === '[data-link-area]' ? { dataset: { linkArea: area } } : null,
      }
      const target = { closest: (selector: string) => (selector === 'a[href]' ? anchor : null) }
      runtime.document.emit(type, { target, button })
    }
    click('/b?email=private@example.com#private')
    expect(runtime.gtag.mock.calls[0][1]).toBe('internal_navigation')
    expect(runtime.gtag.mock.calls[0][2]).toMatchObject({
      content_path: '/a',
      destination_path: '/b',
      link_area: 'guide_next_steps',
    })
    click('/a?filter=secret')
    click('#contents')
    click('/cuenta')
    expect(runtime.gtag).toHaveBeenCalledTimes(1)
    click('https://wa.me/59899123456?text=private%20message')
    expect(runtime.gtag.mock.calls[1][2]).toMatchObject({
      link_url: 'https://wa.me',
      link_domain: 'wa.me',
    })
    expect(JSON.stringify(runtime.gtag.mock.calls)).not.toMatch(/private|secret|99123456/)
    click('/c', 'header', 'auxclick', 2)
    expect(runtime.gtag).toHaveBeenCalledTimes(2)
    click('/c', 'header', 'auxclick', 1)
    expect(runtime.gtag).toHaveBeenCalledTimes(3)
    runtime.navigate('/cuenta')
    click('/b')
    expect(runtime.gtag).toHaveBeenCalledTimes(3)
    runtime.cleanup()
    runtime.navigate('/a')
    click('/b')
    expect(runtime.gtag).toHaveBeenCalledTimes(3)
  })
})
