import { describe, expect, it, vi } from 'vitest'
import {
  createRentalAnalysisResponseCache,
  createRentalAnalysisSnapshotStore,
  RENTAL_ANALYSIS_CACHE_VERSION,
  RENTAL_ANALYSIS_MAX_AGE,
  RENTAL_ANALYSIS_REBUILD_AFTER,
  RENTAL_ANALYSIS_RECHECK,
  rentalAnalysisCutoff,
  type RentalAnalysisSharedCache,
  type RentalAnalysisSnapshot,
} from '../../server/utils/rentalAnalysisCache'
import type { RentalAnalysisListing } from '../../utils/rentalAnalysis'

const initial = Date.parse('2026-09-08T12:00:00Z')
const DAY = 86_400_000
const rows = (n: number) => Array.from({ length: n }, () => ({}) as RentalAnalysisListing)

/** One shared disk (with an mtime-like revision) and any number of workers reading it. */
function fixture() {
  let at = initial
  let generatedAt = '2026-09-08T10:00:00Z'
  let size = 100
  let disk: RentalAnalysisSnapshot | null = null
  let revision = 0
  let queue = Promise.resolve()
  const readMeta = vi.fn(async () => ({ generatedAt }))
  const readCatalogue = vi.fn(async (generation: string) => ({
    generatedAt: generation,
    catalogueProperties: size,
    listings: rows(size),
  }))
  const shared: RentalAnalysisSharedCache = {
    read: vi.fn(async () => disk),
    write: vi.fn(async value => {
      disk = value
      revision++
    }),
    revision: vi.fn(async () => (disk ? revision : null)),
    async withLock(work) {
      const previous = queue
      let release!: () => void
      queue = new Promise<void>(resolve => {
        release = resolve
      })
      await previous
      try {
        return await work()
      } finally {
        release()
      }
    },
  }
  const worker = () =>
    createRentalAnalysisSnapshotStore({ readMeta, readCatalogue, shared, now: () => at })
  return {
    worker,
    readMeta,
    readCatalogue,
    shared,
    clock(value: number) {
      at = value
    },
    generation(value: string) {
      generatedAt = value
    },
    size(value: number) {
      size = value
    },
    seed(value: RentalAnalysisSnapshot) {
      disk = value
      revision++
    },
  }
}

