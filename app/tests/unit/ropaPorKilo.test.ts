import { describe, expect, it } from 'vitest'
import { getCourier } from '../../utils/courierShipping'
import {
  channelFeeUyu,
  cheapestCourierFor,
  CONSIGNMENT_KEEP_PCT,
  courierBale,
  DEFAULT_SELLABLE_PCT,
  LOCAL_LOTS,
  lotEconomics,
  minPriceFor,
  mlFixedFeeUyu,
  perGarmentUyu,
  REGION_2024,
  ROPA_SOURCES,
  ROPA_UNPUBLISHED,
  TOP_EXPORTERS_2024,
  UNSELLABLE_EVIDENCE,
  URUGUAY_IMPORTS,
  US_EXPORT_USD_PER_KG_2024,
  usdPerKg,
  VOPERO_EXAMPLES,
  WORLD_BY_YEAR,
} from '../../utils/ropaPorKilo'

describe('las estadísticas de comercio', () => {
  it('derivan el precio por kilo en vez de escribirlo', () => {
    // BACI 2024: el mundo exportó ropa usada a US$ 0,91 el kilo y EE.UU. a US$ 1,22.
    expect(usdPerKg(WORLD_BY_YEAR[2]!)!).toBeCloseTo(0.913, 2)
    expect(US_EXPORT_USD_PER_KG_2024).toBeCloseTo(1.222, 2)
    expect(usdPerKg({ valueUsd: 10, tonnes: 0 })).toBeNull()
  })

  it('pone a Uruguay donde está: tres órdenes de magnitud debajo de Chile', () => {
    const chile = REGION_2024.find(r => r.label === 'Chile')!
    const uruguay = REGION_2024.find(r => r.label === 'Uruguay')!
    expect(chile.tonnes / uruguay.tonnes).toBeGreaterThan(200)
    // El año de la región es el mismo que el último de la serie uruguaya de BACI.
    expect(URUGUAY_IMPORTS.baci.at(-1)!.tonnes).toBe(uruguay.tonnes)
  })

  it('publica las dos cifras de Uruguay, que no coinciden, con su nombre', () => {
    expect(URUGUAY_IMPORTS.declared2024.label).toContain('declarado')
    expect(URUGUAY_IMPORTS.declared2024.tonnes).toBeLessThan(URUGUAY_IMPORTS.baci.at(-1)!.tonnes)
  })

  it('ordena los exportadores por valor', () => {
    const values = TOP_EXPORTERS_2024.map(r => r.valueUsd)
    expect([...values].sort((a, b) => b - a)).toEqual(values)
  })
})

