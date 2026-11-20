// The per-worker memo of the rentals directory (spec P2). Everything runs on a fake clock and a fake
// one-shot scheduler: no real timer is created by these tests (the last describe checks that, and
// checks the default scheduler unrefs its timer).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RENTAL_MEMO_HEADER,
  RENTAL_WORKER_HEADER,
  RentalMemoBusyError,
  createRentalMemo,
  defaultRentalMemoSchedule,
  formatRentalMemoHeader,
  hashIds,
  rentalMemo,
  rentalMemoKey,
  rentalWorkerId,
  type RentalMemoKind,
  type RentalMemoOptions,
} from '../../server/utils/rentalMemo'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_PER_PAGE,
  RENTAL_STALE_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMatchingOffer,
  rentalMongoSort,
  rentalOfferStages,
  rentalPublicStages,
  rentalRecentSortProjection,
  type RentalOffer,
  type RentalQuery,
} from '../../utils/rentals'
import { rentalDistanceProjection, rentalDistanceStages } from '../../utils/rentalDistance'
import { rentalPricePerM2Stages } from '../../utils/rentalPricePerM2'
import {
  RENTAL_SERVICE_FILTERS,
  formatRentalServiceSelections,
} from '../../utils/rentalZoneServices'
import { MUTUALISTA_SEDES } from '../../utils/mutualistaSedes'

const KINDS: readonly RentalMemoKind[] = ['win', 'facet', 'dept', 'barrio', 'map']
const S = 1000
const T0 = 10_000_000

interface Timer {
  at: number
  fn: () => void
  cancelled: boolean
}

/** Lets every promise chain started by a resolution or a timer run to its end. */
async function flush() {
  for (let i = 0; i < 12; i++) await new Promise<void>(resolve => setImmediate(resolve))
}

function harness(over: Partial<RentalMemoOptions> = {}) {
  let clock = T0
  const timers: Timer[] = []
  const logs: unknown[] = []
  const schedule = (fn: () => void, ms: number) => {
    const timer = { at: clock + Math.max(0, ms), fn, cancelled: false }
    timers.push(timer)
    return () => {
      timer.cancelled = true
    }
  }
  const memo = createRentalMemo({
    now: () => clock,
    random: () => 0.5,
    schedule,
    log: stats => logs.push(stats),
    ...over,
  })
  return {
    memo,
    timers,
    logs,
    schedule,
    get now() {
      return clock
    },
    /** Moves the clock to `ms` from now, firing every due timer at its own instant. */
    async advance(ms: number) {
      const target = clock + ms
      for (;;) {
        const due = timers
          .filter(timer => !timer.cancelled && timer.at <= target)
          .sort((a, b) => a.at - b.at)[0]
        if (!due) break
        clock = Math.max(clock, due.at)
        due.cancelled = true
        due.fn()
        await flush()
      }
      clock = target
      await flush()
    },
    /** Moves the clock without firing timers (for entries whose age is all a test needs). */
    jump(ms: number) {
      clock += ms
    },
  }
}

interface Pending<T> {
  resolve: (value: T, weight?: number) => void
  reject: (error: unknown) => void
  startedAt: number
}

/** A build whose every call waits until the test settles it. */
function manualBuild<T>(clock: () => number) {
  const calls: Array<Pending<T>> = []
  const build = () =>
    new Promise<{ value: T; weight: number }>((resolve, reject) => {
      calls.push({
        resolve: (value, weight = 10) => resolve({ value, weight }),
        reject,
        startedAt: clock(),
      })
    })
  return { build, calls }
}

const instant =
  <T>(value: T, weight = 10) =>
  async () => ({ value, weight })

const failing =
  (message = 'db down') =>
  async () => {
    throw new Error(message)
  }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('freshness on a fake clock', () => {
  it('serves a fresh entry as a hit without building', async () => {
    const h = harness()
    const build = vi.fn(instant('v1'))
    expect(await h.memo.get('win', 'k', build)).toEqual({ value: 'v1', state: 'miss', builtAt: T0 })
    h.jump(299 * S)
    expect(await h.memo.get('win', 'k', build)).toEqual({ value: 'v1', state: 'hit', builtAt: T0 })
    expect(build).toHaveBeenCalledTimes(1)
  })

  it('at 899 s serves the entry as stale at once and starts ONE background refresh', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    h.jump(899 * S)
    const refresh = manualBuild<string>(() => h.now)
    expect(await h.memo.get('win', 'k', refresh.build)).toMatchObject({
      value: 'v1',
      state: 'stale',
    })
    expect(await h.memo.get('win', 'k', refresh.build)).toMatchObject({ state: 'stale' })
    await flush()
    expect(refresh.calls).toHaveLength(1)
    refresh.calls[0]!.resolve('v2')
    await flush()
    expect(await h.memo.get('win', 'k', refresh.build)).toMatchObject({
      value: 'v2',
      state: 'hit',
    })
  })

  it('at 900 s makes the caller wait for a synchronous build', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    h.jump(900 * S)
    const rebuild = manualBuild<string>(() => h.now)
    let settled = false
    const answer = h.memo.get('win', 'k', rebuild.build).then(result => {
      settled = true
      return result
    })
    await flush()
    expect(rebuild.calls).toHaveLength(1)
    expect(settled).toBe(false)
    rebuild.calls[0]!.resolve('v2')
    expect(await answer).toEqual({ value: 'v2', state: 'miss', builtAt: T0 + 900 * S })
  })

  it('at 900 s returns the old entry as stale when that build fails', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    h.jump(900 * S)
    expect(await h.memo.get('win', 'k', failing())).toEqual({
      value: 'v1',
      state: 'stale',
      builtAt: T0,
    })
    expect(h.memo.stats().win.failures).toBe(1)
  })

  it('at 3600 s lets the failure propagate', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    h.jump(3599 * S)
    expect(await h.memo.get('win', 'k', failing())).toMatchObject({ state: 'stale' })
    h.jump(1 * S)
    await expect(h.memo.get('win', 'k', failing('gone'))).rejects.toThrow('gone')
  })

  it('peek returns the entry until 900 s, then nothing, and never builds', async () => {
    const h = harness()
    await h.memo.get('map', 'k', instant('points', 99))
    h.jump(899 * S)
    expect(h.memo.peek('map', 'k')).toMatchObject({
      value: 'points',
      // What the budget is charged: the reported weight, the fixed overhead, the id twice.
      weight: 99 + 512 + 2 * 'map k'.length,
      builtAt: T0,
      serveUntil: T0 + 900 * S,
      hardExpiresAt: T0 + 3600 * S,
    })
    h.jump(1 * S)
    expect(h.memo.peek('map', 'k')).toBeUndefined()
    expect(h.memo.peek('map', 'never')).toBeUndefined()
    expect(h.memo.stats().map.builds).toBe(1)
  })

  it('spreads the soft expiry over 270–330 s', async () => {
    for (const r of [0, 0.25, 0.5, 0.999999]) {
      const h = harness({ random: () => r })
      await h.memo.get('facet', 'k', instant(1))
      const entry = h.memo.peek('facet', 'k')!
      const soft = entry.softExpiresAt - entry.builtAt
      expect(soft).toBeGreaterThanOrEqual(270 * S)
      expect(soft).toBeLessThan(330 * S)
    }
    const early = harness({ random: () => 0 })
    await early.memo.get('facet', 'k', instant(1))
    early.jump(270 * S)
    expect((await early.memo.get('facet', 'k', instant(2))).state).toBe('stale')
  })
})

