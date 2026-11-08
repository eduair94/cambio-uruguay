// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://cambio-uruguay.com/dolar-hoy" }
// plugins/clarity.client.ts end to end, with Nuxt's auto-imports stubbed: when Clarity loads, what
// it is told first, and when the site stops it. clarity.js itself never loads here (jsdom fetches
// no external script); a test that needs it running swaps in a fake carrying a version, as the
// real library does when it replaces the stub.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  return {
    path: url.pathname,
    fullPath,
    name,
    query: Object.fromEntries(url.searchParams),
  }
}

const listeners: Array<[EventTarget, string, EventListenerOrEventListenerObject, unknown]> = []
const originalWindowAdd = window.addEventListener.bind(window)
const originalDocumentAdd = document.addEventListener.bind(document)

let guards: Guard[]
let hooks: Record<string, () => unknown>
let ready: Array<() => void>
let current: { value: Route }
let fetchMock: ReturnType<typeof vi.fn>
let clarityId: string

function host() {
  return window as unknown as { clarity?: Fn }
}
const tagScripts = () =>
  document.head.querySelectorAll('script[src^="https://www.clarity.ms/tag/"]').length
const flush = async () => {
  for (let index = 0; index < 6; index++) await Promise.resolve()
}

async function boot(options: { at?: string; strict?: boolean | 'fail' } = {}) {
  current = { value: route(options.at ?? '/dolar-hoy', 'dolar-hoy') }
  window.history.replaceState({}, '', current.value.fullPath)
  fetchMock = vi.fn(async () => {
    if (options.strict === 'fail') throw new Error('offline')
    return { ok: true, json: async () => ({ strict: options.strict ?? false }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('defineNuxtPlugin', (setup: unknown) => setup)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { clarityId, adsTools: '' } }))
  vi.stubGlobal('useRouter', () => ({
    currentRoute: current,
    beforeEach: (guard: Guard) => guards.push(guard),
  }))
  vi.stubGlobal('onNuxtReady', (callback: () => void) => ready.push(callback))
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => callback())
  const plugin = (await import('../../plugins/clarity.client')).default as unknown as (
    app: unknown
  ) => void
  plugin({ hook: (name: string, callback: () => unknown) => (hooks[name] = callback) })
  ready.forEach(callback => callback())
  await flush()
}

/** A router navigation: guards, the URL change, then Nuxt's end-of-navigation hook. */
async function navigate(fullPath: string, name = 'page') {
  const to = route(fullPath, name)
  const from = current.value
  for (const guard of guards) guard(to, from)
  window.history.pushState({}, '', fullPath)
  current.value = to
  await hooks['page:loading:end']?.()
  await flush()
}

/** clarity.js runs: it replaces the stub with its own function, which records every call. */
function libraryTakesOver(): unknown[][] {
  const calls: unknown[][] = []
  host().clarity = Object.assign((...args: unknown[]) => void calls.push(args), { v: '0.8.77' })
  return calls
}

beforeEach(() => {
  vi.resetModules()
  guards = []
  hooks = {}
  ready = []
  clarityId = '3t0wlogvdz'
  delete host().clarity
  document.head.replaceChildren()
  // A browser in the recorded half everywhere; the sampling test sets its own seed.
  localStorage.setItem('cu-clarity-seed', '0.1')
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    listeners.push([window, type, listener, options])
    originalWindowAdd(type, listener, options)
  })
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    listeners.push([document, type, listener, options])
    originalDocumentAdd(type, listener, options)
  })
})

afterEach(() => {
  for (const [target, type, listener, options] of listeners.splice(0))
    target.removeEventListener(type, listener, options as EventListenerOptions)
  for (const cookie of ['cu_consent', '_clck', '_clsk'])
    document.cookie = `${cookie}=; Max-Age=0; path=/`
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true })
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('when Clarity loads', () => {
  it('with no project id it registers nothing and loads nothing', async () => {
    clarityId = ''
    await boot()
    expect(guards).toEqual([])
    expect(hooks).toEqual({})
    expect(ready).toEqual([])
    expect(listeners).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(host().clarity).toBeUndefined()
  })

  it('an undecided visitor in Uruguay: after the idle start, consent queued before anything', async () => {
    await boot({ strict: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(tagScripts()).toBe(1)
    const queue = host().clarity!.q!
    expect(queue[0]).toEqual(['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }])
    expect(queue).toContainEqual(['set', 'template', 'dolar-hoy'])
    expect(queue).toContainEqual(['set', 'family', 'cotizaciones'])
    expect(queue).toContainEqual(['set', 'consent', 'por-defecto'])
  })

  it('an undecided visitor in a strict region waits for "Aceptar"', async () => {
    await boot({ strict: true })
    expect(tagScripts()).toBe(0)
    expect(host().clarity).toBeUndefined()
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'granted' }))
    await flush()
    expect(tagScripts()).toBe(1)
    expect(host().clarity!.q).toContainEqual(['set', 'consent', 'explicita'])
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
    expect(fetchMock).not.toHaveBeenCalled()
    expect(tagScripts()).toBe(0)
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    expect(tagScripts()).toBe(1)
    expect(localStorage.getItem('cu-clarity-seed')).toBe('0.9')
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
    const calls = libraryTakesOver()
    await navigate('/cuenta', 'cuenta')
    expect(calls).toEqual([['stop']])
    await navigate('/dolar-hoy', 'dolar-hoy')
    expect(calls.slice(1, 2)).toEqual([['start', {}]])
    expect(calls).toContainEqual(['set', 'template', 'dolar-hoy'])
  })

  it('on back/forward to an excluded page, in the capture phase, before any guard', async () => {
    await boot()
    const calls = libraryTakesOver()
    window.history.pushState({}, '', '/conectar?oobCode=abc')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(calls).toEqual([['stop']])
  })

  it('on "Rechazar": stopped before gtag hears it, cookies deleted, never restarted', async () => {
    await boot()
    const calls = libraryTakesOver()
    document.cookie = '_clck=abc; path=/'
    document.cookie = '_clsk=def; path=/'
    window.dispatchEvent(new CustomEvent('cu:consent', { detail: 'denied' }))
    expect(calls).toEqual([['stop']])
    expect(document.cookie).not.toMatch(/_cl(?:ck|sk)=/)
    await navigate('/alquileres-uruguay', 'alquileres-uruguay')
    expect(calls).toEqual([['stop']])
  })

  it('from the fourth filter change on a directory, until the visitor leaves it', async () => {
    await boot({ at: '/alquileres-uruguay' })
    const calls = libraryTakesOver()
    for (let index = 1; index <= 4; index++) await navigate(`/alquileres-uruguay?pagina=${index}`)
    const starts = () => calls.filter(([method]) => method === 'start').length
    expect(starts()).toBe(3)
    await navigate('/alquileres-uruguay?pagina=5')
    expect(starts()).toBe(3)
    await navigate('/alquileres/montevideo-cordon-1rt3jaj', 'alquileres-key')
    expect(starts()).toBe(4)
  })

  it('mirrors data-cta clicks as Clarity events, and drops them while stopped', async () => {
    await boot()
    const calls = libraryTakesOver()
    const button = document.createElement('button')
    button.dataset.cta = 'rental-feedback-si'
    document.body.append(button)
    button.click()
    expect(calls).toContainEqual(['event', 'cta_rental-feedback-si'])
    await navigate('/cuenta', 'cuenta')
    button.click()
    expect(calls.filter(([method]) => method === 'event')).toHaveLength(1)
    button.remove()
  })
})
