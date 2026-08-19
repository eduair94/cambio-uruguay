// app/tests/unit/bcuRatesMerge.test.ts
import { describe, expect, it } from 'vitest'

import {
  applyBcuRates,
  baselineBcuRates,
  provesOut,
  plausibleFractions,
  type LiveBcuRatesResponse,
  type LiveBcuRow,
} from '../../server/utils/bcuRatesMerge'
import { BCU_CAPS, USURY_MARKUP } from '../../utils/cashAdvance'

/**
 * A live payload that restates the baseline — the "nothing changed" case.
 *
 * NOTE THE ×100: the backend serves the grid in PERCENT, the way the BCU prints it, while
 * `BCU_CAPS` holds fractions. Writing this helper without the conversion is precisely the bug the
 * unit-boundary tests below exist to catch.
 */
function goodRows(): LiveBcuRow[] {
  return BCU_CAPS.map(r => ({
    bracket: r.bracket,
    cortoPlazo: r.cortoPlazo,
    currency: r.currency,
    media: r.media * 100,
    tope: r.tope * 100,
    topeMora: r.topeMora * 100,
  }))
}

function payload(over: Partial<LiveBcuRatesResponse> = {}): LiveBcuRatesResponse {
  return {
    periodo: 'abril–junio de 2026',
    vigenteDesde: '2026-08-01',
    rows: goodRows(),
    asOf: '2026-08-19T00:00:00.000Z',
    ...over,
  }
}

describe('provesOut — the Ley 18.212 arithmetic guard', () => {
  it('accepts a table whose caps derive from the published averages', () => {
    expect(provesOut(goodRows())).toBe(true)
  })

  it('rejects a cap that does not follow media × 1,55', () => {
    const rows = goodRows()
    rows[0]!.tope = 125
    expect(provesOut(rows)).toBe(false)
  })

  it('rejects a default cap that does not follow media × 1,80', () => {
    const rows = goodRows()
    rows[2]!.topeMora = 99
    expect(provesOut(rows)).toBe(false)
  })

  it('rejects a short table', () => {
    expect(provesOut(goodRows().slice(0, 5))).toBe(false)
  })

  it('rejects duplicates even when the count matches', () => {
    const rows = goodRows()
    rows[5] = { ...rows[0]! }
    expect(provesOut(rows)).toBe(false)
  })

  it('rejects non-finite, zero and negative values', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      const rows = goodRows()
      rows[0]!.media = bad as number
      expect(provesOut(rows), String(bad)).toBe(false)
    }
  })

  it('rejects junk without throwing', () => {
    for (const junk of [undefined, null, 'rows', 42, [], [null]]) {
      expect(provesOut(junk as never)).toBe(false)
    }
  })

  it('accepts a genuinely NEW table, as long as it closes', () => {
    // Next month's numbers are unknown, so the guard must not be pinned to today's values.
    const rows = goodRows().map(r => {
      const media = r.media * 1.03
      return {
        ...r,
        media,
        tope: media * (1 + USURY_MARKUP.menor2M),
        topeMora: media * (1 + USURY_MARKUP.menor2MMora),
      }
    })
    expect(provesOut(rows)).toBe(true)
  })
})

describe('plausibleFractions — the unit guard', () => {
  it('accepts the baseline, which is already fractions', () => {
    expect(plausibleFractions(BCU_CAPS)).toBe(true)
  })

  it('rejects percents that were never converted', () => {
    expect(
      plausibleFractions(
        BCU_CAPS.map(r => ({ ...r, media: r.media * 100, topeMora: r.topeMora * 100 }))
      )
    ).toBe(false)
  })

  it('rejects a double conversion', () => {
    expect(
      plausibleFractions(
        BCU_CAPS.map(r => ({ ...r, media: r.media / 100, topeMora: r.topeMora / 100 }))
      )
    ).toBe(false)
  })
})

describe('applyBcuRates', () => {
  it('falls back to the baseline on a null payload', () => {
    const r = applyBcuRates(null)
    expect(r.live).toBe(false)
    expect(r.rows).toEqual(BCU_CAPS.map(x => ({ ...x })))
  })

  it('takes a payload that proves out', () => {
    const r = applyBcuRates(payload())
    expect(r.live).toBe(true)
    expect(r.vigenteDesde).toBe('2026-08-01')
    expect(r.asOf).toBe('2026-08-19T00:00:00.000Z')
  })

  it('converts the backend percent into this app fractions', () => {
    // The regression this guards: forwarding 84.47 unconverted renders "8447 %" on the page.
    const r = applyBcuRates(payload())
    const row = r.rows.find(
      x => x.currency === 'UYU' && x.bracket === 'menor10kUI' && x.cortoPlazo
    )!
    expect(row.media).toBeCloseTo(0.8447, 6)
    expect(row.tope).toBeCloseTo(1.309285, 6)
    for (const x of r.rows) expect(x.media).toBeLessThan(5)
  })

  it('refuses a payload that already arrives as fractions', () => {
    // A double conversion would render "0,84 %" — silently 100x too cheap. `provesOut` cannot see
    // it (the ratio holds in any unit), so the magnitude band is the only thing that can.
    const rows = BCU_CAPS.map(r => ({
      bracket: r.bracket,
      cortoPlazo: r.cortoPlazo,
      currency: r.currency,
      media: r.media,
      tope: r.tope,
      topeMora: r.topeMora,
    }))
    expect(provesOut(rows)).toBe(true) // the arithmetic proof is scale-invariant…
    expect(applyBcuRates(payload({ rows })).live).toBe(false) // …the unit guard is not.
  })

  it('refuses a payload inflated by a stray extra factor', () => {
    const rows = goodRows().map(r => ({
      ...r,
      media: r.media * 100,
      tope: r.tope * 100,
      topeMora: r.topeMora * 100,
    }))
    expect(applyBcuRates(payload({ rows })).live).toBe(false)
  })

  it('refuses a payload whose arithmetic does not close', () => {
    const rows = goodRows()
    rows[0]!.tope = 200
    expect(applyBcuRates(payload({ rows })).live).toBe(false)
  })

  it('refuses a malformed effective date', () => {
    expect(applyBcuRates(payload({ vigenteDesde: 'agosto 2026' })).live).toBe(false)
  })

  it('never moves the table backwards in time', () => {
    // An archived BCU page would otherwise silently downgrade a correct current table.
    const r = applyBcuRates(payload({ vigenteDesde: '2026-06-01' }))
    expect(r.live).toBe(false)
    expect(r.vigenteDesde).toBe(baselineBcuRates().vigenteDesde)
  })

  it('accepts a newer effective date', () => {
    const r = applyBcuRates(payload({ vigenteDesde: '2026-09-01', periodo: 'mayo–julio de 2026' }))
    expect(r.live).toBe(true)
    expect(r.periodo).toBe('mayo–julio de 2026')
  })

  it('keeps the baseline source when the payload carries none', () => {
    const r = applyBcuRates(payload())
    expect(r.sources[0]!.url).toMatch(/bcu\.gub\.uy/)
  })

  it('does not alias the baseline rows', () => {
    const a = baselineBcuRates()
    a.rows[0]!.media = 1
    expect(baselineBcuRates().rows[0]!.media).not.toBe(1)
  })
})
