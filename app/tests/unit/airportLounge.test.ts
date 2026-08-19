// app/tests/unit/airportLounge.test.ts
import { describe, expect, it } from 'vitest'

import {
  ACCESS_ROUTES,
  CHILD_FREE_UNDER,
  FAQS,
  GAPS,
  LOUNGES,
  LOUNGE_LAST_REVIEWED,
  LOUNGE_SOURCES,
  MAX_STAY_HOURS,
  NO_ACCESS,
  PRICEABLE_ROUTE_IDS,
  PROGRAM_LABEL,
  WALK_IN_USD,
  annualCost,
  costPerVisit,
  getLounge,
  getRoute,
  rankByCost,
  routesForLounge,
} from '../../utils/airportLounge'

describe('the data set is internally consistent', () => {
  it('has a unique id per route and per lounge', () => {
    const routeIds = ACCESS_ROUTES.map(r => r.id)
    expect(new Set(routeIds).size).toBe(routeIds.length)
    const loungeIds = LOUNGES.map(l => l.id)
    expect(new Set(loungeIds).size).toBe(loungeIds.length)
  })

  it('points every route at lounges that exist', () => {
    for (const route of ACCESS_ROUTES) {
      expect(route.lounges.length, route.id).toBeGreaterThan(0)
      for (const id of route.lounges) expect(getLounge(id), `${route.id} -> ${id}`).toBeDefined()
    }
  })

  it('labels every program it uses', () => {
    for (const route of ACCESS_ROUTES) expect(PROGRAM_LABEL[route.program]).toBeTruthy()
  })

  it('cites at least one source per route and per lounge', () => {
    for (const route of ACCESS_ROUTES) {
      expect(route.sources.length, route.id).toBeGreaterThan(0)
      for (const src of route.sources) expect(src.url).toMatch(/^https:\/\//)
    }
    for (const lounge of LOUNGES) expect(lounge.sources.length, lounge.id).toBeGreaterThan(0)
    for (const src of LOUNGE_SOURCES) expect(src.url).toMatch(/^https:\/\//)
  })

  it('keeps the review date in ISO form', () => {
    expect(LOUNGE_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('ships the editorial blocks the page renders', () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(8)
    expect(GAPS.length).toBeGreaterThanOrEqual(5)
    expect(NO_ACCESS.length).toBeGreaterThanOrEqual(3)
    for (const faq of FAQS) expect(faq.a.length).toBeGreaterThan(40)
  })
})

describe('the facts that decide the recommendation', () => {
  it("keeps Itaú's preferential access at US$ 10, the cheapest published route", () => {
    const itau = ['itau-visa-platinum', 'itau-visa-infinite', 'itau-mastercard-black']
    for (const id of itau) expect(getRoute(id)?.extraUsd, id).toBe(10)

    // Nobody else publishes a per-access tariff below the door price.
    const cheaper = ACCESS_ROUTES.filter(
      r => r.extraUsd !== null && r.extraUsd > 0 && r.extraUsd < 10
    )
    expect(cheaper).toHaveLength(0)
  })

  it('prices the socio discount at 20 % of the door price', () => {
    expect(getRoute('club-el-pais')?.extraUsd).toBe(Math.round(WALK_IN_USD * 0.8))
  })

  it('keeps the arrivals lounge out of the Priority Pass network', () => {
    const arrivals = routesForLounge('mvd-arribos')
    expect(arrivals.some(r => r.program === 'priority-pass')).toBe(false)
    // ...and keeps the one bank route that does cover it.
    expect(arrivals.map(r => r.id)).toContain('itau-cuenta-personal-bank')
  })

  it('publishes the same 3-hour cap and child rule on every lounge', () => {
    for (const lounge of LOUNGES) expect(lounge.maxStayHours).toBe(MAX_STAY_HOURS)
    expect(CHILD_FREE_UNDER).toBe(12)
  })

  it('flags the lounge that is under construction', () => {
    expect(getLounge('mvd-partidas')?.status).toMatch(/provisoria/i)
  })
})

describe('annualCost', () => {
  it('charges nothing while the free allowance lasts', () => {
    const brou = getRoute('brou-mastercard-black')!
    const cost = annualCost(brou, 6)
    expect(cost.total).toBe(0)
    expect(cost.unpricedVisits).toBe(0)
  })

  it('refuses to price a visit whose tariff nobody publishes', () => {
    const brou = getRoute('brou-mastercard-black')!
    const cost = annualCost(brou, 7)
    expect(cost.total).toBeNull()
    expect(cost.unpricedVisits).toBe(1)
  })

  it('walks the Itaú Infinite ladder: 4 free, 10 at US$ 10, then US$ 32', () => {
    const infinite = getRoute('itau-visa-infinite')!
    expect(annualCost(infinite, 4).total).toBe(0)
    expect(annualCost(infinite, 5).total).toBe(10)
    expect(annualCost(infinite, 14).total).toBe(100)
    expect(annualCost(infinite, 15).total).toBe(132)
  })

  it('charges the Platinum from the first visit but at the preferential rate', () => {
    const platinum = getRoute('itau-visa-platinum')!
    expect(annualCost(platinum, 1).total).toBe(10)
    expect(annualCost(platinum, 10).total).toBe(100)
    expect(annualCost(platinum, 11).total).toBe(100 + 32)
  })

  it('adds the Priority Pass membership to its per-visit fee', () => {
    const standard = getRoute('priority-pass-standard')!
    expect(annualCost(standard, 0).total).toBe(99)
    expect(annualCost(standard, 3).total).toBe(99 + 105)
    // Prestige is a flat fee no matter how many times you go in.
    const prestige = getRoute('priority-pass-prestige')!
    expect(annualCost(prestige, 1).total).toBe(469)
    expect(annualCost(prestige, 30).total).toBe(469)
  })

  it('charges guests where the guest fee is published and refuses where it is not', () => {
    const doorway = getRoute('compra-individual')!
    expect(annualCost(doorway, 2, 1).total).toBe(WALK_IN_USD * 4)

    const prestige = getRoute('priority-pass-prestige')!
    expect(annualCost(prestige, 2, 1).total).toBe(469 + 70)

    const santander = getRoute('santander-mastercard-black')!
    expect(annualCost(santander, 1, 1).total).toBeNull()
  })

  it('lets the unlimited operator membership carry guests for free', () => {
    const anual = getRoute('avc-anual')!
    expect(annualCost(anual, 10, 1).total).toBe(1750)
  })
})

describe('rankByCost', () => {
  it('puts the free allowance first, then the preferential tariff', () => {
    const [first] = rankByCost(1)
    expect(first?.route.id).toBe('itau-visa-infinite')
    expect(first?.cost.total).toBe(0)
    // Once the free accesses are gone, the US$ 10 tariff is what wins.
    const heavy = rankByCost(15)
    expect(heavy[0]?.route.id).toBe('itau-visa-infinite')
    expect(heavy.find(r => r.route.id === 'compra-individual')?.cost.total).toBe(15 * WALK_IN_USD)
  })

  it('beats the door price with Priority Pass Standard from the second visit', () => {
    const cost = (id: string, visits: number) => annualCost(getRoute(id)!, visits).total
    expect(cost('priority-pass-standard', 1)!).toBeGreaterThan(cost('compra-individual', 1)!)
    expect(cost('priority-pass-standard', 2)!).toBeLessThan(cost('compra-individual', 2)!)
  })

  it('never sorts an unpriceable route above a priced one', () => {
    const rows = rankByCost(20, 0, [...PRICEABLE_ROUTE_IDS, 'brou-mastercard-black'])
    const firstNull = rows.findIndex(r => r.cost.total === null)
    const lastNumber = rows
      .map(r => r.cost.total)
      .lastIndexOf(rows.filter(r => r.cost.total !== null).at(-1)?.cost.total ?? null)
    expect(firstNull).toBeGreaterThan(lastNumber - 1)
    expect(rows.at(-1)?.cost.total).toBeNull()
  })

  it('is monotonic: more visits never cost less', () => {
    for (const id of PRICEABLE_ROUTE_IDS) {
      const route = getRoute(id)!
      let previous = -1
      for (let visits = 0; visits <= 15; visits++) {
        const total = annualCost(route, visits).total
        if (total === null) continue
        expect(total, `${id} @ ${visits}`).toBeGreaterThanOrEqual(previous)
        previous = total
      }
    }
  })
})

describe('costPerVisit', () => {
  it('divides the year by the visits', () => {
    const cost = annualCost(getRoute('avc-personal')!, 12)
    expect(costPerVisit(cost, 12)).toBe(72)
  })

  it('returns null when there is nothing to divide', () => {
    expect(costPerVisit(annualCost(getRoute('compra-individual')!, 0), 0)).toBeNull()
    expect(costPerVisit(annualCost(getRoute('bbva-visa-infinite')!, 9), 9)).toBeNull()
  })
})
