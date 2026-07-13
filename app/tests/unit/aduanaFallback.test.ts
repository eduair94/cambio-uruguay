import { describe, expect, it } from 'vitest'
import { BASELINE } from '../../../classes/aduana/baseline'
import { buildAduanaPayload } from '../../../classes/aduana/payload'
import { ADUANA_FALLBACK } from '../../server/utils/aduanaFallback'

describe('aduana fallback', () => {
  // This file is a hand-maintained COPY of classes/aduana/baseline.ts (the header comment
  // explains why: the two TypeScript programs cannot cross-import at build time, but vitest can).
  // Nothing forced the two to stay in sync until this test: edit one and not the other and every
  // other suite stays green while the fallback quietly serves a superseded number the moment the
  // live backend blinks. This also pins the twice-declared PublicAduanaPayload shape field-for-
  // field (pendingReview and aiCheckedAt included) — a field added to one type and not the other
  // would surface here as a value mismatch, not a silent type-only drift.
  it('is a faithful copy of the backend baseline', () => {
    expect(ADUANA_FALLBACK).toEqual(buildAduanaPayload(BASELINE as any))
  })

  // If the backend is down, the page must still be a useful page — not an empty shell.
  it('carries every problem and every fact, so a dead backend still renders the guide', () => {
    expect(ADUANA_FALLBACK.problems).toHaveLength(12)
    expect(ADUANA_FALLBACK.facts.length).toBeGreaterThan(0)
    expect(ADUANA_FALLBACK.problems.every(p => Array.isArray(p.quotes))).toBe(true)
    expect(ADUANA_FALLBACK.stale).toBe(true) // it is a snapshot, and it says so
  })

  it('sources every fact', () => {
    for (const f of ADUANA_FALLBACK.facts) {
      expect(ADUANA_FALLBACK.sources.some(s => s.id === f.sourceId)).toBe(true)
    }
  })
})
