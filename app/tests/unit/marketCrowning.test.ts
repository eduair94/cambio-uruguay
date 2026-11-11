// Todo lugar del sitio que nombra "la mejor" cotización corona lo mismo: sobre la foto real del
// mercado del 2026-11-11 y sobre un mercado armado para separar los dos lados.
//
// POR QUÉ ESTE TEST. La regla de "fuera de mercado" (utils/marketOutlier.ts) existía, pero cada
// página la aplicaba a su manera o no la aplicaba: ese día el hub /cotizacion decía "Venta desde
// $ 39,55", /pizarra pintaba en verde esa misma pizarra (quieta desde julio) aunque su encabezado
// nombraba otra, el conversor y el "¿Dónde cambiar?" de la portada la recomendaban, /dolar-blue-hoy
// dividía por ella, el mapa la ponía primera cerca de Punta del Este, y /cotizacion/real decía "se
// vende desde $8,45" con cuatro casas vivas a 8,00–8,10, porque una banda de 3 % pensada para el
// dólar las descartaba. Lo que este archivo vigila es que todas lleguen a la misma respuesta.
//
// Lo que dice la foto, por moneda (tests/fixtures/rates-2026-11-11.json):
// - USD: baluma_cambio vende a 39,55, 5,2 % bajo la mediana, quieta hace 120 días → no gana;
//   la venta más barata es prex 40,96 y la compra mejor pagada, cambio_principal 40,20.
// - EUR: cambio_principal compra a 45, 3,7 % sobre la mediana y quieta hace 100 días → no gana;
//   la mejor compra es fortex 44,54.
// - BRL: cambio_principal vende a 8,00, 5,9 % bajo la mediana, y está viva → gana.
// - ARS: tradelix compra a 0,15 contra una mediana de 0,02 → no gana; prex compra y vende a 0,03.
//
// La foto sola no distingue "juzgar cada lado por separado" de "descartar la pizarra entera si
// cualquiera de sus lados está fuera": ese día las dos variantes coronan lo mismo. Por eso hay un
// segundo mercado, sintético, donde la venta más barata es de una casa con la COMPRA fuera de
// banda: juzgar los dos lados juntos la pierde, y juzgarlos cruzados corona la pizarra congelada.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import { compareInstitutionKinds } from '../../utils/bankVsCasa'
import { buildCurrencyMarket } from '../../utils/casaIntents'
import { buildUsdComparison } from '../../utils/casasDirectory'
import { getExchangeRate, marketAverageSavings } from '../../utils/conversion'
import { quotesForCurrency, rankUsableQuotes, type CurrencyCode } from '../../utils/currencyPages'
import { categoryForOrigin } from '../../utils/exchangeChannel'
import { buildFaqItems } from '../../utils/faqAnswers'
import { crownable } from '../../utils/marketOutlier'
import { buildRatesByOrigin, rankNearby } from '../../utils/nearbyRates'
import { bestUsdPair } from '../../utils/ogRate'
import { buildBoard, buildComparison } from '../../utils/pizarra'
import { publicRates } from '../../utils/rateSource'
import { rankExchanges } from '../../utils/recommendation'
import { bestDigestQuotes } from '../../server/utils/newsletter'
import { bestRateFor } from '../../server/utils/rates'

type Row = { origin: string; code: string; type: string; buy: number; sell: number }
type Expected = Partial<Record<CurrencyCode, { sell: number; buy: number }>>

const photo = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/rates-2026-11-11.json'), 'utf8')
) as Row[]
/** The counter rows of one currency, without the BCU: what a casa charges at the window. */
const cashOf = (rows: Row[], code: string) =>
  rows.filter(r => r.code === code && !r.type && r.origin !== 'bcu')

// The synthetic market: twenty real casas (so every catalogue lookup works) spread evenly, plus
// - `narrow`: the cheapest sell, real (−0,5 %), with a buy 4,4 % over the median → off on the buy;
// - `frozen`: the 39,55 / 37,15 board → off on the sell, merely low on the buy;
// - `payer`: the best buy, real (+2,0 %).
const casas = [...new Set(cashOf(photo, 'USD').map(r => r.origin))].filter(
  origin => origin !== 'baluma_cambio' && categoryForOrigin(origin) === 'casa'
)
const [narrow, frozen, payer] = casas.slice(20, 23) as [string, string, string]
const synthetic: Row[] = [
  ...casas.slice(0, 20).map((origin, i) => ({
    origin,
    code: 'USD',
    type: '',
    buy: 39 + i * 0.01,
    sell: 41 + i * 0.01,
  })),
  { origin: narrow, code: 'USD', type: '', buy: 40.8, sell: 40.9 },
  { origin: frozen, code: 'USD', type: '', buy: 37.15, sell: 39.55 },
  { origin: payer, code: 'USD', type: '', buy: 39.9, sell: 41.5 },
]

