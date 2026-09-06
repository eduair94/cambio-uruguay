import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { $fetch } from 'ofetch'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let server: Server
let apiBase: string
let serveRates = false
const requests: string[] = []

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push(req.url || '/')
    if (serveRates && req.url === '/') {
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify([
          { origin: 'synthetic', code: 'USD', type: '', buy: 40, sell: 42, date: new Date() },
        ])
      )
    }
    // Otherwise leave the upstream open forever, reproducing a stalled backend.
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  apiBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  vi.stubGlobal('$fetch', $fetch)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase } }))
  vi.stubGlobal('defineCachedEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', () => ({ lang: 'es' }))
})

afterAll(async () => {
  server.closeAllConnections()
  await new Promise<void>(resolve => server.close(() => resolve()))
  vi.unstubAllGlobals()
})

describe('homepage SSR with an unresponsive upstream', () => {
  it('returns rate and evergreen FAQ fallbacks instead of waiting forever or retrying', async () => {
    const [{ default: ogRate }, { default: faq }] = await Promise.all([
      import('../../server/api/og-rate.get'),
      import('../../server/api/faq.get'),
    ])
    const [pair, payload] = await Promise.all([ogRate({} as never), faq({} as never)])
    expect(pair).toBeDefined()
    expect(payload.items.length).toBeGreaterThan(0)
    expect(requests).toEqual(['/', '/'])
  }, 7000)

  it('keeps deterministic answers when the optional context service never answers', async () => {
    serveRates = true
    requests.length = 0
    const { default: faq } = await import('../../server/api/faq.get')
    const payload = await faq({} as never)
    expect(payload.items.some(item => item.id === 'rate-USD')).toBe(true)
    expect(requests).toEqual(['/', '/ai/insights'])
  }, 5000)
})
