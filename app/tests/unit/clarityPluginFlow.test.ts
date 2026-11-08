// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://cambio-uruguay.com/dolar-hoy" }
// Microsoft Clarity end to end: plugins/clarity.client.ts (when the runtime is fetched) and
// services/clarityRuntime.ts (whether, where and how it records), with a model of clarity-js's
// own life cycle (helpers/fakeClarity.ts) standing in for the tag and the library. jsdom fetches
// no external script, and every upload is a row that says where it would have gone.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeClarity, type FakeClarity } from './helpers/fakeClarity'

type Fn = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: unknown }
interface Route {
  path: string
  fullPath: string
  name: string
  query: Record<string, string>
}
type Guard = (to: Route, from: Route) => unknown

const route = (fullPath: string, name = 'page'): Route => {
  const url = new URL(fullPath, 'https://cambio-uruguay.com')
  return { path: url.pathname, fullPath, name, query: Object.fromEntries(url.searchParams) }
}

const listeners: Array<[EventTarget, string, EventListenerOrEventListenerObject, unknown]> = []
const originalWindowAdd = window.addEventListener.bind(window)
const originalDocumentAdd = document.addEventListener.bind(document)

let fake: FakeClarity
let guards: Guard[]
let ends: Array<() => void>
let idleQueue: Array<() => void>
let current: { value: Route }
let fetchMock: ReturnType<typeof vi.fn>
let service: typeof import('../../services/clarity')

const host = () => window as unknown as { clarity?: Fn }
const tagScripts = () =>
  document.head.querySelectorAll('script[src^="https://www.clarity.ms/tag/"]').length
const flush = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve()
}
const runIdle = () => {
  while (idleQueue.length) idleQueue.shift()!()
}
const network = () => fake.uploads.filter(item => item.to === 'network')
const tags = () =>
  fake.calls.filter(call => call.method === 'set').map(call => call.args as [string, string])

async function boot(options: { at?: string; name?: string; strict?: boolean | 'fail' } = {}) {
  current = { value: route(options.at ?? '/dolar-hoy', options.name ?? 'dolar-hoy') }
  window.history.replaceState({}, '', current.value.fullPath)
  fetchMock = vi.fn(async () => {
    if (options.strict === 'fail') throw new Error('offline')
    return { ok: true, json: async () => ({ strict: options.strict ?? false }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  service = await import('../../services/clarity')
  const { startClarityRuntime } = await import('../../services/clarityRuntime')
  startClarityRuntime({
    projectId: '3t0wlogvdz',
    adsTools: '',
    router: { currentRoute: current, beforeEach: (guard: Guard) => guards.push(guard) },
    onNavigationEnd: callback => ends.push(callback),
    idle: callback => void idleQueue.push(callback),
  } as Parameters<typeof startClarityRuntime>[0])
  await flush()
}

/** The tag and clarity.js arriving after the runtime inserted the tag. */
function arrive() {
  expect(tagScripts()).toBe(1)
  fake.runTag()
  fake.runLibrary()
}

/** A router navigation: guards, the URL change (the router's pushState), the end hook. */
async function navigate(fullPath: string, name = 'page') {
  const to = route(fullPath, name)
  const from = current.value
  for (const guard of guards) guard(to, from)
  window.history.pushState({}, '', fullPath)
  current.value = to
  for (const end of ends) end()
  await flush()
}

/** Back or forward: the browser changes the URL and fires popstate; then the router runs. */
async function goBack(fullPath: string, name = 'page') {
  fake.browserGoTo(fullPath)
  const to = route(fullPath, name)
  const from = current.value
  for (const guard of guards) guard(to, from)
  current.value = to
  for (const end of ends) end()
  await flush()
}

beforeEach(() => {
  vi.resetModules()
  guards = []
  ends = []
  idleQueue = []
  delete host().clarity
  document.head.replaceChildren()
  // A browser in the recorded half everywhere; the sampling tests set their own seed.
  localStorage.setItem('cu-clarity-seed', '0.1')
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    listeners.push([window, type, listener, options])
    originalWindowAdd(type, listener, options)
  })
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    listeners.push([document, type, listener, options])
    originalDocumentAdd(type, listener, options)
  })
  fake = createFakeClarity()
})

afterEach(() => {
  fake.restore()
  for (const [target, type, listener, options] of listeners.splice(0))
    target.removeEventListener(type, listener, options as EventListenerOptions)
  for (const cookie of ['cu_consent', '_clck', '_clsk'])
    document.cookie = `${cookie}=; Max-Age=0; path=/`
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true })
  sessionStorage.clear()
  localStorage.clear()
  delete host().clarity
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.doUnmock('~/services/clarityRuntime')
})

