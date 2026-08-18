import { describe, expect, it } from 'vitest'

import {
  CUSTOMS_VALUE_THRESHOLD_HIGH_USD,
  CUSTOMS_VALUE_THRESHOLD_LOW_USD,
  DECREE_147_2026_MATRIX,
  DECREE_390_2021_CURRENT_RATES,
  ELECTRIC_VEHICLE_TAX_SOURCES,
  ENGINE_ROWS,
  HYBRID_SUBCATEGORY_DEFINITIONS,
  resolveCustomsBracket,
  resolveEngineRow,
  resolveVehicleTax,
} from '../../utils/electricVehicleTax'

describe('resolveCustomsBracket', () => {
  // Decreto 147/026: literal a) es "no supere los US$ 19.000", así que
  // exactamente 19.000 entra en el tramo bajo (desigualdad no estricta).
  it('keeps exactly 19.000 in bracket a', () => {
    expect(resolveCustomsBracket(CUSTOMS_VALUE_THRESHOLD_LOW_USD)).toBe('a')
  })

  it('moves to bracket b one dollar above 19.000', () => {
    expect(resolveCustomsBracket(CUSTOMS_VALUE_THRESHOLD_LOW_USD + 1)).toBe('b')
  })

  // Literal b) es "superior a US$ 19.000 y no exceda los US$ 27.000": el
  // límite superior es no excluyente, así que 27.000 exacto sigue en b.
  it('keeps exactly 27.000 in bracket b', () => {
    expect(resolveCustomsBracket(CUSTOMS_VALUE_THRESHOLD_HIGH_USD)).toBe('b')
  })

  it('moves to bracket c one dollar above 27.000', () => {
    expect(resolveCustomsBracket(CUSTOMS_VALUE_THRESHOLD_HIGH_USD + 1)).toBe('c')
  })

  it('clamps negatives and non-numbers into bracket a instead of throwing', () => {
    for (const value of [-100, Number.NaN, Number.NEGATIVE_INFINITY]) {
      expect(resolveCustomsBracket(value)).toBe('a')
    }
  })
})

describe('resolveEngineRow', () => {
  it('resolves the boundary of every row', () => {
    expect(resolveEngineRow(1_000)).toBe('F1')
    expect(resolveEngineRow(1_001)).toBe('F2')
    expect(resolveEngineRow(1_500)).toBe('F2')
    expect(resolveEngineRow(1_501)).toBe('F3')
    expect(resolveEngineRow(2_000)).toBe('F3')
    expect(resolveEngineRow(2_001)).toBe('F4')
    expect(resolveEngineRow(2_500)).toBe('F4')
    expect(resolveEngineRow(2_501)).toBe('F5')
    expect(resolveEngineRow(3_000)).toBe('F5')
    expect(resolveEngineRow(3_001)).toBe('F6')
  })

  it('never breaks on zero or negative displacement', () => {
    expect(resolveEngineRow(0)).toBe('F1')
    expect(resolveEngineRow(-500)).toBe('F1')
  })
})

describe('resolveVehicleTax — eléctrico puro', () => {
  it('handles a pure electric vehicle without an engine displacement, without breaking', () => {
    const r = resolveVehicleTax({ customsValueUsd: 15_000, propulsion: 'electric' })
    expect(r.engineCc).toBeNull()
    expect(r.engineRow).toBeNull()
    expect(r.hybridSubcategory).toBeNull()
  })

  it('is 0% today and 0% in 2027 up to US$ 19.000', () => {
    const r = resolveVehicleTax({ customsValueUsd: 19_000, propulsion: 'electric' })
    expect(r.customsBracket).toBe('a')
    expect(r.rateTodayPct).toBe(0)
    expect(r.rate2027Pct).toBe(0)
    expect(r.diffPct).toBe(0)
  })

  it('jumps to 5% in 2027 just above US$ 19.000, while today stays at 0%', () => {
    const r = resolveVehicleTax({ customsValueUsd: 19_001, propulsion: 'electric' })
    expect(r.customsBracket).toBe('b')
    expect(r.rateTodayPct).toBe(0)
    expect(r.rate2027Pct).toBe(5)
    expect(r.diffPct).toBe(5)
  })

  it('reaches 9% in 2027 above US$ 27.000, regardless of how high the value goes', () => {
    const r = resolveVehicleTax({ customsValueUsd: 200_000, propulsion: 'electric' })
    expect(r.customsBracket).toBe('c')
    expect(r.rateTodayPct).toBe(0)
    expect(r.rate2027Pct).toBe(9)
    expect(r.diffPct).toBe(9)
  })
})

