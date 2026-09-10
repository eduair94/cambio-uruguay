import { describe, expect, it } from 'vitest'
import type { Event, EventHint } from '@sentry/nuxt'
import {
  sanitizeSentryEvent,
  sentryErrorOptions,
  sentryErrorsEnabled,
  sentryHttpStatus,
  sentryMongoCode,
  sentryRouteCategory,
} from '../../utils/sentryPrivacy'

const config = {
  dsn: 'https://public@sentry.example.invalid/1',
  enabled: true,
  environment: 'production',
  release: 'cambio-uruguay-app@0123456789ab',
}

describe('Sentry errors privacy boundary', () => {
  it('requires an ingestion DSN and never enables dev, tests, prerender or preflight', () => {
    expect(sentryErrorsEnabled(config)).toBe(true)
    for (const context of [
      { dev: true },
      { test: true },
      { prerender: true },
      { preflight: true },
    ]) {
      expect(sentryErrorsEnabled(config, context)).toBe(false)
    }
    for (const enabled of [false, '0', 'false', 'FALSE'])
      expect(sentryErrorsEnabled({ ...config, enabled })).toBe(false)
    for (const dsn of [
      '',
      'http://public@example.invalid/1',
      'https://example.invalid/1',
      'https://public:private@example.invalid/1',
    ])
      expect(sentryErrorsEnabled({ ...config, dsn })).toBe(false)
  })

  it.each([
    ['/pt/alquileres-uruguay?department=secret&budget=12000#token', '/alquileres-uruguay'],
    ['/alquileres/private-address-123?uid=someone', '/alquileres/:item'],
    ['/api/me/rental-alerts/private-id?token=secret', '/api/me/rental-alerts/:item'],
    ['/api/rentals?source=private', '/api/rentals'],
    ['/api/rentals/budget?neighborhood=secret', '/api/rentals/budget'],
    ['/api/rentals/geocode?q=private-address', '/api/rentals/geocode'],
    [
      '/__og-image__/image/pt/historico/private-origin/og.png?token=secret',
      '/__og-image__/image/historico/:item',
    ],
    [
      '/__og-image__/static/alquileres/private-house/og.png',
      '/__og-image__/static/alquileres/:item',
    ],
    ['/__og-image__/image/private-page/og.png', '/__og-image__/image/other'],
    ['/__og-image__/image/og.png', '/__og-image__/image/'],
    ['/__og-image__/image/__og-image__/image/private', '/__og-image__/image/other'],
    ['/__og-image__/image/pt/__og-image__/image/private', '/__og-image__/image/other'],
    ['/unlisted-private-path', '/other'],
  ])('redacts route %s', (path, category) => expect(sentryRouteCategory(path)).toBe(category))

  it('keeps OG categories stable when a hook and beforeSend both sanitize them', () => {
    for (const path of [
      '/__og-image__/image/historico/private/og.png',
      '/__og-image__/static/alquileres/private/og.png',
      '/__og-image__/image/private/og.png',
      '/__og-image__/image/og.png',
    ]) {
      const category = sentryRouteCategory(path)
      expect(sentryRouteCategory(category)).toBe(category)
    }
  })

  it.each([
    [
      '[Nuxt OG Image] HTML response from /private?email=private@example.invalid is missing the #nuxt-og-image-options script tag. Make sure you have defined an og image for this page.',
      'OG image metadata missing from page',
    ],
    [
      '[Nuxt OG Image] Failed to read the path /private?token=private for og-image extraction, returning no HTML.',
      'OG image page returned no HTML',
    ],
  ])('preserves the technical OG failure without its page URL: %s', (value, expected) => {
    const result = sanitizeSentryEvent(
      { tags: { http_status: '500' }, exception: { values: [{ type: 'Error', value }] } },
      {},
      config,
      'nitro'
    )!
    expect(result.exception?.values?.[0].value).toBe(expected)
    expect(JSON.stringify(result)).not.toContain('private')
    expect(result.tags?.http_status).toBe('500')
  })

  it('projects only technical fields, including nested frames and attachments', () => {
    const secret = 'private-email@example.invalid'
    const event = {
      event_id: 'a'.repeat(32),
      timestamp: 1234,
      message: secret,
      user: { id: secret, email: secret, ip_address: '127.1.2.3' },
      request: {
        url: `https://cambio-uruguay.com/alquileres/private-house?token=${secret}`,
        headers: { authorization: secret },
        cookies: secret,
        data: secret,
      },
      contexts: { vue: { props: { email: secret } }, trace: { data: secret } },
      extra: { mongoQuery: secret },
      breadcrumbs: [{ message: secret }],
      tags: { uid: secret, department: secret, http_status: '503' },
      exception: {
        values: [
          {
            type: 'MongoServerError',
            value: `Sort exceeded memory limit of 104857600 bytes ${secret}`,
            stacktrace: {
              frames: [
                {
                  filename: `file:///private/user/project/server/chunks/rentals-AbCd.mjs?token=${secret}`,
                  function: secret,
                  context_line: secret,
                  pre_context: [secret],
                  vars: { secret },
                  lineno: 42,
                  colno: 5,
                },
              ],
            },
            mechanism: { data: { secret } },
          },
        ],
      },
    } as unknown as Event
    const hint: EventHint = { attachments: [{ filename: 'private.txt', data: secret }] }
    const result = sanitizeSentryEvent(event, hint, config, 'nitro')!
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(result).not.toHaveProperty('request')
    expect(result).not.toHaveProperty('user')
    expect(result).not.toHaveProperty('contexts')
    expect(result.exception?.values?.[0].value).toBe('MongoDB sort exceeded memory limit')
    expect(result.exception?.values?.[0].stacktrace?.frames).toEqual([
      { filename: 'rentals-AbCd.mjs', lineno: 42, colno: 5 },
    ])
    expect(result.tags).toEqual({
      application: 'cambio-uruguay-app',
      runtime: 'nitro',
      route: '/alquileres/:item',
      http_status: '503',
    })
    expect(hint.attachments).toEqual([])
  })

  it('withholds arbitrary error text, custom classes, and every non-error event', () => {
    const result = sanitizeSentryEvent(
      {
        exception: {
          values: [
            { type: 'Customer_private', value: 'Private customer input from a rental search' },
          ],
        },
      },
      {},
      config,
      'browser'
    )!
    expect(result.exception?.values?.[0]).toMatchObject({
      type: 'Error',
      value: 'Error message withheld; inspect the bundled stack',
    })
    for (const type of ['transaction', 'replay_event', 'profile', 'log'])
      expect(sanitizeSentryEvent({ type } as Event, {}, config, 'browser')).toBeNull()
    expect(sanitizeSentryEvent({ message: 'console private' }, {}, config, 'browser')).toBeNull()
  })

  it('deduplicates the same exception but preserves separate failures', () => {
    const options = sentryErrorOptions(config, 'nitro')
    const event = { exception: { values: [{ type: 'Error', value: 'private' }] } }
    const error = new Error('private')
    expect(options.beforeSend(event, { originalException: error })).not.toBeNull()
    expect(options.beforeSend(event, { originalException: error })).toBeNull()
    expect(options.beforeSend(event, { originalException: new Error('private') })).not.toBeNull()
  })

  it('has an explicit allowlist excluding all recording, requests, console, context and tracing', () => {
    const names = [
      'InboundFilters',
      'FunctionToString',
      'BrowserApiErrors',
      'GlobalHandlers',
      'Dedupe',
      'OnUncaughtException',
      'OnUnhandledRejection',
      'Breadcrumbs',
      'HttpContext',
      'RequestData',
      'Http',
      'NodeFetch',
      'ContextLines',
      'LocalVariables',
      'Context',
      'BrowserSession',
      'Console',
      'Replay',
      'BrowserTracing',
      'Mongo',
      'LinkedErrors',
      'FutureUnsafeIntegration',
    ]
    const defaults = names.map(name => ({ name }))
    const browser = sentryErrorOptions(config, 'browser')
    const nitro = sentryErrorOptions(config, 'nitro')
    expect(browser.integrations(defaults).map(item => item.name)).toEqual(names.slice(0, 5))
    expect(nitro.integrations(defaults).map(item => item.name)).toEqual([
      'InboundFilters',
      'FunctionToString',
      'OnUncaughtException',
      'OnUnhandledRejection',
    ])
    expect(browser.autoSessionTracking).toBe(false)
    expect(browser.sendDefaultPii).toBe(false)
    expect(browser.tracePropagationTargets).toEqual([])
    expect(browser).not.toHaveProperty('tracesSampleRate')
    expect(browser.beforeBreadcrumb()).toBeNull()
  })

  it('recognizes expected HTTP errors independently of error messages', () => {
    expect(sentryHttpStatus({ statusCode: 503 })).toBe(503)
    expect(sentryHttpStatus({ statusCode: 401 })).toBe(401)
    expect(sentryHttpStatus(new Error('503'))).toBeNull()
  })

  it('drops failures raised inside third-party scripts the page only embeds', () => {
    // AdSense throwing inside its own stack is Google's failure in our page: no
    // change here can fix it, and it competes with our own reports.
    const { denyUrls } = sentryErrorOptions(config, 'browser') as { denyUrls: RegExp[] }
    const denied = (url: string) => denyUrls.some(pattern => pattern.test(url))
    for (const url of [
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://googleads.g.doubleclick.net/pagead/ads',
      'chrome-extension://abcdefghijklmnop/inject.js',
      'moz-extension://1234/content.js',
      'safari-web-extension://5678/script.js',
    ])
      expect(denied(url)).toBe(true)
    for (const url of [
      'https://cambio-uruguay.com/_nuxt/B9YBhYkO.js',
      'https://cambio-uruguay.com/sw.js',
    ])
      expect(denied(url)).toBe(false)
    expect(sentryErrorOptions(config, 'nitro')).not.toHaveProperty('denyUrls')
  })

  it('names the failing API endpoint instead of folding it into /other', () => {
    // Every /api segment here is a directory in `server/api`, so it names the
    // endpoint and never the visitor: only the parameters below it collapse.
    for (const [path, expected] of [
      ['/api/property-sales/ficha/infocasas-private-id?token=secret', '/api/property-sales/:item'],
      ['/api/branches', '/api/branches'],
      ['/api/property-nearby/alquiler/private-key', '/api/property-nearby/:item'],
      ['/api/agencies/private-agency', '/api/agencies/:item'],
      ['/api/__sitemap__/rentals', '/api/__sitemap__/:item'],
      // The deliberate deeper families keep their own precision.
      ['/api/rentals/geocode?q=private-address', '/api/rentals/geocode'],
      ['/api/me/rental-alerts/private-id', '/api/me/rental-alerts/:item'],
    ] as const)
      expect(sentryRouteCategory(path)).toBe(expected)
    // A page keeps the allowlist: its first segment is whatever was requested.
    for (const path of ['/private-invite-code', '/wp-admin/setup.php'])
      expect(sentryRouteCategory(path)).toBe('/other')
    // Folding is idempotent, so a second pass cannot widen or leak it.
    for (const path of ['/api/property-sales/:item', '/api/branches'])
      expect(sentryRouteCategory(sentryRouteCategory(path))).toBe(path)
  })

  it('reports the numeric Mongo failure code from the cause chain and nothing else', () => {
    const mongo = Object.assign(new Error('Sort exceeded memory limit private@example.invalid'), {
      name: 'MongoServerError',
      code: 292,
    })
    expect(sentryMongoCode(Object.assign(new Error('unavailable'), { cause: mongo }))).toBe('292')
    expect(sentryMongoCode(mongo)).toBe('292')
    // Only the driver's own numeric enum: never a string code, a foreign error
    // or a chain long enough to walk an unbounded structure.
    expect(sentryMongoCode(Object.assign(new Error('dns'), { code: 'ENOTFOUND' }))).toBeUndefined()
    expect(
      sentryMongoCode(Object.assign(new Error('x'), { name: 'MongoServerError', code: '292' }))
    ).toBeUndefined()
    expect(sentryMongoCode(new Error('plain'))).toBeUndefined()
    const cyclic: { cause?: unknown } = {}
    cyclic.cause = cyclic
    expect(sentryMongoCode(cyclic)).toBeUndefined()
    let deep: unknown = mongo
    for (let level = 0; level < 6; level += 1)
      deep = Object.assign(new Error('wrap'), { cause: deep })
    expect(sentryMongoCode(deep)).toBeUndefined()
  })

  it('keeps the diagnostic tags only in their technical shapes', () => {
    const tagsFor = (tags: Record<string, string>) =>
      sanitizeSentryEvent(
        { tags, exception: { values: [{ type: 'Error', value: 'x' }] } } as unknown as Event,
        {},
        config,
        'nitro'
      )!.tags
    expect(tagsFor({ mongo_code: '292', og_source: '200' })).toEqual({
      application: 'cambio-uruguay-app',
      runtime: 'nitro',
      route: '/other',
      mongo_code: '292',
      og_source: '200',
    })
    for (const tags of [
      { mongo_code: 'private-collection', og_source: '/alquileres/private-house' },
      { mongo_code: '292 private@example.invalid', og_source: '200 private' },
      { mongo_code: '', og_source: '' },
    ]) {
      const result = tagsFor(tags)
      expect(result).not.toHaveProperty('mongo_code')
      expect(result).not.toHaveProperty('og_source')
    }
    expect(tagsFor({ og_source: 'unobserved' })).toHaveProperty('og_source', 'unobserved')
  })
})
