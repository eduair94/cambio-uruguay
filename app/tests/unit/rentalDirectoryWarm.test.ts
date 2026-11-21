import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RENTAL_DIRECTORY_WARM_QUERIES,
  rentalDirectoryBootWarmDelay,
  rentalDirectoryCacheKey,
  rentalDirectoryWarmFetcher,
  runRentalDirectoryWarm,
  warmRentalDirectory,
} from '../../server/utils/rentalDirectoryWarm'

describe('rental directory warm-up', () => {
  it('warms the front page and the three big departments, in order and one at a time', async () => {
    const seen: string[] = []
    let active = 0
    let maxActive = 0
    const report = await warmRentalDirectory(async query => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      seen.push(new URLSearchParams(query).toString())
      active--
    })
    expect(report.status).toBe('warmed')
    expect(seen).toEqual([
      '',
      'department=Montevideo',
      'department=Canelones',
      'department=Maldonado',
    ])
    expect(maxActive).toBe(1)
    expect(report.failed).toEqual([])
    expect(report.warmed).toEqual(seen)
  })

  it('keeps going when one query fails and reports which one', async () => {
    const report = await warmRentalDirectory(async query => {
      if (query.department === 'Canelones') throw new Error('Mongo unavailable')
    })
    expect(report.warmed).toEqual(['', 'department=Montevideo', 'department=Maldonado'])
    expect(report.failed).toEqual([{ query: 'department=Canelones', error: 'Mongo unavailable' }])
  })

  it('refuses to stack a second run on the same process while one is in flight', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    const first = runRentalDirectoryWarm(() => gate, [{}])
    const second = await runRentalDirectoryWarm(async () => {}, [{}])
    expect(second.status).toBe('busy')
    release()
    expect((await first).status).toBe('warmed')
    // Once the first run finished the guard opens again.
    expect((await runRentalDirectoryWarm(async () => {}, [{}])).status).toBe('warmed')
  })

  it('warms exactly the cache keys the handler would mint for those queries', () => {
    // A warm-up that lands on a different key than the visitor's request warms nothing.
    for (const query of RENTAL_DIRECTORY_WARM_QUERIES) {
      const key = rentalDirectoryCacheKey({ ...query })
      expect(key).toBe(new URLSearchParams(query).toString() || 'default')
    }
    // Only whole responses: a scroll page (`parts=items`) no longer goes through Nitro's memo
    // (server/api/rentals/index.get.ts), its window is the inner memo's entry the first page warms.
    expect(RENTAL_DIRECTORY_WARM_QUERIES.every(query => !('parts' in query))).toBe(true)
    // `?page=1`, `?` and a stray tracking parameter all collapse into the front-page entry.
    expect(rentalDirectoryCacheKey({ page: '1' })).toBe('default')
    expect(rentalDirectoryCacheKey({ utm_source: 'x' })).toBe('default')
    expect(rentalDirectoryCacheKey({ availabilityRevision: '3' })).toBe('default')
  })

  it('keeps a part of the response apart from the whole response', () => {
    // An items-only or facets-only answer must never be served to a request for the whole page.
    expect(rentalDirectoryCacheKey({ page: '2', parts: 'items' })).toBe('items_page=2')
    expect(rentalDirectoryCacheKey({ department: 'Montevideo', parts: 'facets' })).toBe(
      'facets_department=Montevideo'
    )
    expect(rentalDirectoryCacheKey({ parts: 'items' })).toBe('items_')
    // The whole response keeps the key it always had, whatever else `parts` says.
    for (const parts of ['all', 'cards', '', ['items', 'facets']])
      expect(rentalDirectoryCacheKey({ page: '2', parts })).toBe(
        Array.isArray(parts) ? 'items_page=2' : 'page=2'
      )
    // The part is a prefix on the normalised search, so the order of the URL does not matter.
    expect(rentalDirectoryCacheKey({ parts: 'items', page: '2', department: 'Montevideo' })).toBe(
      rentalDirectoryCacheKey({ department: 'Montevideo', page: '2', parts: 'items' })
    )
  })

  it('keeps the parts apart from free text once Nitro escapes the key', () => {
    // Nitro's `defineCachedEventHandler` stores the entry under `getKey(event)` with every non-word
    // character stripped (nitropack runtime/internal/cache.mjs, `escapeKey`). A trailing
    // `&parts=facets` was then the same entry as a department typed as "Montevideo parts facets",
    // so one crafted URL could serve a 0-result answer to the drawer, or `items` without `facets`
    // to a full request, for five minutes.
    const escapeKey = (key: string) => key.replace(/\W/g, '')
    const pairs: Array<[Record<string, unknown>, Record<string, unknown>]> = [
      [{ department: 'Montevideo', parts: 'facets' }, { department: 'Montevideo parts facets' }],
      [
        { department: 'Montevideo', page: '2', parts: 'items' },
        { department: 'Montevideo page2parts items' },
      ],
      [{ page: '2', parts: 'items' }, { q: 'page2parts items' }],
      [{ parts: 'items' }, { q: 'items' }],
      [{ parts: 'facets' }, { availability: 'facets' }],
    ]
    for (const [part, full] of pairs) {
      expect(escapeKey(rentalDirectoryCacheKey(part))).not.toBe(
        escapeKey(rentalDirectoryCacheKey(full))
      )
    }
    // No escaped full key can start with a part's name: every one starts with a parameter name of
    // `rentalQueryToParams` or is `default`.
    for (const full of [
      {},
      { q: 'x' },
      { department: 'Montevideo' },
      { type: 'apartamento' },
      { page: '3' },
    ]) {
      const escaped = escapeKey(rentalDirectoryCacheKey(full))
      expect(escaped.startsWith('items')).toBe(false)
      expect(escaped.startsWith('facets')).toBe(false)
    }
  })

  it('warms the inner memo before the outer one, for each query', async () => {
    const calls: string[] = []
    const fetcher = rentalDirectoryWarmFetcher(
      async query => {
        calls.push(`inner ${new URLSearchParams(query)}`)
      },
      async query => {
        calls.push(`outer ${new URLSearchParams(query)}`)
        return 'ok'
      }
    )
    const report = await warmRentalDirectory(fetcher, [{}, { department: 'Montevideo' }])
    expect(calls).toEqual([
      'inner ',
      'outer ',
      'inner department=Montevideo',
      'outer department=Montevideo',
    ])
    expect(report.warmed).toEqual(['', 'department=Montevideo'])
    // A failed inner warm-up is reported, and the outer request for that query is not sent.
    const failing = rentalDirectoryWarmFetcher(
      async () => {
        throw new Error('Mongo unavailable')
      },
      async query => calls.push(`outer ${new URLSearchParams(query)}`)
    )
    calls.length = 0
    const failed = await warmRentalDirectory(failing, [{}])
    expect(failed.failed).toEqual([{ query: '', error: 'Mongo unavailable' }])
    expect(calls).toEqual([])
  })
})

