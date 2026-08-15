import { describe, expect, it } from 'vitest'
import { courierImport, generalImport } from '../../utils/importTax'
import {
  IMPORT_PRODUCT_TYPES,
  exemptionFor,
  ivaPctFor,
  productRegimeStatus,
  productTypeById,
  resolveProductTax,
} from '../../utils/importProductTypes'

describe('ivaPctFor', () => {
  it('maps the IVA treatment to its numeric rate', () => {
    expect(ivaPctFor('exento')).toBe(0)
    expect(ivaPctFor('minima')).toBe(10)
    expect(ivaPctFor('basica')).toBe(22)
  })
})

describe('IMPORT_PRODUCT_TYPES catalog', () => {
  it('has unique ids', () => {
    const ids = IMPORT_PRODUCT_TYPES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every type has a label and an icon', () => {
    for (const t of IMPORT_PRODUCT_TYPES) {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.icon).toMatch(/^mdi-/)
    }
  })

  it('exposes a "general" default that is the current (22%, no procedures, allowed) behavior', () => {
    const general = productTypeById('general')
    expect(general.iva).toBe('basica')
    expect(general.imesi ?? false).toBe(false)
    expect(general.prohibited ?? false).toBe(false)
    expect(general.courierProhibited ?? false).toBe(false)
    expect(general.procedures ?? []).toHaveLength(0)
  })

  it('books are IVA-exempt with no procedures', () => {
    const libros = productTypeById('libros')
    expect(libros.iva).toBe('exento')
    expect(libros.procedures ?? []).toHaveLength(0)
  })

  it('medicines pay the 10% minima rate and require an MSP procedure', () => {
    const med = productTypeById('medicamentos')
    expect(med.iva).toBe('minima')
    expect(med.procedures?.some(p => p.organism === 'MSP')).toBe(true)
  })

  it('radiofrequency goods require a URSEC procedure', () => {
    const rf = productTypeById('radiofrecuencia')
    expect(rf.procedures?.some(p => p.organism === 'URSEC')).toBe(true)
  })

  it('alcohol/tobacco applies IMESI and cannot enter via courier', () => {
    const at = productTypeById('alcohol_tabaco')
    expect(at.imesi).toBe(true)
    expect(at.courierProhibited).toBe(true)
  })

  it('the prohibited category is flagged prohibited in both regimes', () => {
    const p = productTypeById('prohibidos')
    expect(p.prohibited).toBe(true)
  })
})

describe('productTypeById', () => {
  it('returns the matching type', () => {
    expect(productTypeById('libros').id).toBe('libros')
  })

  it('falls back to "general" for an unknown id', () => {
    expect(productTypeById('does-not-exist').id).toBe('general')
  })
})

describe('productRegimeStatus', () => {
  it('allows a general product in both regimes', () => {
    expect(productRegimeStatus(productTypeById('general'), 'courier').blocked).toBe(false)
    expect(productRegimeStatus(productTypeById('general'), 'general').blocked).toBe(false)
  })

  it('blocks a prohibited product in both regimes', () => {
    const courier = productRegimeStatus(productTypeById('prohibidos'), 'courier')
    const general = productRegimeStatus(productTypeById('prohibidos'), 'general')
    expect(courier.blocked).toBe(true)
    expect(general.blocked).toBe(true)
    expect(courier.reason).toMatch(/prohib/i)
  })

  it('blocks a courier-prohibited product only in the courier regime', () => {
    expect(productRegimeStatus(productTypeById('alcohol_tabaco'), 'courier').blocked).toBe(true)
    expect(productRegimeStatus(productTypeById('alcohol_tabaco'), 'general').blocked).toBe(false)
  })
})