describe('the plugin', () => {
  type Ready = () => void
  let ready: Ready[]
  let idle: Array<{ callback: () => void; options: unknown }>
  let runtime: { startClarityRuntime: ReturnType<typeof vi.fn> }

  async function setup(clarityId: string) {
    ready = []
    idle = []
    runtime = { startClarityRuntime: vi.fn() }
    vi.doMock('~/services/clarityRuntime', () => runtime)
    vi.stubGlobal('defineNuxtPlugin', (setup: unknown) => setup)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { clarityId, adsTools: 'light' } }))
    vi.stubGlobal('useRouter', () => ({ beforeEach: vi.fn(), currentRoute: { value: {} } }))
    vi.stubGlobal('onNuxtReady', (callback: Ready) => ready.push(callback))
    vi.stubGlobal('requestIdleCallback', (callback: () => void, options: unknown) =>
      idle.push({ callback, options })
    )
    const plugin = (await import('../../plugins/clarity.client')).default as unknown as (
      app: unknown
    ) => void
    plugin({ hook: vi.fn() })
  }

  it('with no project id registers nothing, fetches nothing and loads nothing', async () => {
    await setup('')
    expect(ready).toEqual([])
    expect(listeners).toEqual([])
    expect(runtime.startClarityRuntime).not.toHaveBeenCalled()
    expect(host().clarity).toBeUndefined()
  })

  it('fetches the runtime after hydration, in an idle moment, and hands it the id', async () => {
    await setup('3t0wlogvdz')
    expect(idle).toEqual([])
    ready.forEach(callback => callback())
    expect(idle).toHaveLength(1)
    expect(idle[0]!.options).toEqual({ timeout: 8000 })
    expect(runtime.startClarityRuntime).not.toHaveBeenCalled()
    idle[0]!.callback()
    await vi.dynamicImportSettled()
    expect(runtime.startClarityRuntime).toHaveBeenCalledTimes(1)
    expect(runtime.startClarityRuntime.mock.calls[0]![0]).toMatchObject({
      projectId: '3t0wlogvdz',
      adsTools: 'light',
    })
  })

  it('a tab opened in the background waits until someone looks at it', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await setup('3t0wlogvdz')
    ready.forEach(callback => callback())
    expect(idle).toEqual([])
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(idle).toHaveLength(1)
  })
})

describe('when Clarity loads', () => {
  it('an undecided visitor in Uruguay: consent queued before anything, then the tags', async () => {
    await boot({ strict: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(tagScripts()).toBe(1)
    const queue = host().clarity!.q!
    expect(queue[0]).toEqual(['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }])
    expect(queue).toContainEqual(['set', 'template', 'dolar-hoy'])
    expect(queue).toContainEqual(['set', 'family', 'cotizaciones'])
    expect(queue).toContainEqual(['set', 'consent', 'por-defecto'])
    arrive()
    expect(fake.images).toEqual([])
  })

  it('an undecided visitor in a strict region waits for "Aceptar", with nothing stored', async () => {
    localStorage.removeItem('cu-clarity-seed')
    // A rental page records every browser, whatever seed comes out after "Aceptar".
    await boot({ at: '/alquileres-uruguay', name: 'alquileres-uruguay', strict: true })
    expect(tagScripts()).toBe(0)
    expect(host().clarity).toBeUndefined()
    // No analytics identifier before consent, not even the sampling seed.
    expect(localStorage.getItem('cu-clarity-seed')).toBeNull()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'granted' }))
    expect(tagScripts()).toBe(0)
    runIdle()
    await flush()
    expect(tagScripts()).toBe(1)
    expect(host().clarity!.q).toContainEqual(['set', 'consent', 'explicita'])
    expect(localStorage.getItem('cu-clarity-seed')).not.toBeNull()
  })

  it('without the region route, a European time zone waits', async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Europe/Berlin',
    } as Intl.ResolvedDateTimeFormatOptions)
    await boot({ strict: 'fail' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(tagScripts()).toBe(0)
  })

  it('without the region route, a Montevideo time zone loads', async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'America/Montevideo',
    } as Intl.ResolvedDateTimeFormatOptions)
    await boot({ strict: 'fail' })
    expect(tagScripts()).toBe(1)
    // Not cached: the next page asks the server again.
    expect(sessionStorage.getItem('cu-consent-region')).toBeNull()
  })

  it('asks the region once per tab', async () => {
    await boot({ strict: false })
    expect(sessionStorage.getItem('cu-consent-region')).toBe('0')
  })

  it('a stored rejection loads nothing, asks for no region and clears old cookies', async () => {
    document.cookie = 'cu_consent=denied; path=/'
    document.cookie = '_clck=abc; path=/'
    await boot()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(tagScripts()).toBe(0)
    expect(document.cookie).not.toMatch(/_clck=/)
  })

  it('Global Privacy Control loads nothing, even after "Aceptar"', async () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true })
    document.cookie = 'cu_consent=granted; path=/'
    await boot()
    expect(tagScripts()).toBe(0)
  })

  it('a browser outside the sampled half records only the rental pages', async () => {
    localStorage.setItem('cu-clarity-seed', '0.9')
    await boot({ at: '/dolar-hoy' })
    expect(tagScripts()).toBe(0)
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    expect(tagScripts()).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('cu-clarity-seed')).toBe('0.9')
  })

  it('a tab opened from a search with the reference address records nothing at all', async () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://cambio-uruguay.com/alquileres-uruguay?refLat=-34.9&refLabel=Bulevar%20Artigas'
    )
    await boot({ at: '/alquileres/montevideo-cordon-1rt3jaj', name: 'alquileres-key' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(tagScripts()).toBe(0)
    await navigate('/dolar-hoy', 'dolar-hoy')
    expect(tagScripts()).toBe(0)
  })

  it('an excluded landing page asks for nothing until the visitor reaches one it may record', async () => {
    await boot({ at: '/pizarra' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(tagScripts()).toBe(0)
    await navigate('/dolar-hoy', 'dolar-hoy')
    expect(tagScripts()).toBe(1)
  })
})

