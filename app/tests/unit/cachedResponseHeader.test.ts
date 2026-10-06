import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import * as h3 from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { setHeaderUnlessSent } from '../../server/utils/cachedResponseHeader'

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(done => server.close(done))))
})

/**
 * A Nitro memo answering a matching `If-None-Match`: like `handleCacheHeaders`, it sets the etag,
 * answers 304 and ENDS the response itself, then returns to the route's own wrapper.
 */
function memo(event: h3.H3Event) {
  const etag = '"directory-v1"'
  event.node.res.setHeader('etag', etag)
  if (event.node.req.headers['if-none-match'] === etag) {
    event.node.res.statusCode = 304
    event.node.res.end()
    return ''
  }
  return { items: [] }
}

async function serve(setHeader: (event: h3.H3Event) => void) {
  const errors: unknown[] = []
  const app = h3.createApp({
    onError: error => {
      errors.push(error)
    },
  })
  app.use(
    '/api/rentals',
    h3.eventHandler(async event => {
      const response = memo(event)
      setHeader(event)
      return response
    })
  )
  const server = createServer(h3.toNodeListener(app))
  servers.push(server)
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const { port } = server.address() as AddressInfo
  const request = (headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${port}/api/rentals`, { headers })
  return { request, errors }
}

describe('setHeaderUnlessSent', () => {
  it('reproduces the 500: writing a header after the memo answered 304 throws', async () => {
    const { request, errors } = await serve(event =>
      h3.setResponseHeader(event, 'cache-control', 'public, max-age=30')
    )
    const response = await request({ 'if-none-match': '"directory-v1"' })
    // The visitor still got the 304 (it was already sent), but the route raised and was logged
    // and reported as a 500: Sentry CAMBIO-URUGUAY-BACKEND-14.
    expect(response.status).toBe(304)
    expect(errors).toHaveLength(1)
    expect(String((errors[0] as { cause?: { code?: string } }).cause?.code)).toBe(
      'ERR_HTTP_HEADERS_SENT'
    )
  })

  it('leaves a sent 304 alone and still sets the header on a full response', async () => {
    const { request, errors } = await serve(event =>
      setHeaderUnlessSent(event, 'cache-control', 'public, max-age=30')
    )
    const revalidated = await request({ 'if-none-match': '"directory-v1"' })
    expect(revalidated.status).toBe(304)
    const fresh = await request()
    expect(fresh.status).toBe(200)
    expect(fresh.headers.get('cache-control')).toBe('public, max-age=30')
    expect(await fresh.json()).toEqual({ items: [] })
    expect(errors).toEqual([])
  })

  it('is what every memo wrapper uses after awaiting its cached handler', () => {
    for (const route of ['rentals/index.get.ts', 'rentals/salario-minimo.get.ts']) {
      const source = readFileSync(resolve(__dirname, '../../server/api', route), 'utf8')
      const wrapper = source.slice(source.lastIndexOf('export default defineEventHandler'))
      expect(wrapper).not.toMatch(/setResponseHeader\(/)
      expect(wrapper.match(/setHeaderUnlessSent\(/g)).toHaveLength(2)
    }
  })
})