describe('catalog feeds the import math', () => {
  /** Everything the category contributes to the courier math, in one place. */
  function courierFor(id: string, extra: Record<string, unknown> = {}) {
    const { ivaPct, exemption, franchiseCapExempt } = resolveProductTax(productTypeById(id))
    return courierImport({
      value: 150,
      origin: 'other',
      useFranchise: true,
      ivaPct,
      exemption,
      franchiseCapExempt,
      ...extra,
    })
  }

  it('books pay nothing under the franquicia: the import is exonerated of every tax', () => {
    const r = courierFor('libros')
    expect(r.regime).toBe('exonerado')
    expect(r.totalTax).toBe(0)
  })

  // ESTE es el bug que reportó el lector: sin franquicia, un libro cobraba el 60% (mínimo US$ 20).
  // La prestación única es una OPCIÓN (Ley 20.446 art. 627: "podrán optar"), no puede desplazar
  // una exoneración legal: Título 10 art. 41 y Ley 15.913 art. 8 exoneran la importación de libros
  // de todo tributo nacional, aranceles y tasas consulares.
  it('books pay nothing WITHOUT the franchise either — the 60% never reaches them', () => {
    const r = courierFor('libros', { useFranchise: false })
    expect(r.regime).toBe('exonerado')
    expect(r.totalTax).toBe(0)
  })

  it('books do not consume the annual USD 800 balance (Decreto 50/026 art. 4)', () => {
    // Saldo agotado: una categoría común caería en prestación única; el libro no.
    const r = courierFor('libros', { franchiseAvailable: 0 })
    expect(r.regime).toBe('exonerado')
    expect(r.totalTax).toBe(0)
  })

  it('a non-exempt category with no balance left falls into the 60%', () => {
    const r = courierFor('ropa', { franchiseAvailable: 0 })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(90) // 150 × 60%
  })

  it('medicines pay the 10% rate, floored at the USD 20 statutory minimum', () => {
    // 150 × 10% = 15, por debajo del piso del art. 13 lit. B (Ley 20.446 art. 660). Los
    // medicamentos NO están exonerados: tributan a la tasa mínima, así que el piso les corre.
    const r = courierFor('medicamentos')
    expect(r.regime).toBe('franquicia')
    expect(r.totalTax).toBe(20)
  })

  it('medicines above the floor pay their own 10%', () => {
    const r = courierFor('medicamentos', { value: 400 })
    expect(r.totalTax).toBe(40)
  })

  it('general regime applies the category IMESI when it is supplied', () => {
    const r = generalImport({
      value: 1000,
      tasaConsularPct: 0,
      imesiPct: 20,
      ivaPct: ivaPctFor(productTypeById('alcohol_tabaco').iva),
    })
    // Base (1000 + 0) × 1,5 = 1500 → IMESI 300, IVA 330, total 630. El IMESI no integra la base
    // del IVA (Título 10 art. 13 lit. B nombra sólo valor en aduana + arancel).
    expect(r.totalTax).toBe(630)
  })
})

describe('resolveProductTax', () => {
  it('resolves the IVA rate, IMESI applicability and how far the exoneration reaches', () => {
    expect(resolveProductTax(productTypeById('libros'))).toEqual({
      ivaPct: 0,
      imesiApplies: false,
      exemption: 'todo-tributo',
      franchiseCapExempt: true,
    })
    expect(resolveProductTax(productTypeById('medicamentos'))).toEqual({
      ivaPct: 10,
      imesiApplies: false,
      exemption: 'none',
      franchiseCapExempt: true,
    })
    expect(resolveProductTax(productTypeById('alcohol_tabaco'))).toEqual({
      ivaPct: 22,
      imesiApplies: true,
      exemption: 'none',
      franchiseCapExempt: false,
    })
  })

  it('an IVA-exempt category implies at least an IVA exoneration on the import', () => {
    // Título 10 art. 38 num. 3 lit. B: "las importaciones de bienes cuya enajenación se exonera
    // por este artículo". Ninguna categoría tiene que repetirlo.
    for (const type of IMPORT_PRODUCT_TYPES.filter(t => t.iva === 'exento')) {
      expect(exemptionFor(type)).not.toBe('none')
    }
  })
})