const MARKETS: Array<{
  name: string
  rows: Row[]
  expected: Expected
  /** The house with the cheapest sell the site crowns. */
  bestSeller: string
  /** The house whose sell is too cheap to be a price. */
  offSeller: string
  /** A house real on its sell and off on its buy, when the market has one. */
  offBuyer?: string
}> = [
  {
    name: 'la foto del 2026-11-11',
    rows: photo,
    expected: {
      USD: { sell: 40.96, buy: 40.2 },
      EUR: { sell: 47.5, buy: 44.54425 },
      BRL: { sell: 8, buy: 7.7 },
      ARS: { sell: 0.03, buy: 0.03 },
    },
    bestSeller: 'prex',
    offSeller: 'baluma_cambio',
  },
  {
    name: 'un mercado que separa los dos lados',
    rows: synthetic,
    expected: { USD: { sell: 40.9, buy: 39.9 } },
    bestSeller: narrow,
    offSeller: frozen,
    offBuyer: narrow,
  },
]

describe('la foto del 2026-11-11 tiene lo que este archivo dice que tiene', () => {
  const cash = (code: string) => cashOf(photo, code)
  it('trae la pizarra congelada, la compra que no es un precio y las casas baratas del real', () => {
    const find = (origin: string, code: string) => cash(code).find(r => r.origin === origin)
    expect(find('baluma_cambio', 'USD')?.sell).toBe(39.55)
    expect(find('tradelix', 'ARS')?.buy).toBe(0.15)
    expect(find('cambio_principal', 'BRL')?.sell).toBe(8)
    expect(find('cambio_principal', 'EUR')?.buy).toBe(45)
    for (const code of ['USD', 'EUR', 'BRL', 'ARS']) {
      expect(cash(code).length, code).toBeGreaterThanOrEqual(30)
    }
  })

  it('sin la regla, el mínimo y el máximo crudos son justamente esos', () => {
    const rawSell = (code: string) => Math.min(...cash(code).map(r => r.sell))
    const rawBuy = (code: string) => Math.max(...cash(code).map(r => r.buy))
    expect(rawSell('USD')).toBe(39.55)
    expect(rawBuy('ARS')).toBe(0.15)
    expect(rawBuy('EUR')).toBe(45)
  })

  it('el mercado sintético tiene 23 casas de verdad', () => {
    expect(new Set(synthetic.map(r => r.origin)).size).toBe(23)
  })
})

