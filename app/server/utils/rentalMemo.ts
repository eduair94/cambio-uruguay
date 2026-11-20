/**
 * A bounded per-worker memo for the rentals directory, with a build semaphore (spec P2).
 *
 * Every uncached `/api/rentals` or `/api/rentals/mapa` request re-derives the whole public inventory
 * in Mongo: 4–8 s per scroll page, measured from outside on 2026-11-20. This memo keeps the expensive
 * intermediate results (a 20-page window of keys, the facet counts, the map points) per query, so the
 * next scroll page, the next filter that shares the facets and the reopened map only read memory.
 *
 * What it promises, and how:
 * - **Freshness by TTL only.** An entry is fresh for 300 s ± 10 % (jitter, so the entries of one
 *   burst do not all expire together), served stale while one background refresh runs until 900 s,
 *   then rebuilt before answering; until 3600 s it is still kept, but only as the answer when that
 *   rebuild fails or is refused. So nothing older than 15 minutes is served while the database
 *   answers. Neither the UTC cutoff day nor the exchange rate is in a key: they age out with the TTL,
 *   which is what keeps 00:00 UTC and the :47 harvest from emptying every worker at once.
 * - **Failures are never stored.** Waiters of a failed build get its error (or the entry still under
 *   an hour old, as `stale`) and the next request retries.
 * - **Bytes, not entries.** The builder reports a weight; each budget evicts its least recently used
 *   entry (a `Map` in recency order). 28 MB per worker in all, against a 512 MB heap.
 * - **A semaphore of three builds**, request builds first, background builds one at a time, with a
 *   deadline: a request build that would not finish within 8 s of being queued is refused with
 *   {@link RentalMemoBusyError} (the route answers 503 `no-store`, as on today's timeout) instead of
 *   piling up behind a slow database. At most 12 request builds wait.
 *
 * Pure: clock, randomness and a one-shot scheduler are injected. The scheduler is used only for the
 * queue deadlines, and the default one unrefs its timer; there is no interval anywhere, and the stats
 * log line is written from a request, at most every 10 minutes.
 */
import { createHash } from 'node:crypto'
import { RENTAL_PER_PAGE, rentalQueryToParams, type RentalQuery } from '../../utils/rentals'
import { rentalFlag } from './rentalFlags'

export type RentalMemoKind = 'win' | 'facet' | 'dept' | 'barrio' | 'map'
export type RentalMemoPriority = 'request' | 'refresh' | 'warm'
export type RentalMemoState = 'hit' | 'stale' | 'miss'

export const RENTAL_MEMO_KINDS: readonly RentalMemoKind[] = Object.freeze([
  'win',
  'facet',
  'dept',
  'barrio',
  'map',
])

export interface RentalMemoEntry<T> {
  value: T
  weight: number
  builtAt: number
  softExpiresAt: number
  serveUntil: number
  hardExpiresAt: number
}

export interface RentalMemoKindStats {
  entries: number
  bytes: number
  hit: number
  stale: number
  miss: number
  builds: number
  failures: number
  busy: number
  evictions: number
  queueWaitMsMax: number
  buildMsEwma: number
}

export type RentalMemoBuild<T> = () => Promise<{ value: T; weight: number }>

export interface RentalMemoGetOptions {
  /** `request` (default) for a visitor waiting; `refresh` and `warm` run in the background slot. */
  priority?: RentalMemoPriority
  /** Build even when fresh (the warm-up); other callers keep the current entry meanwhile. */
  force?: boolean
}

export interface RentalMemoResult<T> {
  value: T
  state: RentalMemoState
  builtAt: number
}

export interface RentalMemo {
  get<T>(
    kind: RentalMemoKind,
    key: string,
    build: RentalMemoBuild<T>,
    opts?: RentalMemoGetOptions
  ): Promise<RentalMemoResult<T>>
  /** The entry while it may still be served (before `serveUntil`). Never builds. */
  peek<T>(kind: RentalMemoKind, key: string): RentalMemoEntry<T> | undefined
  stats(): Record<RentalMemoKind, RentalMemoKindStats>
  /** Drops the stored entries; builds already started finish for their waiters but are not stored. */
  clear(): void
}

/** The build was refused: the queue is full, or it would not finish inside its deadline. */
export class RentalMemoBusyError extends Error {
  readonly code = 'RENTAL_MEMO_BUSY'
  constructor(message = 'Rental directory is busy') {
    super(message)
    this.name = 'RentalMemoBusyError'
  }
}