describe('resolveVehicleTax — híbridos', () => {
  it('requires hybridSubcategory for hybrids instead of guessing one', () => {
    expect(() =>
      resolveVehicleTax({ customsValueUsd: 20_000, propulsion: 'hybrid', engineCc: 1_800 })
    ).toThrow()
  })

  it('requires engineCc for hybrids instead of guessing a row', () => {
    expect(() =>
      resolveVehicleTax({ customsValueUsd: 20_000, propulsion: 'hybrid', hybridSubcategory: 'a' })
    ).toThrow()
  })

  // El hallazgo central del dossier: para híbridos de hasta US$ 19.000, las
  // tasas del decreto nuevo son IDÉNTICAS a las de hoy — no cambia nada.
  it('changes nothing for a plug-in hybrid under US$ 19.000', () => {
    const r = resolveVehicleTax({
      customsValueUsd: 19_000,
      propulsion: 'hybrid',
      hybridSubcategory: 'a',
      engineCc: 1_800,
    })
    expect(r.customsBracket).toBe('a')
    expect(r.rateTodayPct).toBe(2)
    expect(r.rate2027Pct).toBe(2)
    expect(r.diffPct).toBe(0)
  })

  // El salto grande: un enchufable de hasta 2.500cc pasa de 2% a 7% (tramo b)
  // y a 11% (tramo c) apenas se cruza el umbral de US$ 19.000.
  it('jumps from 2% to 7% for a plug-in hybrid just above US$ 19.000', () => {
    const r = resolveVehicleTax({
      customsValueUsd: 19_001,
      propulsion: 'hybrid',
      hybridSubcategory: 'a',
      engineCc: 2_000,
    })
    expect(r.rateTodayPct).toBe(2)
    expect(r.rate2027Pct).toBe(7)
    expect(r.diffPct).toBe(5)
  })

  it('jumps to 11% above US$ 27.000 for the same plug-in hybrid', () => {
    const r = resolveVehicleTax({
      customsValueUsd: 27_001,
      propulsion: 'hybrid',
      hybridSubcategory: 'a',
      engineCc: 2_000,
    })
    expect(r.rate2027Pct).toBe(11)
  })

  it('resolves a mild hybrid (c) with a large engine straight to the 34.5% ceiling in both tables', () => {
    const r = resolveVehicleTax({
      customsValueUsd: 30_000,
      propulsion: 'hybrid',
      hybridSubcategory: 'c',
      engineCc: 2_600,
    })
    expect(r.engineRow).toBe('F5')
    expect(r.rateTodayPct).toBe(34.5)
    expect(r.rate2027Pct).toBe(34.5)
    expect(r.diffPct).toBe(0)
  })

  it('keeps fractional rates precise (no floating point drift) on the b subcategory', () => {
    const r = resolveVehicleTax({
      customsValueUsd: 19_001,
      propulsion: 'hybrid',
      hybridSubcategory: 'b',
      engineCc: 900,
    })
    expect(r.rateTodayPct).toBe(3.45)
    expect(r.rate2027Pct).toBe(8.45)
    expect(r.diffPct).toBeCloseTo(5, 6)
  })
})

describe('the sourcing contract', () => {
  it('cites only impo.com.uy sources', () => {
    expect(ELECTRIC_VEHICLE_TAX_SOURCES.length).toBeGreaterThan(0)
    for (const source of ELECTRIC_VEHICLE_TAX_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })

  it('documents all three hybrid subcategories, including the start/stop exclusion', () => {
    expect(HYBRID_SUBCATEGORY_DEFINITIONS).toHaveLength(3)
    const mildHybrid = HYBRID_SUBCATEGORY_DEFINITIONS.find(d => d.id === 'c')
    expect(mildHybrid?.description).toMatch(/start\/stop/)
  })
})

describe('data integrity of the matrix', () => {
  it('has all six engine rows for every hybrid subcategory in every bracket', () => {
    for (const bracket of ['a', 'b', 'c'] as const) {
      for (const sub of ['a', 'b', 'c'] as const) {
        for (const row of ENGINE_ROWS) {
          expect(typeof DECREE_147_2026_MATRIX[bracket].hybrid[sub][row]).toBe('number')
        }
      }
    }
  })

  it("matches the 2027 bracket-a hybrid rates against today's rates exactly", () => {
    for (const sub of ['a', 'b', 'c'] as const) {
      for (const row of ENGINE_ROWS) {
        expect(DECREE_147_2026_MATRIX.a.hybrid[sub][row]).toBe(
          DECREE_390_2021_CURRENT_RATES.hybrid[sub][row]
        )
      }
    }
  })

  it('caps every subcategory at the same 34.5% ceiling from F5 up', () => {
    for (const bracket of ['a', 'b', 'c'] as const) {
      for (const sub of ['a', 'b', 'c'] as const) {
        expect(DECREE_147_2026_MATRIX[bracket].hybrid[sub].F5).toBe(34.5)
        expect(DECREE_147_2026_MATRIX[bracket].hybrid[sub].F6).toBe(34.5)
      }
    }
  })
})
