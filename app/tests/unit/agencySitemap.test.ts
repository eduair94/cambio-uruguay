import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgencySummary } from '../../utils/agencies'

const directory = vi.fn()
const disconnect = vi.fn()

vi.mock('../../server/utils/agencies', () => ({
  loadAgencyDirectory: () => directory(),
}))
vi.mock('../../server/utils/db', () => ({
  disconnectDbAfterPrerender: () => disconnect(),
}))

const sitemap = await import('../../server/utils/agencySitemap')
const { agencySitemapUrls, loadAgencySitemapUrls } = sitemap

const agency = (key: string, listings: number, departments: string[] = ['Montevideo']) =>
  ({
    agency: { version: 1, key, name: `Agencia ${key}`, observedAt: '2026-10-20T00:00:00.000Z' },
    rentals: listings,
    sales: 0,
    listings,
    departments,
    zones: [],
    lastListingSeen: '2026-10-20T00:00:00.000Z',
  }) as unknown as AgencySummary

beforeEach(() => {
  vi.clearAllMocks()
})

describe('agency sitemap', () => {
  it('lists every indexable profile in the three locales with reciprocal alternates', () => {
    const urls = agencySitemapUrls([agency('infocasas:13651', 2214)])
    expect(urls.map(url => url.loc)).toEqual([
      '/inmobiliarias-uruguay/infocasas:13651',
      '/en/inmobiliarias-uruguay/infocasas:13651',
      '/pt/inmobiliarias-uruguay/infocasas:13651',
    ])
    for (const url of urls) {
      expect(url.alternatives).toEqual([
        { hreflang: 'es-ES', href: '/inmobiliarias-uruguay/infocasas:13651' },
        { hreflang: 'en-US', href: '/en/inmobiliarias-uruguay/infocasas:13651' },
        { hreflang: 'pt-PT', href: '/pt/inmobiliarias-uruguay/infocasas:13651' },
        { hreflang: 'x-default', href: '/inmobiliarias-uruguay/infocasas:13651' },
      ])
      expect(url).not.toHaveProperty('lastmod')
    }
  })

  it('keeps the key raw: the sitemap module encodes the path once more', () => {
    const [url] = agencySitemapUrls([agency('casasweb:inmo-del-este', 3)])
    expect(url?.loc).toBe('/inmobiliarias-uruguay/casasweb:inmo-del-este')
    expect(url?.loc).not.toContain('%3A')
  })

  it('applies the profile page gate and drops invalid or repeated keys', () => {
    const urls = agencySitemapUrls([
      agency('infocasas:1', 1),
      agency('infocasas:2', 5, []),
      agency('not-a-source:3', 9),
      agency('infocasas:4', 2),
      agency('infocasas:4', 2),
    ])
    expect(urls.filter(url => !url.loc.startsWith('/en') && !url.loc.startsWith('/pt'))).toEqual([
      expect.objectContaining({ loc: '/inmobiliarias-uruguay/infocasas:4' }),
    ])
    expect(urls).toHaveLength(3)
  })

  it('throws on an empty directory so the cached list survives a bad read', async () => {
    directory.mockResolvedValue([agency('infocasas:1', 1)])
    await expect(loadAgencySitemapUrls()).rejects.toThrow(/no indexable agencies/)
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('propagates a failed directory read instead of returning an empty sitemap', async () => {
    directory.mockRejectedValue(new Error('aggregation timed out'))
    await expect(loadAgencySitemapUrls()).rejects.toThrow('aggregation timed out')
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('returns the profile URLs from a healthy directory', async () => {
    directory.mockResolvedValue([agency('infocasas:13651', 2214), agency('infocasas:9', 1)])
    const urls = await loadAgencySitemapUrls()
    expect(urls).toHaveLength(3)
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
