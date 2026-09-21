import { describe, expect, it } from 'vitest'
import { staleRentalSources, type RentalSourceRun } from '../../utils/rentals'

// 2026-09-21: Casasweb missed ONE hourly pass (1 of 130 that week) and the directory printed
// "No pudimos actualizar Casasweb en el último repaso" for the whole hour, while every Casasweb
// advert on the page was exactly the one read an hour earlier — the hourly run never expires any.
const run = (source: Partial<RentalSourceRun>): RentalSourceRun => ({
  key: 'casasweb',
  ok: false,
  listings: 0,
  note: '',
  ...source,
})
const meta = (generatedAt: string, ...sources: RentalSourceRun[]) => ({ generatedAt, sources })

describe('staleRentalSources', () => {
  it('does not warn about a single missed hourly pass', () => {
    const missed = run({
      lastOkAt: '2026-09-21T09:48:11.377Z',
      failingSince: '2026-09-21T10:48:17.179Z',
    })
    expect(staleRentalSources(meta('2026-09-21T10:48:17.179Z', missed))).toEqual([])
  })

  it('warns once the source has missed two passes in a row', () => {
    const missed = run({
      lastOkAt: '2026-09-21T09:48:11.377Z',
      failingSince: '2026-09-21T10:48:17.179Z',
    })
    expect(staleRentalSources(meta('2026-09-21T11:48:02.000Z', missed))).toEqual([missed])
  })

  it('warns about a source that has never been read', () => {
    const never = run({})
    expect(staleRentalSources(meta('2026-09-21T10:48:17.179Z', never))).toEqual([never])
  })

  it('never warns about a healthy source or one we only link to', () => {
    const external = run({ key: 'elpais', access: 'external_only' })
    const healthy = run({ key: 'infocasas', ok: true, lastOkAt: '2026-09-20T00:00:00.000Z' })
    expect(staleRentalSources(meta('2026-09-21T10:48:17.179Z', external, healthy))).toEqual([])
  })

  it('measures from the run, not the clock, so the server render and hydration agree', () => {
    const missed = run({ lastOkAt: '2026-09-01T09:48:11.377Z' })
    // A week-old page whose run was one missed pass is still one missed pass.
    expect(staleRentalSources(meta('2026-09-01T10:48:17.179Z', missed))).toEqual([])
  })

  it('tolerates a missing meta', () => {
    expect(staleRentalSources(null)).toEqual([])
    expect(staleRentalSources(undefined)).toEqual([])
  })
})