describe('single flight and failures', () => {
  it('runs one build for ten concurrent callers', async () => {
    const h = harness()
    const build = manualBuild<string>(() => h.now)
    const answers = Array.from({ length: 10 }, () => h.memo.get('win', 'k', build.build))
    await flush()
    expect(build.calls).toHaveLength(1)
    build.calls[0]!.resolve('one')
    const results = await Promise.all(answers)
    expect(results.every(result => result.value === 'one' && result.state === 'miss')).toBe(true)
    expect(h.memo.stats().win).toMatchObject({ builds: 1, miss: 10 })
  })

  it('never stores a failure: every waiter gets the error and the next get builds again', async () => {
    const h = harness()
    const build = manualBuild<string>(() => h.now)
    const answers = [h.memo.get('win', 'k', build.build), h.memo.get('win', 'k', build.build)]
    await flush()
    build.calls[0]!.reject(new Error('maxTimeMS'))
    for (const answer of answers) await expect(answer).rejects.toThrow('maxTimeMS')
    expect(h.memo.peek('win', 'k')).toBeUndefined()
    expect(await h.memo.get('win', 'k', instant('ok'))).toMatchObject({ state: 'miss' })
    expect(h.memo.stats().win).toMatchObject({ builds: 2, failures: 1 })
  })

  it('keeps the entry when a background refresh fails, and retries on the next get', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    h.jump(400 * S)
    const refresh = vi.fn(failing())
    expect(await h.memo.get('win', 'k', refresh)).toMatchObject({ value: 'v1', state: 'stale' })
    await flush()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(h.memo.peek('win', 'k')?.value).toBe('v1')
    expect(await h.memo.get('win', 'k', refresh)).toMatchObject({ value: 'v1', state: 'stale' })
    await flush()
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(h.memo.stats().win.failures).toBe(2)
  })

  it('force builds a fresh key without blocking hits, and replaces it only on success', async () => {
    const h = harness()
    await h.memo.get('facet', 'k', instant('v1'))
    h.jump(10 * S)
    const forced = manualBuild<string>(() => h.now)
    const warming = h.memo.get('facet', 'k', forced.build, { force: true, priority: 'warm' })
    await flush()
    expect(forced.calls).toHaveLength(1)
    expect(await h.memo.get('facet', 'k', instant('x'))).toMatchObject({
      value: 'v1',
      state: 'hit',
    })
    forced.calls[0]!.reject(new Error('timeout'))
    // The warm-up learns it failed only through the state: it gets the entry back, as stale.
    expect(await warming).toMatchObject({ value: 'v1', state: 'stale' })
    expect(h.memo.peek('facet', 'k')?.value).toBe('v1')

    const again = h.memo.get('facet', 'k', instant('v2'), { force: true, priority: 'warm' })
    expect(await again).toMatchObject({ value: 'v2', state: 'miss' })
    expect(await h.memo.get('facet', 'k', instant('x'))).toMatchObject({
      value: 'v2',
      state: 'hit',
    })
  })

  it('does not store a build that started before clear(), even when it ends last', async () => {
    // Single-flight leaves clear() as the only way two builds of one key overlap; the guard keeps
    // the newer one (rentalCoverage.ts's revision guard, per key).
    const h = harness()
    const old = manualBuild<string>(() => h.now)
    const oldAnswer = h.memo.get('win', 'k', old.build)
    await flush()
    h.memo.clear()
    h.jump(1 * S)
    expect(await h.memo.get('win', 'k', instant('new'))).toMatchObject({ value: 'new' })
    old.calls[0]!.resolve('old')
    expect(await oldAnswer).toMatchObject({ value: 'old', state: 'miss' })
    expect(h.memo.peek('win', 'k')?.value).toBe('new')
    expect(h.memo.stats().win.entries).toBe(1)
  })
})

