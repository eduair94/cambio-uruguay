// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import * as BrowserSentry from '@sentry/browser'
import type { Envelope } from '@sentry/nuxt'
import { sentryErrorOptions } from '../../utils/sentryPrivacy'

// Nuxt/Vite picks the browser export in production. Node-based Vitest needs
// that same export selected explicitly; capture still uses the real SDK.
vi.mock('@sentry/nuxt', () => import('@sentry/browser'))

afterEach(async () => {
  await BrowserSentry.close(1000)
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('captures Vue, window errors and unhandled promise rejections without DOM/session data', async () => {
  const config = {
    dsn: 'https://public@sentry.example.invalid/1',
    enabled: true,
    environment: 'production',
    release: 'cambio-uruguay-app@browser-test',
  }
  const envelopes: Envelope[] = []
  window.history.replaceState({}, '', '/alquileres-uruguay?monthlyMax=private-budget')
  BrowserSentry.init({
    ...sentryErrorOptions(config, 'browser', () => window.location.pathname),
    transport: () => ({
      send: async envelope => {
        envelopes.push(envelope)
        return { statusCode: 200 }
      },
      flush: async () => true,
    }),
  })
  vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { sentry: config } }))
  vi.stubEnv('NODE_ENV', 'production')
  const { default: plugin } = await import('../../plugins/sentry.client')
  const hooks = new Map<string, (error: unknown) => unknown>()
  plugin.setup({
    hook: (name: string, fn: (error: unknown) => unknown) => hooks.set(name, fn),
  } as never)
  const vueError = new TypeError(
    'Cannot read properties of undefined (reading private-email@example.invalid)'
  )
  hooks.get('vue:error')!(vueError)
  hooks.get('app:error')!(vueError)
  // Invoke the handlers installed by the real GlobalHandlers integration;
  // direct rejected promises would incorrectly fail Vitest's own runner.
  window.onerror!(
    'private-window-message',
    '/_nuxt/app.js?private-query',
    10,
    20,
    new Error('private-window-error')
  )
  const rejection = new window.Event('unhandledrejection')
  Object.defineProperty(rejection, 'reason', {
    value: new RangeError('Maximum call stack size exceeded private-promise'),
  })
  window.onunhandledrejection!(rejection as PromiseRejectionEvent)
  await BrowserSentry.flush(1000)
  expect(envelopes).toHaveLength(3)
  expect(envelopes.flatMap(envelope => envelope[1].map(item => item[0].type))).toEqual([
    'event',
    'event',
    'event',
  ])
  const body = JSON.stringify(envelopes)
  expect(body).toContain('Cannot read a property of null or undefined')
  expect(body).toContain('Maximum call stack size exceeded')
  expect(body).not.toContain('private-')
  expect(
    envelopes.every(
      envelope =>
        (envelope[1][0][1] as { tags: { route: string } }).tags.route === '/alquileres-uruguay'
    )
  ).toBe(true)
  for (const category of ['breadcrumbs', 'replay', 'session', 'user', 'request'])
    expect(body).not.toContain(`"${category}"`)
})
