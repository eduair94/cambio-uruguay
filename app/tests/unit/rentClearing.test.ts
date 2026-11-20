import { describe, expect, it } from 'vitest'
import {
  GUARANTEE_ROUTES,
  INSURER_STANCES,
  RENT_CLEARING_SOURCES,
  clearingAnswerGroups,
  matchRentRoutes,
  routeById,
  type ClearingMatchInput,
} from '../../utils/rentClearing'

// The persona that motivated the page: never rented, in the clearing for an
// unpaid Movistar (telecom) bill, formal income, unsure about a guarantor,
// could put up a month or two, open to a direct owner, and unsure whether the
// Contaduría guarantee applies to them.
const persona: ClearingMatchInput = {
  debt: 'telco-servicios',
  income: 'formal',
  guarantor: 'no-se',
  advance: 'poco',
  directOwner: 'no-se',
  cgn: 'no-se',
}

const fitOf = (res: ReturnType<typeof matchRentRoutes>, id: string) =>
  res.find(r => r.route.id === id)!.fit

const SOURCE_URLS = new Set(RENT_CLEARING_SOURCES.map(s => s.url))

describe('matchRentRoutes - static clearing verdicts', () => {
  it('marks the rental insurance as excluding the clearing', () => {
    expect(routeById('seguro')!.checksClearing).toBe('excluyente')
  })

  it('marks the state FGA as tolerant', () => {
    expect(routeById('fga')!.checksClearing).toBe('tolerante')
  })

  it('marks ANDA and FIDECIU as admitting people in the clearing, subject to approval', () => {
    expect(routeById('anda')!.checksClearing).toBe('admite-con-aprobacion')
    expect(routeById('fideciu')!.checksClearing).toBe('admite-con-aprobacion')
  })

  it('quotes what ANDA and FIDECIU publish, word for word', () => {
    expect(routeById('anda')!.forClearing).toContain(
      'Personas registradas en Clearing de Informes pueden acceder al servicio'
    )
    expect(routeById('fideciu')!.forClearing).toContain('no excluyente, se analiza cada caso')
  })

  it('marks the Contaduría as the guarantee the law forbids denying (Ley 20.212 art. 631)', () => {
    expect(routeById('cgn')!.checksClearing).toBe('ley-impide-negar')
    expect(routeById('cgn')!.forClearing).toContain('631')
  })

  it('marks the deposit, no-guarantee regime, guarantor and direct owner as not checking your clearing', () => {
    for (const id of ['deposito', 'sin-garantia', 'garante', 'dueno-directo'] as const) {
      expect(routeById(id)!.checksClearing).toBe('no-mira-tu-clearing')
    }
  })
})