describe('weekly rental analysis snapshot', () => {
  it('never builds on a request: without a snapshot, load fails and reads no catalogue', async () => {
    const f = fixture()
    await expect(f.worker().load()).rejects.toMatchObject({ code: 'RENTAL_ANALYSIS_UNAVAILABLE' })
    expect(f.readMeta).not.toHaveBeenCalled()
    expect(f.readCatalogue).not.toHaveBeenCalled()
  })

  it('serves one weekly build for days, through hourly harvests and UTC midnights', async () => {
    const f = fixture(),
      store = f.worker()
    expect(await store.rebuild()).toMatchObject({ status: 'built', rows: 100, previousRows: null })
    const first = await store.load()
    for (const hours of [1, 2, 24, 72, 6 * 24]) {
      f.clock(initial + hours * 3_600_000)
      // The hourly rental job moves the harvest generation; the analysis does not follow it.
      f.generation(new Date(initial + hours * 3_600_000 - 600_000).toISOString())
      expect(await store.load()).toBe(first)
    }
    expect(f.readCatalogue).toHaveBeenCalledOnce()
    expect(f.readMeta).toHaveBeenCalledTimes(2)
  })

  it('absorbs the double fire: a snapshot younger than twelve hours is left alone', async () => {
    const f = fixture(),
      store = f.worker()
    await store.rebuild()
    f.clock(initial + RENTAL_ANALYSIS_REBUILD_AFTER - 1)
    expect(await store.rebuild()).toEqual({ status: 'fresh', builtAt: initial })
    expect(f.readCatalogue).toHaveBeenCalledOnce()
    f.clock(initial + RENTAL_ANALYSIS_REBUILD_AFTER)
    f.generation(new Date(initial + RENTAL_ANALYSIS_REBUILD_AFTER - 3_600_000).toISOString())
    expect(await store.rebuild()).toMatchObject({ status: 'built', previousRows: 100 })
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
  })

  it('lets only one of the two cluster workers build when both fire the task', async () => {
    const f = fixture()
    const [a, b] = await Promise.all([f.worker().rebuild(), f.worker().rebuild()])
    expect([a.status, b.status].sort()).toEqual(['built', 'fresh'])
    expect(f.readCatalogue).toHaveBeenCalledOnce()
  })

  it('reports a worker waiting on the lock as busy instead of failing the task', async () => {
    const f = fixture()
    f.shared.withLock = async () => {
      throw new Error('Rental analysis normalization is already running')
    }
    expect(await f.worker().rebuild()).toEqual({ status: 'busy' })
  })

  it('lets the other worker see a new build through the cheap revision check', async () => {
    const f = fixture(),
      builder = f.worker(),
      reader = f.worker()
    await builder.rebuild()
    const first = await reader.load()
    const t0 = initial + RENTAL_ANALYSIS_REBUILD_AFTER
    f.clock(t0)
    expect(await reader.load()).toBe(first)
    f.generation(new Date(t0 - 3_600_000).toISOString())
    await builder.rebuild()
    // Within the recheck window the reader keeps its copy without touching the disk…
    f.clock(t0 + RENTAL_ANALYSIS_RECHECK - 1)
    expect(await reader.load()).toBe(first)
    f.clock(t0 + RENTAL_ANALYSIS_RECHECK)
    const reads = vi.mocked(f.shared.read).mock.calls.length
    const second = await reader.load()
    expect(second).not.toBe(first)
    expect(vi.mocked(f.shared.read).mock.calls.length).toBe(reads + 1)
    // …and an unchanged revision does not re-parse the file.
    f.clock(t0 + 2 * RENTAL_ANALYSIS_RECHECK)
    expect(await reader.load()).toBe(second)
    expect(vi.mocked(f.shared.read).mock.calls.length).toBe(reads + 1)
  })

  it('declares a snapshot stale after two missed weeks, and the bootstrap rebuilds it', async () => {
    const f = fixture(),
      store = f.worker()
    await store.rebuild()
    f.clock(initial + RENTAL_ANALYSIS_MAX_AGE + 1)
    await expect(store.load()).rejects.toMatchObject({
      code: 'RENTAL_ANALYSIS_STALE',
      generatedAt: '2026-09-08T10:00:00Z',
    })
    f.generation(new Date(initial + RENTAL_ANALYSIS_MAX_AGE - 3_600_000).toISOString())
    expect(await store.ensure()).toMatchObject({ status: 'built' })
    expect((await store.load()).loadedAt).toBe(initial + RENTAL_ANALYSIS_MAX_AGE + 1)
  })

  it('does nothing at boot when a servable snapshot is already on disk', async () => {
    const f = fixture()
    await f.worker().rebuild()
    expect(await f.worker().ensure()).toBeNull()
    expect(f.readCatalogue).toHaveBeenCalledOnce()
  })

  it('refuses to replace a snapshot with a much thinner read, until the old one is too old', async () => {
    const f = fixture(),
      store = f.worker()
    await store.rebuild()
    f.clock(initial + RENTAL_ANALYSIS_REBUILD_AFTER)
    f.generation(new Date(initial + RENTAL_ANALYSIS_REBUILD_AFTER - 3_600_000).toISOString())
    f.size(59)
    expect(await store.rebuild()).toEqual({ status: 'thin', rows: 59, previousRows: 100 })
    expect((await store.load()).value.listings).toHaveLength(100)
    f.size(60)
    expect(await store.rebuild()).toMatchObject({ status: 'built', rows: 60 })
    // Past the stale limit the old snapshot is no longer servable, so a thin read still wins.
    const late = initial + RENTAL_ANALYSIS_REBUILD_AFTER + RENTAL_ANALYSIS_MAX_AGE + 1
    f.clock(late)
    f.generation(new Date(late - 3_600_000).toISOString())
    f.size(10)
    expect(await store.rebuild()).toMatchObject({ status: 'built', rows: 10 })
  })

  it('does not build from a stale harvest, and keeps serving the previous snapshot', async () => {
    const f = fixture(),
      store = f.worker()
    await store.rebuild()
    f.clock(initial + 11 * DAY)
    // The rental job stopped: its last generation is older than the 10-day observation window.
    await expect(store.rebuild()).rejects.toMatchObject({ code: 'RENTAL_ANALYSIS_STALE' })
    expect(await store.load()).toMatchObject({ loadedAt: initial })
  })

  it('retries once when a generation changes mid-scan and never publishes the discarded scan', async () => {
    const f = fixture()
    f.readCatalogue.mockImplementationOnce(async generation => {
      f.generation('2026-09-08T11:00:00Z')
      return { generatedAt: generation, catalogueProperties: 0, listings: [] }
    })
    expect(await f.worker().rebuild()).toMatchObject({
      status: 'built',
      generatedAt: '2026-09-08T11:00:00Z',
    })
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
    expect(f.shared.write).toHaveBeenCalledOnce()
  })

  it('fails closed when both scan attempts observe changing generations', async () => {
    const f = fixture()
    let minute = 1
    f.readCatalogue.mockImplementation(async generation => {
      f.generation(`2026-09-08T11:0${minute++}:00Z`)
      return { generatedAt: generation, catalogueProperties: 0, listings: [] }
    })
    await expect(f.worker().rebuild()).rejects.toThrow('source changed')
    expect(f.shared.write).not.toHaveBeenCalled()
  })

  it('reports a failed write, while the building worker still serves what it read', async () => {
    const f = fixture(),
      store = f.worker()
    vi.mocked(f.shared.write).mockRejectedValue(new Error('disk full'))
    await expect(store.rebuild()).rejects.toThrow('disk full')
    expect((await store.load()).value.listings).toHaveLength(100)
  })

  it('ignores a snapshot from another version or from the future', async () => {
    for (const change of [{ version: 99 }, { loadedAt: initial + 1 }]) {
      const f = fixture()
      f.seed({
        version: RENTAL_ANALYSIS_CACHE_VERSION,
        loadedAt: initial,
        cutoff: rentalAnalysisCutoff(initial),
        value: { generatedAt: '2026-09-08T10:00:00Z', catalogueProperties: 0, listings: [] },
        ...change,
      } as RentalAnalysisSnapshot)
      await expect(f.worker().load()).rejects.toMatchObject({
        code: 'RENTAL_ANALYSIS_UNAVAILABLE',
      })
    }
  })
})

describe('bounded rental analysis response cache', () => {
  it('expires results without extending their life on hits and bounds LRU entries', () => {
    let at = initial
    const cache = createRentalAnalysisResponseCache<number>({ now: () => at, maxEntries: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    at += 29_000
    expect(cache.get('a')).toBe(1)
    at += 1_000
    expect(cache.get('a')).toBeUndefined()
  })
})
