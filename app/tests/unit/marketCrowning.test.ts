// Todo lugar del sitio que nombra "la mejor" cotización corona lo mismo, con la foto real del
// mercado del 2026-11-11.
//
// POR QUÉ ESTE TEST. La regla de "fuera de mercado" (utils/marketOutlier.ts) existía, pero cada
// página la aplicaba a su manera o no la aplicaba: ese día el hub /cotizacion decía "Venta desde
// $ 39,55", /pizarra pintaba en verde esa misma pizarra (quieta desde julio) aunque su encabezado
// nombraba otra, el conversor y el "¿Dónde cambiar?" de la portada la recomendaban, /dolar-blue-hoy
// dividía por ella, y /cotizacion/real decía "se vende desde $8,45" con cuatro casas vivas a
// 8,00–8,10, porque una banda de 3 % pensada para el dólar las descartaba. Lo que este archivo
// vigila es que todas lleguen a la misma respuesta, sobre datos de verdad.
//
// Lo que el día dice, por moneda (la foto está en tests/fixtures/rates-2026-11-11.json):
// - USD: baluma_cambio vende a 39,55, 5,2 % bajo la mediana, quieta hace 120 días → no gana;
//   la venta más barata es prex 40,96 y la compra mejor pagada, cambio_principal 40,20.
// - EUR: cambio_principal compra a 45, 3,7 % sobre la mediana y quieta hace 100 días → no gana;
//   la mejor compra es fortex 44,54.
// - BRL: cambio_principal vende a 8,00, 5,9 % bajo la mediana, y está viva → gana.
// - ARS: tradelix compra a 0,15 contra una mediana de 0,02 → no gana; prex compra y vende a 0,03.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import { compareInstitutionKinds } from '../../utils/bankVsCasa'
import { buildCurrencyMarket } from '../../utils/casaIntents'
import { buildUsdComparison } from '../../utils/casasDirectory'
import { getExchangeRate, marketAverageSavings } from '../../utils/conversion'
import { quotesForCurrency, rankUsableQuotes, type CurrencyCode } from '../../utils/currencyPages'
import { buildFaqItems } from '../../utils/faqAnswers'
import { bestUsdPair } from '../../utils/ogRate'
import { buildBoard, buildComparison } from '../../utils/pizarra'
import { publicRates } from '../../utils/rateSource'
import { rankExchanges } from '../../utils/recommendation'
import { bestDigestQuotes } from '../../server/utils/newsletter'

type Row = {
  origin: string
  code: string
  type: string
  buy: number
  sell: number
  isInterBank?: boolean
}
const rows = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/rates-2026-11-11.json'), 'utf8')
) as Row[]
// As the site reads them (useApiService): the BCU and the wholesale rows flagged as interbank.
const asRates = rows.map(r => ({
  ...r,
  name: r.origin,
  date: '2026-11-11T03:00:00Z',
  isInterBank: r.origin === 'bcu' || ['INTERBANCARIO', 'FONDO/CABLE'].includes(r.type),
})) as ExchangeRate[]
const cash = (code: string) =>
  rows.filter(r => r.code === code && !r.type && r.origin !== 'bcu' && !r.isInterBank)

const EXPECTED = {
  USD: { sell: 40.96, buy: 40.2 },
  EUR: { sell: 47.5, buy: 44.54425 },
  BRL: { sell: 8, buy: 7.7 },
  ARS: { sell: 0.03, buy: 0.03 },
} as const
const CODES = Object.keys(EXPECTED) as CurrencyCode[]

describe('la foto del 2026-11-11 tiene lo que este archivo dice que tiene', () => {
  it('trae la pizarra congelada, la compra que no es un precio y las casas baratas del real', () => {
    const find = (origin: string, code: string) => cash(code).find(r => r.origin === origin)
    expect(find('baluma_cambio', 'USD')?.sell).toBe(39.55)
    expect(find('tradelix', 'ARS')?.buy).toBe(0.15)
    expect(find('cambio_principal', 'BRL')?.sell).toBe(8)
    expect(find('cambio_principal', 'EUR')?.buy).toBe(45)
    for (const code of CODES) expect(cash(code).length, code).toBeGreaterThanOrEqual(30)
  })

  it('sin la regla, el mínimo y el máximo crudos son justamente esos', () => {
    const rawSell = (code: string) => Math.min(...cash(code).map(r => r.sell))
    const rawBuy = (code: string) => Math.max(...cash(code).map(r => r.buy))
    expect(rawSell('USD')).toBe(39.55)
    expect(rawBuy('ARS')).toBe(0.15)
    expect(rawBuy('EUR')).toBe(45)
  })
})