/** A one-shot timer; returns its cancel. */
export type RentalMemoSchedule = (fn: () => void, ms: number) => () => void

/** `setTimeout(...).unref()`: a pending deadline never keeps the process alive. */
export const defaultRentalMemoSchedule: RentalMemoSchedule = (fn, ms) => {
  const timer = setTimeout(fn, ms)
  ;(timer as { unref?: () => void }).unref?.()
  return () => clearTimeout(timer)
}

type RentalMemoGroup = 'win' | 'facets' | 'map'
const GROUP_OF: Readonly<Record<RentalMemoKind, RentalMemoGroup>> = Object.freeze({
  win: 'win',
  facet: 'facets',
  dept: 'facets',
  barrio: 'facets',
  map: 'map',
})

const MB = 1024 * 1024
const KB = 1024

export const RENTAL_MEMO_DEFAULTS = Object.freeze({
  softMs: 300_000,
  /** ± this fraction of `softMs`. */
  jitter: 0.1,
  serveMs: 900_000,
  hardMs: 3_600_000,
  concurrency: 3,
  maxQueuedRequests: 12,
  requestDeadlineMs: 8_000,
  backgroundMaxWaitMs: 30_000,
  initialBuildMs: 2_000,
  ewmaAlpha: 0.2,
  logEveryMs: 600_000,
  /**
   * Charged to the budget per entry on top of the reported weight (plus twice the id's length):
   * the Stored object, its Map slot and the id string cost real memory even when the value is
   * empty, so without it a stream of distinct empty searches would grow a Map without bound.
   */
  entryOverheadBytes: 512,
  budgets: Object.freeze({ win: 6 * MB, facets: 6 * MB, map: 16 * MB }) as Readonly<
    Record<RentalMemoGroup, number>
  >,
  entryCaps: Object.freeze({
    win: 256 * KB,
    facet: 512 * KB,
    dept: 512 * KB,
    barrio: 512 * KB,
    map: 4 * MB,
  }) as Readonly<Record<RentalMemoKind, number>>,
})

// Numbers, not the literal types Object.freeze infers: a caller may tune any of them.
type Tunables = {
  [K in Exclude<keyof typeof RENTAL_MEMO_DEFAULTS, 'budgets' | 'entryCaps'>]: number
}

export interface RentalMemoOptions extends Partial<Tunables> {
  now?: () => number
  /** In [0, 1), like `Math.random`. */
  random?: () => number
  schedule?: RentalMemoSchedule
  /** False makes the memo a pass-through: every get builds, nothing is stored. */
  enabled?: () => boolean
  /** Receives `stats()` at most every `logEveryMs`, from a get. */
  log?: (stats: Record<RentalMemoKind, RentalMemoKindStats>) => void
  budgets?: Partial<Record<RentalMemoGroup, number>>
  entryCaps?: Partial<Record<RentalMemoKind, number>>
}

interface Stored<T = unknown> extends RentalMemoEntry<T> {
  kind: RentalMemoKind
  /** Start sequence of the build that produced it (the revision guard). */
  startSeq: number
}

interface Job {
  id: string
  kind: RentalMemoKind
  build: RentalMemoBuild<unknown>
  priority: RentalMemoPriority
  /** clear() count when the job was created: an older job is not stored. */
  generation: number
  queuedAt: number
  /** Where the deadline counts from: the enqueue, or the promotion of a background job. */
  deadlineFrom: number
  /**
   * A get awaits this job: its creator on a miss, or a later caller that joined it. Only the
   * refresh a stale hit starts is not awaited (its one waiter is its own internal catch).
   */
  awaited: boolean
  startSeq: number
  startedAt: number
  state: 'queued' | 'running' | 'settled'
  promise: Promise<{ value: unknown; builtAt: number }>
  resolve: (result: { value: unknown; builtAt: number }) => void
  reject: (error: unknown) => void
  cancelDeadline?: () => void
}

type Counters = Omit<RentalMemoKindStats, 'entries' | 'bytes'>

