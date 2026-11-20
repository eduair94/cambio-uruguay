import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecommendationExposure } from '../../utils/recommendationExposure'

describe('recommendation exposure scope', () => {
  it('requires a half-visible link and a visible tab, then records each module once per visit', () => {
    const exposure = createRecommendationExposure()
    exposure.visit('/guide-a', '/guide-a')
    expect(exposure.observe('guide_next_steps', 0.49, true)).toBeNull()
    expect(exposure.observe('guide_next_steps', 1, false)).toBeNull()
    expect(exposure.observe('arbitrary-private-value', 1, true)).toBeNull()
    expect(exposure.observe('guide_next_steps', NaN, true)).toBeNull()
    expect(exposure.observe('guide_next_steps', 0.5, true)).toEqual({
      content_path: '/guide-a',
      link_area: 'guide_next_steps',
      non_interaction: true,
    })
    expect(exposure.observe('guide_next_steps', 1, true)).toBeNull()
    expect(exposure.observe('bank_decision', 1, true)?.link_area).toBe('bank_decision')
    exposure.visit('/guide-a', '/guide-a')
    expect(exposure.observe('guide_next_steps', 1, true)).toBeNull()
    exposure.visit('/guide-b', '/guide-b')
    expect(exposure.observe('guide_next_steps', 1, true)?.content_path).toBe('/guide-b')
    exposure.visit('/guide-a', '/guide-a')
    expect(exposure.observe('guide_next_steps', 1, true)?.content_path).toBe('/guide-a')
    exposure.visit('/cuenta', null)
    expect(exposure.observe('guide_next_steps', 1, true)).toBeNull()
  })
})

function surface() {
  const callbacks = new Map<string, Set<() => void>>()
  return {
    addEventListener(name: string, fn: () => void) {
      if (!callbacks.has(name)) callbacks.set(name, new Set())
      callbacks.get(name)!.add(fn)
    },
    removeEventListener(name: string, fn: () => void) {
      callbacks.get(name)?.delete(fn)
    },
    emit(name: string) {
      for (const fn of callbacks.get(name) ?? []) fn()
    },
  }
}

function browser() {
  const gtag = vi.fn()
  const cleanup: (() => void)[] = []
  const hooks = new Map<string, () => Promise<void>>()
  let routeHook: (to: any, from: any, failure?: unknown) => void = () => {}
  const route = (path: string) => ({ path, matched: [{ path }], meta: {} })
  const currentRoute = { value: route('/mejores-bancos-uruguay') }
  const router = {
    currentRoute,
    resolve: route,
    afterEach(fn: typeof routeHook) {
      routeHook = fn
      return vi.fn()
    },
  }
  const location = {
    href: 'https://cambio-uruguay.com/mejores-bancos-uruguay?private=email#secret',
    origin: 'https://cambio-uruguay.com',
  }
  const module = { dataset: { linkArea: 'bank_decision' }, querySelectorAll: () => links }
  const link = (href: string, download = false) => ({
    href,
    isConnected: true,
    getAttribute: () => href,
    hasAttribute: () => download,
    closest: () => module,
  })
  const links = [
    link('/tarjetas-de-credito-uruguay?private=email#secret'),
    link('/cuenta'),
    link('#details'),
    link('https://external.test'),
    link('/download', true),
  ]
  const document = { ...surface(), visibilityState: 'visible', querySelectorAll: () => [module] }
  const window = surface()
  const observers: FakeObserver[] = []
  class FakeObserver {
    targets: typeof links = []
    disconnected = false
    constructor(
      public callback: (entries: any[]) => void,
      public options: unknown
    ) {
      observers.push(this)
    }
    observe(target: (typeof links)[number]) {
      this.targets.push(target)
    }
    disconnect() {
      this.disconnected = true
    }
    emit(ratio = 1, target = this.targets[0]) {
      this.callback([{ target, intersectionRatio: ratio, isIntersecting: ratio > 0 }])
    }
  }
  vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
  vi.stubGlobal('useRouter', () => router)
  vi.stubGlobal('useGtag', () => ({ gtag }))
  vi.stubGlobal('nextTick', () => Promise.resolve())
  vi.stubGlobal('location', location)
  vi.stubGlobal('document', document)
  vi.stubGlobal('window', window)
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  return {
    gtag,
    document,
    window,
    observers,
    links,
    app: {
      vueApp: { onUnmount: (fn: () => void) => cleanup.push(fn) },
      hook(name: string, fn: () => Promise<void>) {
        hooks.set(name, fn)
        return () => hooks.delete(name)
      },
    },
    async finish() {
      await hooks.get('page:finish')?.()
    },
    navigate(path: string) {
      const from = currentRoute.value
      currentRoute.value = route(path)
      routeHook(currentRoute.value, from)
    },
    cleanup() {
      cleanup.forEach(fn => fn())
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('recommendation observer lifecycle', () => {
  it('observes actual safe links, handles hidden tabs and deduplicates refreshed observers', async () => {
    const runtime = browser()
    const plugin = (await import('../../plugins/track-recommendations.client')).default
    plugin(runtime.app as never)
    await Promise.resolve()
    const first = runtime.observers[0]!
    expect(first.options).toEqual({ threshold: [0.5] })
    expect(first.targets).toEqual([runtime.links[0]])
    first.emit(0.49)
    expect(runtime.gtag).not.toHaveBeenCalled()
    runtime.document.visibilityState = 'hidden'
    runtime.document.emit('visibilitychange')
    expect(first.disconnected).toBe(true)
    first.emit(1)
    expect(runtime.gtag).not.toHaveBeenCalled()
    runtime.document.visibilityState = 'visible'
    runtime.document.emit('visibilitychange')
    await Promise.resolve()
    runtime.observers.at(-1)!.emit(0.5)
    expect(runtime.gtag).toHaveBeenCalledWith('event', 'recommendation_view', {
      content_path: '/mejores-bancos-uruguay',
      page_location: 'https://cambio-uruguay.com/mejores-bancos-uruguay',
      page_title: '/mejores-bancos-uruguay',
      page_referrer: '',
      link_area: 'bank_decision',
      non_interaction: true,
    })
    await runtime.finish()
    runtime.observers.at(-1)!.emit(1)
    runtime.window.emit('pagehide')
    runtime.window.emit('pageshow')
    await Promise.resolve()
    runtime.observers.at(-1)!.emit(1)
    expect(runtime.gtag).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(runtime.gtag.mock.calls)).not.toMatch(/private|email|secret/)
    runtime.cleanup()
  })

  it('discards old-page callbacks and resets only after successful pathname navigation', async () => {
    const runtime = browser()
    const plugin = (await import('../../plugins/track-recommendations.client')).default
    plugin(runtime.app as never)
    await Promise.resolve()
    const first = runtime.observers[0]!
    first.emit()
    runtime.navigate('/otra-pagina')
    first.emit()
    expect(first.disconnected).toBe(true)
    expect(runtime.gtag).toHaveBeenCalledTimes(1)
    await runtime.finish()
    runtime.observers.at(-1)!.emit()
    expect(runtime.gtag.mock.calls[1]![2].content_path).toBe('/otra-pagina')
    runtime.navigate('/cuenta')
    await runtime.finish()
    expect(runtime.observers).toHaveLength(2)
    runtime.cleanup()
    runtime.navigate('/mejores-bancos-uruguay')
    await runtime.finish()
    runtime.document.emit('visibilitychange')
    await Promise.resolve()
    expect(runtime.observers).toHaveLength(2)
    expect(runtime.gtag).toHaveBeenCalledTimes(2)
  })
})
