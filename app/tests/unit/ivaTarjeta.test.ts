// The point of this suite is that the page's headline percentages are not ours.
//
// DGI confirms 7,38 % for the nine-point extension through April 30, 2027.
// `ivaDiscountOnTicket` derives those from the raw percentage points and the IVA rate. If the
// derivation ever stopped landing on DGI's own numbers, either the formula or the rate on the page
// would be wrong — and the page would be publishing an invented figure, which is the one thing this
// site does not do.

import { describe, expect, it } from 'vitest'

import {
  IVA_NINE_POINTS_LAST_DAY,
  IVA_NON_RESIDENT,
  IVA_REGIMES,
  IVA_GASTRONOMIA_PERIOD,
  IVA_GASTRONOMIA_VERIFIED_AT,
  IVA_TARJETA_FAQ,
  IVA_TARJETA_SOURCES,
  IVA_TARJETA_VERIFIED_AT,
  IVA_TASA_BASICA,
  IVA_TASA_MINIMA,
  IVA_TICKET_CHECKS,
  ivaDiscountOnTicket,
  ivaSavingOnTotal,
} from '../../utils/ivaTarjeta'

describe('the discount on the ticket reproduces what DGI publishes', () => {
  it('reproduces the published percentage of the current extension', () => {
    const row = IVA_GASTRONOMIA_PERIOD
    expect(ivaDiscountOnTicket(row.points)).toBeCloseTo(row.dgiPublishedPct, 2)
  })

  it('gives 1,64 % for the two points of Ley 19.210 on the basic rate', () => {
    // The figure the site already quotes in utils/financingData.ts. Same formula, same answer.
    expect(ivaDiscountOnTicket(2, IVA_TASA_BASICA)).toBeCloseTo(1.64, 2)
  })

  it('applies to the minimum rate too, where the same points are worth more', () => {
    // Decreto 203/014 reduces "la tasa básica o mínima", and 2 of 110 beats 2 of 122.
    expect(ivaDiscountOnTicket(2, IVA_TASA_MINIMA)).toBeGreaterThan(
      ivaDiscountOnTicket(2, IVA_TASA_BASICA)
    )
    expect(ivaDiscountOnTicket(2, IVA_TASA_MINIMA)).toBeCloseTo(1.82, 2)
  })

  it('never treats points as a straight percentage off the price', () => {
    // The whole misconception the page exists to correct: 9 points is not 9 % off.
    expect(ivaDiscountOnTicket(9)).toBeLessThan(9)
  })

  it('refuses nonsense inputs instead of returning a negative discount', () => {
    expect(ivaDiscountOnTicket(0)).toBe(0)
    expect(ivaDiscountOnTicket(-3)).toBe(0)
    // More points than the rate itself would mean a negative IVA.
    expect(ivaDiscountOnTicket(30, IVA_TASA_BASICA)).toBe(0)
    expect(ivaDiscountOnTicket(9, 0)).toBe(0)
  })
})

describe('the saving in pesos', () => {
  it('is the discount applied to the total', () => {
    expect(ivaSavingOnTotal(1000, 9)).toBeCloseTo(73.77, 2)
    expect(ivaSavingOnTotal(1000, 5)).toBeCloseTo(40.98, 2)
  })

  it('backs the "casi $ 58" the ticket-check copy claims', () => {
    const gap = ivaSavingOnTotal(1000, 9) - ivaSavingOnTotal(1000, 2)
    expect(gap).toBeGreaterThan(57)
    expect(gap).toBeLessThan(58)
  })

  it('is zero for a total that is not a positive number', () => {
    expect(ivaSavingOnTotal(0, 9)).toBe(0)
    expect(ivaSavingOnTotal(-100, 9)).toBe(0)
    expect(ivaSavingOnTotal(Number.NaN, 9)).toBe(0)
  })
})