export function createRentalMemo(options: RentalMemoOptions = {}): RentalMemo {
  const o: Tunables = { ...RENTAL_MEMO_DEFAULTS, ...definedOnly(options) }
  const budgets = { ...RENTAL_MEMO_DEFAULTS.budgets, ...options.budgets }
  const caps = { ...RENTAL_MEMO_DEFAULTS.entryCaps, ...options.entryCaps }
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random
  const schedule = options.schedule ?? defaultRentalMemoSchedule
  const enabled = options.enabled ?? (() => true)
  const log =
    options.log ??
    (stats =>
      console.info('[rentals-memo]', JSON.stringify({ worker: rentalWorkerId(), ...stats })))

  const groups: Record<RentalMemoGroup, Map<string, Stored>> = {
    win: new Map(),
    facets: new Map(),
    map: new Map(),
  }
  const groupBytes: Record<RentalMemoGroup, number> = { win: 0, facets: 0, map: 0 }
  const sizes = Object.fromEntries(
    RENTAL_MEMO_KINDS.map(kind => [kind, { entries: 0, bytes: 0 }])
  ) as Record<RentalMemoKind, { entries: number; bytes: number }>
  const counters = Object.fromEntries(
    RENTAL_MEMO_KINDS.map(kind => [
      kind,
      {
        hit: 0,
        stale: 0,
        miss: 0,
        builds: 0,
        failures: 0,
        busy: 0,
        evictions: 0,
        queueWaitMsMax: 0,
        buildMsEwma: o.initialBuildMs,
      },
    ])
  ) as Record<RentalMemoKind, Counters>

  const pending = new Map<string, Job>()
  const requestQueue: Job[] = []
  const backgroundQueue: Job[] = []
  let running = 0
  let runningBackground = 0
  let startSeq = 0
  let generation = 0
  let lastLogAt = now()

  const idOf = (kind: RentalMemoKind, key: string) => `${kind} ${key}`

  const remove = (id: string, entry: Stored) => {
    const group = GROUP_OF[entry.kind]
    groups[group].delete(id)
    groupBytes[group] -= entry.weight
    sizes[entry.kind].entries--
    sizes[entry.kind].bytes -= entry.weight
  }

  /** The stored entry, unless it reached its hard expiry (then it is dropped). */
  const lookup = (kind: RentalMemoKind, id: string, at: number): Stored | undefined => {
    const entry = groups[GROUP_OF[kind]].get(id)
    if (entry && at >= entry.hardExpiresAt) {
      remove(id, entry)
      return undefined
    }
    return entry
  }

  const touch = (kind: RentalMemoKind, id: string, entry: Stored) => {
    const map = groups[GROUP_OF[kind]]
    map.delete(id)
    map.set(id, entry)
  }

  const publicEntry = <T>(entry: Stored): RentalMemoEntry<T> => ({
    value: entry.value as T,
    weight: entry.weight,
    builtAt: entry.builtAt,
    softExpiresAt: entry.softExpiresAt,
    serveUntil: entry.serveUntil,
    hardExpiresAt: entry.hardExpiresAt,
  })

  const store = (job: Job, value: unknown, weight: number) => {
    if (job.generation !== generation) return
    // `!(<=)` also refuses a NaN weight: an entry whose size is unknown is not kept.
    if (!(weight >= 0 && weight <= caps[job.kind])) return
    const charged = weight + o.entryOverheadBytes + 2 * job.id.length
    const group = GROUP_OF[job.kind]
    const map = groups[group]
    const existing = map.get(job.id)
    // Only a build that started after the stored entry's own build may replace it.
    if (existing && existing.startSeq > job.startSeq) return
    if (existing) remove(job.id, existing)
    const builtAt = job.startedAt
    const spread = 1 - o.jitter + 2 * o.jitter * random()
    map.set(job.id, {
      kind: job.kind,
      startSeq: job.startSeq,
      value,
      weight: charged,
      builtAt,
      softExpiresAt: builtAt + o.softMs * spread,
      serveUntil: builtAt + o.serveMs,
      hardExpiresAt: builtAt + o.hardMs,
    })
    groupBytes[group] += charged
    sizes[job.kind].entries++
    sizes[job.kind].bytes += charged
    for (const [id, entry] of map) {
      if (groupBytes[group] <= budgets[group]) break
      if (id === job.id) continue
      remove(id, entry)
      counters[entry.kind].evictions++
    }
  }

  const noteWait = (job: Job, at: number) => {
    const counter = counters[job.kind]
    counter.queueWaitMsMax = Math.max(counter.queueWaitMsMax, at - job.queuedAt)
  }

  const overDeadline = (job: Job, at: number) =>
    at - job.deadlineFrom + counters[job.kind].buildMsEwma >= o.requestDeadlineMs

  const refuse = (job: Job, at: number) => {
    const index = requestQueue.indexOf(job)
    if (index >= 0) requestQueue.splice(index, 1)
    job.cancelDeadline?.()
    job.cancelDeadline = undefined
    job.state = 'settled'
    if (pending.get(job.id) === job) pending.delete(job.id)
    noteWait(job, at)
    counters[job.kind].busy++
    job.reject(new RentalMemoBusyError())
  }

  /** One one-shot timer per waiting request build, at the instant it would cross its deadline. */
  const armDeadline = (job: Job) => {
    job.cancelDeadline?.()
    const waited = now() - job.deadlineFrom
    const delay = Math.max(0, o.requestDeadlineMs - counters[job.kind].buildMsEwma - waited)
    job.cancelDeadline = schedule(() => {
      job.cancelDeadline = undefined
      if (job.state !== 'queued' || job.priority !== 'request') return
      // The estimate may have dropped since this was armed: then the deadline moved later.
      if (overDeadline(job, now())) refuse(job, now())
      else armDeadline(job)
    }, delay)
  }

  const run = (job: Job, at: number) => {
    job.cancelDeadline?.()
    job.cancelDeadline = undefined
    job.state = 'running'
    job.startedAt = at
    job.startSeq = ++startSeq
    noteWait(job, at)
    const background = job.priority !== 'request'
    running++
    if (background) runningBackground++
    counters[job.kind].builds++

    const release = () => {
      running--
      if (background) runningBackground--
      job.state = 'settled'
      if (pending.get(job.id) === job) pending.delete(job.id)
      pump()
    }
    new Promise<{ value: unknown; weight: number }>(resolve => resolve(job.build())).then(
      ({ value, weight }) => {
        const counter = counters[job.kind]
        counter.buildMsEwma += o.ewmaAlpha * (now() - job.startedAt - counter.buildMsEwma)
        store(job, value, Number(weight))
        release()
        job.resolve({ value, builtAt: job.startedAt })
      },
      error => {
        counters[job.kind].failures++
        release()
        job.reject(error)
      }
    )
  }

  /**
   * A queued refresh whose entry is gone (evicted by the budget, cleared, past its hard expiry)
   * would rebuild something nobody reads, exactly when the database is slowest. Unless a get
   * awaits it, it is settled without building (not counted as `busy`: no visitor was refused).
   */
  const isOrphanRefresh = (job: Job, at: number) =>
    job.priority === 'refresh' &&
    !job.awaited &&
    (job.generation !== generation || !lookup(job.kind, job.id, at))

  const dropOrphanRefreshes = (at: number) => {
    while (backgroundQueue.length && isOrphanRefresh(backgroundQueue[0]!, at)) {
      const job = backgroundQueue.shift()!
      job.state = 'settled'
      if (pending.get(job.id) === job) pending.delete(job.id)
      job.reject(new RentalMemoBusyError('Refresh dropped: its entry is gone'))
    }
  }

  /** Refuses what crossed its deadline, then fills the free slots. Runs on every enqueue and release. */
  function pump() {
    const at = now()
    for (const job of [...requestQueue]) if (overDeadline(job, at)) refuse(job, at)
    while (running < o.concurrency) {
      if (runningBackground === 0) dropOrphanRefreshes(at)
      const background = backgroundQueue[0]
      const backgroundMayRun =
        background !== undefined &&
        runningBackground === 0 &&
        (requestQueue.length === 0 || at - background.queuedAt >= o.backgroundMaxWaitMs)
      if (backgroundMayRun) run(backgroundQueue.shift()!, at)
      else if (requestQueue.length) run(requestQueue.shift()!, at)
      else break
    }
  }

  /** Whether a request build has to wait, and if so whether it may: queue cap, then deadline. */
  const admitRequestWait = (kind: RentalMemoKind) => {
    if (running < o.concurrency) return
    if (
      requestQueue.length >= o.maxQueuedRequests ||
      counters[kind].buildMsEwma >= o.requestDeadlineMs
    ) {
      counters[kind].busy++
      throw new RentalMemoBusyError()
    }
  }

  const enqueueRequest = (job: Job) => {
    // A build that does not have to wait has no deadline: it starts now, whatever the estimate
    // says (and its duration is what moves the estimate back down).
    if (running < o.concurrency && requestQueue.length === 0) {
      run(job, now())
      return
    }
    requestQueue.push(job)
    pump()
    if (job.state === 'queued') armDeadline(job)
  }

  const startJob = (
    kind: RentalMemoKind,
    id: string,
    build: RentalMemoBuild<unknown>,
    priority: RentalMemoPriority,
    awaited: boolean
  ): Job => {
    if (priority === 'request') admitRequestWait(kind)
    const at = now()
    let resolve!: Job['resolve']
    let reject!: Job['reject']
    const promise = new Promise<{ value: unknown; builtAt: number }>((res, rej) => {
      resolve = res
      reject = rej
    })
    // A refresh nobody awaits must not surface as an unhandled rejection.
    promise.catch(() => {})
    const job: Job = {
      id,
      kind,
      build,
      priority,
      generation,
      queuedAt: at,
      deadlineFrom: at,
      awaited,
      startSeq: 0,
      startedAt: 0,
      state: 'queued',
      promise,
      resolve,
      reject,
    }
    pending.set(id, job)
    if (priority === 'request') enqueueRequest(job)
    else {
      backgroundQueue.push(job)
      pump()
    }
    return job
  }

  /** A request joining a queued background build promotes it; its deadline counts from now. */
  const join = (job: Job, priority: RentalMemoPriority) => {
    if (priority !== 'request' || job.priority === 'request' || job.state !== 'queued') return
    admitRequestWait(job.kind)
    const index = backgroundQueue.indexOf(job)
    if (index >= 0) backgroundQueue.splice(index, 1)
    job.priority = 'request'
    job.deadlineFrom = now()
    enqueueRequest(job)
  }

  const asResult = <T>(entry: Stored, state: RentalMemoState): RentalMemoResult<T> => ({
    value: entry.value as T,
    state,
    builtAt: entry.builtAt,
  })

  const maybeLog = (at: number) => {
    if (at - lastLogAt < o.logEveryMs) return
    lastLogAt = at
    try {
      log(stats())
    } catch {
      // A log line must never fail a request.
    }
  }

  const storedCount = () => groups.win.size + groups.facets.size + groups.map.size

  function stats(): Record<RentalMemoKind, RentalMemoKindStats> {
    return Object.fromEntries(
      RENTAL_MEMO_KINDS.map(kind => [kind, { ...sizes[kind], ...counters[kind] }])
    ) as Record<RentalMemoKind, RentalMemoKindStats>
  }

  function clear() {
    for (const group of Object.keys(groups) as RentalMemoGroup[]) {
      groups[group].clear()
      groupBytes[group] = 0
    }
    for (const kind of RENTAL_MEMO_KINDS) sizes[kind] = { entries: 0, bytes: 0 }
    generation++
    // New callers start new builds; the old ones still hold their slots and their waiters.
    pending.clear()
  }

  async function get<T>(
    kind: RentalMemoKind,
    key: string,
    build: RentalMemoBuild<T>,
    opts: RentalMemoGetOptions = {}
  ): Promise<RentalMemoResult<T>> {
    const at = now()
    maybeLog(at)
    const counter = counters[kind]

    if (!enabled()) {
      if (storedCount() || pending.size) clear()
      counter.builds++
      try {
        const { value } = await build()
        counter.miss++
        return { value, state: 'miss', builtAt: at }
      } catch (error) {
        counter.failures++
        throw error
      }
    }

    const id = idOf(kind, key)
    const entry = lookup(kind, id, at)
    if (entry) touch(kind, id, entry)
    if (entry && !opts.force && at < entry.softExpiresAt) {
      counter.hit++
      return asResult<T>(entry, 'hit')
    }
    if (entry && !opts.force && at < entry.serveUntil) {
      counter.stale++
      if (!pending.has(id)) startJob(kind, id, build as RentalMemoBuild<unknown>, 'refresh', false)
      return asResult<T>(entry, 'stale')
    }

    // Too old to serve, missing, or forced: wait for the build at the caller's priority.
    const priority = opts.priority ?? 'request'
    try {
      let job = pending.get(id)
      if (job) {
        join(job, priority)
        job.awaited = true
      } else job = startJob(kind, id, build as RentalMemoBuild<unknown>, priority, true)
      const { value, builtAt } = await job.promise
      counter.miss++
      return { value: value as T, state: 'miss', builtAt }
    } catch (error) {
      const fallback = lookup(kind, id, now())
      if (fallback) {
        counter.stale++
        return asResult<T>(fallback, 'stale')
      }
      throw error
    }
  }

  return {
    get,
    peek<T>(kind: RentalMemoKind, key: string) {
      if (!enabled()) return undefined
      const at = now()
      const id = idOf(kind, key)
      const entry = lookup(kind, id, at)
      if (!entry || at >= entry.serveUntil) return undefined
      touch(kind, id, entry)
      return publicEntry<T>(entry)
    },
    stats,
    clear,
  }
}

