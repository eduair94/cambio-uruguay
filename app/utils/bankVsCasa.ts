// "¿Conviene cambiar en el banco o en una casa de cambio?" — la comparación por TIPO de
// institución, no por casa.
//
// El sitio ya responde "qué mostrador tiene hoy el mejor precio" (/mejor-casa-de-cambio) y ya lista
// cada grupo por separado (/casas-de-cambio/bancos, /casas-de-cambio/casas-de-cambio). Lo que no
// respondía es la pregunta previa, que es la que la gente hace en voz alta: si el banco donde ya
// tiene la cuenta le sirve o si le conviene caminar hasta una casa de cambio. Eso no es una opinión
// y no hace falta escribirlo a mano: sale de las mismas pizarras que el sitio publica.
//
// PURA (sin imports de Vue/Nuxt) para que vitest-node la cargue sin runtime.
//
// Tres decisiones que hacen que la comparación sea honesta:
//
//  1. Se comparan SÓLO mostradores. `quotesForCurrency` ya deja una fila por origen y sólo de tipo
//     contado/BILLETE, así que el eBROU y las cotizaciones por TRANSFERENCIA —que exigen ser
//     cliente— quedan afuera. Comparar la transferencia de un banco contra el efectivo de una casa
//     mide dos operaciones distintas y le regala al banco un precio que el que pasa por la calle no
//     puede tomar.
//  2. La pizarra fuera de mercado no corona ni entra en la mediana del grupo. Es la misma regla que
//     usan la home, /pizarra y /casas-de-cambio (`offMarketDetector`, mediana y no promedio), y acá
//     pesa más que en ningún lado: los bancos son cinco, así que UNA fila mal parseada movería el
//     grupo entero y la página diría lo contrario de lo que pasa.
//  3. La mediana viaja al lado del mejor precio. El mejor de cada grupo es un solo mostrador y
//     puede ser una excepción; la mediana dice si el grupo entero está ahí o si ese precio es un
//     caso aislado. Las dos cifras juntas son la respuesta; una sola es un titular.

import { categoryForOrigin, type OriginCategory } from './exchangeChannel'
import type { CurrencyQuote } from './currencyPages'
import { median, offMarketDetector } from './marketOutlier'

/** Los grupos que la página compara, en el orden en que los muestra. */
export const COMPARED_KINDS: readonly OriginCategory[] = ['casa', 'banco', 'fintech'] as const

/** Lo que publica hoy un grupo de instituciones para una moneda. */
export interface KindSummary {
  kind: OriginCategory
  /** Pizarras del grupo con precio usable hoy (sin las fuera de mercado). */
  count: number
  /** El mostrador del grupo que vende más barato, o null si ninguno vende. */
  bestSell: CurrencyQuote | null
  /** El mostrador del grupo que paga más por la moneda, o null si ninguno compra. */
  bestBuy: CurrencyQuote | null
  /** Mediana de venta del grupo: dice si el mejor precio es la regla o la excepción. */
  medianSell: number | null
  /** Mediana de compra del grupo. */
  medianBuy: number | null
}

/** La distancia entre los dos grupos en una punta del mostrador. */
export interface KindGap {
  /** El grupo que hoy da el mejor precio de esta punta. */
  winner: OriginCategory
  /** El otro grupo. */
  loser: OriginCategory
  /** Diferencia por unidad de moneda, en pesos uruguayos. Siempre ≥ 0. */
  perUnit: number
  /**
   * Cuánto peor es el precio del perdedor, en % del precio del ganador.
   *
   * Sobre el GANADOR y no sobre el punto medio: la frase que la página escribe es "pagás X% más
   * caro que en …", y ese "más caro que" se mide contra el precio con el que se compara.
   */
  pct: number
}

/** La comparación completa de una moneda entre tipos de institución. */
export interface KindComparison {
  /** Un resumen por grupo, en el orden de {@link COMPARED_KINDS}; los vacíos también viajan. */
  summaries: KindSummary[]
  /** Banco contra casa de cambio comprando la moneda (mirando la venta). */
  sell: KindGap | null
  /** Banco contra casa de cambio vendiéndola (mirando la compra). */
  buy: KindGap | null
}

const positive = (n: number | null | undefined): n is number => typeof n === 'number' && n > 0