describe.each(MARKETS)('$name: todas las superficies coronan lo mismo', market => {
  // As the site reads them (useApiService): the BCU and the wholesale rows flagged as interbank.
  const asRates = market.rows.map(r => ({
    ...r,
    name: r.origin,
    date: '2026-11-11T03:00:00Z',
    isInterBank: r.origin === 'bcu' || ['INTERBANCARIO', 'FONDO/CABLE'].includes(r.type),
  })) as ExchangeRate[]
  const cash = (code: string) => cashOf(market.rows, code)
  const expected = market.expected
  const codes = Object.keys(expected) as CurrencyCode[]
  const usd = expected.USD!

  it('las páginas de cada moneda, el hub y la portada (rankUsableQuotes)', () => {
    for (const code of codes) {
      const ranked = rankUsableQuotes(quotesForCurrency(asRates, code), code)
      expect(ranked.find(q => q.bestSell)?.sell, code).toBe(expected[code]!.sell)
      expect(ranked.find(q => q.bestBuy)?.buy, code).toBe(expected[code]!.buy)
    }
  })

  it('las listas de la portada (crownable), también sobre un subconjunto', () => {
    for (const code of codes) {
      const national = quotesForCurrency(asRates, code)
      expect(
        crownable(
          publicRates(asRates).filter(r => r.code === code),
          national,
          code,
          'sell'
        )[0]?.sell
      ).toBe(expected[code]!.sell)
      expect(
        crownable(
          publicRates(asRates).filter(r => r.code === code),
          national,
          code,
          'buy'
        )[0]?.buy
      ).toBe(expected[code]!.buy)
    }
    const alone = asRates.filter(r => r.origin === market.offSeller && r.code === 'USD')
    expect(crownable(alone, quotesForCurrency(asRates, 'USD'), 'USD', 'sell')).toEqual([])
  })

  it('el encabezado de /pizarra y la marca verde de su tabla', () => {
    const board = buildBoard(asRates)
    const groups = buildComparison(asRates)
    for (const code of codes) {
      const entry = board.find(e => e.code === code)!
      expect(entry.sell.value, code).toBe(expected[code]!.sell)
      expect(entry.buy.value, code).toBe(expected[code]!.buy)
      const group = groups.find(g => g.code === code)!
      for (const row of group.rows.filter(r => r.bestSell))
        expect(row.sell, code).toBe(expected[code]!.sell)
      for (const row of group.rows.filter(r => r.bestBuy))
        expect(row.buy, code).toBe(expected[code]!.buy)
      expect(group.rows.some(r => r.bestSell)).toBe(true)
    }
  })

  it('el recomendador de la portada, su respuesta con IA y /mejor-casa-de-cambio (rankExchanges)', () => {
    for (const code of codes) {
      expect(rankExchanges(cash(code), code, 'buy', 1).ranked[0]?.rate, code).toBe(
        expected[code]!.sell
      )
      expect(rankExchanges(cash(code), code, 'sell', 1).ranked[0]?.rate, code).toBe(
        expected[code]!.buy
      )
    }
  })

  it('el conversor rápido y su "ahorrás comparando", también filtrado por departamento', () => {
    const rows = publicRates(asRates)
    for (const code of codes) {
      expect(getExchangeRate(rows, 'UYU', code), code).toBeCloseTo(1 / expected[code]!.sell)
      expect(getExchangeRate(rows, code, 'UYU'), code).toBe(expected[code]!.buy)
    }
    // Un subconjunto chico (una casa) juzgado contra el mercado entero.
    const subset = rows.filter(r => r.origin === market.offSeller)
    expect(getExchangeRate(subset, 'UYU', 'USD', 'best', rows)).toBe(0)
    // Pedida por nombre, una casa conserva su precio.
    expect(getExchangeRate(rows, 'UYU', 'USD', market.offSeller)).toBeCloseTo(1 / 39.55)
    expect(marketAverageSavings(rows, 'USD', 41000, 'buy').bestRate).toBe(usd.sell)
  })

  it('la tarjeta OG, la tabla de /casas-de-cambio y las páginas de cada casa', () => {
    expect(bestUsdPair(asRates)).toEqual({ buy: usd.buy, sell: usd.sell })

    const table = buildUsdComparison(asRates)
    const off = table.find(e => e.origin === market.offSeller)!
    expect(off.offMarketSell).toBe(true)
    // Its buy is low, which is a bad price and not an error.
    expect(off.offMarketBuy).toBe(false)
    expect(off.offMarket).toBe(true)
    // La distancia "a la mejor" se mide contra la venta que la tabla corona, no contra 39,55.
    expect(table.find(e => e.origin === market.bestSeller)!.gapSellPct).toBe(0)
    if (market.offBuyer) {
      const both = table.find(e => e.origin === market.offBuyer)!
      expect(both.offMarketBuy).toBe(true)
      expect(both.offMarketSell).toBe(false)
    }

    for (const code of codes) {
      const byCurrency = buildCurrencyMarket(asRates, code)
      expect(byCurrency.bySell[0]?.sell, code).toBe(expected[code]!.sell)
      expect(byCurrency.byBuy[0]?.buy, code).toBe(expected[code]!.buy)
    }
    if (market.offBuyer) {
      // Each side leaves out only its own: the frozen sell, and the generous buy.
      const usdMarket = buildCurrencyMarket(asRates, 'USD')
      expect(usdMarket.bySell.map(q => q.origin)).not.toContain(market.offSeller)
      expect(usdMarket.bySell).toHaveLength(22)
      expect(usdMarket.byBuy.map(q => q.origin)).not.toContain(market.offBuyer)
      expect(usdMarket.byBuy).toHaveLength(22)
    }
  })

  it('la comparación banco ↔ casa y las preguntas frecuentes', () => {
    const kinds = compareInstitutionKinds(quotesForCurrency(asRates, 'USD'), 'USD')
    const bestSell = Math.min(...kinds.summaries.map(s => s.bestSell?.sell ?? Infinity))
    expect(bestSell).toBe(usd.sell)

    const faq = buildFaqItems(asRates, 'es', { today: new Date('2026-11-11T12:00:00Z') })
    const answer = faq.find(item => item.id === 'rate-USD')!.answer
    expect(answer).toContain(`se vende desde $${usd.sell.toFixed(2)}`)
    expect(answer).toContain(`se paga hasta $${usd.buy.toFixed(2)}`)
    const ars = faq.find(item => item.id === 'rate-ARS')
    if (ars) expect(ars.answer).not.toContain('$0.15')
  })

  it('el newsletter', () => {
    for (const code of codes) {
      const best = bestDigestQuotes(code, cash(code))!
      expect(best.bestSell.sell, code).toBe(expected[code]!.sell)
      expect(best.bestBuy.buy, code).toBe(expected[code]!.buy)
    }
  })

  it('el mapa y "casas cerca de mí" (buildRatesByOrigin)', () => {
    const here = { lat: -34.9, lng: -56.18 }
    const rates = buildRatesByOrigin(asRates)
    const branches = Object.keys(rates).map(origin => ({ origin, ...here }))
    for (const code of codes) {
      expect(rankNearby(branches, rates, here, 1, code, 'sell')[0]?.rate, code).toBe(
        expected[code]!.sell
      )
      expect(rankNearby(branches, rates, here, 1, code, 'buy')[0]?.rate, code).toBe(
        expected[code]!.buy
      )
    }
    expect(rates[market.offSeller]!.USD!.sell).toBeNull()
  })

  it('las alertas de cotización (bestRateFor)', () => {
    for (const code of codes) {
      expect(bestRateFor(asRates, code, 'bestSell', 'any'), code).toBe(expected[code]!.sell)
      expect(bestRateFor(asRates, code, 'bestBuy', 'any'), code).toBe(expected[code]!.buy)
    }
    // Una alerta sobre una casa por nombre mira esa casa.
    expect(bestRateFor(asRates, 'USD', 'bestSell', market.offSeller)).toBe(39.55)
  })
})