function definedOnly(options: RentalMemoOptions): Partial<Tunables> {
  const tunables: Partial<Tunables> = {}
  for (const name of Object.keys(RENTAL_MEMO_DEFAULTS) as Array<keyof Tunables>) {
    const value = (options as Partial<Tunables>)[name]
    if (typeof value === 'number') (tunables as Record<string, number>)[name] = value
  }
  return tunables
}

/** The pm2 instance answering, for the per-response header (`'na'` outside pm2). */
export function rentalWorkerId(): string {
  return process.env.NODE_APP_INSTANCE ?? 'na'
}

/**
 * The per-worker memo. A pass-through in `nuxt dev` (as the route's `shouldBypassCache`) and while
 * the switch file says `"memo":"off"`.
 */
export const rentalMemo: RentalMemo = createRentalMemo({
  enabled: () => process.env.NODE_ENV !== 'development' && rentalFlag('memo'),
})

/** `''` for no ids; otherwise the sha1 of the sorted, de-duplicated ids (order-free). */
export function hashIds(ids: readonly string[] | null | undefined): string {
  if (!ids?.length) return ''
  const sorted = [...new Set(ids)].sort()
  return createHash('sha1').update(JSON.stringify(sorted)).digest('hex')
}

/**
 * The memo key of one kind of pass for one search: `kind + ':' + sha1(...)` over the explicit
 * parameters of a normalised copy of the query, plus what the route resolved outside the query.
 *
 * - `win`: page dropped (the window index `w`, required, says which 20 pages); keeps sort,
 *   perPage and the reference point.
 * - `map`: page and perPage dropped; keeps sort and the reference point.
 * - `facet`/`dept`/`barrio`: counts do not depend on the order or on a point, so sort, point,
 *   page and perPage are all dropped and every order of one search shares one entry.
 * - `extra.zones`/`extra.excluded`: {@link hashIds} of the service zones and of the excluded adverts.
 *   The zones only count when `servicios` is set.
 *
 * Never the reference LABEL: it can be someone's address, and the server never reads it.
 */
