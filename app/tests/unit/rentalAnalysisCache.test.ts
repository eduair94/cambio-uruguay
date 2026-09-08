import { describe, expect, it, vi } from 'vitest'
import {
  createRentalAnalysisCatalogueCache,
  createRentalAnalysisResponseCache,
  RENTAL_ANALYSIS_CACHE_VERSION,
  rentalAnalysisCutoff,
  type RentalAnalysisSharedCache,
  type RentalAnalysisSnapshot,
} from '../../server/utils/rentalAnalysisCache'

const initial = Date.parse('2026-09-08T12:00:00Z')
function fixture() {
  let at = initial
  let generatedAt = '2026-09-08T10:00:00Z'
  let disk: RentalAnalysisSnapshot | null = null
  let queue = Promise.resolve()
  const readMeta = vi.fn(async () => ({ generatedAt }))
  const readCatalogue = vi.fn(async (generation: string) => ({
    generatedAt: generation,
    catalogueProperties: 0,
    listings: [],
  }))
  const shared: RentalAnalysisSharedCache = {
    read: vi.fn(async () => disk),
    write: vi.fn(async value => {
      disk = value
    }),
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
  const loader = () =>
    createRentalAnalysisCatalogueCache({ readMeta, readCatalogue, shared, now: () => at })
  return {
    loader,
    readMeta,
    readCatalogue,
    shared,
    clock(value: number) {
      at = value
    },
    generation(value: string) {
      generatedAt = value
    },
    seed(value: RentalAnalysisSnapshot) {
      disk = value
    },
  }
}

describe('rental analysis generation cache', () => {
  it('checks metadata every minute while reusing normalization for up to ten minutes', async () => {
    const f = fixture(),
      load = f.loader()
    const first = await load()
    expect(await load()).toBe(first)
    expect(f.readMeta).toHaveBeenCalledTimes(2)
    expect(f.readCatalogue).toHaveBeenCalledOnce()
    f.clock(initial + 60_001)
    expect(await load()).toBe(first)
    expect(f.readMeta).toHaveBeenCalledTimes(3)
    expect(f.readCatalogue).toHaveBeenCalledOnce()
    f.clock(initial + 600_001)
    expect(await load()).not.toBe(first)
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
  })

  it('coalesces initial normalization across workers and reuses disk after a restart', async () => {
    const f = fixture()
    const [first, second] = await Promise.all([f.loader()(), f.loader()()])
    expect(second).toBe(first)
    expect(f.readCatalogue).toHaveBeenCalledOnce()
    expect(await f.loader()()).toBe(first)
    expect(f.readCatalogue).toHaveBeenCalledOnce()
  })

  it('loads a new source generation after metadata revalidation', async () => {
    const f = fixture(),
      load = f.loader()
    const first = await load()
    f.generation('2026-09-08T11:00:00Z')
    f.clock(initial + 60_001)
    const second = await load()
    expect(second.value.generatedAt).toBe('2026-09-08T11:00:00Z')
    expect(second).not.toBe(first)
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
  })

  it('checks metadata freshness at midnight even while the minute cache remains warm', async () => {
    const f = fixture()
    f.clock(Date.parse('2026-09-08T23:59:59Z'))
    f.generation('2026-08-29T10:00:00Z')
    const load = f.loader()
    await load()
    f.clock(Date.parse('2026-09-09T00:00:00Z'))
    await expect(load()).rejects.toMatchObject({ code: 'RENTAL_ANALYSIS_STALE' })
    f.generation('2026-09-09T00:00:00Z')
    expect((await load()).cutoff).toBe('2026-08-30')
  })

  it('rebuilds the UTC observation cutoff and refuses future cache timestamps after clock rollback', async () => {
    const f = fixture()
    f.clock(Date.parse('2026-09-08T23:59:59Z'))
    const load = f.loader()
    const first = await load()
    f.clock(Date.parse('2026-09-09T00:00:00Z'))
    expect((await load()).cutoff).not.toBe(first.cutoff)
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
    f.clock(Date.parse('2026-09-08T09:00:00Z'))
    await expect(load()).rejects.toThrow('metadata unavailable')
  })

  it('does not use an expired, mismatched or future shared snapshot', async () => {
    for (const change of [
      { loadedAt: initial - 600_001 },
      { loadedAt: initial + 1 },
      { cutoff: '2026-08-28' },
      { version: 99 },
      { value: { generatedAt: '2026-09-08T09:00:00Z', catalogueProperties: 0, listings: [] } },
    ]) {
      const f = fixture()
      f.seed({
        version: RENTAL_ANALYSIS_CACHE_VERSION,
        loadedAt: initial,
        cutoff: rentalAnalysisCutoff(initial),
        value: { generatedAt: '2026-09-08T10:00:00Z', catalogueProperties: 0, listings: [] },
        ...change,
      } as RentalAnalysisSnapshot)
      await f.loader()()
      expect(f.readCatalogue).toHaveBeenCalledOnce()
    }
  })

  it('retries once when a generation changes mid-scan and never publishes the discarded scan', async () => {
    const f = fixture()
    f.readCatalogue.mockImplementationOnce(async generation => {
      f.generation('2026-09-08T11:00:00Z')
      return { generatedAt: generation, catalogueProperties: 0, listings: [] }
    })
    const result = await f.loader()()
    expect(result.value.generatedAt).toBe('2026-09-08T11:00:00Z')
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
    await expect(f.loader()()).rejects.toThrow('source changed')
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
    expect(f.shared.write).not.toHaveBeenCalled()
  })

  it('keeps complete reads usable after persistence failure but does not fall back after failed refresh', async () => {
    const f = fixture(),
      load = f.loader()
    vi.mocked(f.shared.write).mockRejectedValue(new Error('disk full'))
    const first = await load()
    expect(await load()).toBe(first)
    f.clock(initial + 600_001)
    f.readCatalogue.mockRejectedValueOnce(new Error('stream failed'))
    await expect(load()).rejects.toThrow('stream failed')
    expect(f.readCatalogue).toHaveBeenCalledTimes(2)
    expect(await load()).not.toBe(first)
  })

  it('shares in-flight work in one worker and recovers after metadata failure', async () => {
    const f = fixture(),
      load = f.loader()
    f.readMeta.mockRejectedValueOnce(new Error('metadata offline'))
    await expect(load()).rejects.toThrow('metadata offline')
    const [first, second] = await Promise.all([load(), load()])
    expect(second).toBe(first)
    expect(f.readCatalogue).toHaveBeenCalledOnce()
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
