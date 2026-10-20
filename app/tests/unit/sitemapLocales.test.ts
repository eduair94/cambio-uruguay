import { describe, expect, it, vi } from 'vitest'
import { keepCanonicalLocales } from '../../server/utils/sitemapLocales'

const allLocales = (path: string) => {
  const alternatives = [
    { hreflang: 'es-ES', href: path },
    { hreflang: 'en-US', href: `/en${path}` },
    { hreflang: 'pt-PT', href: `/pt${path}` },
    { hreflang: 'x-default', href: path },
  ]
  return [path, `/en${path}`, `/pt${path}`].map(loc => ({ loc, alternatives }))
}

describe('sitemap locale filter', () => {
  it('keeps only the Spanish URL of a Spanish-only route, without foreign alternates', () => {
    expect(keepCanonicalLocales(allLocales('/guias/una-guia'))).toEqual([
      {
        loc: '/guias/una-guia',
        alternatives: [
          { hreflang: 'es-ES', href: '/guias/una-guia' },
          { hreflang: 'x-default', href: '/guias/una-guia' },
        ],
      },
    ])
  })

  it('leaves translated routes in all three languages, untouched', () => {
    const entries = [...allLocales('/mapa'), ...allLocales('/historico/brou/usd')]
    expect(keepCanonicalLocales(entries)).toEqual(entries)
  })

  it("drops the module's own page entries for /en and /pt, absolute or relative", () => {
    expect(
      keepCanonicalLocales([
        '/dolar-hoy',
        '/en/dolar-hoy',
        { loc: 'https://cambio-uruguay.com/pt/dolar-hoy' },
        { loc: 'https://cambio-uruguay.com/en/pizarra' },
      ])
    ).toEqual(['/dolar-hoy', { loc: 'https://cambio-uruguay.com/en/pizarra' }])
  })

  it('passes Spanish entries without alternates and entries without a loc through', () => {
    const entries = [{ loc: '/alquileres/una-ficha', images: [] }, { lastmod: 'x' }]
    expect(keepCanonicalLocales(entries as never[])).toEqual(entries)
  })

  it('is the hook every sitemap runs through', async () => {
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    try {
      const { default: plugin } = await import('../../server/plugins/sitemap-locales')
      const hook = vi.fn()
      ;(plugin as unknown as (app: unknown) => void)({ hooks: { hook } })
      expect(hook.mock.calls[0]?.[0]).toBe('sitemap:input')
      const context = { sitemapName: 'en-US', urls: ['/en/guias/x', '/en/mapa'] }
      hook.mock.calls[0]![1](context)
      expect(context.urls).toEqual(['/en/mapa'])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
