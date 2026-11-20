import { beforeAll, describe, expect, it, vi } from 'vitest'

// The site runs as two pm2 workers. With the module's default (memory) cache each one built
// every sitemap on its own, and each deploy started both empty: the crawlers asking for the 35
// sitemaps after a release kept the workers building XML instead of answering pages
// (2026-11-06). The cache lives on disk, under `.data`, which deploy.sh never swaps.

let sitemap: { runtimeCacheStorage?: { driver?: string; base?: string } | boolean }

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (value: unknown) => value)
  try {
    sitemap = (
      (await import('../../nuxt.config')).default as unknown as { sitemap: typeof sitemap }
    ).sitemap
  } finally {
    vi.unstubAllGlobals()
  }
})

describe('sitemap cache', () => {
  it('is on disk, shared by both workers and kept across deploys', () => {
    expect(sitemap.runtimeCacheStorage).toEqual({ driver: 'fs', base: './.data/sitemap' })
  })
})