describe('bytes, not entries', () => {
  it('evicts the least recently used entry of the budget it belongs to', async () => {
    // No fixed per-entry overhead here, so the bytes are the reported weights plus the ids.
    const h = harness({ budgets: { win: 100, facets: 100, map: 100 }, entryOverheadBytes: 0 })
    await h.memo.get('win', 'a', instant('a', 40))
    await h.memo.get('win', 'b', instant('b', 40))
    h.jump(1)
    expect((await h.memo.get('win', 'a', instant('-'))).state).toBe('hit')
    await h.memo.get('win', 'c', instant('c', 40))
    expect(h.memo.peek('win', 'b')).toBeUndefined()
    expect(h.memo.peek('win', 'a')?.value).toBe('a')
    expect(h.memo.peek('win', 'c')?.value).toBe('c')
    // Each is charged its weight plus twice its id ('win a', 'win c'): 2 × (40 + 10).
    expect(h.memo.stats().win).toMatchObject({ entries: 2, bytes: 100, evictions: 1 })

    // facet, dept and barrio share one budget; map has its own.
    await h.memo.get('map', 'm', instant('m', 90))
    await h.memo.get('facet', 'f', instant('f', 60))
    await h.memo.get('dept', 'd', instant('d', 60))
    expect(h.memo.peek('facet', 'f')).toBeUndefined()
    expect(h.memo.peek('dept', 'd')?.value).toBe('d')
    expect(h.memo.peek('map', 'm')?.value).toBe('m')
    expect(h.memo.stats().facet.evictions).toBe(1)
    expect(h.memo.stats().win.entries).toBe(2)
  })

  it('returns an entry above its cap without storing it', async () => {
    const h = harness({ entryCaps: { map: 50 } })
    expect(await h.memo.get('map', 'big', instant('huge', 51))).toMatchObject({
      value: 'huge',
      state: 'miss',
    })
    expect(h.memo.peek('map', 'big')).toBeUndefined()
    expect(h.memo.stats().map).toMatchObject({ entries: 0, bytes: 0 })
    await h.memo.get('map', 'ok', instant('fits', 50))
    expect(h.memo.peek('map', 'ok')?.value).toBe('fits')
  })

  it('has the spec budgets and caps by default', async () => {
    const MB = 1024 * 1024
    const h = harness()
    await h.memo.get('win', 'w', instant(1, 256 * 1024 + 1))
    await h.memo.get('facet', 'f', instant(1, 512 * 1024 + 1))
    await h.memo.get('map', 'm', instant(1, 4 * MB + 1))
    expect(h.memo.stats().win.entries + h.memo.stats().facet.entries).toBe(0)
    expect(h.memo.stats().map.entries).toBe(0)
    for (let i = 0; i < 25; i++) await h.memo.get('win', `w${i}`, instant(i, 256 * 1024))
    // Each entry is charged its weight plus the fixed overhead and twice its id's length
    // ('win w0' … 'win w24'), so 23 entries of 256 KB fit in 6 MB, not 24.
    const win = h.memo.stats().win
    expect(win.entries).toBe(23)
    expect(win.evictions).toBe(2)
    expect(win.bytes).toBeLessThanOrEqual(6 * MB)
    expect(win.bytes).toBe(
      Array.from({ length: 23 }, (_, i) => 256 * 1024 + 512 + 2 * `win w${i + 2}`.length).reduce(
        (sum, bytes) => sum + bytes,
        0
      )
    )
  })

  it('charges a fixed overhead per entry, so weight-0 entries cannot grow without bound', async () => {
    const MB = 1024 * 1024
    const h = harness()
    for (let i = 0; i < 50_000; i++) await h.memo.get('win', `empty-${i}`, instant(null, 0))
    const win = h.memo.stats().win
    expect(win.bytes).toBeLessThanOrEqual(6 * MB)
    expect(win.entries).toBeLessThanOrEqual((6 * MB) / 512)
    expect(win.entries).toBeGreaterThan(0)
    expect(win.evictions).toBe(50_000 - win.entries)
    // Still bounded after every entry passed its hard expiry and a new one arrives.
    h.jump(3600 * 1000 + 1)
    await h.memo.get('win', 'one-more', instant(null, 0))
    expect(h.memo.stats().win.entries).toBeLessThanOrEqual((6 * MB) / 512)
  })

  it('checks the per-entry cap against the weight the builder reports, not the overhead', async () => {
    const h = harness({ entryCaps: { map: 50 } })
    await h.memo.get('map', 'exact', instant('fits', 50))
    expect(h.memo.peek('map', 'exact')?.weight).toBe(50 + 512 + 2 * 'map exact'.length)
    expect(h.memo.stats().map.bytes).toBe(50 + 512 + 2 * 'map exact'.length)
  })
})

