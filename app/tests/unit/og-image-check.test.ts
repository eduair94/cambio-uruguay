import { describe, it, expect } from 'vitest'
import {
  evaluateOgImageResponse,
  filterDefaultLocalePaths,
  ogImageUrl,
} from '../../scripts/lib/og-image-check.mjs'

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
      evaluateOgImageResponse({ ok: false, status: 500, contentType: 'image/png', byteLength: 5000 })
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