export function rentalMemoKey(
  kind: RentalMemoKind,
  query: RentalQuery,
  extra: { w?: number; zones: string; excluded: string }
): string {
  const ordered = kind === 'win' || kind === 'map'
  const normalised: RentalQuery = {
    ...query,
    page: 1,
    ...(kind === 'win' ? {} : { perPage: RENTAL_PER_PAGE }),
    ...(ordered ? {} : { sort: 'recientes', refLat: null, refLng: null, refLabel: '' }),
  }
  const params = rentalQueryToParams(normalised, {
    includeReference: kind === 'win' || kind === 'map' ? 'point' : false,
  })
  // A missing, fractional or non-finite window would serialise as window 0's key (NaN and
  // ±Infinity become null): pages 21+ would be answered from the wrong window, silently.
  if (kind === 'win' && !(Number.isInteger(extra.w) && extra.w! >= 0))
    throw new TypeError(`rentalMemoKey('win') needs a whole window index >= 0, got ${extra.w}`)
  const resolved = {
    ...(kind === 'win' ? { w: extra.w } : {}),
    zones: query.servicios?.length ? extra.zones : '',
    excluded: extra.excluded,
  }
  const digest = createHash('sha1')
    .update(JSON.stringify([kind, params, resolved]))
    .digest('hex')
  return `${kind}:${digest}`
}

export const RENTAL_MEMO_HEADER = 'x-rentals-memo'
export const RENTAL_WORKER_HEADER = 'x-rentals-worker'

/** `'win=miss,facet=hit'` in lookup order; `''` when the request made no lookup. */
export function formatRentalMemoHeader(
  records: ReadonlyArray<{ kind: RentalMemoKind | 'outer'; state: RentalMemoState }>
): string {
  return records.map(record => `${record.kind}=${record.state}`).join(',')
}
