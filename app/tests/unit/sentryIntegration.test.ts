import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/nuxt'
import type { Envelope } from '@sentry/nuxt'
import { createApp, createError, defineEventHandler, toNodeListener } from 'h3'
import { createServer } from 'node:http'
import { sentryErrorOptions } from '../../utils/sentryPrivacy'

const config = {
  dsn: 'https://public@sentry.example.invalid/1',
  enabled: true,
  environment: 'production',
  release: 'cambio-uruguay-app@test-release',
}

afterEach(async () => {
  await Sentry.close(1000)
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Sentry SDK real local transport', () => {
  it('emits one scrubbed error envelope, no session/traces/breadcrumbs/attachments', async () => {
    const envelopes: Envelope[] = []
    Sentry.init({
      ...sentryErrorOptions(config, 'nitro'),
      registerEsmLoaderHooks: false,
      skipOpenTelemetrySetup: true,
      transport: () => ({
        send: async envelope => {
          envelopes.push(envelope)
          return { statusCode: 200 }
        },
        flush: async () => true,
      }),
    })
    Sentry.setUser({ id: 'private-uid', email: 'private@example.invalid', ip_address: '127.2.3.4' })
    Sentry.setExtra('body', 'private-body')
    Sentry.addBreadcrumb({ message: 'private-click' })
    Sentry.getCurrentScope().addAttachment({ filename: 'private.txt', data: 'private-attachment' })
    const error = new Error('private@example.invalid access_token=private-token')
    Sentry.captureException(error, {
      tags: { route: '/api/rentals?monthlyMax=12345', http_status: '503', uid: 'private-uid' },
    })
    Sentry.captureException(error)
    await Sentry.flush(1000)
    expect(envelopes).toHaveLength(1)
    expect(envelopes[0][1].map(item => item[0].type)).toEqual(['event'])
    const serialized = JSON.stringify(envelopes)
    for (const secret of [
      'private-uid',
      'private@example.invalid',
      'private-token',
      'private-body',
      'private-click',
      'private-attachment',
      'monthlyMax',
      '127.2.3.4',
    ])
      expect(serialized).not.toContain(secret)
    const event = envelopes[0][1][0][1] as {
      exception: { values: Array<{ value: string }> }
      tags: Record<string, string>
    }
    expect(event.exception.values[0].value).toBe('HTTP 503 error')
    expect(event.tags.route).toBe('/api/rentals')
    const integrations = Sentry.getClient()!
      .getOptions()
      .integrations!.map(item => item.name)
    expect(integrations).toEqual([
      'InboundFilters',
      'FunctionToString',
      'OnUncaughtException',
      'OnUnhandledRejection',
    ])
  })
})

describe('Nitro error lifecycle', () => {
  it('captures a caught-and-rethrown 503, ignores expected 404 and flushes at shutdown', async () => {
    const hooks = new Map<string, (...args: unknown[]) => unknown>()
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    vi.stubGlobal('useRuntimeConfig', () => ({ sentry: config }))
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CU_DEPLOY_PREFLIGHT', '')
    const { default: plugin } = await import('../../server/plugins/sentry')
    const envelopes: Envelope[] = []
    Sentry.init({
      ...sentryErrorOptions(config, 'nitro'),
      registerEsmLoaderHooks: false,
      skipOpenTelemetrySetup: true,
      transport: () => ({
        send: async envelope => {
          envelopes.push(envelope)
          return { statusCode: 200 }
        },
        flush: async () => true,
      }),
    })
    plugin({
      hooks: { hook: (name: string, fn: (...args: unknown[]) => unknown) => hooks.set(name, fn) },
    } as never)
    const cause = new Error(
      'Sort exceeded memory limit of 104857600 bytes: private@example.invalid'
    )
    const failure = createError({
      statusCode: 503,
      statusMessage: 'Rental search is temporarily unavailable',
      cause,
    })
    hooks.get('error')!(failure, {
      event: { path: '/api/rentals?source=private', method: 'GET' },
    })
    hooks.get('error')!(Object.assign(new Error('Not found'), { statusCode: 404 }), { event: {} })
    await hooks.get('close')!()
    expect(envelopes).toHaveLength(1)
    const body = JSON.stringify(envelopes)
    expect(body).toContain('MongoDB sort exceeded memory limit')
    expect(body).toContain('503')
    expect(body).toContain('/api/rentals')
    expect(body).not.toContain('private@example.invalid')
    expect(body).not.toContain('source=private')
  })

  it('registers no handlers or transport in tests or deployment preflight', async () => {
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    vi.stubGlobal('useRuntimeConfig', () => ({ sentry: config }))
    const { default: plugin } = await import('../../server/plugins/sentry')
    const hook = vi.fn()
    plugin({ hooks: { hook } } as never)
    expect(hook).not.toHaveBeenCalled()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CU_DEPLOY_PREFLIGHT', '1')
    plugin({ hooks: { hook } } as never)
    expect(hook).not.toHaveBeenCalled()
  })

  it('H3 production HTTP JSON never exposes the preserved internal cause or stack', async () => {
    const app = createApp({ debug: false })
    const cause = Object.assign(new Error('Sort exceeded memory limit: private@example.invalid'), {
      query: { uid: 'private-uid' },
      code: 292,
    })
    app.use(
      defineEventHandler(() => {
        throw createError({
          statusCode: 503,
          statusMessage: 'Rental search is temporarily unavailable',
          cause,
        })
      })
    )
    const server = createServer(toNodeListener(app))
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address() as { port: number }
      const response = await fetch(`http://127.0.0.1:${address.port}/api/rentals`)
      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.statusMessage).toBe('Rental search is temporarily unavailable')
      expect(body.stack).toEqual([])
      for (const secret of ['private', '292', 'Sort exceeded', 'cause'])
        expect(JSON.stringify(body)).not.toContain(secret)
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      )
    }
  })
})
