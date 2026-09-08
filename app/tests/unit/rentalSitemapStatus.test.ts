import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

describe('rental sitemap cold failure', () => {
  it('rejects an empty rental source before XML caching but leaves other sitemaps alone', async () => {
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    const { default: plugin } = await import('../../server/plugins/rental-sitemap-status')
    const hook = vi.fn()
    ;(plugin as unknown as (app: unknown) => void)({ hooks: { hook } })
    expect(hook.mock.calls[0]?.[0]).toBe('sitemap:input')
    const guard = hook.mock.calls[0]![1]
    for (const sitemapName of ['rentals', 'rentals-0', 'rentals-99']) {
      expect(() => guard({ sitemapName, urls: [] })).toThrowError(
        expect.objectContaining({ statusCode: 503 })
      )
      expect(() => guard({ sitemapName, urls: [{ loc: '/alquileres/a' }] })).not.toThrow()
    }
    expect(() => guard({ sitemapName: 'es-ES', urls: [] })).not.toThrow()
  })
})