describe('the semaphore', () => {
  it('admits request builds before queued background ones, and runs at most one background', async () => {
    const h = harness()
    const started: string[] = []
    const builds = new Map<string, Pending<string>>()
    const build = (name: string) => () =>
      new Promise<{ value: string; weight: number }>((resolve, reject) => {
        started.push(name)
        builds.set(name, {
          resolve: v => resolve({ value: v, weight: 1 }),
          reject,
          startedAt: h.now,
        })
      })

    const answers = [
      h.memo.get('win', 'r1', build('r1')),
      h.memo.get('win', 'r2', build('r2')),
      h.memo.get('win', 'r3', build('r3')),
      h.memo.get('win', 'w1', build('w1'), { priority: 'warm' }),
      h.memo.get('win', 'w2', build('w2'), { priority: 'refresh' }),
      h.memo.get('win', 'q1', build('q1')),
      h.memo.get('win', 'q2', build('q2')),
    ]
    await flush()
    expect(started).toEqual(['r1', 'r2', 'r3'])
    builds.get('r1')!.resolve('done')
    await flush()
    expect(started).toEqual(['r1', 'r2', 'r3', 'q1'])
    builds.get('r2')!.resolve('done')
    await flush()
    expect(started.at(-1)).toBe('q2')
    builds.get('r3')!.resolve('done')
    await flush()
    expect(started.at(-1)).toBe('w1')
    // Two slots are free now, but w2 waits for w1: background builds take one slot at a time.
    builds.get('q1')!.resolve('done')
    await flush()
    expect(started).not.toContain('w2')
    builds.get('w1')!.resolve('done')
    await flush()
    expect(started.at(-1)).toBe('w2')
    for (const name of ['q2', 'w2']) builds.get(name)!.resolve('done')
    await Promise.all(answers)
  })

  it('promotes a queued background build a request joins; its deadline counts from then', async () => {
    const h = harness()
    const started: string[] = []
    const make = (name: string) => () =>
      new Promise<{ value: string; weight: number }>(() => {
        started.push(name)
      })
    for (const name of ['a', 'b', 'c']) void h.memo.get('win', name, make(name)).catch(() => {})
    void h.memo.get('win', 'w-old', make('w-old'), { priority: 'warm' }).catch(() => {})
    void h.memo.get('win', 'w', make('w'), { priority: 'warm' }).catch(() => {})
    await h.advance(5 * S)

    const joined = h.memo.get('win', 'w', make('never-called'))
    // Not refused at 6 s after the warm-up queued it (1 s after the promotion)...
    await h.advance(1 * S)
    let refused: unknown = null
    joined.catch(error => {
      refused = error
    })
    await flush()
    expect(refused).toBeNull()
    // ...but 6 s after the promotion (8 s − the 2 s initial build estimate).
    await h.advance(5 * S - 1)
    expect(refused).toBeNull()
    await h.advance(1)
    expect(refused).toBeInstanceOf(RentalMemoBusyError)
    expect(started).toEqual(['a', 'b', 'c'])
  })

  it('drops a queued refresh whose entry was evicted before its turn, without building', async () => {
    const h = harness({ budgets: { win: 100, facets: 100, map: 100 }, entryOverheadBytes: 0 })
    await h.memo.get('win', 'k', instant('v1', 40))
    const long = manualBuild<string>(() => h.now)
    void h.memo.get('win', 'bg', long.build, { priority: 'warm' })
    await flush()
    h.jump(400 * S)
    const refresh = vi.fn(instant('v2', 40))
    expect(await h.memo.get('win', 'k', refresh)).toMatchObject({ value: 'v1', state: 'stale' })
    // The refresh waits behind the long warm-up; meanwhile a bigger entry evicts k.
    await h.memo.get('win', 'x', instant('x', 90))
    expect(h.memo.peek('win', 'k')).toBeUndefined()
    long.calls[0]!.resolve('bg')
    await flush()
    expect(refresh).not.toHaveBeenCalled()
    expect(h.memo.stats().win.busy).toBe(0)
    // The key is not stuck behind the dropped job: the next get builds it.
    const next = vi.fn(instant('v3', 10))
    expect(await h.memo.get('win', 'k', next)).toMatchObject({ value: 'v3', state: 'miss' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('drops a queued refresh after clear(), without building', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    const long = manualBuild<string>(() => h.now)
    void h.memo.get('win', 'bg', long.build, { priority: 'warm' })
    await flush()
    h.jump(400 * S)
    const dropped = vi.fn(instant('v2'))
    await h.memo.get('win', 'k', dropped)
    h.memo.clear()
    long.calls[0]!.resolve('bg')
    await flush()
    expect(dropped).not.toHaveBeenCalled()
  })

  it('still runs an evicted key’s queued refresh once a background caller waits for it', async () => {
    const h = harness({ budgets: { win: 100, facets: 100, map: 100 }, entryOverheadBytes: 0 })
    await h.memo.get('win', 'k', instant('v1', 40))
    const long = manualBuild<string>(() => h.now)
    void h.memo.get('win', 'bg', long.build, { priority: 'warm' })
    await flush()
    h.jump(400 * S)
    const refresh = vi.fn(instant('v2', 40))
    await h.memo.get('win', 'k', refresh)
    await h.memo.get('win', 'x', instant('x', 90))
    expect(h.memo.peek('win', 'k')).toBeUndefined()
    // A warm-up of k finds no entry and joins the queued refresh: someone awaits it now.
    const warming = h.memo.get('win', 'k', instant('unused'), { priority: 'warm' })
    long.calls[0]!.resolve('bg')
    await flush()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(await warming).toMatchObject({ value: 'v2', state: 'miss' })
  })

  it('runs a promoted build before an older queued background one', async () => {
    const h = harness()
    const started: string[] = []
    const builds = new Map<string, () => void>()
    const make = (name: string) => () =>
      new Promise<{ value: string; weight: number }>(resolve => {
        started.push(name)
        builds.set(name, () => resolve({ value: name, weight: 1 }))
      })
    for (const name of ['a', 'b', 'c']) void h.memo.get('win', name, make(name))
    void h.memo.get('win', 'w-old', make('w-old'), { priority: 'refresh' })
    void h.memo.get('win', 'w', make('w'), { priority: 'warm' })
    const joined = h.memo.get('win', 'w', make('unused'))
    await flush()
    builds.get('a')!()
    await flush()
    expect(started).toEqual(['a', 'b', 'c', 'w'])
    builds.get('w')!()
    expect(await joined).toMatchObject({ value: 'w', state: 'miss' })
  })
})

describe('deadlines and caps', () => {
  /** Three 20 s builds hold every slot. */
  async function saturate(h: ReturnType<typeof harness>) {
    for (const name of ['s1', 's2', 's3'])
      void h.memo.get('facet', name, () => {
        return new Promise<{ value: string; weight: number }>(resolve => {
          h.schedule(() => resolve({ value: name, weight: 1 }), 20 * S)
        })
      })
    await flush()
  }

  it('refuses a queued request at 8 s − buildMsEwma and never admits it afterwards', async () => {
    const h = harness()
    await saturate(h)
    const build = vi.fn(instant('late'))
    let outcome: unknown = 'pending'
    h.memo.get('win', 'k', build).then(
      value => (outcome = value),
      error => (outcome = error)
    )
    await h.advance(6 * S - 1)
    expect(outcome).toBe('pending')
    await h.advance(1)
    expect(outcome).toBeInstanceOf(RentalMemoBusyError)
    expect((outcome as RentalMemoBusyError).code).toBe('RENTAL_MEMO_BUSY')
    await h.advance(30 * S)
    expect(build).not.toHaveBeenCalled()
    expect(h.memo.stats().win).toMatchObject({ busy: 1, queueWaitMsMax: 6 * S })
  })

  it('resolves the stored entry as stale instead, when the key holds one', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant('v1'))
    h.jump(901 * S)
    await saturate(h)
    const answer = h.memo.get('win', 'k', instant('v2'))
    // The first build took 0 ms, so the estimate is 1.6 s and the deadline 6.4 s.
    expect(h.memo.stats().win.buildMsEwma).toBe(1600)
    await h.advance(6400)
    expect(await answer).toMatchObject({ value: 'v1', state: 'stale', builtAt: T0 })
    expect(h.memo.stats().win.busy).toBe(1)
  })

  it('uses the kind’s moving average of build times (α 0.2, starting at 2 s)', async () => {
    const h = harness()
    const slow = manualBuild<string>(() => h.now)
    const answer = h.memo.get('facet', 'slow', slow.build)
    await h.advance(12 * S)
    slow.calls[0]!.resolve('ok')
    await answer
    // 2000 + 0.2 × (12000 − 2000) = 4000 → a queued facet build is refused after 4 s.
    expect(h.memo.stats().facet.buildMsEwma).toBe(4000)
    expect(h.memo.stats().win.buildMsEwma).toBe(2000)
    await saturate(h)
    let outcome: unknown = 'pending'
    h.memo.get('facet', 'k', instant(1)).catch(error => (outcome = error))
    await h.advance(4 * S - 1)
    expect(outcome).toBe('pending')
    await h.advance(1)
    expect(outcome).toBeInstanceOf(RentalMemoBusyError)
  })

  /** Seven sequential 10 s map builds push the map estimate past the 8 s deadline. */
  async function slowMapHistory(h: ReturnType<typeof harness>) {
    for (let i = 0; i < 7; i++) {
      const slow = manualBuild<string>(() => h.now)
      const answer = h.memo.get('map', `slow-${i}`, slow.build)
      await flush()
      await h.advance(10 * S)
      slow.calls[0]!.resolve('ok')
      await answer
    }
    expect(h.memo.stats().map.buildMsEwma).toBeGreaterThanOrEqual(8 * S)
  }

  it('admits a request build that finds a free slot, whatever the estimate says', async () => {
    const h = harness()
    await slowMapHistory(h)
    const before = h.memo.stats().map.buildMsEwma
    const build = vi.fn(instant('points'))
    // Nothing runs, nothing waits: the deadline only applies to a build that has to queue.
    expect(await h.memo.get('map', 'fresh-key', build)).toMatchObject({
      value: 'points',
      state: 'miss',
    })
    expect(build).toHaveBeenCalledTimes(1)
    expect(h.memo.stats().map.busy).toBe(0)
    // And the estimate moves with that build, so the kind is not locked out on this worker.
    expect(h.memo.stats().map.buildMsEwma).toBeCloseTo(before * 0.8)
  })

  it('admits a request that promotes a queued background build while a slot is free', async () => {
    const h = harness()
    await slowMapHistory(h)
    const first = manualBuild<string>(() => h.now)
    const second = manualBuild<string>(() => h.now)
    void h.memo.get('map', 'warm-a', first.build, { priority: 'warm' })
    void h.memo.get('map', 'warm-b', second.build, { priority: 'warm' })
    await flush()
    // warm-b waits for the one background slot while two slots are free.
    expect(first.calls).toHaveLength(1)
    expect(second.calls).toHaveLength(0)
    const joined = h.memo.get('map', 'warm-b', second.build)
    await flush()
    expect(second.calls).toHaveLength(1)
    second.calls[0]!.resolve('b')
    expect(await joined).toMatchObject({ value: 'b', state: 'miss' })
    expect(h.memo.stats().map.busy).toBe(0)
    first.calls[0]!.resolve('a')
  })

  it('refuses the 13th waiting request build at once', async () => {
    const h = harness()
    await saturate(h)
    const waiting = Array.from({ length: 12 }, (_, i) =>
      h.memo.get('win', `q${i}`, instant(i)).catch(error => error)
    )
    await expect(h.memo.get('win', 'q12', instant(12))).rejects.toBeInstanceOf(RentalMemoBusyError)
    expect(h.now).toBe(T0)
    expect(h.memo.stats().win.busy).toBe(1)
    await h.advance(6 * S)
    for (const result of await Promise.all(waiting))
      expect(result).toBeInstanceOf(RentalMemoBusyError)
    expect(h.memo.stats().win.busy).toBe(13)
  })

  it('starts a refresh queued behind a steady stream of requests at 30 s, one background at a time', async () => {
    const h = harness()
    const startedAt = new Map<string, number>()
    let background = 0
    let maxBackground = 0
    const timed =
      (name: string, ms: number, isBackground = false) =>
      () =>
        new Promise<{ value: string; weight: number }>(resolve => {
          startedAt.set(name, h.now)
          if (isBackground) maxBackground = Math.max(maxBackground, ++background)
          h.schedule(() => {
            if (isBackground) background--
            resolve({ value: name, weight: 1 })
          }, ms)
        })

    // Releases at 1, 2, 3 s and then one every second, each admitting a waiting request.
    void h.memo.get('win', 'r0', timed('r0', 1 * S))
    void h.memo.get('win', 'r1', timed('r1', 2 * S))
    void h.memo.get('win', 'r2', timed('r2', 3 * S))
    void h.memo.get('win', 'q0', timed('q0', 3 * S))
    void h.memo.get('win', 'q1', timed('q1', 3 * S))
    void h.memo.get('win', 'bg1', timed('bg1', 3 * S, true), { priority: 'refresh' })
    void h.memo.get('win', 'bg2', timed('bg2', 3 * S, true), { priority: 'warm' })
    for (let second = 1; second <= 40; second++) {
      await h.advance(1 * S)
      void h.memo.get('win', `q${second + 1}`, timed(`q${second + 1}`, 3 * S))
    }
    expect(startedAt.get('bg1')).toBe(T0 + 30 * S)
    expect(startedAt.get('bg2')).toBe(T0 + 33 * S)
    expect(maxBackground).toBe(1)
    expect(h.memo.stats().win.busy).toBe(0)
  })
})

describe('stats, log line and pass-through', () => {
  it('counts hit, stale and miss per kind', async () => {
    const h = harness()
    await h.memo.get('dept', 'k', instant(1))
    await h.memo.get('dept', 'k', instant(1))
    h.jump(400 * S)
    await h.memo.get('dept', 'k', instant(1))
    await flush()
    expect(h.memo.stats().dept).toMatchObject({ hit: 1, stale: 1, miss: 1, builds: 2 })
    expect(Object.keys(h.memo.stats()).sort()).toEqual(['barrio', 'dept', 'facet', 'map', 'win'])
  })

  it('writes one log line at most every 10 minutes, from a request, without a timer', async () => {
    const h = harness()
    await h.memo.get('win', 'k', instant(1))
    expect(h.logs).toHaveLength(0)
    h.jump(600 * S)
    await h.memo.get('win', 'k', instant(1))
    await h.memo.get('win', 'k', instant(1))
    expect(h.logs).toHaveLength(1)
    expect(h.logs[0]).toMatchObject({ win: { entries: 1 } })
    h.jump(599 * S)
    await h.memo.get('win', 'k', instant(1))
    expect(h.logs).toHaveLength(1)
    expect(h.timers).toHaveLength(0)
  })

  it('is a pass-through while disabled: builds every time, stores nothing, drops what it held', async () => {
    let enabled = true
    const h = harness({ enabled: () => enabled })
    await h.memo.get('win', 'k', instant('v1'))
    enabled = false
    const build = vi.fn(instant('v2'))
    expect(await h.memo.get('win', 'k', build)).toMatchObject({ value: 'v2', state: 'miss' })
    expect(await h.memo.get('win', 'k', build)).toMatchObject({ value: 'v2', state: 'miss' })
    expect(build).toHaveBeenCalledTimes(2)
    expect(h.memo.peek('win', 'k')).toBeUndefined()
    expect(h.memo.stats().win.entries).toBe(0)
    enabled = true
    expect(await h.memo.get('win', 'k', instant('v3'))).toMatchObject({
      value: 'v3',
      state: 'miss',
    })
  })

  it('formats the per-response header', () => {
    expect(
      formatRentalMemoHeader([
        { kind: 'win', state: 'miss' },
        { kind: 'facet', state: 'hit' },
      ])
    ).toBe('win=miss,facet=hit')
    expect(formatRentalMemoHeader([{ kind: 'outer', state: 'hit' }])).toBe('outer=hit')
    expect(formatRentalMemoHeader([])).toBe('')
    expect(RENTAL_MEMO_HEADER).toBe('x-rentals-memo')
    expect(RENTAL_WORKER_HEADER).toBe('x-rentals-worker')
  })

  it('names the pm2 instance, or "na"', () => {
    vi.stubEnv('NODE_APP_INSTANCE', '1')
    expect(rentalWorkerId()).toBe('1')
    vi.stubEnv('NODE_APP_INSTANCE', undefined as unknown as string)
    expect(rentalWorkerId()).toBe('na')
    vi.unstubAllEnvs()
  })

  it('exports a per-worker singleton', () => {
    expect(typeof rentalMemo.get).toBe('function')
    expect(rentalMemo.stats().win.entries).toBe(0)
  })

  it('makes the singleton a pass-through once the switch file says "memo":"off"', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rental-memo-'))
    try {
      await mkdir(join(dir, '.data', 'flags'), { recursive: true })
      await writeFile(join(dir, '.data', 'flags', 'rentals.json'), '{"memo":"off"}')
      vi.spyOn(process, 'cwd').mockReturnValue(dir)
      vi.resetModules()
      const fresh = await import('../../server/utils/rentalMemo')
      const flags = await import('../../server/utils/rentalFlags')
      const build = vi.fn(instant('v'))
      // The file is read when the module loads: the very first request is already a pass-through.
      expect(flags.rentalFlag('memo')).toBe(false)
      await fresh.rentalMemo.get('win', 'k', build)
      expect(fresh.rentalMemo.peek('win', 'k')).toBeUndefined()
      expect(await fresh.rentalMemo.get('win', 'k', build)).toMatchObject({ state: 'miss' })
      expect(await fresh.rentalMemo.get('win', 'k', build)).toMatchObject({ state: 'miss' })
      expect(build).toHaveBeenCalledTimes(3)
      expect(fresh.rentalMemo.peek('win', 'k')).toBeUndefined()
      expect(fresh.rentalMemo.stats().win.entries).toBe(0)
    } finally {
      vi.restoreAllMocks()
      vi.resetModules()
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('makes the singleton a pass-through in nuxt dev', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    try {
      const build = vi.fn(instant('v'))
      await rentalMemo.get('facet', 'dev', build)
      await rentalMemo.get('facet', 'dev', build)
      expect(build).toHaveBeenCalledTimes(2)
      expect(rentalMemo.peek('facet', 'dev')).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('no real timer', () => {
  it('never touches setTimeout or setInterval when a scheduler is injected', async () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout')
    const interval = vi.spyOn(globalThis, 'setInterval')
    const h = harness()
    for (const name of ['a', 'b', 'c']) void h.memo.get('win', name, () => new Promise(() => {}))
    const queued = h.memo.get('win', 'd', instant(1)).catch(error => error)
    await flush()
    expect(h.timers.filter(timer => !timer.cancelled)).toHaveLength(1)
    await h.advance(6 * S)
    expect(await queued).toBeInstanceOf(RentalMemoBusyError)
    // flush() itself uses setImmediate, never setTimeout.
    expect(timeout).not.toHaveBeenCalled()
    expect(interval).not.toHaveBeenCalled()
  })

  it('the default scheduler unrefs its one-shot timer and can cancel it', () => {
    const unref = vi.fn()
    const handle = { unref } as unknown as ReturnType<typeof setTimeout>
    const timeout = vi.spyOn(globalThis, 'setTimeout').mockReturnValue(handle)
    const clear = vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {})
    const fn = () => {}
    const cancel = defaultRentalMemoSchedule(fn, 1234)
    expect(timeout).toHaveBeenCalledWith(fn, 1234)
    expect(unref).toHaveBeenCalledTimes(1)
    cancel()
    expect(clear).toHaveBeenCalledWith(handle)
  })

  it('cancels the deadline timer of a waiter that gets a slot, so none stays live', async () => {
    const h = harness()
    for (const name of ['a', 'b', 'c']) {
      void h.memo.get('win', name, () => {
        return new Promise<{ value: string; weight: number }>(resolve =>
          h.schedule(() => resolve({ value: name, weight: 1 }), 1 * S)
        )
      })
    }
    const queued = h.memo.get('win', 'd', instant('d'))
    await flush()
    await h.advance(1 * S)
    expect(await queued).toMatchObject({ value: 'd', state: 'miss' })
    // The admitted waiter's deadline timer was cancelled, not left to fire.
    expect(h.timers.every(timer => timer.cancelled)).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------
// The memo key
// ---------------------------------------------------------------------------------------------

const POINT = { refLat: '-34.9058', refLng: '-56.1913' }
const extraOf = (zones = '', excluded = '', w = 0) => ({ w, zones, excluded })

describe('rentalMemoKey', () => {
  it('hashes ids order-free, and empty is ""', () => {
    expect(hashIds(undefined)).toBe('')
    expect(hashIds(null)).toBe('')
    expect(hashIds([])).toBe('')
    expect(hashIds(['b', 'a'])).toBe(hashIds(['a', 'b']))
    expect(hashIds(['a', 'b'])).toMatch(/^[0-9a-f]{40}$/)
    expect(hashIds(['a'])).not.toBe(hashIds(['a', 'b']))
  })

  it('starts with the kind and is the same for the same normalised query', () => {
    const a = rentalMemoKey('win', normalizeRentalQuery({ department: 'montevideo' }), extraOf())
    const b = rentalMemoKey('win', normalizeRentalQuery({ departamento: 'Montevideo' }), extraOf())
    expect(a).toBe(b)
    expect(a).toMatch(/^win:[0-9a-f]{40}$/)
    expect(rentalMemoKey('facet', normalizeRentalQuery({}), extraOf())).not.toBe(
      rentalMemoKey('dept', normalizeRentalQuery({}), extraOf())
    )
  })

  it('always drops the page', () => {
    for (const kind of KINDS)
      expect(rentalMemoKey(kind, normalizeRentalQuery({ page: '7' }), extraOf())).toBe(
        rentalMemoKey(kind, normalizeRentalQuery({}), extraOf())
      )
  })

  it('keeps sort and the point for win and map only, perPage and the window for win only', () => {
    const base = normalizeRentalQuery({})
    const sorted = normalizeRentalQuery({ sort: 'precio' })
    const near = normalizeRentalQuery({ ...POINT, sort: 'distancia' })
    const wide = normalizeRentalQuery({ perPage: '48' })
    for (const kind of ['win', 'map'] as const) {
      expect(rentalMemoKey(kind, sorted, extraOf())).not.toBe(rentalMemoKey(kind, base, extraOf()))
      expect(rentalMemoKey(kind, near, extraOf())).not.toBe(rentalMemoKey(kind, base, extraOf()))
    }
    for (const kind of ['facet', 'dept', 'barrio'] as const) {
      expect(rentalMemoKey(kind, sorted, extraOf())).toBe(rentalMemoKey(kind, base, extraOf()))
      expect(rentalMemoKey(kind, near, extraOf())).toBe(rentalMemoKey(kind, base, extraOf()))
    }
    expect(rentalMemoKey('win', wide, extraOf())).not.toBe(rentalMemoKey('win', base, extraOf()))
    for (const kind of ['map', 'facet', 'dept', 'barrio'] as const)
      expect(rentalMemoKey(kind, wide, extraOf())).toBe(rentalMemoKey(kind, base, extraOf()))
    expect(rentalMemoKey('win', base, { ...extraOf(), w: 1 })).not.toBe(
      rentalMemoKey('win', base, { ...extraOf(), w: 0 })
    )
    expect(rentalMemoKey('map', base, { ...extraOf(), w: 3 })).toBe(
      rentalMemoKey('map', base, extraOf())
    )
    expect(rentalMemoKey('map', base, { zones: '', excluded: '' })).toBe(
      rentalMemoKey('map', base, extraOf())
    )
  })

  it('refuses a win key without a whole, non-negative window index', () => {
    // NaN and ±Infinity would all serialise as null and share one key; a missing w would be
    // window 0's key for pages 21+. Both are silent wrong answers, so they throw.
    const base = normalizeRentalQuery({})
    for (const w of [undefined, Number.NaN, Infinity, -Infinity, -1, 1.5])
      expect(() => rentalMemoKey('win', base, { w, zones: '', excluded: '' }), String(w)).toThrow(
        TypeError
      )
    expect(rentalMemoKey('win', base, extraOf('', '', 2))).toMatch(/^win:/)
  })

  it('never carries the reference label', () => {
    const near = normalizeRentalQuery({ ...POINT, sort: 'distancia' })
    const labelled = normalizeRentalQuery({ ...POINT, sort: 'distancia', refLabel: 'Mi casa' })
    expect(labelled.refLabel).toBe('Mi casa')
    for (const kind of KINDS)
      expect(rentalMemoKey(kind, labelled, extraOf())).toBe(rentalMemoKey(kind, near, extraOf()))
  })

  it('changes with the excluded adverts and with the service zones', () => {
    const plain = normalizeRentalQuery({})
    const withServices = normalizeRentalQuery({ servicios: RENTAL_SERVICE_FILTERS[0] })
    for (const kind of KINDS) {
      expect(rentalMemoKey(kind, plain, extraOf('', hashIds(['ml:1'])))).not.toBe(
        rentalMemoKey(kind, plain, extraOf())
      )
      expect(rentalMemoKey(kind, withServices, extraOf(hashIds(['z1'])))).not.toBe(
        rentalMemoKey(kind, withServices, extraOf(hashIds(['z2'])))
      )
      // Zones only mean something with `servicios`: without it a stray hash mints no new key.
      expect(rentalMemoKey(kind, plain, extraOf(hashIds(['z1'])))).toBe(
        rentalMemoKey(kind, plain, extraOf())
      )
    }
  })

  it('does not change with the cutoff day or the exchange rate (they age out with the TTL)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2026-11-20T23:59:00Z'))
      const before = KINDS.map(kind => rentalMemoKey(kind, normalizeRentalQuery({}), extraOf()))
      vi.setSystemTime(new Date('2026-11-21T00:01:00Z'))
      const after = KINDS.map(kind => rentalMemoKey(kind, normalizeRentalQuery({}), extraOf()))
      expect(after).toEqual(before)
      // `usdUyu` is not an argument at all: the key cannot depend on it.
      expect(rentalMemoKey.length).toBe(3)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Key completeness: for each field of normalizeRentalQuery()'s output, an alternative value either
// changes the key, or leaves every pipeline built for that kind deep-equal.
//
// The pipelines are assembled from the same pure builders, with the same arguments, the routes
// pass them (index.get.ts and mapa.get.ts at 93951dff). The routes themselves are rewritten in this
// round and the next (P3, P4, P5), so this file does not import them; P4/P5 own the route-level check
// that each memo lookup is made with this key. What is proved here is the part that cannot drift:
// no field of the query that a builder reads is missing from the key of the kind that runs it.
// ---------------------------------------------------------------------------------------------

const USD_UYU = 40
const SEDE = String(MUTUALISTA_SEDES[0]!.osmId)
const SERVICE = RENTAL_SERVICE_FILTERS[0]!

/** What the routes resolve before building: the excluded adverts and the service zones. */
function resolvedInputs(query: RentalQuery) {
  const excluded = query.availability === 'all' ? [] : [`mercadolibre:${query.availability}`]
  const zones = query.servicios?.length
    ? [`zone-${formatRentalServiceSelections(query.servicios)}`]
    : undefined
  return { excluded, zones, extra: { w: 0, zones: hashIds(zones), excluded: hashIds(excluded) } }
}

const OFFERS = [
  { source: 'mercadolibre', listingId: 'a', price: 25_000, currency: 'UYU', priceUyu: 25_000 },
  { source: 'infocasas', listingId: 'b', price: 900, currency: 'USD', priceUyu: 36_000 },
  {
    source: 'casasweb',
    listingId: 'c',
    price: 18_000,
    currency: 'UYU',
    priceUyu: 18_000,
    petsAllowed: true,
    commonExpenses: 3_000,
    commonExpensesCurrency: 'UYU',
  },
] as unknown as RentalOffer[]

/** Everything the list's window pass reads from the query (index.get.ts:107–141, 178–187). */
function windowInputs(query: RentalQuery) {
  const { excluded, zones } = resolvedInputs(query)
  const { filter } = buildRentalFilter(query, RENTAL_STALE_DAYS, USD_UYU, zones)
  return [
    rentalPublicStages(filter, RENTAL_STALE_DAYS, excluded),
    rentalOfferStages(query, USD_UYU),
    rentalDistanceStages(query),
    query.sort === 'precio-m2' ? rentalPricePerM2Stages() : [],
    rentalDistanceProjection(query),
    rentalRecentSortProjection(query),
    rentalMongoSort(query.sort),
    query.sort,
    query.refLat !== null,
    // The window: perPage × 20 keys from window 0, whatever page asked for it.
    { $skip: 0 },
    { $limit: query.perPage * 20 },
  ]
}

/** The facet, department and barrio passes (index.get.ts:184–239). */
function facetInputs(query: RentalQuery) {
  const { excluded, zones } = resolvedInputs(query)
  const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(
    query,
    RENTAL_STALE_DAYS,
    USD_UYU,
    zones
  )
  return [
    rentalPublicStages(filter, RENTAL_STALE_DAYS, excluded),
    rentalPublicStages(nonLocation, RENTAL_STALE_DAYS, excluded),
    rentalPublicStages(withoutNeighborhood, RENTAL_STALE_DAYS, excluded),
    rentalOfferStages({ ...query, sort: 'precio' }, USD_UYU),
  ]
}

/** The map's three passes and its JavaScript mapper (mapa.get.ts:69–203). */
function mapInputs(query: RentalQuery) {
  const { excluded, zones } = resolvedInputs(query)
  const { filter } = buildRentalFilter(query, RENTAL_STALE_DAYS, USD_UYU, zones)
  const located = {
    ...filter,
    latitude: { $type: 'number', $gte: -35.5, $lte: -30 },
    longitude: { $type: 'number', $gte: -58.6, $lte: -53 },
  }
  return [
    rentalPublicStages(filter, RENTAL_STALE_DAYS, excluded),
    rentalPublicStages(located, RENTAL_STALE_DAYS, excluded),
    rentalOfferStages(query, USD_UYU),
    rentalDistanceStages(query),
    query.sort === 'precio-m2' ? rentalPricePerM2Stages() : [],
    rentalDistanceProjection(query),
    rentalRecentSortProjection(query),
    rentalMongoSort(query.sort),
    query.sort,
    query.refLat !== null,
    OFFERS.map(offer => rentalMatchingOffer([offer], query, USD_UYU)?.listingId ?? null),
    rentalMatchingOffer(OFFERS, query, USD_UYU)?.listingId ?? null,
  ]
}

const pipelinesFor = (kind: RentalMemoKind, query: RentalQuery) =>
  kind === 'win' ? windowInputs(query) : kind === 'map' ? mapInputs(query) : facetInputs(query)

/**
 * One alternative per field of the normalised query. A field added to `RentalQuery` without an
 * entry here fails the first assertion below, so the key is re-checked every time the query grows.
 */
const ALTERNATIVES: Record<string, { base?: Record<string, string>; alt: Record<string, string> }> =
  {
    availability: { alt: { availability: 'hide_any' } },
    q: { alt: { q: 'pocitos' } },
    department: { alt: { department: 'Montevideo' } },
    neighborhood: { alt: { neighborhood: 'Pocitos' } },
    neighborhoods: { alt: { neighborhoods: 'Pocitos,Cordón' } },
    type: { alt: { type: 'apartamento' } },
    types: { alt: { types: 'apartamento,casa' } },
    excludeNeighborhoods: { alt: { sinBarrios: 'Centro' } },
    excludeTypes: { alt: { sinTipos: 'habitacion' } },
    excludeSources: { alt: { sinPortales: 'facebook' } },
    excludeWords: { alt: { sinPalabras: 'garaje' } },
    sharedLiving: { alt: { residencias: 'ocultar' } },
    sinceDays: { alt: { dias: '7' } },
    priceDropped: { alt: { bajo: '1' } },
    source: { alt: { source: 'mercadolibre' } },
    bedrooms: { alt: { bedrooms: '2' } },
    bedroomsExact: { base: { bedrooms: '2' }, alt: { bedroomsExact: '1' } },
    bathrooms: { alt: { bathrooms: '2' } },
    areaMin: { alt: { areaMin: '40' } },
    areaMax: { alt: { areaMax: '90' } },
    currency: { alt: { currency: 'USD' } },
    priceMin: { alt: { priceMin: '15000' } },
    priceMax: { alt: { priceMax: '30000' } },
    monthlyMax: { alt: { monthlyMax: '35000' } },
    expensesMax: { alt: { expensesMax: '0' } },
    multi: { alt: { multi: '1' } },
    pets: { alt: { pets: '1' } },
    parking: { alt: { parking: '1' } },
    furnished: { alt: { furnished: '1' } },
    unfurnished: { alt: { sinMuebles: '1' } },
    term: { alt: { plazo: 'invernal' } },
    guarantees: { alt: { garantia: RENTAL_GUARANTEE_PUBLISHED[0]! } },
    amenities: { alt: { comodidades: 'piscina' } },
    withExpenses: { alt: { gc: '1' } },
    hideStayPrices: { alt: { sinNoche: '1' } },
    owner: { alt: { dueno: '1' } },
    agency: { alt: { agency: 'infocasas:abc' } },
    servicios: { alt: { servicios: SERVICE } },
    sedes: { alt: { sedes: SEDE } },
    radioKm: { base: { sedes: SEDE }, alt: { radio: '3' } },
    refLat: { alt: { ...POINT } },
    refLng: { base: { ...POINT }, alt: { refLng: '-56.1500' } },
    refLabel: { base: { ...POINT, sort: 'distancia' }, alt: { refLabel: 'Bulevar y 26' } },
    sort: { alt: { sort: 'precio' } },
    page: { alt: { page: '5' } },
    perPage: { alt: { perPage: '48' } },
  }

describe('rentalMemoKey completeness', () => {
  it('has an alternative for every field the normaliser returns, and each one moves its field', () => {
    expect(Object.keys(normalizeRentalQuery({})).sort()).toEqual(Object.keys(ALTERNATIVES).sort())
    for (const [field, { base = {}, alt }] of Object.entries(ALTERNATIVES)) {
      const before = normalizeRentalQuery(base) as unknown as Record<string, unknown>
      const after = normalizeRentalQuery({ ...base, ...alt }) as unknown as Record<string, unknown>
      expect(isDeepStrictEqual(before[field], after[field]), field).toBe(false)
    }
  })

  it.each(KINDS)('%s: every field either changes the key or no pipeline at all', kind => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'))
    try {
      const silent: string[] = []
      for (const [field, { base = {}, alt }] of Object.entries(ALTERNATIVES)) {
        const before = normalizeRentalQuery(base)
        const after = normalizeRentalQuery({ ...base, ...alt })
        const keyBefore = rentalMemoKey(kind, before, resolvedInputs(before).extra)
        const keyAfter = rentalMemoKey(kind, after, resolvedInputs(after).extra)
        if (keyBefore !== keyAfter) continue
        silent.push(field)
        expect(
          isDeepStrictEqual(pipelinesFor(kind, before), pipelinesFor(kind, after)),
          `${kind}: ${field} is not in the key but changes what is built`
        ).toBe(true)
      }
      // Display text and the page never mint an entry, for any kind.
      expect(silent).toContain('refLabel')
      expect(silent).toContain('page')
      if (kind === 'facet' || kind === 'dept' || kind === 'barrio')
        expect(silent).toEqual(expect.arrayContaining(['sort', 'refLat', 'refLng', 'perPage']))
      if (kind === 'map') expect(silent).toContain('perPage')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the normalised defaults the key relies on', () => {
    expect(RENTAL_PER_PAGE).toBe(24)
  })
})
