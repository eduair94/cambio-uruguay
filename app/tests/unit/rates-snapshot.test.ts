import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSnapshot,
  loadSnapshot,
  snapshotAgeLabel,
  resolveExchangeResult,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
} from '../../utils/ratesSnapshot'

// Minimal in-memory localStorage fake (vitest runs in node env: no real localStorage).
function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    _map: m,
  }
}

describe('saveSnapshot / loadSnapshot', () => {
  let store: ReturnType<typeof fakeStorage>
  beforeEach(() => {
    store = fakeStorage()
  })

  it('round-trips a payload and stamps version + ts', () => {
    saveSnapshot({ exchangeData: [{ a: 1 }], localData: { x: 1 }, locations: ['MVD'] }, store)
    const snap = loadSnapshot(store)
    expect(snap).not.toBeNull()
    expect(snap!.v).toBe(SNAPSHOT_VERSION)
    expect(typeof snap!.ts).toBe('number')
    expect(snap!.exchangeData).toEqual([{ a: 1 }])
    expect(snap!.locations).toEqual(['MVD'])
  })

  it('does not save an empty exchangeData payload', () => {
    saveSnapshot({ exchangeData: [] }, store)
    expect(store.getItem(SNAPSHOT_KEY)).toBeNull()
  })

  it('returns null when nothing stored', () => {
    expect(loadSnapshot(store)).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    store.setItem(SNAPSHOT_KEY, '{not valid json')
    expect(loadSnapshot(store)).toBeNull()
  })

  it('returns null on version mismatch', () => {
    store.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ v: 999, ts: Date.now(), exchangeData: [{ a: 1 }] })
    )
    expect(loadSnapshot(store)).toBeNull()
  })

  it('returns null when no storage is available', () => {
    saveSnapshot({ exchangeData: [{ a: 1 }] }, null)
    expect(loadSnapshot(null)).toBeNull()
  })
})

describe('snapshotAgeLabel', () => {
  it('formats as HH:MM 24h', () => {
    const label = snapshotAgeLabel(Date.now())
    expect(label).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
  })
})

describe('resolveExchangeResult', () => {
  const snap = { v: 1, ts: 123, exchangeData: [{ s: 1 }], localData: { l: 1 }, locations: ['X'] }

  it('keeps live data when present and error-free', () => {
    const live = { error: null, exchangeData: [{ a: 1 }], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, snap)
    expect(r.exchangeData).toEqual([{ a: 1 }])
    expect(r.fromSnapshot).toBe(false)
    expect(r.snapshotTs).toBeNull()
  })

  it('falls back to snapshot when live is empty and a snapshot exists', () => {
    const live = { error: null, exchangeData: [], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, snap)
    expect(r.exchangeData).toEqual([{ s: 1 }])
    expect(r.fromSnapshot).toBe(true)
    expect(r.snapshotTs).toBe(123)
    expect(r.error).toBeNull()
  })

  it('falls back to snapshot when live errored', () => {
    const live = { error: { message: 'boom' }, exchangeData: [], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, snap)
    expect(r.fromSnapshot).toBe(true)
    expect(r.exchangeData).toEqual([{ s: 1 }])
  })

  it('returns live unchanged when empty and no snapshot', () => {
    const live = { error: null, exchangeData: [], localData: {}, locations: [] }
    const r = resolveExchangeResult(live, null)
    expect(r.exchangeData).toEqual([])
    expect(r.fromSnapshot).toBe(false)
  })
})