/**
 * Resumir un grupo ya filtrado de pizarras usables.
 *
 * No vuelve a correr el detector de outliers: la muestra de un grupo son cinco bancos y el detector
 * se planta por debajo de diez cotizaciones (`MIN_SAMPLE`), así que juzgar al banco contra la
 * mediana de los bancos no filtraría nada. El descarte se hace una sola vez contra el mercado
 * entero, que es la referencia que sí tiene muestra.
 */
function summarise(kind: OriginCategory, quotes: readonly CurrencyQuote[]): KindSummary {
  const sells = quotes.map(q => q.sell).filter(positive)
  const buys = quotes.map(q => q.buy).filter(positive)

  let bestSell: CurrencyQuote | null = null
  let bestBuy: CurrencyQuote | null = null
  for (const quote of quotes) {
    if (positive(quote.sell) && (bestSell === null || quote.sell < bestSell.sell!)) bestSell = quote
    if (positive(quote.buy) && (bestBuy === null || quote.buy > bestBuy.buy!)) bestBuy = quote
  }

  return {
    kind,
    count: quotes.length,
    bestSell,
    bestBuy,
    medianSell: median(sells),
    medianBuy: median(buys),
  }
}

/**
 * La distancia entre dos grupos en una punta, o null cuando falta alguno de los dos precios.
 *
 * `lowerWins` distingue las dos puntas: comprando dólares gana la venta más BAJA, vendiéndolos gana
 * la compra más ALTA. Un empate exacto devuelve una diferencia de cero con el primer grupo como
 * ganador, y la página lo escribe como "prácticamente lo mismo" en vez de coronar a nadie.
 */
function gapBetween(
  a: { kind: OriginCategory; price: number | null },
  b: { kind: OriginCategory; price: number | null },
  lowerWins: boolean
): KindGap | null {
  if (!positive(a.price) || !positive(b.price)) return null
  const aWins = lowerWins ? a.price <= b.price : a.price >= b.price
  const winner = aWins ? a : b
  const loser = aWins ? b : a
  return {
    winner: winner.kind,
    loser: loser.kind,
    perUnit: Math.abs(loser.price! - winner.price!),
    pct: (Math.abs(loser.price! - winner.price!) / winner.price!) * 100,
  }
}

/**
 * Comparar lo que publican hoy bancos, casas de cambio y fintechs para una moneda.
 *
 * @param quotes las cotizaciones de UNA moneda, tal como las arma `quotesForCurrency` (una fila por
 *   origen, sólo contado/BILLETE, sin el BCU).
 * @returns un resumen por grupo y las dos diferencias banco↔casa. Las fintechs se resumen pero no
 *   entran en la diferencia: cotizan sólo para sus propios clientes y en la app, así que no son una
 *   alternativa para el que va con efectivo, que es a quien responde esta página.
 */
export function compareInstitutionKinds(quotes: readonly CurrencyQuote[]): KindComparison {
  const isOffMarket = offMarketDetector(quotes)
  const usable = quotes.filter(quote => !isOffMarket(quote))

  const summaries = COMPARED_KINDS.map(kind =>
    summarise(
      kind,
      usable.filter(quote => categoryForOrigin(quote.origin) === kind)
    )
  )
  const casa = summaries.find(s => s.kind === 'casa')!
  const banco = summaries.find(s => s.kind === 'banco')!

  return {
    summaries,
    sell: gapBetween(
      { kind: 'casa', price: casa.bestSell?.sell ?? null },
      { kind: 'banco', price: banco.bestSell?.sell ?? null },
      true
    ),
    buy: gapBetween(
      { kind: 'casa', price: casa.bestBuy?.buy ?? null },
      { kind: 'banco', price: banco.bestBuy?.buy ?? null },
      false
    ),
  }
}

/**
 * Lo que esa diferencia por unidad cuesta en una operación concreta.
 *
 * La diferencia por unidad de dólar son centavos y se lee como "da lo mismo"; sobre los US$ 1.000
 * de una operación real se lee como lo que es. Es una multiplicación de una cifra medida, no una
 * estimación: no hay comisión, impuesto ni mínimo metido acá dentro.
 */
export function differenceOn(gap: KindGap | null, units: number): number | null {
  if (!gap || !(units > 0)) return null
  return gap.perUnit * units
}
