import { describe, expect, it } from 'vitest'
import { courierImport, generalImport } from '../../utils/importTax'
import {
  IMPORT_PRODUCT_TYPES,
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
  it('books (IVA exempt) pay no IVA on the franchised value via courier', () => {
    const { ivaPct } = resolveProductTax(productTypeById('libros'))
    const r = courierImport({ value: 150, origin: 'other', useFranchise: true, ivaPct })
    expect(r.totalTax).toBe(0)
  })

  it('medicines pay the 10% rate on the franchised value via courier', () => {
    const { ivaPct } = resolveProductTax(productTypeById('medicamentos'))
    const r = courierImport({ value: 150, origin: 'other', useFranchise: true, ivaPct })
    expect(r.totalTax).toBe(15) // 150 * 10%
  })

  it('general regime applies the category IMESI when it is supplied', () => {
    const r = generalImport({
      value: 1000,
      tasaConsularPct: 0,
      imesiPct: 20,
      ivaPct: ivaPctFor(productTypeById('alcohol_tabaco').iva),
    })
    // IMESI 200, IVA base 1200, IVA 264, total 464
    expect(r.totalTax).toBe(464)
  })
})

describe('resolveProductTax', () => {
  it('resolves the IVA rate and IMESI applicability of a category', () => {
    expect(resolveProductTax(productTypeById('libros'))).toEqual({
      ivaPct: 0,
      imesiApplies: false,
    })
    expect(resolveProductTax(productTypeById('medicamentos'))).toEqual({
      ivaPct: 10,
      imesiApplies: false,
    })
    expect(resolveProductTax(productTypeById('alcohol_tabaco'))).toEqual({
      ivaPct: 22,
      imesiApplies: true,
    })
  })
})