describe('los lotes locales', () => {
  it('derivan el costo por prenda', () => {
    const ml = LOCAL_LOTS.find(l => l.id === 'ml-100-usadas')!
    expect(perGarmentUyu(ml)).toBe(120)
    expect(perGarmentUyu({ priceUyu: 100, garments: 0 })).toBe(0)
  })

  it('cada lote cita una fuente que existe y una fecha ISO', () => {
    for (const lot of LOCAL_LOTS) {
      expect(ROPA_SOURCES[lot.source], lot.id).toBeDefined()
      expect(lot.seenOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(lot.garments).toBeGreaterThan(0)
    }
  })

  it('no repite ids', () => {
    const ids = LOCAL_LOTS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('lo que se queda cada canal', () => {
  it('la feria no cobra comisión (el puesto va en otros costos)', () => {
    expect(channelFeeUyu('feria', 300)).toBe(0)
  })

  it('Mercado Libre: el tope del 17 % más el cargo fijo de su tramo', () => {
    expect(mlFixedFeeUyu(499)).toBe(15)
    expect(mlFixedFeeUyu(500)).toBe(25)
    expect(mlFixedFeeUyu(999)).toBe(40)
    expect(mlFixedFeeUyu(1000)).toBe(0)
    expect(channelFeeUyu('mercadolibre', 400)).toBeCloseTo(68 + 15)
    expect(channelFeeUyu('mercadolibre', 0)).toBe(0)
  })

  it('consignación: 48 % más IVA deja 41,44 % a quien trae la prenda', () => {
    expect(CONSIGNMENT_KEEP_PCT).toBeCloseTo(41.44, 2)
    expect(channelFeeUyu('consignacion', 1000)).toBeCloseTo(585.6, 1)
  })

  it('Vopero paga una porción más chica cuanto más barata es la prenda', () => {
    const shares = VOPERO_EXAMPLES.map(e => e.sellerGetsUyu / e.saleUyu)
    expect([...shares].sort((a, b) => a - b)).toEqual(shares)
  })
})

describe('la cuenta de un lote', () => {
  const base = {
    lotCostUyu: 12_000,
    garments: 100,
    sellablePct: 60,
    avgPriceUyu: 250,
    channel: 'feria' as const,
    otherCostsUyu: 0,
  }

  it('las prendas que no se venden las pagan las que sí', () => {
    const r = lotEconomics(base)
    expect(r.sold).toBe(60)
    expect(r.revenueUyu).toBe(15_000)
    expect(r.profitUyu).toBe(3_000)
    expect(r.costPerGarmentUyu).toBe(120)
    expect(r.costPerSoldUyu).toBe(200)
    expect(r.marginPct).toBeCloseTo(20)
    expect(r.returnPct).toBeCloseTo(25)
    expect(r.breakEvenUnits).toBe(48)
    expect(r.breakEvenPriceUyu).toBeCloseTo(200)
  })

  it('con los otros costos, el punto de equilibrio sube', () => {
    const r = lotEconomics({ ...base, otherCostsUyu: 3_000 })
    expect(r.profitUyu).toBe(0)
    expect(r.breakEvenUnits).toBe(60)
    expect(r.breakEvenPriceUyu).toBeCloseTo(250)
  })

  it('en Mercado Libre el precio de equilibrio respeta el tramo del cargo fijo', () => {
    const r = lotEconomics({ ...base, channel: 'mercadolibre' })
    // 12.000 / 60 = 200 netos por prenda → (200 + 15) / 0,83 = 259,04, dentro del tramo < $ 500.
    expect(r.breakEvenPriceUyu!).toBeCloseTo(259.04, 1)
    const p = r.breakEvenPriceUyu!
    expect(p - channelFeeUyu('mercadolibre', p)).toBeCloseTo(200, 6)
  })

  it('cuando el neto cae en el borde de un tramo, sube al siguiente sin hueco', () => {
    // 400 netos por prenda: en el primer tramo haría falta 500 (fuera del tramo); en el segundo
    // (400 + 25) / 0,83 = 512,05.
    const p = minPriceFor('mercadolibre', 1, 400)!
    expect(p).toBeGreaterThanOrEqual(500)
    expect(p - channelFeeUyu('mercadolibre', p)).toBeCloseTo(400, 6)
    // Por encima de $ 1.000 no hay cargo fijo.
    const high = minPriceFor('mercadolibre', 1, 1000)!
    expect(high - channelFeeUyu('mercadolibre', high)).toBeCloseTo(1000, 6)
  })

  it('consignación: el mismo neto exige más del doble de precio', () => {
    const p = minPriceFor('consignacion', 1, 100)!
    expect(p).toBeCloseTo(100 / 0.4144, 1)
  })

  it('un precio que no cubre la comisión nunca llega al equilibrio', () => {
    // En Mercado Libre, una prenda de $ 15 se la come el cargo fijo.
    const r = lotEconomics({ ...base, channel: 'mercadolibre', avgPriceUyu: 15 })
    expect(r.breakEvenUnits).toBeNull()
    expect(r.profitUyu).toBeLessThan(-12_000)
  })

  it('no inventa con entradas absurdas', () => {
    const r = lotEconomics({ ...base, garments: -5, sellablePct: 250, avgPriceUyu: Number.NaN })
    expect(r.sold).toBe(0)
    expect(r.marginPct).toBeNull()
    expect(r.costPerSoldUyu).toBeNull()
    expect(r.breakEvenPriceUyu).toBeNull()
    expect(lotEconomics({ ...base, sellablePct: 250 }).sold).toBe(100)
  })

  it('el vendible por defecto está dentro del rango medido', () => {
    expect(DEFAULT_SELLABLE_PCT).toBeGreaterThanOrEqual(50)
    expect(DEFAULT_SELLABLE_PCT).toBeLessThanOrEqual(80)
    for (const e of UNSELLABLE_EVIDENCE) expect(ROPA_SOURCES[e.source]).toBeDefined()
  })
})

describe('un fardo por courier', () => {
  it('el courier más barato existe y no tiene cargos condicionales', () => {
    expect(cheapestCourierFor(20)).not.toBeNull()
  })

  it('el flete es casi todo el costo: la ropa es menos del 10 %', () => {
    const courier = cheapestCourierFor(20)!
    const r = courierBale({
      kg: 20,
      goodsUsdPerKg: US_EXPORT_USD_PER_KG_2024,
      courier,
      usdUyu: 40,
    })!
    expect(r.goodsUsd).toBeCloseTo(24.44, 1)
    // 60 % de US$ 24 son US$ 14,7: rige el mínimo de US$ 20 por envío.
    expect(r.taxUsd).toBe(20)
    expect(r.freightSharePct).toBeGreaterThan(80)
    expect(r.goodsUsd / r.totalUsd).toBeLessThan(0.1)
    expect(r.perKgUyu).toBeCloseTo(r.perKgUsd * 40, 6)
    expect(r.overWeight).toBe(false)
    expect(r.overValue).toBe(false)
  })

  it('el kilo traído por courier sale más caro que el kilo al público en Uruguay', () => {
    // Era Mío vende al público a $ 590–790 el kilo; el fardo puesto acá, al por mayor, cuesta más.
    const courier = cheapestCourierFor(20)!
    const r = courierBale({
      kg: 20,
      goodsUsdPerKg: US_EXPORT_USD_PER_KG_2024,
      courier,
      usdUyu: 40,
    })!
    expect(r.perKgUyu).toBeGreaterThan(590)
  })

  it('marca lo que se pasa de los topes de la prestación única', () => {
    const courier = cheapestCourierFor(25)!
    const r = courierBale({ kg: 25, goodsUsdPerKg: 40, courier, usdUyu: 40 })!
    expect(r.overWeight).toBe(true)
    expect(r.overValue).toBe(true)
  })

  it('sin kilos o sin tarifa no afirma nada', () => {
    const courier = cheapestCourierFor(20)!
    expect(courierBale({ kg: 0, goodsUsdPerKg: 1, courier, usdUyu: 40 })).toBeNull()
    expect(
      courierBale({
        kg: 10,
        goodsUsdPerKg: 1,
        courier: { ...getCourier('gripper'), perKgUsd: null },
        usdUyu: 40,
      })
    ).toBeNull()
  })
})

describe('las fuentes', () => {
  it('son todas https', () => {
    for (const [id, s] of Object.entries(ROPA_SOURCES)) expect(s.url, id).toMatch(/^https:\/\//)
  })

  it('declara lo que no publica', () => {
    expect(ROPA_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
  })
})
