import { describe, expect, it } from 'vitest'
import { mergeLenders } from '../../server/utils/loansMerge'
import { LENDERS } from '../../utils/loans'

describe('mergeLenders', () => {
  it('overlays a scraped TEA and scrapedAt onto the seed catalogue', () => {
    const out = mergeLenders({ oca: { teaPct: 41, scrapedAt: '2026-07-12T00:00:00.000Z' } })
    const oca = out.find(l => l.id === 'oca')!
    expect(oca.teaPct).toBe(41)
    expect(oca.scrapedAt).toBe('2026-07-12T00:00:00.000Z')
  })

  it('keeps every seed lender, with the seed TEA, when no live rates are present', () => {
    const out = mergeLenders(undefined)
    expect(out).toHaveLength(LENDERS.length)
    expect(out.find(l => l.id === 'itau')!.teaPct).toBe(39)
    expect(out.find(l => l.id === 'itau')!.scrapedAt).toBeUndefined()
  })
})