describe('when the site stops it', () => {
  it('before a navigation to /cuenta, without restarting there; back on a public page it starts', async () => {
    await boot()
    arrive()
    await navigate('/cuenta', 'cuenta')
    expect(fake.active).toBe(false)
    fake.tick()
    expect(network().filter(item => item.url.includes('/cuenta'))).toEqual([])
    await navigate('/dolar-hoy', 'dolar-hoy')
    expect(fake.active).toBe(true)
    fake.tick()
    expect(network().at(-1)!.url).toBe('https://cambio-uruguay.com/dolar-hoy')
    expect(tags()).toContainEqual(['template', 'dolar-hoy'])
    expect(fake.warnings).toEqual([])
  })

  it('on back/forward to an excluded page, in the capture phase, before Clarity sees it', async () => {
    await boot()
    arrive()
    await goBack('/conectar?oobCode=abc', 'conectar')
    expect(fake.active).toBe(false)
    // The last batch of the page it recorded leaves with the new URL, its code dropped.
    expect(network().map(item => item.url)).not.toContainEqual(expect.stringContaining('abc'))
  })

  it('on "Rechazar": stopped before gtag hears it, cookies deleted, never restarted', async () => {
    await boot()
    arrive()
    document.cookie = '_clck=abc; path=/'
    document.cookie = '_clsk=def; path=/'
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'denied' }))
    expect(fake.active).toBe(false)
    expect(document.cookie).not.toMatch(/_cl(?:ck|sk)=/)
    const before = network().length
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    runIdle()
    fake.tick()
    expect(fake.active).toBe(false)
    expect(network()).toHaveLength(before)
  })

  it('from the fourth filter change on a directory, until the visitor leaves it', async () => {
    await boot({ at: '/alquileres-uruguay', name: 'alquileres-uruguay' })
    arrive()
    for (let index = 1; index <= 4; index++) await navigate(`/alquileres-uruguay?pagina=${index}`)
    expect(fake.active).toBe(false)
    await navigate('/alquileres-uruguay?pagina=5')
    expect(fake.active).toBe(false)
    await navigate('/alquileres/montevideo-cordon-1rt3jaj', 'alquileres-key')
    expect(fake.active).toBe(true)
  })

  it('mirrors data-cta clicks as Clarity events, and drops them while stopped', async () => {
    await boot()
    arrive()
    const button = document.createElement('button')
    button.dataset.cta = 'rental-feedback-si'
    document.body.append(button)
    button.click()
    expect(fake.calls).toContainEqual(expect.objectContaining({ method: 'event' }))
    await navigate('/cuenta', 'cuenta')
    button.click()
    expect(fake.calls.filter(call => call.method === 'event')).toHaveLength(1)
    button.remove()
  })
})