describe('the route catalogue', () => {
  it('has nine routes with unique ids, in the published order', () => {
    expect(GUARANTEE_ROUTES.map(r => r.id)).toEqual([
      'deposito',
      'sin-garantia',
      'cgn',
      'fga',
      'garante',
      'dueno-directo',
      'anda',
      'fideciu',
      'seguro',
    ])
  })

  it('every defined source is https and listed in the sources block', () => {
    for (const route of GUARANTEE_ROUTES) {
      if (!route.sourceUrl) continue
      expect(route.sourceUrl).toMatch(/^https:\/\//)
      expect(SOURCE_URLS.has(route.sourceUrl), route.id).toBe(true)
    }
  })

  it('the garante and dueño directo routes claim no official source (they are market practice)', () => {
    expect(routeById('garante')!.sourceUrl).toBeUndefined()
    expect(routeById('dueno-directo')!.sourceUrl).toBeUndefined()
  })

  it('every route has a one-line verdict for the short answer', () => {
    for (const route of GUARANTEE_ROUTES) expect(route.verdictLine.length).toBeGreaterThan(20)
  })
})

describe('clearingAnswerGroups', () => {
  it('splits every route into exactly one of the three answers', () => {
    const groups = clearingAnswerGroups()
    const ids = groups.flatMap(g => g.routes.map(r => r.id))
    expect(ids.sort()).toEqual(GUARANTEE_ROUTES.map(r => r.id).sort())
  })

  it('puts the doors that publish they accept you in the middle group', () => {
    const [ignore, accept, reject] = clearingAnswerGroups()
    expect(ignore!.routes.map(r => r.id)).toEqual([
      'deposito',
      'sin-garantia',
      'garante',
      'dueno-directo',
    ])
    expect(accept!.routes.map(r => r.id)).toEqual(['cgn', 'fga', 'anda', 'fideciu'])
    expect(reject!.routes.map(r => r.id)).toEqual(['seguro'])
  })
})

describe('INSURER_STANCES', () => {
  it('lists the seven insurers read, with unique ids', () => {
    expect(INSURER_STANCES).toHaveLength(7)
    expect(new Set(INSURER_STANCES.map(i => i.id)).size).toBe(7)
  })

  it('only Porto Seguro publishes the clearing as excluyente', () => {
    const rejecting = INSURER_STANCES.filter(i => i.verdict === 'rechaza')
    expect(rejecting.map(i => i.name)).toEqual(['Porto Seguro'])
  })

  it('every insurer source is https and listed in the sources block', () => {
    for (const insurer of INSURER_STANCES) {
      expect(insurer.sourceUrl).toMatch(/^https:\/\//)
      expect(SOURCE_URLS.has(insurer.sourceUrl), insurer.id).toBe(true)
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
      cgn: 'si',
    }
    expect(fitOf(matchRentRoutes(strong), 'seguro')).toBe('descartada')
    expect(matchRentRoutes(strong).at(-1)!.route.id).toBe('seguro')
    expect(matchRentRoutes(persona).at(-1)!.route.id).toBe('seguro')
  })
})

describe('matchRentRoutes - the Contaduría and the FGA', () => {
  it('a public employee or retiree gets the Contaduría as a strong fit and the FGA ruled out', () => {
    const res = matchRentRoutes({ ...persona, cgn: 'si' })
    expect(fitOf(res, 'cgn')).toBe('alta')
    expect(fitOf(res, 'fga')).toBe('descartada')
  })

  it('someone outside the Contaduría keeps the FGA', () => {
    const res = matchRentRoutes({ ...persona, cgn: 'no' })
    expect(fitOf(res, 'cgn')).toBe('descartada')
    expect(fitOf(res, 'fga')).toBe('alta')
  })

  it('an unsure persona sees the Contaduría as possible', () => {
    expect(fitOf(matchRentRoutes(persona), 'cgn')).toBe('media')
  })

  // The short answer at the top lists the Contaduría among "te aceptan": without
  // naming who can use it, a private-sector tenant reads it as their door.
  it('the Contaduría verdict line names who can use it', () => {
    const line = routeById('cgn')!.verdictLine
    expect(line).toContain('funcionario público')
    expect(line).toContain('jubilado')
    expect(line).toContain('SGA')
  })

  // A retiree who leaves the sixth question at "no sé" must still be told the
  // FGA excludes them, in both FGA branches that can rank it as a door.
  it('an unsure persona gets an FGA reason that warns about the Contaduría', () => {
    const reasonOf = (input: typeof persona) =>
      matchRentRoutes(input).find(r => r.route.id === 'fga')!.reason
    expect(persona.cgn).toBe('no-se')
    expect(reasonOf(persona)).toContain('Contaduría')
    expect(reasonOf({ ...persona, debt: 'banco-financiera' })).toContain('Contaduría')
    expect(reasonOf({ ...persona, cgn: 'no' })).not.toContain('Contaduría')
  })

  it('the FGA is a strong fit for a telco debtor with formal income', () => {
    expect(fitOf(matchRentRoutes(persona), 'fga')).toBe('alta')
  })

  it('the FGA drops to descartada without formal income (needs 15-100 UR formal)', () => {
    expect(fitOf(matchRentRoutes({ ...persona, income: 'informal' }), 'fga')).toBe('descartada')
    expect(fitOf(matchRentRoutes({ ...persona, income: 'ninguno' }), 'fga')).toBe('descartada')
  })

  it('the FGA is only medium for a bank/financial debt (possible BCU 4/5 bar)', () => {
    expect(fitOf(matchRentRoutes({ ...persona, debt: 'banco-financiera' }), 'fga')).toBe('media')
    expect(fitOf(matchRentRoutes({ ...persona, debt: 'no-se' }), 'fga')).toBe('media')
  })
})

describe('matchRentRoutes - ANDA and FIDECIU stop at "Posible"', () => {
  for (const id of ['anda', 'fideciu'] as const) {
    it(`${id}: formal media, informal baja, ninguno descartada`, () => {
      expect(fitOf(matchRentRoutes({ ...persona, income: 'formal' }), id)).toBe('media')
      expect(fitOf(matchRentRoutes({ ...persona, income: 'informal' }), id)).toBe('baja')
      expect(fitOf(matchRentRoutes({ ...persona, income: 'ninguno' }), id)).toBe('descartada')
    })
  }
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
