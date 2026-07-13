import { describe, expect, it } from 'vitest'
import { ADUANA_FALLBACK } from '../../server/utils/aduanaFallback'

describe('aduana fallback', () => {
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
