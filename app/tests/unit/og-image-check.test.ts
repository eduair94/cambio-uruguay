import { describe, it, expect } from 'vitest'
import {
  evaluateOgImageResponse,
  explicitOgImagePaths,
  filterDefaultLocalePaths,
  ogImageUrl,
  pageOgImageUrl,
  sampleOgImagePaths,
} from '../../scripts/lib/og-image-check.mjs'

describe('published preview smoke checks', () => {
  it('accepts targeted property and localized paths without consulting a sitemap', () => {
    expect(
      explicitOgImagePaths(
        ' /alquileres-uruguay,/alquileres/cordon-123,/en/alquileres/cordon-123,/alquileres/cordon-123 '
      )
    ).toEqual(['/alquileres-uruguay', '/alquileres/cordon-123', '/en/alquileres/cordon-123'])
    expect(explicitOgImagePaths(undefined)).toBeNull()
    expect(explicitOgImagePaths('  ')).toBeNull()
  })
  it('rejects foreign URLs, empty entries, queries and path escapes in explicit input', () => {
    for (const value of [
      'https://example.com/a',
      '//example.com/a',
      '/\\example.com/a',
      '/one,',
      '/one?x=1',
      '/one#photo',
      '/two words',
      ',',
    ]) {
      expect(() => explicitOgImagePaths(value)).toThrow(/OG_PATHS/)
    }
    expect(() => explicitOgImagePaths(Array.from({ length: 501 }, () => '/a').join(','))).toThrow(
      /500/
    )
  })
  it('follows a property photo from actual metadata, including escaped URL query parameters', () => {
    expect(
      pageOgImageUrl(
        '<meta content="https://cdn.example.com/property.jpg?w=1200&amp;q=80" property="og:image">',
        'https://cambio-uruguay.com/alquileres/one'
      )
    ).toBe('https://cdn.example.com/property.jpg?w=1200&q=80')
  })
  it('also resolves existing generated previews and refuses absent or executable metadata', () => {
    const base = 'https://cambio-uruguay.com/alquileres/one'
    expect(
      pageOgImageUrl(
        "<meta property='og:image' content='/__og-image__/image/alquileres/one/og.png'>",
        base
      )
    ).toBe('https://cambio-uruguay.com/__og-image__/image/alquileres/one/og.png')
    for (const html of [
      '',
      '<meta property="og:image">',
      '<meta property="og:image" content="javascript:alert(1)">',
      '<meta property="og:image" content="https://user:secret@example.com/x">',
    ]) {
      expect(pageOgImageUrl(html, base)).toBeNull()
    }
  })
  it('samples large directories without making thousands of SSR and image requests', () => {
    const paths = Array.from({ length: 10000 }, (_, index) => `/alquileres/${index}`)
    const sample = sampleOgImagePaths(paths)
    expect(sample).toHaveLength(60)
    expect(new Set(sample).size).toBe(60)
    expect(sample[0]).toBe('/alquileres/0')
    expect(sample.at(-1)).toBe('/alquileres/9999')
    expect(sampleOgImagePaths(paths.slice(0, 3))).toEqual(paths.slice(0, 3))
  })
})

describe('ogImageUrl', () => {
  it('builds the nuxt-og-image URL for a normal path', () => {
    expect(ogImageUrl('http://localhost:3000', '/buscar')).toBe(
      'http://localhost:3000/__og-image__/image/buscar/og.png'
    )
  })

  it('handles a nested path', () => {
    expect(ogImageUrl('http://localhost:3000', '/herramientas/calculadora-iva')).toBe(
      'http://localhost:3000/__og-image__/image/herramientas/calculadora-iva/og.png'
    )
  })

  it('avoids a double slash for the root path', () => {
    expect(ogImageUrl('http://localhost:3000', '/')).toBe(
      'http://localhost:3000/__og-image__/image/og.png'
    )
  })
})

describe('filterDefaultLocalePaths', () => {
  it('drops /en and /pt prefixed duplicates, keeps default-locale paths', () => {
    const urls = [
      { loc: '/buscar' },
      { loc: '/en/buscar' },
      { loc: '/pt/buscar' },
      { loc: '/herramientas/calculadora-iva' },
    ]
    expect(filterDefaultLocalePaths(urls)).toEqual(['/buscar', '/herramientas/calculadora-iva'])
  })

  it('dedupes repeated paths', () => {
    const urls = [{ loc: '/buscar' }, { loc: '/buscar' }]
    expect(filterDefaultLocalePaths(urls)).toEqual(['/buscar'])
  })

  it('does not drop paths that merely contain "en" or "pt" as a substring', () => {
    const urls = [{ loc: '/entretenimiento' }, { loc: '/prestamos-uruguay' }]
    expect(filterDefaultLocalePaths(urls)).toEqual(['/entretenimiento', '/prestamos-uruguay'])
  })
})

describe('evaluateOgImageResponse', () => {
  it('passes a healthy PNG response', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: 'image/png', byteLength: 5000 })
    ).toEqual({ ok: true })
  })

  it('fails on non-2xx status', () => {
    expect(
      evaluateOgImageResponse({
        ok: false,
        status: 500,
        contentType: 'image/png',
        byteLength: 5000,
      })
    ).toEqual({ ok: false, reason: 'HTTP 500' })
  })

  it('fails on non-image content-type', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: 'text/html', byteLength: 5000 })
    ).toEqual({ ok: false, reason: 'bad content-type: text/html' })
  })

  it('fails on a missing content-type', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: null, byteLength: 5000 })
    ).toEqual({ ok: false, reason: 'bad content-type: (none)' })
  })

  it('fails on a suspiciously small body', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: 'image/png', byteLength: 40 })
    ).toEqual({ ok: false, reason: 'body too small: 40 bytes' })
  })
})
