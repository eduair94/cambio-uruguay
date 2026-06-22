import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const lookup = vi.fn()
vi.mock('node:dns/promises', () => ({ lookup }))

const { getQuery } = installNitroGlobals()
const handler = (await import('../../server/api/import-preview.get')).default

const htmlResponse = (html: string, contentType = 'text/html; charset=utf-8') =>
  ({
    status: 200,
    ok: true,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: () => Promise.resolve(html),
  }) as unknown as Response

beforeEach(() => {
  getQuery.mockReset()
  lookup.mockReset()
  // default: hostname resolves to a public address
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})

describe('import-preview endpoint', () => {
  it('rejects URLs outside the marketplace allowlist', async () => {
    getQuery.mockReturnValueOnce({ url: 'https://evil.com/x' })
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns parsed product metadata for an allowed URL', async () => {
    getQuery.mockReturnValue({ url: 'https://www.amazon.com/dp/B0123' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        htmlResponse(`
          <meta property="og:title" content="Echo Dot">
          <meta property="og:image" content="https://img/echo.jpg">
          <meta property="product:price:amount" content="49.99">
          <meta property="product:price:currency" content="USD">
        `)
      )
    )
    const res = await handler({} as any)
    expect(res).toMatchObject({ title: 'Echo Dot', price: 49.99, currency: 'USD' })
  })

  it('returns an empty object (not an error) when the fetch fails', async () => {
    getQuery.mockReturnValue({ url: 'https://www.amazon.com/dp/B0123' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const res = await handler({} as any)
    expect(res).toEqual({})
  })

  it('returns an empty object when the response is not HTML', async () => {
    getQuery.mockReturnValue({ url: 'https://www.amazon.com/dp/B0123' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('{"a":1}', 'application/json')))
    const res = await handler({} as any)
    expect(res).toEqual({})
  })

  it('refuses to fetch when an allowlisted host resolves to a private IP (SSRF)', async () => {
    getQuery.mockReturnValue({ url: 'https://www.amazon.dev/dp/B0123' })
    lookup.mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }])
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const res = await handler({} as any)
    expect(res).toEqual({}) // blocked before fetch -> best-effort empty
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
