import { describe, expect, it } from 'vitest'
import {
  GUARANTEE_ROUTES,
  matchRentRoutes,
  routeById,
  type ClearingMatchInput,
} from '../../utils/rentClearing'

// The persona that motivated the page: never rented, in the clearing for an
// unpaid Movistar (telecom) bill, formal income, unsure about a guarantor,
// could put up a month or two, open to a direct owner.
const persona: ClearingMatchInput = {
  debt: 'telco-servicios',
  income: 'formal',
  guarantor: 'no-se',
  advance: 'poco',
  directOwner: 'no-se',
}

const fitOf = (res: ReturnType<typeof matchRentRoutes>, id: string) =>
  res.find(r => r.route.id === id)!.fit

describe('matchRentRoutes - static clearing verdicts', () => {
  it('marks the rental insurance as excluding the clearing', () => {
    expect(routeById('seguro')!.checksClearing).toBe('excluyente')
  })

  it('marks the state FGA as tolerant', () => {
    expect(routeById('fga')!.checksClearing).toBe('tolerante')
  })

  it('marks ANDA as evaluating without publishing whether it queries the clearing', () => {
    expect(routeById('anda')!.checksClearing).toBe('evalua-no-publica')
  })

  it('marks the deposit, no-guarantee regime, guarantor and direct owner as not checking your clearing', () => {
    for (const id of ['deposito', 'sin-garantia', 'garante', 'dueno-directo'] as const) {
      expect(routeById(id)!.checksClearing).toBe('no-mira-tu-clearing')
    }
  })
})

describe('matchRentRoutes - ranking', () => {
  it('always returns every route exactly once', () => {
    const res = matchRentRoutes(persona)
    expect(res).toHaveLength(GUARANTEE_ROUTES.length)
    expect(new Set(res.map(r => r.route.id)).size).toBe(GUARANTEE_ROUTES.length)
  })

  it('is deterministic (same input, same order)', () => {
    const a = matchRentRoutes(persona).map(r => r.route.id)
    const b = matchRentRoutes(persona).map(r => r.route.id)
    expect(a).toEqual(b)
  })

  it('is sorted by fit, best first', () => {
    const order = ['alta', 'media', 'baja', 'descartada']
    const res = matchRentRoutes(persona)
    const idxs = res.map(r => order.indexOf(r.fit))
    expect(idxs).toEqual([...idxs].sort((x, y) => x - y))
  })

  it('never recommends the rental insurance while in the clearing', () => {
    // Even with the strongest possible profile, seguro stays descartada.
    const strong: ClearingMatchInput = {
      debt: 'telco-servicios',
      income: 'formal',
      guarantor: 'si',
      advance: 'varios',
      directOwner: 'si',
    }
    expect(fitOf(matchRentRoutes(strong), 'seguro')).toBe('descartada')
    expect(matchRentRoutes(strong).at(-1)!.route.id).toBe('seguro')
  })
})

describe('matchRentRoutes - the FGA credit gate', () => {
  it('is a strong fit for a telco debtor with formal income', () => {
    expect(fitOf(matchRentRoutes(persona), 'fga')).toBe('alta')
  })

  it('drops to descartada without formal income (needs 15-100 UR formal)', () => {
    expect(fitOf(matchRentRoutes({ ...persona, income: 'informal' }), 'fga')).toBe('descartada')
    expect(fitOf(matchRentRoutes({ ...persona, income: 'ninguno' }), 'fga')).toBe('descartada')
  })

  it('is only medium for a bank/financial debt (possible BCU 4/5 bar)', () => {
    expect(fitOf(matchRentRoutes({ ...persona, debt: 'banco-financiera' }), 'fga')).toBe('media')
    expect(fitOf(matchRentRoutes({ ...persona, debt: 'no-se' }), 'fga')).toBe('media')
  })
})

describe('matchRentRoutes - clearing-agnostic routes react to the inputs', () => {
  it('deposit gets stronger the more you can advance', () => {
    expect(fitOf(matchRentRoutes({ ...persona, advance: 'varios' }), 'deposito')).toBe('alta')
    expect(fitOf(matchRentRoutes({ ...persona, advance: 'poco' }), 'deposito')).toBe('media')
    expect(fitOf(matchRentRoutes({ ...persona, advance: 'no' }), 'deposito')).toBe('baja')
  })

  it('a clean guarantor makes the garante route a strong fit', () => {
    expect(fitOf(matchRentRoutes({ ...persona, guarantor: 'si' }), 'garante')).toBe('alta')
    expect(fitOf(matchRentRoutes({ ...persona, guarantor: 'no' }), 'garante')).toBe('baja')
  })

  it('the direct-owner route weakens if you insist on an agency', () => {
    expect(fitOf(matchRentRoutes({ ...persona, directOwner: 'no' }), 'dueno-directo')).toBe('baja')
    expect(fitOf(matchRentRoutes({ ...persona, directOwner: 'si' }), 'dueno-directo')).toBe('alta')
  })

  it('for the persona, the top route is one that does not check the clearing', () => {
    const top = matchRentRoutes(persona)[0]!
    expect(['no-mira-tu-clearing', 'tolerante']).toContain(top.route.checksClearing)
  })
})
