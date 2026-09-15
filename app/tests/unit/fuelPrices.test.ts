import { describe, expect, it } from 'vitest'

import {
  FUEL_HOW_IT_WORKS,
  FUEL_PRODUCTS,
  FUEL_SOURCES,
  FUEL_VERIFIED_AT,
  buildFuelFaq,
  changeBetween,
  formatUyu,
  lastChange,
  monthLabel,
  monthOfYearLabel,
  nextMonthLabel,
  nextMonthOfYearLabel,
  yearAgo,
} from '../../utils/fuelPrices'
import type { FuelRow } from '../../utils/fuelPrices'

const row = (from: string, super95: number, gasoil50s = 50): FuelRow => ({
  from,
  super95,
  premium97: super95 + 2.5,
  gasoil50s,
  gasoil10s: gasoil50s + 8,
  queroseno: 55,
  supergas: 88,
})
const rows = [
  row('2026-06-01', 93.36),
  row('2026-07-01', 88.67),
  row('2026-08-01', 88.67),
  row('2026-09-01', 88.67),
]

describe('monthLabel', () => {
  it('escribe setiembre, no septiembre', () => {
    expect(monthLabel('2026-09-01')).toBe('setiembre 2026')
    expect(monthLabel('2026-01-01')).toBe('enero 2026')
  })
  it('no explota con basura', () => {
    expect(monthLabel('')).toBe('')
    expect(monthLabel('nope')).toBe('')
  })
})

describe('monthOfYearLabel', () => {
  it('agrega el "de" que pide «el 1.º de …»', () => {
    expect(monthOfYearLabel('2026-09-01')).toBe('setiembre de 2026')
    expect(nextMonthOfYearLabel('2026-12-01')).toBe('enero de 2027')
  })
  it('no explota con basura', () => {
    expect(monthOfYearLabel('')).toBe('')
    expect(nextMonthOfYearLabel('nope')).toBe('')
  })
})

describe('nextMonthLabel', () => {
  it('avanza una vigencia', () => {
    expect(nextMonthLabel('2026-09-01')).toBe('octubre 2026')
    expect(nextMonthLabel('2026-01-01')).toBe('febrero 2026')
  })
  it('rueda el año en diciembre', () => {
    expect(nextMonthLabel('2026-12-01')).toBe('enero 2027')
  })
  it('no explota con basura', () => {
    expect(nextMonthLabel('')).toBe('')
    expect(nextMonthLabel('nope')).toBe('')
  })
})

describe('formatUyu', () => {
  it('usa coma decimal y el signo de pesos', () => {
    expect(formatUyu(88.67)).toBe('$ 88,67')
    expect(formatUyu(null)).toBe('—')
  })
})

describe('changeBetween', () => {
  it('devuelve diferencia y porcentaje', () => {
    expect(changeBetween(93.36, 88.67)).toEqual({ abs: -4.69, pct: -5.02 })
    expect(changeBetween(88.67, 88.67)).toEqual({ abs: 0, pct: 0 })
  })
  it('devuelve null con nulos o cero', () => {
    expect(changeBetween(null, 1)).toBeNull()
    expect(changeBetween(0, 1)).toBeNull()
    expect(changeBetween(Number.NaN, 1)).toBeNull()
  })
})

