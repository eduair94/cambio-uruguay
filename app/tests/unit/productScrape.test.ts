import { describe, expect, it } from 'vitest'
import {
  isAllowedProductUrl,
  isEbayUrl,
  parseEbayApiJson,
  parseProductHtml,
} from '../../utils/productScrape'

describe('isAllowedProductUrl', () => {
  it('accepts https Amazon / eBay / MercadoLibre product URLs', () => {
    expect(isAllowedProductUrl('https://www.amazon.com/dp/B0123')).toBe(true)
    expect(isAllowedProductUrl('https://www.amazon.co.uk/dp/x')).toBe(true)
    expect(isAllowedProductUrl('https://www.ebay.com/itm/123')).toBe(true)
    expect(isAllowedProductUrl('https://articulo.mercadolibre.com.uy/MLU-123')).toBe(true)
    expect(isAllowedProductUrl('https://produto.mercadolivre.com.br/MLB-1')).toBe(true)
  })

  it('rejects non-https schemes', () => {
    expect(isAllowedProductUrl('http://www.amazon.com/x')).toBe(false)
    expect(isAllowedProductUrl('ftp://www.amazon.com/x')).toBe(false)
  })

  it('rejects look-alike and non-allowlisted hosts', () => {
    expect(isAllowedProductUrl('https://amazon.evil.com/x')).toBe(false)
    expect(isAllowedProductUrl('https://evil.com/amazon.com')).toBe(false)
    expect(isAllowedProductUrl('https://example.com/x')).toBe(false)
  })

  it('rejects embedded credentials and IP-literal / loopback hosts (SSRF)', () => {
    expect(isAllowedProductUrl('https://user:pass@amazon.com/x')).toBe(false)
    expect(isAllowedProductUrl('https://127.0.0.1/x')).toBe(false)
    expect(isAllowedProductUrl('https://192.168.0.1/x')).toBe(false)
    expect(isAllowedProductUrl('https://localhost/x')).toBe(false)
    expect(isAllowedProductUrl('https://[::1]/x')).toBe(false)
  })

  it('rejects garbage input', () => {
    expect(isAllowedProductUrl('not a url')).toBe(false)
    expect(isAllowedProductUrl('')).toBe(false)
  })
})

describe('isEbayUrl', () => {
  it('is true only for allowlisted eBay hosts', () => {
    expect(isEbayUrl('https://www.ebay.com/itm/167912235793')).toBe(true)
    expect(isEbayUrl('https://www.ebay.co.uk/itm/1')).toBe(true)
    expect(isEbayUrl('https://www.amazon.com/dp/B0123')).toBe(false)
    expect(isEbayUrl('https://ebay.evil.com/itm/1')).toBe(false)
    expect(isEbayUrl('not a url')).toBe(false)
  })
})

describe('parseEbayApiJson', () => {
  it('maps the proxy response to a ProductPreview', () => {
    const r = parseEbayApiJson({
      success: true,
      title: 'ASUS ROG Ally 7" 120Hz',
      image: 'https://img.example/rc71l.jpg',
      price: { value: 427, currency: 'USD', raw: 'US $427.00' },
    })
    expect(r).toEqual({
      title: 'ASUS ROG Ally 7" 120Hz',
      image: 'https://img.example/rc71l.jpg',
      price: 427,
      currency: 'USD',
    })
  })

  it('coerces string prices and trims fields', () => {
    const r = parseEbayApiJson({ title: '  Thing  ', price: { value: '19.90', currency: ' EUR ' } })
    expect(r.title).toBe('Thing')
    expect(r.price).toBe(19.9)
    expect(r.currency).toBe('EUR')
  })

  it('returns {} on failure, non-object, or missing fields', () => {
    expect(parseEbayApiJson({ success: false, title: 'x' })).toEqual({})
    expect(parseEbayApiJson(null)).toEqual({})
    expect(parseEbayApiJson('nope')).toEqual({})
    expect(parseEbayApiJson({})).toEqual({})
    expect(parseEbayApiJson({ price: { value: 0 } })).toEqual({})
  })
})

describe('parseProductHtml', () => {
  it('extracts OpenGraph title and image (attribute order independent)', () => {
    const html = `
      <meta property="og:title" content="Echo Dot (5th Gen)" />
      <meta content="https://m.media-amazon.com/echo.jpg" property="og:image">
    `
    const r = parseProductHtml(html)
    expect(r.title).toBe('Echo Dot (5th Gen)')
    expect(r.image).toBe('https://m.media-amazon.com/echo.jpg')
  })

  it('extracts price and currency from product:price meta tags', () => {
    const html = `
      <meta property="og:title" content="Thing">
      <meta property="product:price:amount" content="49.99">
      <meta property="product:price:currency" content="USD">
    `
    const r = parseProductHtml(html)
    expect(r.price).toBe(49.99)
    expect(r.currency).toBe('USD')
  })

  it('extracts price from JSON-LD Product offers when no price meta exists', () => {
    const html = `
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","name":"Widget",
       "offers":{"@type":"Offer","price":"19.90","priceCurrency":"EUR"}}
      </script>
    `
    const r = parseProductHtml(html)
    expect(r.title).toBe('Widget')
    expect(r.price).toBe(19.9)
    expect(r.currency).toBe('EUR')
  })

  it('falls back to the <title> tag when no og:title is present', () => {
    const html = `<title>Fallback Product Name</title>`
    expect(parseProductHtml(html).title).toBe('Fallback Product Name')
  })

  it('returns an empty object when nothing is parseable', () => {
    expect(parseProductHtml('<html><body>nothing</body></html>')).toEqual({})
  })

  it('ignores malformed JSON-LD without throwing', () => {
    const html = `<script type="application/ld+json">{ not valid json }</script>`
    expect(() => parseProductHtml(html)).not.toThrow()
    expect(parseProductHtml(html)).toEqual({})
  })
})
