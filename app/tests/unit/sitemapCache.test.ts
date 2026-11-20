import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createStorage } from 'unstorage'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import atomicFs from '../../server/storage/atomicFs.mjs'

// The site runs as two pm2 workers. With the module's default (memory) cache each one built
// every sitemap on its own, and each deploy started both empty: the crawlers asking for the 35
// sitemaps after a release kept the workers building XML instead of answering pages
// (2026-11-06). The cache lives on disk, under `.data`, which deploy.sh never swaps.
//
// And it is written atomically: with the plain `fs` driver one worker read the other's
// half-written entry, and Nitro reported "Malformed data read from cache."
// (CAMBIO-URUGUAY-BACKEND-1E, mapped on a local build of 179ab8b: nitro.mjs:4308 is
// defineCachedFunction's `typeof entry !== "object"`, called from @nuxtjs/sitemap's
// buildSitemapXmlCached).

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
    const storage = sitemap.runtimeCacheStorage as { driver: string; base: string }
    expect(storage.base).toBe('./.data/sitemap')
    // POSIX (where the site builds and runs) gets the atomic driver. Windows keeps unstorage's own
    // `fs`: there `rename` over an open file is refused and an absolute path is not an import
    // specifier, so the atomic driver broke `nuxi prepare` and `nuxt build` on every Windows checkout.
    if (process.platform === 'win32') expect(storage.driver).toBe('fs')
    else
      expect(storage.driver.replace(/\\/g, '/')).toMatch(/\/app\/server\/storage\/atomicFs\.mjs$/)
    // Whatever machine runs this test, the choice is written down once and the other branch is real.
    const config = readFileSync(join(__dirname, '../../nuxt.config.ts'), 'utf8')
    expect(config).toContain("process.platform === 'win32' ? 'fs' : ATOMIC_FS_DRIVER")
    expect(config).toContain(
      "runtimeCacheStorage: { driver: SITEMAP_CACHE_DRIVER, base: './.data/sitemap' }"
    )
  })
})

// A cachedFunction entry the size of a built sitemap, as Nitro stores it.
const entry = (n: number) =>
  JSON.stringify({
    value: `<urlset>${'<url><loc>x</loc></url>'.repeat(200_000)}${n}</urlset>`,
    mtime: n,
    integrity: 'i',
  })

describe('atomic fs driver', () => {
  const dirs: string[] = []
  const dir = () => {
    const d = mkdtempSync(join(tmpdir(), 'atomic-fs-'))
    dirs.push(d)
    return d
  }
  afterAll(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })))

  it('round-trips values and leaves no temporary file behind', async () => {
    const base = dir()
    const storage = createStorage({ driver: atomicFs({ base }) })
    await storage.setItem('sitemap:xml:a.json', { value: 'x', mtime: 1 })
    expect(await storage.getItem('sitemap:xml:a.json')).toEqual({ value: 'x', mtime: 1 })
    expect(await storage.getKeys()).toEqual(['sitemap:xml:a.json'])
    expect(readdirSync(join(base, 'sitemap', 'xml'))).toEqual(['a.json'])
    await storage.removeItem('sitemap:xml:a.json')
    expect(await storage.hasItem('sitemap:xml:a.json')).toBe(false)
  })

  // Nitro also loads the driver with Node's own import() while building, and the server's Node
  // does not strip TypeScript: as `.ts` the deploy failed (run 44730280599).
  it('loads in plain Node, without TypeScript stripping', () => {
    // The file itself, as a file: URL, so the check also runs where the config picks another driver.
    const driver = pathToFileURL(join(__dirname, '../../server/storage/atomicFs.mjs')).href
    const out = execFileSync(
      process.execPath,
      [
        '--no-experimental-strip-types',
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(driver)}); console.log(typeof m.default)`,
      ],
      { cwd: join(__dirname, '../..'), encoding: 'utf8' }
    )
    expect(out.trim()).toBe('function')
  })

  it('rejects keys that leave the base directory', async () => {
    const storage = createStorage({ driver: atomicFs({ base: dir() }) })
    await expect(storage.setItem('..', 'x')).rejects.toThrow()
  })

  // One storage writes a sitemap-sized entry over and over while another one reads the same
  // file, as the two workers do. A multi-megabyte writeFile is written in chunks, so with the
  // plain `fs` driver the reader regularly gets the file half-filled.
  async function malformedReads(driver: typeof atomicFs) {
    const base = dir()
    const writer = createStorage({ driver: driver({ base }) })
    const reader = createStorage({ driver: driver({ base }) })
    await writer.setItem('sitemap:xml:key.json', entry(0))
    let done = false
    let malformed = 0
    // `finally`: a write that throws must end the read loop and fail the test with its own error,
    // not leave the reader spinning until the timeout.
    const writes = (async () => {
      try {
        for (let i = 1; i <= 30; i++) await writer.setItem('sitemap:xml:key.json', entry(i))
      } finally {
        done = true
      }
    })()
    while (!done) {
      const value = await reader.getItem('sitemap:xml:key.json')
      if (typeof value !== 'object' || value === null) malformed++
    }
    await writes
    return malformed
  }

  // POSIX only: there `rename` replaces a file another process holds open, which is the point of
  // the driver. Windows refuses it (EPERM), and Windows does not use this driver (nuxt.config.ts).
  it.skipIf(process.platform === 'win32')(
    'never hands a reader a half-written entry while another process writes',
    async () => {
      expect(await malformedReads(atomicFs)).toBe(0)
    },
    60_000
  )
})
