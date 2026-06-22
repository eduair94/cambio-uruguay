export const SNAPSHOT_VERSION = 1
export const SNAPSHOT_KEY = 'cu:rates-snapshot:v1'

export interface RatesSnapshotPayload {
  exchangeData: unknown[]
  localData?: unknown
  locations?: unknown[]
}

export interface RatesSnapshot extends RatesSnapshotPayload {
  v: number
  ts: number
}

export interface ExchangeResultLike {
  error: unknown
  exchangeData: unknown[]
  localData?: unknown
  locations?: unknown[]
  fromSnapshot?: boolean
  snapshotTs?: number | null
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage
    return ls ?? null
  } catch {
    // Access to localStorage can throw in some privacy modes / sandboxes.
    return null
  }
}

export function saveSnapshot(
  payload: RatesSnapshotPayload,
  storage: StorageLike | null = defaultStorage()
): void {
  if (!storage) return
  if (!payload || !Array.isArray(payload.exchangeData) || payload.exchangeData.length === 0) return
  const snap: RatesSnapshot = { v: SNAPSHOT_VERSION, ts: Date.now(), ...payload }
  try {
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(snap))
  } catch {
    // Quota or serialization errors are non-fatal — offline cache is best-effort.
  }
}

export function loadSnapshot(storage: StorageLike | null = defaultStorage()): RatesSnapshot | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(SNAPSHOT_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const p = parsed as Partial<RatesSnapshot> | null
  if (!p || p.v !== SNAPSHOT_VERSION || typeof p.ts !== 'number') return null
  if (!Array.isArray(p.exchangeData) || p.exchangeData.length === 0) return null
  return p as RatesSnapshot
}

export function snapshotAgeLabel(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function resolveExchangeResult(
  live: ExchangeResultLike,
  snapshot: RatesSnapshot | null
): ExchangeResultLike {
  const liveOk =
    !!live && !live.error && Array.isArray(live.exchangeData) && live.exchangeData.length > 0
  if (liveOk) return { ...live, fromSnapshot: false, snapshotTs: null }
  if (snapshot) {
    return {
      error: null,
      exchangeData: snapshot.exchangeData,
      localData: snapshot.localData,
      locations: snapshot.locations ?? [],
      fromSnapshot: true,
      snapshotTs: snapshot.ts,
    }
  }
  return { ...live, fromSnapshot: false, snapshotTs: null }
}
