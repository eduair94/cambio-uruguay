import { describe, expect, it } from 'vitest'
import {
  equiparPlan,
  equiparUnitPrice,
  type EquiparBand,
  type EquiparItemDoc,
  type EquiparTier,
} from '../../utils/equipar'

const band = (median: number, n = 12): EquiparBand => ({
  p25: Math.round(median * 0.8),
  median,
  p75: Math.round(median * 1.25),
  min: Math.round(median * 0.6),
  n,
})

/** `rank` mirrors the backend registry order, which is what the tier table prints. */
const RANKS: Record<string, number> = {
  heladera: 0,
  colchon: 1,
  lavarropas: 2,
  calefon: 4,
  olla: 11,
  tv: 6,
  impresora: 37,
}

function item(
  category: string,
  tier: EquiparTier,
  newMedian: number | null,
  usedMedian: number | null = null,
  extra: Partial<EquiparItemDoc> = {}
): EquiparItemDoc {
  return {
    key: `${category}:base`,
    category,
    categoryLabel: category,
    variant: 'base',
    variantLabel: 'base',
    room: 'cocina',
    tier,
    rank: RANKS[category] ?? 99,
    regime: 'commodity',
    reason: 'porque sí',
    usedOk: true,
    quantity: 1,
    newBand: newMedian === null ? null : band(newMedian),
    usedBand: usedMedian === null ? null : band(usedMedian),
    usedSavingPct: null,
    products: [],
    offers: [],
    suspectDropped: 0,
    observedAt: '2026-09-10T00:00:00.000Z',
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-10',
    ...extra,
  }
}

describe('precio unitario', () => {
  it('toma el usado cuando el lector lo acepta y la categoría lo tolera', () => {
    expect(equiparUnitPrice(item('heladera', 'S', 30_000, 12_000), true)).toEqual({
      priceUyu: 12_000,
      condition: 'used',
    })
  })

  it('no ofrece usado donde la categoría dice que no', () => {
    // El colchón es la única excepción del catálogo, y viene marcada desde el backend.
    const colchon = item('colchon', 'S', 20_000, 6_000, { usedOk: false })
    expect(equiparUnitPrice(colchon, true)).toEqual({
      priceUyu: band(20_000).p25,
      condition: 'new',
    })
  })

  it('devuelve null cuando no hay ningún precio', () => {
    expect(equiparUnitPrice(item('olla', 'S', null, null), true)).toBeNull()
  })
})

describe('hasta dónde llega la plata', () => {
  const items = [
    item('heladera', 'S', 30_000, 12_000),
    item('colchon', 'S', 20_000, 6_000, { usedOk: false }),
    item('olla', 'S', 2_000, 900, { quantity: 2 }),
    item('lavarropas', 'A', 40_000, 15_000),
    item('tv', 'B', 25_000, 9_000),
  ]

  it('compra en el mismo orden que publica la tabla, no por precio', () => {
    // Ni el más barato primero ni el más caro primero: los dos eligen en silencio a qué
    // imprescindible sacrificar. Con el rango publicado, el plan se lee directo de la tabla.
    const plan = equiparPlan({ items, budgetUyu: 1_000_000, acceptUsed: true })
    expect(plan.lines.map(line => line.item.category)).toEqual([
      'heladera',
      'colchon',
      'olla',
      'lavarropas',
      'tv',
    ])
    // El tier S entero va antes que el tier A, aunque el lavarropas usado sea más barato que el
    // colchón nuevo.
    const order = plan.lines.map(line => line.item.tier)
    expect(order.indexOf('A')).toBeGreaterThan(order.lastIndexOf('S'))
  })

  it('dice dónde se corta la plata', () => {
    // Con $20.000 y aceptando usado: heladera $12.000 entra y deja $8.000; el colchón nuevo
    // ($16.000, porque usado no se recomienda) no entra. Ahí se corta.
    const plan = equiparPlan({ items, budgetUyu: 20_000, acceptUsed: true })
    const afforded = plan.lines.filter(line => line.afforded).map(line => line.item.category)
    expect(afforded).toContain('heladera')
    expect(afforded).not.toContain('colchon')
    expect(plan.cutAt?.item.category).toBe('colchon')
    expect(plan.missingUyu).toBeGreaterThan(0)
  })

  it('multiplica por la cantidad que hace falta comprar', () => {
    const plan = equiparPlan({ items, budgetUyu: 500_000, acceptUsed: false })
    const ollas = plan.lines.find(line => line.item.category === 'olla')!
    expect(ollas.quantity).toBe(2)
    expect(ollas.totalUyu).toBe(ollas.unitPriceUyu * 2)
  })

  it('descuenta lo que el lector ya tiene', () => {
    const plan = equiparPlan({
      items,
      budgetUyu: 500_000,
      acceptUsed: true,
      owned: new Set(['heladera']),
    })
    expect(plan.lines.some(line => line.item.category === 'heladera')).toBe(false)
  })

  it('con presupuesto de sobra no corta en ningún lado', () => {
    const plan = equiparPlan({ items, budgetUyu: 1_000_000, acceptUsed: false })
    expect(plan.cutAt).toBeNull()
    expect(plan.missingUyu).toBe(0)
    expect(plan.leftoverUyu).toBeGreaterThan(0)
  })

  it('deja el tier C afuera salvo que se lo pidan', () => {
    const withC = [...items, item('impresora', 'C', 5_000, 2_000)]
    const byDefault = equiparPlan({ items: withC, budgetUyu: 1_000_000, acceptUsed: false })
    expect(byDefault.lines.some(line => line.item.category === 'impresora')).toBe(false)

    const everything = equiparPlan({
      items: withC,
      budgetUyu: 1_000_000,
      acceptUsed: false,
      tiers: ['S', 'A', 'B', 'C'],
    })
    expect(everything.lines.some(line => line.item.category === 'impresora')).toBe(true)
  })

  it('ignora las categorías sin precio en vez de contarlas como gratis', () => {
    const plan = equiparPlan({
      items: [...items, item('calefon', 'S', null, null)],
      budgetUyu: 1_000_000,
      acceptUsed: false,
    })
    expect(plan.lines.some(line => line.item.category === 'calefon')).toBe(false)
  })
})
