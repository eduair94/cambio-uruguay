// The point of this suite is that the page's headline percentages are not ours.
//
// DGI publishes the discount on the ticket as 7,38 % today and 4,1 % from the 1st of October 2026.
// `ivaDiscountOnTicket` derives those from the raw percentage points and the IVA rate. If the
// derivation ever stopped landing on DGI's own numbers, either the formula or the rate on the page
// would be wrong — and the page would be publishing an invented figure, which is the one thing this
// site does not do.

import { describe, expect, it } from 'vitest'

import {
  IVA_NINE_POINTS_LAST_DAY,
  IVA_NON_RESIDENT,
  IVA_REGIMES,
  IVA_STEP_DOWN,
  IVA_STEP_DOWN_DATE,
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
  it.each(IVA_STEP_DOWN)('$points points is $dgiPublishedPct % of the total', row => {
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

describe('the October 2026 step-down', () => {
  it('goes down, never up', () => {
    expect(IVA_STEP_DOWN).toHaveLength(2)
    expect(IVA_STEP_DOWN[1]!.points).toBeLessThan(IVA_STEP_DOWN[0]!.points)
    expect(IVA_STEP_DOWN[1]!.dgiPublishedPct).toBeLessThan(IVA_STEP_DOWN[0]!.dgiPublishedPct)
  })

  it('starts the day after the last day of the nine-point extension', () => {
    // Decreto 83/026 runs to 30/9/2026; DGI puts the five points from 1/10/2026. No gap, no overlap.
    const lastDay = new Date(`${IVA_NINE_POINTS_LAST_DAY}T00:00:00Z`)
    const stepDown = new Date(`${IVA_STEP_DOWN_DATE}T00:00:00Z`)
    expect(stepDown.getTime() - lastDay.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('matches the points the gastronomía regime currently declares', () => {
    expect(IVA_STEP_DOWN[0]!.points).toBe(IVA_REGIMES.find(r => r.id === 'gastronomia')!.points)
  })
})

describe('the non-resident block never overstates what is in force', () => {
  it('marks the expired reintegro as unverified rather than dropping or asserting it', () => {
    const statuses = IVA_NON_RESIDENT.map(i => i.status)
    expect(statuses).toContain('sin-prorroga-verificada')
    expect(statuses.filter(s => s === 'vigente')).toHaveLength(2)
  })

  it('explains itself wherever it claims no prórroga was found', () => {
    for (const item of IVA_NON_RESIDENT.filter(i => i.status === 'sin-prorroga-verificada')) {
      expect(item.detail).toMatch(/Decreto/)
      expect(item.detail.length).toBeGreaterThan(80)
    }
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
    expect(urls).toContain('83-2026')
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