describe('when Clarity restarts on its own', () => {
  it('paused after idle minutes, then a navigation to /cuenta: nothing recorded there', async () => {
    await boot()
    arrive()
    fake.suspend()
    await navigate('/cuenta', 'cuenta')
    document.dispatchEvent(new Event('mousemove'))
    window.dispatchEvent(new Event('scroll'))
    fake.tick()
    expect(fake.active).toBe(false)
    expect(network().filter(item => item.url.includes('/cuenta'))).toEqual([])
  })

  it('paused after idle minutes, then Back to /cuenta: nothing recorded there', async () => {
    await boot()
    arrive()
    fake.suspend()
    await goBack('/cuenta', 'cuenta')
    document.dispatchEvent(new Event('touchstart'))
    fake.tick()
    expect(fake.active).toBe(false)
    expect(network().filter(item => item.url.includes('/cuenta'))).toEqual([])
  })

  it('restored from the back/forward cache after "Rechazar": stopped again, cookies gone', async () => {
    await boot()
    arrive()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'denied' }))
    const before = network().length
    fake.bfcacheRoundTrip()
    // clarity-js restarted itself: parked, it recorded into nothing. The runtime looks next.
    expect(fake.active).toBe(true)
    runIdle()
    expect(fake.active).toBe(false)
    expect(network()).toHaveLength(before)
    expect(document.cookie).not.toMatch(/_cl(?:ck|sk)=/)
  })

  it('restored from the back/forward cache on /cuenta: stopped again, nothing sent', async () => {
    await boot()
    arrive()
    await navigate('/cuenta', 'cuenta')
    const before = network().length
    fake.bfcacheRoundTrip()
    runIdle()
    expect(fake.active).toBe(false)
    expect(network()).toHaveLength(before)
  })

  it('restored from the back/forward cache on a recorded page: its tags are sent again', async () => {
    await boot()
    arrive()
    const before = tags().length
    fake.bfcacheRoundTrip()
    runIdle()
    expect(fake.active).toBe(true)
    expect(tags().slice(before)).toContainEqual(['template', 'dolar-hoy'])
  })

  it('its own 250 ms restart, pending when the visitor heads to /cuenta, sends nothing', async () => {
    await boot({ at: '/precio/yerba', name: 'precio-slug' })
    arrive()
    window.history.replaceState({}, '', '/precio/yerba?orden=precio')
    await navigate('/cuenta', 'cuenta')
    fake.runTimers()
    fake.tick()
    expect(network().filter(item => item.url.includes('/cuenta'))).toEqual([])
  })
})

describe('"Aceptar"', () => {
  it('after "Rechazar" in the same page view: records again, and the ad sync never fires', async () => {
    fake.installConsentMode({ ad_storage: 1, analytics_storage: 1 })
    await boot()
    arrive()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'denied' }))
    fake.consentUpdate({ ad_storage: 2, analytics_storage: 2 })
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'granted' }))
    fake.consentUpdate({ ad_storage: 1, analytics_storage: 1 })
    expect(fake.active).toBe(false)
    runIdle()
    await flush()
    expect(fake.active).toBe(true)
    fake.tick()
    expect(fake.images).toEqual([])
    expect(tags()).toContainEqual(['consent', 'explicita'])
  })

  it('while recording by default: stopped while gtag hears it, then tagged as explicit', async () => {
    fake.installConsentMode({ ad_storage: 2, analytics_storage: 1 })
    await boot()
    arrive()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'granted' }))
    expect(fake.active).toBe(false)
    fake.consentUpdate({ ad_storage: 1, analytics_storage: 1 })
    runIdle()
    await flush()
    expect(fake.active).toBe(true)
    fake.tick()
    expect(fake.images).toEqual([])
    expect(tags().at(-1)).toEqual(['consent', 'explicita'])
  })
})

describe('a decision taken in another tab', () => {
  it('"Rechazar" there stops this tab at its next navigation, and deletes the cookies', async () => {
    await boot()
    arrive()
    document.cookie = 'cu_consent=denied; path=/'
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    expect(fake.active).toBe(false)
    expect(service.isRecording()).toBe(false)
    expect(document.cookie).not.toMatch(/_cl(?:ck|sk)=/)
  })

  it('"Rechazar" there stops this tab when the visitor comes back to it', async () => {
    await boot()
    arrive()
    document.cookie = 'cu_consent=denied; path=/'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(fake.active).toBe(false)
  })

  it('"Aceptar" here after an old "Rechazar" is not undone by the cookie still saying denied', async () => {
    document.cookie = 'cu_consent=denied; path=/'
    document.cookie = 'cu_consent=granted; path=/'
    await boot()
    arrive()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'denied' }))
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'granted' }))
    // useCookie has not written "granted" yet: the cookie still holds the old answer.
    document.cookie = 'cu_consent=denied; path=/'
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    runIdle()
    await flush()
    expect(fake.active).toBe(true)
  })

  it('a decision taken here a moment ago is not undone by the cookie it has not written yet', async () => {
    await boot()
    arrive()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'denied' }))
    // useCookie writes cu_consent after the event: a navigation in between reads the old value.
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    runIdle()
    expect(fake.active).toBe(false)
  })
})
