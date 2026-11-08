import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, defineEventHandler, getRequestHeader, sendRedirect, toNodeListener } from 'h3'

// CAMBIO-URUGUAY-BACKEND-18: h3 decodes `event.path` before any middleware runs, and three
// middlewares built their Location from it. `/de/historico/%E4%B8%AD%E6%96%87` became the header
// `location: /historico/中文`, which Node refuses (ERR_INVALID_CHAR) -> 500 for every crawler that
// followed an extra-locale link with a non-Latin-1 segment. Real Node server on purpose: the web
// handler does not run Node's header validation, which is exactly what failed in production.

vi.mock('../../server/utils/autoTranslateStore', () => ({
  translatedLocales: async () => [],
  embargoedRoutes: async () => [],
  lookupTranslations: async () => new Map(),
}))
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('getRequestHeader', getRequestHeader)
vi.stubGlobal('sendRedirect', sendRedirect)

const autoTranslate = (await import('../../server/middleware/auto-translate')).default
const lowercase = (await import('../../server/middleware/lowercase-routes')).default
const canonicalHost = (await import('../../server/middleware/canonical-host')).default

let server: Server
let port = 0

beforeAll(async () => {
  const app = createApp()
  app.use(canonicalHost)
  app.use(autoTranslate)
  app.use(lowercase)
  app.use(defineEventHandler(() => 'page'))
  server = createServer(toNodeListener(app))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
})
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())))

function get(path: string, host = '127.0.0.1') {
  return new Promise<{ status: number; location: string | null }>((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, headers: { accept: 'text/html', host } },
      res => {
        res.resume()
        resolve({ status: res.statusCode ?? 0, location: (res.headers.location as string) ?? null })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

describe('redirects keep the request percent-encoding', () => {
  it('extra locale -> Spanish, with a non-Latin-1 segment (the production 500)', async () => {
    expect(await get('/de/historico/%E4%B8%AD%E6%96%87')).toEqual({
      status: 302,
      location: '/historico/%E4%B8%AD%E6%96%87',
    })
  })

  it('extra locale keeps an encoded "?" in the path and the real query after it', async () => {
    expect(await get('/de/historico/a%3Fb/?x=1')).toEqual({
      status: 302,
      location: '/historico/a%3Fb?x=1',
    })
    expect(await get('/de/historico/brou')).toEqual({ status: 302, location: '/historico/brou' })
  })

  it('lowercase canonical with an untouched non-Latin-1 segment', async () => {
    expect(await get('/historico/BROU/%E4%B8%AD')).toEqual({
      status: 301,
      location: '/historico/brou/%E4%B8%AD',
    })
    expect(await get('/historico/PAYSAND%C3%9A')).toEqual({
      status: 301,
      location: '/historico/paysand%C3%BA',
    })
  })

  it('www -> apex keeps the encoded path', async () => {
    expect(await get('/historico/%E4%B8%AD?x=1', 'www.cambio-uruguay.com')).toEqual({
      status: 301,
      location: 'https://cambio-uruguay.com/historico/%E4%B8%AD?x=1',
    })
  })

  it('a canonical path is still served', async () => {
    expect((await get('/historico/%E4%B8%AD')).status).toBe(200)
  })
})
