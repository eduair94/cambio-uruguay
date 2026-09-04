import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import { quotesForCurrency, rankUsableQuotes } from '../../utils/currencyPages'

// El defecto que cierra este archivo, medido el 2026-09-04 en producción:
//
//   curl https://cambio-uruguay.com/convertir/50000-pesos-argentinos-a-pesos-uruguayos
//   <title>¿Cuánto es 50.000 pesos argentinos en pesos uruguayos? ≈ $ 7.500,00 | Cambio Uruguay</title>
//
// La respuesta honesta era ~$ 1.000. El sitio publicaba 50.000 × 0,15 porque `useExchangeRates`
// coronaba con `quotesForCurrency` a secas, y esa función corona la compra más alta sin preguntar
// si el número es alcanzable. tradelix compraba el peso argentino a 0,15 contra una mediana de 0,02
// en un mercado de 40 casas.
//
// El backend NO tiene la culpa y no hay que arreglarlo ahí: `rate_plausibility` ya ve esa fila y la
// marca sospechosa a propósito en vez de borrarla, porque 0,15/0,55 es coherente por fila y es un
// precio realmente publicado ("borrarlo sería inventar que la casa no cotiza", dice su test). El
// error era anunciar esa fila como el mejor precio del mercado.
//
// Es la MISMA falla que `rankUsableQuotes` ya había arreglado una vez en la home, una superficie más
// tarde: cuando se escribió, la lista de superficies con la regla era /casas-de-cambio, /pizarra y
// las páginas de casa; el conversor y las herramientas nunca entraron.

/** El mercado ARS real del 2026-09-04: 40 casas, mediana de compra 0,02, y tradelix arriba de todo. */
const arsMarket = (): ExchangeRate[] => [
  {
    origin: 'tradelix',
    date: '2026-09-04',
    type: '',
    code: 'ARS',
    name: 'ars',
    buy: 0.15,
    sell: 0.55,
  },
  { origin: 'prex', date: '2026-09-04', type: '', code: 'ARS', name: '', buy: 0.03, sell: 0.03 },
  {
    origin: 'fortex',
    date: '2026-09-04',
    type: '',
    code: 'ARS',
    name: '',
    buy: 0.0248,
    sell: 0.0303,
  },
  ...Array.from({ length: 37 }, (_, i) => ({
    origin: `casa${i}`,
    date: '2026-09-04',
    type: '',
    code: 'ARS' as const,
    name: 'Peso Argentino',
    buy: 0.02,
    sell: 0.03,
  })),
]

describe('crowning the converter reads', () => {
  it('no corona la compra de tradelix, que está 7 veces sobre la mediana', () => {
    const ranked = rankUsableQuotes(quotesForCurrency(arsMarket(), 'ARS'))
    const crowned = ranked.find(q => q.bestBuy)

    expect(crowned?.origin).not.toBe('tradelix')
    // 50.000 × la compra coronada tiene que dar la cifra que el título publica.
    expect(50_000 * (crowned?.buy ?? 0)).toBeLessThan(2_000)
  })

  it('sin la regla, el sitio publica los $ 7.500 que publicaba', () => {
    // Esta es la única razón por la que el test anterior tiene dientes: demuestra que la corona sin
    // filtrar SÍ elige tradelix, así que un revert de useExchangeRates rompe la primera prueba.
    const crudo = quotesForCurrency(arsMarket(), 'ARS').find(q => q.bestBuy)
    expect(crudo?.origin).toBe('tradelix')
    expect(50_000 * (crudo?.buy ?? 0)).toBe(7_500)
  })

  it('la fila sospechosa sigue en la lista: es un precio publicado, no un error de parseo', () => {
    const ranked = rankUsableQuotes(quotesForCurrency(arsMarket(), 'ARS'))
    expect(ranked.find(q => q.origin === 'tradelix')?.buy).toBe(0.15)
    expect(ranked).toHaveLength(40)
  })

  it('useExchangeRates corona a través de rankUsableQuotes', () => {
    // Tripwire de código fuente, no de comportamiento: el composable necesita el runtime de Nuxt
    // (useAsyncData) y no se puede montar acá. Lo que se puede vigilar es que no vuelva a leer la
    // corona sin filtrar, que es exactamente la línea que causó el defecto.
    const src = readFileSync(
      fileURLToPath(new URL('../../composables/useExchangeRates.ts', import.meta.url)),
      'utf8'
    )
    // Toda llamada a `quotesForCurrency` de este archivo tiene que estar envuelta: es la corona sin
    // filtrar, y leerla directo es exactamente lo que publicaba los $ 7.500.
    const llamadas = src.match(/quotesForCurrency\(/g) ?? []
    const envueltas = src.match(/rankUsableQuotes\(\s*quotesForCurrency\(/g) ?? []
    expect(llamadas.length).toBeGreaterThan(0)
    expect(envueltas.length).toBe(llamadas.length)
  })
})
