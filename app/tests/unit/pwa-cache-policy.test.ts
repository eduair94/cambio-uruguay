import { runInNewContext } from 'node:vm'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { populateSWTemplate } from 'workbox-build/build/lib/populate-sw-template.js'
import type { GenerateSWOptions } from 'workbox-build'
import { beforeAll, describe, expect, it, vi } from 'vitest'

type WorkboxPolicy = Omit<GenerateSWOptions, 'globDirectory' | 'swDest'>
let workbox: WorkboxPolicy
let workerCode: string

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
  try {
    const { default: config } = await import('../../nuxt.config')
    const pwa = config.modules.find(
      module => Array.isArray(module) && module[0] === '@vite-pwa/nuxt'
    ) as unknown as [string, { workbox: WorkboxPolicy }]
    expect(pwa, 'the PWA module must be present').toBeDefined()
    workbox = pwa[1].workbox
  } finally {
    vi.unstubAllGlobals()
  }

  // Use the real Workbox generator and runtime. Nitro SSR does not emit an
  // index.html or '/' into the precache manifest. Nothing is written to disk.
  const source = populateSWTemplate({
    ...workbox,
    manifestEntries: [{ url: '_nuxt/synthetic-entry.js', revision: null }],
  })
  const bundled = await build({
    stdin: {
      contents: source,
      sourcefile: 'synthetic-service-worker.js',
      resolveDir: resolve(__dirname, '../..'),
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  workerCode = bundled.outputFiles[0].text
})

function startWorker() {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  const location = new URL('https://cambio-uruguay.com/sw.js')
  const cache = {
    match: async () => undefined,
    put: async () => undefined,
    keys: async () => [],
  }
  const caches = { open: async () => cache, match: async () => undefined, keys: async () => [] }
  const self = {
    location,
    caches,
    registration: { scope: 'https://cambio-uruguay.com/' },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener: (name: string, listener: (event: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  }
  runInNewContext(workerCode, {
    self,
    location,
    caches,
    URL,
    Request,
    Response,
    Headers,
    // Observe routing synchronously; do not exercise network/IndexedDB here.
    fetch: () => new Promise(() => {}),
    setTimeout: () => 0,
    clearTimeout: () => undefined,
    importScripts: () => undefined,
  })

  return {
    listeners,
    handles(path: string, method = 'GET', navigation = false): boolean {
      const request = new Request(new URL(path, location), { method })
      if (navigation) Object.defineProperty(request, 'mode', { value: 'navigate' })
      const respondWith = vi.fn((promise: Promise<unknown>) => void promise.catch(() => {}))
      const event = {
        request,
        respondWith,
        waitUntil: (p: Promise<unknown>) => void p.catch(() => {}),
      }
      for (const listener of listeners.get('fetch') ?? []) listener(event)
      return respondWith.mock.calls.length > 0
    },
  }
}

describe('PWA cache policy', () => {
  it('starts without binding an absent SSR home page', () => {
    expect(workbox.navigateFallback).toBeNull()
    const worker = startWorker()
    expect(worker.listeners.has('install')).toBe(true)
    expect(worker.listeners.has('fetch')).toBe(true)
    expect(worker.handles('/', 'GET', true)).toBe(false)
    expect(worker.handles('/primer-alquiler-uruguay', 'GET', true)).toBe(false)
  })

  it.each([
    '/api/me/favorites',
    '/api/me/alerts',
    '/api/me/bankos-favorites',
    '/api/site-revenue',
    '/api/search-console',
    '/api/telegram/favorites',
    '/api/auth/discord/callback?code=synthetic',
    '/api/a-future-private-endpoint',
  ])('does not intercept private API requests: %s', path => {
    expect(startWorker().handles(path)).toBe(false)
  })

  it('preserves the public discount fallback without matching siblings or other origins', () => {
    const worker = startWorker()
    expect(worker.handles('/api/bankos/discounts')).toBe(true)
    expect(worker.handles('/api/bankos/discounts?bank=synthetic')).toBe(true)
    expect(worker.handles('/api/bankos/discounts/private')).toBe(false)
    expect(worker.handles('/api/bankos/discounts', 'POST')).toBe(false)
    expect(worker.handles('https://example.org/api/bankos/discounts')).toBe(false)
  })

  it('preserves both Google Fonts caches', () => {
    const worker = startWorker()
    expect(worker.handles('https://fonts.googleapis.com/css2?family=Open+Sans')).toBe(true)
    expect(worker.handles('https://fonts.gstatic.com/s/opensans/synthetic.woff2')).toBe(true)
  })
})