describe('the two regimes stay distinguishable', () => {
  it('has exactly the two the page describes', () => {
    expect(IVA_REGIMES.map(r => r.id)).toEqual(['general', 'gastronomia'])
  })

  it('keeps gastronomía the bigger of the two', () => {
    const general = IVA_REGIMES.find(r => r.id === 'general')!
    const gastro = IVA_REGIMES.find(r => r.id === 'gastronomia')!
    expect(general.points).toBe(2)
    expect(gastro.points).toBe(9)
    expect(gastro.points).toBeGreaterThan(general.points)
  })

  it('says which payment means are excluded, for both', () => {
    // Half the confusion is about what does NOT qualify, so the field is not optional in practice.
    for (const regime of IVA_REGIMES) {
      expect(regime.excluded.length).toBeGreaterThan(20)
      expect(regime.norm).toMatch(/Ley|Decreto/)
    }
  })
})

describe('the confirmed gastronomía extension', () => {
  it('covers October without inventing a new five-point period', () => {
    expect(IVA_GASTRONOMIA_PERIOD.from).toBe('2026-10-01')
    expect(IVA_GASTRONOMIA_PERIOD.through).toBe('2027-04-30')
    expect(IVA_GASTRONOMIA_PERIOD.through).toBe(IVA_NINE_POINTS_LAST_DAY)
    expect(IVA_GASTRONOMIA_PERIOD.points).toBe(9)
    expect(IVA_GASTRONOMIA_PERIOD.decree).toBe('235/026')
  })

  it('keeps the displayed regime aligned with the confirmed period', () => {
    expect(IVA_GASTRONOMIA_PERIOD.points).toBe(
      IVA_REGIMES.find(r => r.id === 'gastronomia')!.points
    )
    expect(IVA_GASTRONOMIA_VERIFIED_AT > IVA_GASTRONOMIA_PERIOD.from).toBe(true)
    expect(IVA_GASTRONOMIA_VERIFIED_AT <= IVA_NINE_POINTS_LAST_DAY).toBe(true)
  })
})

describe('the non-resident block distinguishes the general extension', () => {
  it('does not label the dated nine-point extension as a permanent benefit', () => {
    const statuses = IVA_NON_RESIDENT.map(i => i.status)
    expect(statuses.filter(s => s === 'vigente-hasta')).toHaveLength(1)
    expect(statuses.filter(s => s === 'vigente')).toHaveLength(2)
    const dated = IVA_NON_RESIDENT.find(i => i.status === 'vigente-hasta')!
    expect(dated.detail).toContain(IVA_GASTRONOMIA_PERIOD.decree)
  })
})

describe('sourcing', () => {
  it('cites only official Uruguayan publishers', () => {
    // impo.com.uy for the norms, gub.uy for what the agencies publish. Nothing else counts here.
    for (const source of IVA_TARJETA_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('has no duplicate source URLs', () => {
    const urls = IVA_TARJETA_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('backs each of the two regimes with its own norm in the source list', () => {
    const urls = IVA_TARJETA_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('17934')
    expect(urls).toContain('203-2014')
    expect(urls).toContain('235-2026')
  })

  it('carries a verification date', () => {
    expect(IVA_TARJETA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(IVA_TARJETA_VERIFIED_AT))).toBe(false)
  })
})

describe('the FAQ', () => {
  it('answers every question it asks', () => {
    expect(IVA_TARJETA_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const item of IVA_TARJETA_FAQ) {
      expect(item.question.endsWith('?')).toBe(true)
      expect(item.answer.length).toBeGreaterThan(80)
    }
  })

  it('asks no question twice', () => {
    const questions = IVA_TARJETA_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})

describe('the ticket checks', () => {
  it('leads with the mismatch the MEF calls out', () => {
    expect(IVA_TICKET_CHECKS[0]!.id).toBe('dos-en-vez-de-nueve')
  })

  it('says why each check matters, with unique ids', () => {
    const ids = IVA_TICKET_CHECKS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const check of IVA_TICKET_CHECKS) expect(check.why.length).toBeGreaterThan(40)
  })
})
