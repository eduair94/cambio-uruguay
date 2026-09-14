import assert from 'node:assert/strict'
import { test } from 'vitest'
import http, { type IncomingHttpHeaders } from 'node:http'
import { once } from 'node:events'
import { createApp, eventHandler, toNodeListener, send, type H3Event } from 'h3'
import {
  createPropertySsrListener,
  isPropertySsrRequest,
} from '../../server/utils/propertySsrAdmission'

const tick = () => new Promise(resolve => setTimeout(resolve, 15))
const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}
async function until(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await tick()
  }
  assert.fail('Condition did not become true')
}
async function fixture(
  handler: (event: H3Event) => unknown,
  options: Parameters<typeof createPropertySsrListener>[1] = {},
  appOptions: Parameters<typeof createApp>[0] = {}
) {
  const app = createApp(appOptions)
  app.use(eventHandler(handler))
  const received: string[] = []
  const listener = createPropertySsrListener(toNodeListener(app), options)
  const server = http.createServer((request, response) => {
    received.push(request.url || '/')
    return listener(request, response)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test port')
  const port = address.port
  function get(path: string) {
    const result = deferred<{
      status: number | 'disconnected'
      headers: IncomingHttpHeaders
      body: string
    }>()
    const request = http.get({ hostname: '127.0.0.1', port, path, agent: false }, response => {
      let body = ''
      response.on('data', chunk => {
        body += chunk
      })
      response.on('end', () =>
        result.resolve({ status: response.statusCode || 0, headers: response.headers, body })
      )
    })
    request.on('error', () => result.resolve({ status: 'disconnected', headers: {}, body: '' }))
    return { request, result: result.promise }
  }
  async function close() {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
  return { get, close, received }
}

test('matches property SSR paths and locales, while APIs, fletes and non-reads bypass', () => {
  for (const path of [
    '/alquileres/key',
    '/en/alquileres/key?a=1',
    '/pt/alquileres-uruguay',
    '/venta-viviendas-uruguay',
    '/en/venta-viviendas-uruguay/key',
  ])
    assert.equal(isPropertySsrRequest('GET', path), true)
  assert.equal(isPropertySsrRequest('HEAD', '/alquileres/key'), true)
  for (const path of [
    '/api/rentals/ficha/key',
    '/fletes-mudanzas-uruguay',
    '/acerca',
    '/_nuxt/file.js',
    '/alquileres-uruguay-falso',
  ])
    assert.equal(isPropertySsrRequest('GET', path), false)
  assert.equal(isPropertySsrRequest('POST', '/alquileres/key'), false)
})

test('real H3: saturates before SSR and lets unrelated pages and APIs through', async () => {
  const release = deferred()
  const started: string[] = []
  const app = await fixture(
    async event => {
      started.push(event.path)
      if (event.path.startsWith('/alquileres/')) await release.promise
      return 'ok'
    },
    { maxActive: 1, maxQueued: 1, maxWaitMs: 1000 }
  )
  try {
    const first = app.get('/alquileres/one')
    await until(() => started.length === 1)
    const second = app.get('/alquileres/two')
    await tick()
    const rejected = await app.get('/alquileres/three').result
    assert.equal(rejected.status, 503)
    assert.match(rejected.headers['cache-control'], /no-store/)
    assert.equal(rejected.headers['retry-after'], '2')
    assert.equal(started.length, 1)
    assert.equal((await app.get('/fletes-mudanzas-uruguay').result).status, 200)
    assert.equal((await app.get('/api/rentals/ficha/key').result).status, 200)
    release.resolve()
    assert.equal((await first.result).status, 200)
    assert.equal((await second.result).status, 200)
    assert.equal(started.includes('/alquileres/three'), false)
  } finally {
    release.resolve()
    await app.close()
  }
})

test('defaults admit two active renders and eight queued requests', async () => {
  const release = deferred()
  let starts = 0
  let active = 0
  let peakActive = 0
  const app = await fixture(async () => {
    starts++
    active++
    peakActive = Math.max(peakActive, active)
    await release.promise
    active--
    return 'ok'
  })
  try {
    const requests = [app.get('/alquileres/one'), app.get('/alquileres/two')]
    await until(() => starts === 2)
    for (let i = 0; i < 8; i++) requests.push(app.get('/alquileres/queued-' + i))
    await until(() => app.received.length === 10)
    assert.equal((await app.get('/alquileres/overflow').result).status, 503)
    assert.equal(starts, 2)
    release.resolve()
    const responses = await Promise.all(requests.map(request => request.result))
    assert.equal(
      responses.every(response => response.status === 200),
      true
    )
    assert.equal(starts, 10)
    assert.equal(peakActive, 2)
  } finally {
    release.resolve()
    await app.close()
  }
})

test('real H3: queue timeout emits a plain 503 without starting SSR', async () => {
  const release = deferred()
  let starts = 0
  const app = await fixture(
    async () => {
      starts++
      await release.promise
      return 'ok'
    },
    { maxActive: 1, maxQueued: 1, maxWaitMs: 25 }
  )
  try {
    const first = app.get('/alquileres/one')
    await until(() => starts === 1)
    const timedOut = await app.get('/alquileres/two').result
    assert.equal(timedOut.status, 503)
    assert.match(timedOut.headers['content-type'], /text\/plain/)
    assert.equal(starts, 1)
    release.resolve()
    await first.result
  } finally {
    release.resolve()
    await app.close()
  }
})

test('real H3: cancelled queued clients free their queue place without starting SSR', async () => {
  const release = deferred()
  const started: string[] = []
  const app = await fixture(
    async event => {
      started.push(event.path)
      await release.promise
      return 'ok'
    },
    { maxActive: 1, maxQueued: 1, maxWaitMs: 1000 }
  )
  try {
    const first = app.get('/alquileres/one')
    await until(() => started.length === 1)
    const cancelled = app.get('/alquileres/cancelled')
    await tick()
    cancelled.request.destroy()
    await cancelled.result
    await tick()
    const second = app.get('/alquileres/two')
    await tick()
    assert.deepEqual(started, ['/alquileres/one'])
    release.resolve()
    assert.equal((await first.result).status, 200)
    assert.equal((await second.result).status, 200)
    assert.equal(started.includes('/alquileres/cancelled'), false)
  } finally {
    release.resolve()
    await app.close()
  }
})

test('real H3: disconnecting an active client does not release its running SSR permit', async () => {
  const release = deferred()
  const started: string[] = []
  const app = await fixture(
    async event => {
      started.push(event.path)
      if (event.path === '/alquileres/one') await release.promise
      return 'ok'
    },
    { maxActive: 1, maxQueued: 1, maxWaitMs: 1000 }
  )
  try {
    const first = app.get('/alquileres/one')
    await until(() => started.length === 1)
    first.request.destroy()
    await first.result
    const second = app.get('/alquileres/two')
    await tick()
    assert.deepEqual(started, ['/alquileres/one'])
    assert.equal((await app.get('/alquileres/three').result).status, 503)
    release.resolve()
    assert.equal((await second.result).status, 200)
  } finally {
    release.resolve()
    await app.close()
  }
})

test('real H3: permit includes asynchronous error rendering even when afterResponse is skipped', async () => {
  const release = deferred()
  const errorEntered = deferred()
  const started: string[] = []
  let afterResponse = 0
  const app = await fixture(
    event => {
      started.push(event.path)
      if (event.path === '/alquileres/error') throw new Error('synthetic failure')
      return 'ok'
    },
    { maxActive: 1, maxQueued: 1, maxWaitMs: 1000 },
    {
      onError: async (error, event) => {
        errorEntered.resolve()
        await release.promise
        await send(event, 'handled error')
      },
      onAfterResponse: () => {
        afterResponse++
      },
    }
  )
  try {
    const failed = app.get('/alquileres/error')
    await errorEntered.promise
    const second = app.get('/alquileres/two')
    await tick()
    assert.deepEqual(started, ['/alquileres/error'])
    release.resolve()
    await failed.result
    assert.equal((await second.result).status, 200)
    assert.equal(afterResponse, 1)
  } finally {
    release.resolve()
    await app.close()
  }
})