describe('lastChange', () => {
  it('encuentra la última vigencia en la que cambió el producto', () => {
    expect(lastChange(rows, 'super95')).toEqual({
      from: '2026-07-01',
      before: 93.36,
      after: 88.67,
      abs: -4.69,
      pct: -5.02,
    })
  })
  it('null si nunca cambió o no hay filas', () => {
    expect(lastChange(rows, 'supergas')).toBeNull()
    expect(lastChange([], 'super95')).toBeNull()
  })
  it('saltea el hueco en vez de esconder el cambio que hay a sus dos lados', () => {
    // Un solo null en el medio dejaba el producto como "sin cambios en la serie".
    const conHueco = [
      row('2026-06-01', 93.36),
      { ...row('2026-07-01', 93.36), super95: null },
      row('2026-08-01', 88.67),
    ]
    expect(lastChange(conHueco, 'super95')).toEqual({
      from: '2026-08-01',
      before: 93.36,
      after: 88.67,
      abs: -4.69,
      pct: -5.02,
    })
  })
  it('sigue mirando hacia atrás cuando un par no tiene porcentaje', () => {
    // Con base cero no hay variación porcentual, pero eso no vuelve al producto inmóvil.
    const desdeCero = [
      row('2026-06-01', 93.36),
      { ...row('2026-07-01', 93.36), super95: 0 },
      row('2026-08-01', 88.67),
    ]
    expect(lastChange(desdeCero, 'super95')).toMatchObject({
      from: '2026-07-01',
      before: 93.36,
      after: 0,
    })
  })
})

describe('yearAgo', () => {
  it('trae la fila vigente doce meses antes', () => {
    const many = [row('2025-09-01', 78.2), row('2025-10-01', 78.2), ...rows]
    expect(yearAgo(many, '2026-09-01')?.from).toBe('2025-09-01')
    expect(yearAgo(rows, '2026-09-01')).toBeNull()
  })
})

describe('buildFuelFaq', () => {
  const faq = buildFuelFaq(rows[3]!, rows[2]!, rows)
  it('arma al menos seis preguntas con id, pregunta y respuesta', () => {
    expect(faq.length).toBeGreaterThanOrEqual(6)
    for (const f of faq) {
      expect(f.id).toMatch(/^[a-z0-9-]+$/)
      expect(f.question.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(40)
    }
  })
  it('las respuestas llevan los números vigentes', () => {
    expect(faq.map(f => f.answer).join(' ')).toContain('$ 88,67')
    expect(faq.map(f => f.answer).join(' ')).toContain('setiembre de 2026')
  })
  it('sin vigencia anterior escribe respuestas enteras, sin undefined ni huecos', () => {
    const sinPrevia = buildFuelFaq(rows[3]!, null, rows)
    expect(sinPrevia.length).toBeGreaterThanOrEqual(6)
    for (const f of sinPrevia) {
      expect(f.answer.length).toBeGreaterThan(40)
      expect(f.answer, f.id).not.toMatch(/undefined|null|NaN/)
      // "el 1.º de ." y "vale  el litro": los agujeros que deja interpolar una cadena vacía.
      expect(f.answer, f.id).not.toMatch(/\bde\s*[.,]/)
      expect(f.answer, f.id).not.toMatch(/ {2,}/)
    }
    expect(sinPrevia.map(f => f.answer).join(' ')).toContain('setiembre de 2026')
  })
  it('sin vigencia legible no promete una fecha que no tiene', () => {
    const huerfana = buildFuelFaq({ ...rows[3]!, from: '' }, null, [])
    for (const f of huerfana) {
      expect(f.answer.length).toBeGreaterThan(40)
      expect(f.answer, f.id).not.toMatch(/undefined|null|NaN/)
      expect(f.answer, f.id).not.toMatch(/\bde\s*[.,]/)
      expect(f.answer, f.id).not.toMatch(/ {2,}/)
    }
  })
})

describe('catálogo', () => {
  it('seis productos con unidad', () => {
    expect(FUEL_PRODUCTS.map(p => p.key)).toEqual([
      'super95',
      'premium97',
      'gasoil50s',
      'gasoil10s',
      'queroseno',
      'supergas',
    ])
    expect(FUEL_PRODUCTS.find(p => p.key === 'supergas')?.unit).toBe('kg')
  })
  it('fuentes https y fecha de verificación ISO', () => {
    expect(FUEL_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of FUEL_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    expect(FUEL_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(FUEL_HOW_IT_WORKS.length).toBeGreaterThanOrEqual(4)
  })
})
