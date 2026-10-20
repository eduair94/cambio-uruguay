import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// A page leaves the index by replacing the global `robots` meta with `noindex`.
// Until 2026-10-20 nuxt.config also set `googlebot` and `bingbot` to
// `index, follow` on every page, and nothing replaced those: used-car adverts,
// sale dossiers and filtered directories said `noindex` to everyone and `index`
// to Bing, which then reported them as important pages missing from the sitemap.

type Meta = { name?: string; content?: string }
let config: {
  app: { head: { meta: Meta[] } }
  sitemap: { sitemaps: Record<string, { sources?: unknown[] }> }
}

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (value: unknown) => value)
  try {
    config = (await import('../../nuxt.config')).default as unknown as typeof config
  } finally {
    vi.unstubAllGlobals()
  }
})

const ROOT = resolve(__dirname, '../..')
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(?:vue|ts)$/.test(name) ? [path] : []
  })

describe('robots meta contract', () => {
  it('sets one site-wide robots meta and no per-crawler override', () => {
    const names = config.app.head.meta.map(meta => meta.name?.toLowerCase())
    expect(names.filter(name => name === 'robots')).toHaveLength(1)
    expect(names).not.toContain('googlebot')
    expect(names).not.toContain('bingbot')
  })

  it('no page, component or composable sets a per-crawler robots meta', () => {
    const offenders = ['pages', 'components', 'composables', 'layouts', 'app.vue']
      .map(entry => join(ROOT, entry))
      .flatMap(path => (statSync(path).isDirectory() ? sourceFiles(path) : [path]))
      .filter(file => /name:\s*['"](?:googlebot|bingbot)['"]/i.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('publishes the agency profiles in their own sitemap', () => {
    expect(config.sitemap.sitemaps.inmobiliarias?.sources).toEqual([
      ['/api/__sitemap__/agencies', { timeout: 60_000 }],
    ])
  })
})
