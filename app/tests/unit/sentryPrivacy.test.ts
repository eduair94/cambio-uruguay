import { describe, expect, it } from 'vitest'
import type { Event, EventHint } from '@sentry/nuxt'
import {
  sanitizeSentryEvent,
  sentryErrorOptions,
  sentryErrorsEnabled,
  sentryHttpStatus,
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
    ['/unlisted-private-path', '/other'],
  ])('redacts route %s', (path, category) => expect(sentryRouteCategory(path)).toBe(category))

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
            { type: 'Customer_private', value: 'uid 123 secret-token query=monthlyMax12000' },
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
})
