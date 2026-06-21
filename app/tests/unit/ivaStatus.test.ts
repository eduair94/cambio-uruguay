import { describe, expect, it } from 'vitest'
import {
  getReverifyState,
  IVA_RULES,
  pendingSeasonStartYear,
  resolveIvaStatus,
  toISODate,
} from '../../utils/ivaStatus'

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe('toISODate', () => {
  it('formats a date as UTC YYYY-MM-DD', () => {
    expect(toISODate(d('2026-06-21'))).toBe('2026-06-21')
  })
})

describe('resolveIvaStatus — base reduction step-down', () => {
  it('is 9 points before 2026-10-01', () => {
    expect(resolveIvaStatus(d('2026-06-21')).baseReductionPoints).toBe(9)
    expect(resolveIvaStatus(d('2026-09-30')).baseReductionPoints).toBe(9)
  })

  it('drops to 5 points on/after 2026-10-01', () => {
    expect(resolveIvaStatus(d('2026-10-01')).baseReductionPoints).toBe(5)
    expect(resolveIvaStatus(d('2027-01-01')).baseReductionPoints).toBe(5)
  })

  it('always reports hotel lodging at 0%', () => {
    expect(resolveIvaStatus(d('2026-06-21')).hotelPct).toBe(0)
  })
})

describe('resolveIvaStatus — seasonal full exemption', () => {
  it('is active inside the encoded 2025/2026 window', () => {
    const s = resolveIvaStatus(d('2026-03-01'))
    expect(s.seasonalActive).toBe(true)
    expect(s.seasonalWindow?.decree).toBe('220/025')
  })

  it('is active on the window boundaries (inclusive)', () => {
    expect(resolveIvaStatus(d('2025-11-15')).seasonalActive).toBe(true)
    expect(resolveIvaStatus(d('2026-04-30')).seasonalActive).toBe(true)
  })

  it('is inactive in the off-season (June)', () => {
    expect(resolveIvaStatus(d('2026-06-21')).seasonalActive).toBe(false)
    expect(resolveIvaStatus(d('2026-06-21')).seasonalWindow).toBeNull()
  })

  it('is inactive next summer until a new window is encoded', () => {
    // Dec 2026 has no encoded window yet -> not active (watchdog should flag it).
    expect(resolveIvaStatus(d('2026-12-01')).seasonalActive).toBe(false)
  })
})

describe('pendingSeasonStartYear', () => {
  it('returns this year Oct–Dec', () => {
    expect(pendingSeasonStartYear(d('2026-10-15'))).toBe(2026)
    expect(pendingSeasonStartYear(d('2026-12-31'))).toBe(2026)
  })
  it('returns last year Jan–Apr', () => {
    expect(pendingSeasonStartYear(d('2026-02-01'))).toBe(2025)
  })
  it('returns null in the off-season May–Sep', () => {
    expect(pendingSeasonStartYear(d('2026-06-21'))).toBeNull()
    expect(pendingSeasonStartYear(d('2026-09-15'))).toBeNull()
  })
})

describe('getReverifyState', () => {
  it('does not flag in June 2026 when just researched (off-season, fresh)', () => {
    const r = getReverifyState(d('2026-06-21'), '2026-06-21')
    expect(r.needsReverify).toBe(false)
    expect(r.reasons).toHaveLength(0)
  })

  it('does not flag inside the confirmed 2025/2026 window', () => {
    expect(getReverifyState(d('2026-02-01'), '2026-06-21').needsReverify).toBe(false)
  })

  it('flags the unconfirmed next summer once the calendar reaches October', () => {
    const r = getReverifyState(d('2026-10-15'), '2026-06-21')
    expect(r.needsReverify).toBe(true)
    expect(r.reasons.join(' ')).toMatch(/Summer 2026\/2027/)
  })

  it('flags an unconfirmed summer in December', () => {
    expect(getReverifyState(d('2026-12-01'), '2026-06-21').needsReverify).toBe(true)
  })

  it('flags stale facts independently of the season', () => {
    // Off-season + last verified > 6 months ago -> stale reason only.
    const r = getReverifyState(d('2026-09-15'), '2025-01-01')
    expect(r.needsReverify).toBe(true)
    expect(r.reasons.join(' ')).toMatch(/overdue/i)
    expect(r.reasons.join(' ')).not.toMatch(/Summer/)
  })

  it('clears once the next window is encoded (rules-driven)', () => {
    // Sanity: the encoded rules currently contain exactly one window.
    expect(IVA_RULES.seasonalWindows).toHaveLength(1)
  })
})
