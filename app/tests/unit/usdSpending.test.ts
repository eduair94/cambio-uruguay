import { describe, expect, it } from 'vitest'

import { DEFAULTS } from '../../utils/cuotasVsContado'
import {
  IVA_BASICA,
  IVA_DEBITO_PUNTOS,
  MEASURE_STEPS,
  SPENDING_FAQ,
  compareUsdRoutes,
  impliedRate,
  ivaDebitoFrac,
  usdRoutesVerdict,
  spreadVsMarket,
  type UsdRoutesInput,
} from '../../utils/usdSpending'

const input = (over: Partial<UsdRoutesInput> = {}): UsdRoutesInput => ({
  monthlySpendUyu: 100_000,
  bankRate: 38,
  bestSellRate: 40,
  ...over,
})

describe('medir el tipo de cambio del banco', () => {
  it('saca el tipo implícito del estado de cuenta', () => {
    expect(impliedRate({ uyuCharged: 3800, usdDebited: 100 })).toBe(38)
    expect(impliedRate({ uyuCharged: 1234.5, usdDebited: 30 })).toBeCloseTo(41.15, 2)
  })

  // Un campo vacío o un cero no puede producir Infinity ni NaN en una página de plata.
  it('devuelve null en vez de romper con entradas inválidas', () => {
    expect(impliedRate({ uyuCharged: 3800, usdDebited: 0 })).toBeNull()
    expect(impliedRate({ uyuCharged: 0, usdDebited: 100 })).toBeNull()
    expect(impliedRate({ uyuCharged: NaN, usdDebited: 100 })).toBeNull()
    expect(impliedRate({ uyuCharged: 3800, usdDebited: -5 })).toBeNull()
  })

  it('mide cuánto peor es que el mercado, en porcentaje', () => {
    expect(spreadVsMarket(38, 40)).toBeCloseTo(5, 2)
    expect(spreadVsMarket(40, 40)).toBe(0)
  })

  it('un banco mejor que el mercado da spread negativo, no cero forzado', () => {
    expect(spreadVsMarket(41, 40)).toBeLessThan(0)
  })

  it('protege la división por cero', () => {
    expect(spreadVsMarket(38, 0)).toBeNull()
  })
})

describe('rebaja de IVA por débito', () => {
  // La aritmética que casi todos hacen mal: 2 puntos sobre 22 NO son 2 %.
  it('dos puntos sobre 22 son 1,64 % del precio con IVA, no 2 %', () => {
    expect(ivaDebitoFrac()).toBeCloseTo(2 / 122, 6)
    expect(ivaDebitoFrac() * 100).toBeCloseTo(1.64, 2)
    expect(ivaDebitoFrac()).toBeLessThan(0.02)
  })

  // No se redefine el dato: sale de cuotasVsContado, que ya estaba auditado.
  it('reusa los valores ya auditados en vez de duplicarlos', () => {
    expect(IVA_DEBITO_PUNTOS).toBe(DEFAULTS.ivaDebitoPuntos)
    expect(IVA_BASICA).toBe(DEFAULTS.ivaBasica)
  })
})

describe('comparar las rutas', () => {
  it('devuelve las tres rutas', () => {
    const r = compareUsdRoutes(input())
    expect(r.map(x => x.id)).toEqual(['tarjeta-usd', 'vender-y-debito', 'vender-y-credito'])
  })

  it('con un banco peor que el mercado, vender y pagar con débito gana', () => {
    const v = usdRoutesVerdict(input({ bankRate: 38, bestSellRate: 40 }))
    expect(v.best.id).toBe('vender-y-debito')
    expect(v.annualUsdSaved).toBeGreaterThan(0)
  })

  it('el débito siempre consume menos dólares que el crédito al mismo tipo de cambio', () => {
    const r = compareUsdRoutes(input())
    const deb = r.find(x => x.id === 'vender-y-debito')!
    const cred = r.find(x => x.id === 'vender-y-credito')!
    expect(deb.usdNeeded).toBeLessThan(cred.usdNeeded)
  })

  // Si el banco liquida mejor que la mejor casa, la respuesta honesta es «quedate con la tarjeta».
  it('si el banco liquida mejor que el mercado, no fuerza el resultado', () => {
    const v = usdRoutesVerdict(input({ bankRate: 45, bestSellRate: 40 }))
    expect(v.best.id).toBe('tarjeta-usd')
    expect(v.annualUsdSaved).toBe(0)
  })

  it('el ahorro anual es la diferencia mensual por doce', () => {
    const v = usdRoutesVerdict(input())
    const card = v.routes.find(r => r.id === 'tarjeta-usd')!
    expect(v.annualUsdSaved).toBeCloseTo((card.usdNeeded - v.best.usdNeeded) * 12, 1)
  })

  it('se puede apagar el beneficio de IVA y ahí las dos rutas de venta empatan', () => {
    const r = compareUsdRoutes(input({ applyIvaBenefit: false }))
    const deb = r.find(x => x.id === 'vender-y-debito')!
    const cred = r.find(x => x.id === 'vender-y-credito')!
    expect(deb.usdNeeded).toBeCloseTo(cred.usdNeeded, 2)
  })

  it('con tipos de cambio en cero no produce NaN ni Infinity', () => {
    const v = usdRoutesVerdict(input({ bankRate: 0, bestSellRate: 0 }))
    expect(v.routes.every(r => Number.isFinite(r.usdNeeded))).toBe(true)
    expect(Number.isFinite(v.annualUsdSaved)).toBe(true)
  })

  it('un gasto negativo se trata como cero', () => {
    const r = compareUsdRoutes(input({ monthlySpendUyu: -5000 }))
    expect(r.every(x => x.effectiveCost === 0)).toBe(true)
  })
})

describe('contenido', () => {
  it('el método de medición tiene los tres pasos', () => {
    expect(MEASURE_STEPS).toHaveLength(3)
    for (const s of MEASURE_STEPS) expect(s.detail.length).toBeGreaterThan(40)
  })

  // La página se autoimpone no publicar spreads de bancos: el FAQ tiene que decirlo.
  it('explica por qué no publica el spread de cada banco', () => {
    const f = SPENDING_FAQ.find(x => /spread de cada banco/i.test(x.question))
    expect(f).toBeDefined()
    expect(f!.answer).toMatch(/no se publica|inventad|envejec/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(SPENDING_FAQ.length).toBeGreaterThanOrEqual(4)
    for (const f of SPENDING_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })
})
