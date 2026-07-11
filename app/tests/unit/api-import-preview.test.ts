import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const lookup = vi.fn()
vi.mock('node:dns/promises', () => ({ lookup }))

const { getQuery, useRuntimeConfig } = installNitroGlobals()
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
  useRuntimeConfig.mockReset()
  useRuntimeConfig.mockReturnValue({}) // default: no ebayApiUrl -> HTML-scrape path
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

  it('resolves eBay items via the proxy API when ebayApiUrl is configured', async () => {
    getQuery.mockReturnValue({ url: 'https://www.ebay.com/itm/167912235793' })
    useRuntimeConfig.mockReturnValue({ ebayApiUrl: 'https://proxy.test/ebay/item' })
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          title: 'ROG Ally',
          image: 'https://img/x.jpg',
          price: { value: 427, currency: 'USD' },
        }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchSpy)
    const res = await handler({} as any)
    expect(res).toMatchObject({ title: 'ROG Ally', price: 427, currency: 'USD' })
    // hit the proxy with the encoded item URL, not eBay directly
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('proxy.test/ebay/item')
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(encodeURIComponent('https://www.ebay.com/itm/167912235793'))
  })

  it('falls back to the HTML scrape when the eBay proxy returns nothing usable', async () => {
    getQuery.mockReturnValue({ url: 'https://www.ebay.com/itm/1' })
    useRuntimeConfig.mockReturnValue({ ebayApiUrl: 'https://proxy.test/ebay/item' })
    const fetchSpy = vi
      .fn()
      // proxy call: success:false -> empty preview
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: false }),
      } as unknown as Response)
      // fallback HTML scrape
      .mockResolvedValueOnce(
        htmlResponse('<meta property="og:title" content="Scraped Item">')
      )
    vi.stubGlobal('fetch', fetchSpy)
    const res = await handler({} as any)
    expect(res).toMatchObject({ title: 'Scraped Item' })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
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
