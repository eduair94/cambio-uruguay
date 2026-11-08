import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_UNSAFE_PARAMS,
  hasAnalyticsUnsafeQuery,
  withoutSignInHandoff,
} from '../../utils/analyticsUrl'
import { isBareRoute } from '../../utils/bareRoutes'

// 2026-11-08, measured in production: a Discord sign-in lands on /cuenta?ct=<Firebase custom
// token> and the first GA4 page_view carried the token (dl=…?ct=…) before it left the address bar.
describe('what analytics must never read in a page URL', () => {
  it('flags sign-in hand-offs and the rental reference point, nothing else', () => {
    for (const search of [
      '?ct=eyJhbGciOi',
      '?authError=discord',
      '?magic=1&apiKey=AIza&oobCode=abc&mode=signIn&lang=es',
      '?refLat=-34.9&refLng=-56.1&refLabel=Casa',
      '?link=https%3A%2F%2Fx',
    ])
      expect(hasAnalyticsUnsafeQuery(search), search).toBe(true)
    for (const search of ['', '?department=Montevideo', '?mode=budget', '?lang=en', '?q=ct'])
      expect(hasAnalyticsUnsafeQuery(search), search).toBe(false)
    expect(ANALYTICS_UNSAFE_PARAMS).not.toContain('mode')
  })

  it('treats /mi-lista’s share token as unsafe on that page only', () => {
    expect(hasAnalyticsUnsafeQuery('?l=eyJ6b25lIjp7fQ', '/mi-lista')).toBe(true)
    expect(hasAnalyticsUnsafeQuery('?l=eyJ6b25lIjp7fQ', '/en/mi-lista')).toBe(true)
    expect(hasAnalyticsUnsafeQuery('?l=2', '/historico')).toBe(false)
    expect(hasAnalyticsUnsafeQuery('', '/mi-lista')).toBe(false)
  })

  it('drops an emailed link and its companions, keeping the page’s own filters', () => {
    expect(
      withoutSignInHandoff({
        magic: '1',
        apiKey: 'AIza',
        oobCode: 'x',
        mode: 'signIn',
        lang: 'es',
        continueUrl: 'u',
        tab: 'alertas',
      })
    ).toEqual({ tab: 'alertas' })
    // Without an oobCode, `mode` and `lang` are real parameters of the page.
    expect(withoutSignInHandoff({ mode: 'budget', lang: 'en', ct: 't' })).toEqual({
      mode: 'budget',
      lang: 'en',
    })
  })
})

// The real plugin, transpiled and run with stubs: no Nuxt, no browser, no Google request.
function boot(path: string, search: string) {
  const file = resolve(__dirname, '../../plugins/gtag-init.client.ts')
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.client', 'true')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const state = {
    initialized: 0,
    timers: [] as Array<() => void>,
    afterEach: [] as Array<(to: { path: string }) => void>,
    now: 0,
  }
  const window = { location: { pathname: path, search } }
  const context: Record<string, any> = {
    exports: {},
    require: (name: string) => {
      if (name === '~/utils/analyticsUrl') return { hasAnalyticsUnsafeQuery }
      if (name === '~/utils/bareRoutes') return { isBareRoute }
      throw new Error(`Unexpected import: ${name}`)
    },
    defineNuxtPlugin: (fn: unknown) => fn,
    useGtag: () => ({ initialize: () => state.initialized++ }),
    useRouter: () => ({
      afterEach: (cb: (to: { path: string }) => void) => state.afterEach.push(cb),
    }),
    window,
    setInterval: (cb: () => void) => {
      state.timers.push(cb)
      return state.timers.length
    },
    clearInterval: (id: number) => {
      state.timers[id - 1] = () => {}
    },
    Date: { now: () => state.now },
  }
  runInNewContext(outputText, context)
  context.exports.default({})
  const tick = (ms: number) => {
    state.now += ms
    for (const timer of [...state.timers]) timer()
  }
  return { state, window, tick }
}

describe('gtag waits for a clean address bar', () => {
  it('starts at once on an ordinary page', () => {
    expect(boot('/dolar-hoy', '?utm_source=x').state.initialized).toBe(1)
  })

  it('waits while a sign-in token is in the URL, and starts once its code removed it', () => {
    const { state, window, tick } = boot('/cuenta', '?ct=eyJhbGciOi')
    expect(state.initialized).toBe(0)
    tick(250)
    expect(state.initialized).toBe(0)
    window.location.search = ''
    tick(250)
    expect(state.initialized).toBe(1)
    tick(250)
    expect(state.initialized).toBe(1)
  })

  it('skips the view if the token never leaves, and starts on the next navigation', () => {
    const { state, window, tick } = boot('/cuenta', '?magic=1&oobCode=x&apiKey=y')
    tick(61_000)
    expect(state.initialized).toBe(0)
    window.location.pathname = '/dolar-hoy'
    window.location.search = ''
    for (const cb of state.afterEach) cb({ path: '/dolar-hoy' })
    expect(state.initialized).toBe(1)
  })

  it('never starts on a bare route', () => {
    expect(boot('/pizarra', '').state.initialized).toBe(0)
  })
})
