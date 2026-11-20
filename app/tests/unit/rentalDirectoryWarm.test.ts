import { describe, expect, it } from 'vitest'
import {
  RENTAL_DIRECTORY_WARM_QUERIES,
  rentalDirectoryCacheKey,
  runRentalDirectoryWarm,
  warmRentalDirectory,
} from '../../server/utils/rentalDirectoryWarm'

describe('rental directory warm-up', () => {
  it('warms the front page, the three big departments and the scroll page 2, in order and one at a time', async () => {
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
      // The infinite scroll asks for the cards alone since 2026-11-20 (utils/rentalDirectoryParts.ts).
      'page=2&parts=items',
    ])
    expect(maxActive).toBe(1)
    expect(report.failed).toEqual([])
    expect(report.warmed).toEqual(seen)
  })

  it('keeps going when one query fails and reports which one', async () => {
    const report = await warmRentalDirectory(async query => {
      if (query.department === 'Canelones') throw new Error('Mongo unavailable')
    })
    expect(report.warmed).toEqual([
      '',
      'department=Montevideo',
      'department=Maldonado',
      'page=2&parts=items',
    ])
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
      const { parts, ...search } = query
      const base = new URLSearchParams(search).toString()
      expect(key).toBe(parts ? `${parts}_${base}` : base || 'default')
    }
    // The scroll's request for page 2 (pages/alquileres-uruguay.vue `fetchPage`: the search's
    // params, the page and `parts: 'items'`) lands on the warmed entry.
    expect(rentalDirectoryCacheKey({ page: String(2), parts: 'items' })).toBe(
      rentalDirectoryCacheKey({ ...RENTAL_DIRECTORY_WARM_QUERIES.at(-1)! })
    )
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
})