describe('todas las superficies coronan lo mismo', () => {
  it('las páginas de cada moneda, el hub y la portada (rankUsableQuotes)', () => {
    for (const code of CODES) {
      const ranked = rankUsableQuotes(quotesForCurrency(asRates, code), code)
      expect(ranked.find(q => q.bestSell)?.sell, code).toBe(EXPECTED[code].sell)
      expect(ranked.find(q => q.bestBuy)?.buy, code).toBe(EXPECTED[code].buy)
    }
  })

  it('el encabezado de /pizarra y la marca verde de su tabla', () => {
    const board = buildBoard(asRates)
    const groups = buildComparison(asRates)
    for (const code of CODES) {
      const entry = board.find(e => e.code === code)!
      expect(entry.sell.value, code).toBe(EXPECTED[code].sell)
      expect(entry.buy.value, code).toBe(EXPECTED[code].buy)
      const group = groups.find(g => g.code === code)!
      for (const row of group.rows.filter(r => r.bestSell))
        expect(row.sell, code).toBe(EXPECTED[code].sell)
      for (const row of group.rows.filter(r => r.bestBuy))
        expect(row.buy, code).toBe(EXPECTED[code].buy)
      expect(group.rows.some(r => r.bestSell)).toBe(true)
    }
  })

  it('el recomendador de la portada, su respuesta con IA y /mejor-casa-de-cambio (rankExchanges)', () => {
    for (const code of CODES) {
      const market = cash(code)
      expect(rankExchanges(market, code, 'buy', 1).ranked[0]?.rate, code).toBe(EXPECTED[code].sell)
      expect(rankExchanges(market, code, 'sell', 1).ranked[0]?.rate, code).toBe(EXPECTED[code].buy)
    }
  })

  it('el conversor rápido y su "ahorrás comparando", también filtrado por departamento', () => {
    const market = publicRates(asRates)
    expect(getExchangeRate(market, 'UYU', 'USD')).toBeCloseTo(1 / 40.96)
    expect(getExchangeRate(market, 'ARS', 'UYU')).toBe(0.03)
    // Un subconjunto chico (una casa) juzgado contra el mercado entero.
    const subset = market.filter(r => r.origin === 'baluma_cambio')
    expect(getExchangeRate(subset, 'UYU', 'USD', 'best', market)).toBe(0)
    // Pedida por nombre, una casa conserva su precio.
    expect(getExchangeRate(market, 'UYU', 'USD', 'baluma_cambio')).toBeCloseTo(1 / 39.55)
    expect(marketAverageSavings(market, 'USD', 41000, 'buy').bestRate).toBe(40.96)
  })

  it('la tarjeta OG, la tabla de /casas-de-cambio y las páginas de cada casa', () => {
    expect(bestUsdPair(asRates)).toEqual({ buy: 40.2, sell: 40.96 })

    const table = buildUsdComparison(asRates)
    const baluma = table.find(e => e.origin === 'baluma_cambio')!
    expect(baluma.offMarketSell).toBe(true)
    expect(baluma.offMarket).toBe(true)
    // La distancia "a la mejor" se mide contra la venta que la tabla corona, no contra 39,55.
    expect(table.find(e => e.origin === 'prex')!.gapSellPct).toBe(0)

    for (const code of CODES) {
      const market = buildCurrencyMarket(asRates, code)
      expect(market.bySell[0]?.sell, code).toBe(EXPECTED[code].sell)
      expect(market.byBuy[0]?.buy, code).toBe(EXPECTED[code].buy)
    }
  })

  it('la comparación banco ↔ casa y las preguntas frecuentes', () => {
    const kinds = compareInstitutionKinds(quotesForCurrency(asRates, 'USD'), 'USD')
    const bestSell = Math.min(...kinds.summaries.map(s => s.bestSell?.sell ?? Infinity))
    expect(bestSell).toBe(40.96)

    const faq = buildFaqItems(asRates, 'es', { today: new Date('2026-11-11T12:00:00Z') })
    const usd = faq.find(item => item.id === 'rate-USD')!.answer
    expect(usd).toContain('se vende desde $40.96')
    expect(usd).toContain('se paga hasta $40.20')
    const ars = faq.find(item => item.id === 'rate-ARS')
    if (ars) expect(ars.answer).not.toContain('$0.15')
  })

  it('el newsletter', () => {
    for (const code of CODES) {
      const best = bestDigestQuotes(code, cash(code))!
      expect(best.bestSell.sell, code).toBe(EXPECTED[code].sell)
      expect(best.bestBuy.buy, code).toBe(EXPECTED[code].buy)
    }
  })
})