describe('the warm-up at boot', () => {
  const production = { NODE_ENV: 'production' }

  it('waits 5 s plus 25 s per pm2 instance', () => {
    expect(rentalDirectoryBootWarmDelay({ dev: false, prerender: false, env: production })).toBe(
      5_000
    )
    for (const [instance, delay] of [
      ['0', 5_000],
      ['1', 30_000],
      ['2', 55_000],
      ['x', 5_000],
      ['-1', 5_000],
    ] as const)
      expect(
        rentalDirectoryBootWarmDelay({
          dev: false,
          prerender: false,
          env: { ...production, NODE_APP_INSTANCE: instance },
        }),
        instance
      ).toBe(delay)
  })

  it('never runs in dev, in the prerender, in tests or in the deploy preflight', () => {
    expect(rentalDirectoryBootWarmDelay({ dev: true, prerender: false, env: production })).toBe(
      null
    )
    expect(rentalDirectoryBootWarmDelay({ dev: false, prerender: true, env: production })).toBe(
      null
    )
    expect(
      rentalDirectoryBootWarmDelay({ dev: false, prerender: false, env: { NODE_ENV: 'test' } })
    ).toBe(null)
    // scripts/check-staging.cjs forks the candidate build like this: production, no instance.
    expect(
      rentalDirectoryBootWarmDelay({
        dev: false,
        prerender: false,
        env: { NODE_ENV: 'production', CU_DEPLOY_PREFLIGHT: '1' },
      })
    ).toBe(null)
  })

  it('is what the plugin asks, with a one-shot timer that never holds the process', () => {
    const plugin = readFileSync(
      join(__dirname, '../../server/plugins/rental-directory-warm.ts'),
      'utf8'
    )
    expect(plugin).toMatch(/rentalDirectoryBootWarmDelay\(\{\s*dev: import\.meta\.dev,/)
    expect(plugin).toContain('prerender: import.meta.prerender')
    expect(plugin).toContain('env: process.env')
    expect(plugin).toContain('if (delay === null) return')
    expect(plugin).toMatch(/const timer = setTimeout\(/)
    expect(plugin).toContain('timer.unref?.()')
    expect(plugin).not.toMatch(/setInterval\(/)
    // The same warm-up as the task at :51 and :56: inner memo first, then the route.
    const task = readFileSync(
      join(__dirname, '../../server/tasks/rentals/directory-warm.ts'),
      'utf8'
    )
    for (const source of [plugin, task])
      expect(source).toMatch(
        /runRentalDirectoryWarm\(\s*rentalDirectoryWarmFetcher\(rentalDirectoryData\.warm, query =>\s*\$fetch\('\/api\/rentals', \{ query \}\)\s*\)\s*\)/
      )
  })
})
