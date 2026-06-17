// Pure, framework-agnostic FAQ answer builder. No Vue/Nuxt, no I/O, no AI — so it
// unit-tests in plain Vitest and is the single source of truth for the FAQ Q&A copy.
// The Nitro route (server/api/faq.get.ts) calls this, then optionally appends one
// AI context sentence. Visible page text and FAQPage schema both come from these items.
import type { ExchangeRate } from '../types/api'
import { rankExchanges, type RankableRate } from './recommendation'

export const FAQ_LANGS = ['es', 'en', 'pt'] as const
export type FaqLang = (typeof FAQ_LANGS)[number]

export interface FaqItem {
  id: string
  question: string
  answer: string
}

// Home embed = the USD live answers (incl. spread) + the evergreen set. This is
// the full data-grounded replacement for the old static 8-question home FAQ, so
// it carries one FAQPage schema for the home URL.
export const HOME_FAQ_IDS = [
  'rate-USD',
  'buy-USD',
  'sell-USD',
  'spread-USD',
  'types',
  'update-freq',
  'data-source',
  'how-choose',
] as const
export function currencyFaqIds(code: string): string[] {
  const c = code.toUpperCase()
  return [`rate-${c}`, `buy-${c}`, `sell-${c}`]
}

const CURRENCIES = ['USD', 'EUR', 'BRL', 'ARS'] as const

interface RateFacts {
  minSell: number
  maxBuy: number
  avgSell: number
  bestBuyHouse: { name: string; rate: number; savingsVsAvg: number } | null // cheapest to BUY
  bestSellHouse: { name: string; rate: number } | null // pays most to SELL
  minSpreadHouse: { name: string; spread: number } | null
}

interface Labels {
  curNames: Record<string, string>
  rateQ: (cur: string) => string
  rateA: (p: {
    date: string
    cur: string
    minSell: string
    maxBuy: string
    avgSell: string
  }) => string
  buyQ: (cur: string) => string
  buyA: (p: { cur: string; house: string; rate: string; savings: string }) => string
  sellQ: (cur: string) => string
  sellA: (p: { cur: string; house: string; rate: string }) => string
  spreadQ: (cur: string) => string
  spreadA: (p: { cur: string; house: string; spread: string; avg: string }) => string
  disclaimer: string
  evergreen: { id: string; question: string; answer: string }[]
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function factsFor(rates: ExchangeRate[], code: string): RateFacts | null {
  const market = rates.filter(r => r.code === code && !r.type && r.origin !== 'bcu')
  const sells = market.map(r => r.sell ?? 0).filter(v => v > 0)
  const buys = market.map(r => r.buy ?? 0).filter(v => v > 0)
  if (!sells.length || !buys.length) return null

  const avgSell = sells.reduce((a, b) => a + b, 0) / sells.length
  const rankable = market as RankableRate[]
  const buyRank = rankExchanges(rankable, code, 'buy', 1).ranked[0] // lowest sell
  const sellRank = rankExchanges(rankable, code, 'sell', 1).ranked[0] // highest buy

  // Lowest per-house spread (sell - buy), one row per origin.
  const spreads = market
    .filter(r => (r.buy ?? 0) > 0 && (r.sell ?? 0) > 0)
    .map(r => ({
      name: r.name || r.origin,
      spread: round2((r.sell as number) - (r.buy as number)),
    }))
    .sort((a, b) => a.spread - b.spread)

  return {
    minSell: Math.min(...sells),
    maxBuy: Math.max(...buys),
    avgSell: round2(avgSell),
    bestBuyHouse: buyRank
      ? { name: buyRank.name, rate: buyRank.rate, savingsVsAvg: buyRank.savingsVsAvg }
      : null,
    bestSellHouse: sellRank ? { name: sellRank.name, rate: sellRank.rate } : null,
    minSpreadHouse: spreads[0] ?? null,
  }
}

function fmtDate(d: Date): string {
  // DD/MM/YYYY — unambiguous and stable across the three locales.
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

function freshestDate(rates: ExchangeRate[], fallback: Date): Date {
  const times = rates.map(r => Date.parse(r.date)).filter(n => Number.isFinite(n))
  return times.length ? new Date(Math.max(...times)) : fallback
}

const LABELS: Record<FaqLang, Labels> = {
  es: {
    curNames: { USD: 'dólar', EUR: 'euro', BRL: 'real brasileño', ARS: 'peso argentino' },
    rateQ: cur => `¿A cuánto está el ${cur} hoy en Uruguay?`,
    rateA: p =>
      `Hoy ${p.date}, el ${p.cur} se vende desde $${p.minSell} y se paga hasta $${p.maxBuy} en las casas de cambio de Uruguay. El promedio de venta es $${p.avgSell}. Datos actualizados cada 10 minutos.`,
    buyQ: cur => `¿Dónde conviene comprar ${cur} hoy en Uruguay?`,
    buyA: p =>
      `Para comprar ${p.cur}, hoy la opción más barata es ${p.house}, que lo vende a $${p.rate} (ahorrás $${p.savings} por unidad frente al promedio del mercado).`,
    sellQ: cur => `¿Dónde conviene vender ${cur} hoy en Uruguay?`,
    sellA: p => `Para vender ${p.cur}, hoy te pagan más en ${p.house}, que lo compra a $${p.rate}.`,
    spreadQ: cur => `¿Cuál es el spread del ${cur} hoy y quién tiene el menor?`,
    spreadA: p =>
      `El menor spread del ${p.cur} hoy lo ofrece ${p.house}, con $${p.spread} entre compra y venta (el promedio de venta es $${p.avg}).`,
    disclaimer: ' Información orientativa, no asesoramiento financiero.',
    evergreen: [
      {
        id: 'types',
        question: '¿Qué diferencia hay entre BILLETE, CABLE, TRANSFERENCIA e INTERBANCARIO?',
        answer:
          'BILLETE es efectivo; CABLE es una transferencia bancaria internacional; TRANSFERENCIA es una transferencia bancaria local; INTERBANCARIO es la cotización de referencia exclusiva entre bancos, que no está disponible para el público. Para comprar o vender se usan las cotizaciones BILLETE, CABLE o TRANSFERENCIA.',
      },
      {
        id: 'update-freq',
        question: '¿Cada cuánto se actualizan las cotizaciones?',
        answer:
          'Las cotizaciones se actualizan automáticamente cada 10 minutos a partir de los datos publicados por las casas de cambio de todo el país.',
      },
      {
        id: 'data-source',
        question: '¿De dónde salen los datos de las cotizaciones?',
        answer:
          'Los datos provienen del Banco Central del Uruguay (BCU) y de más de 40 casas de cambio del país, que se consultan en tiempo real y se comparan en un solo lugar.',
      },
      {
        id: 'how-choose',
        question: '¿Cómo se elige la mejor casa de cambio?',
        answer:
          'Para comprar conviene la casa con la menor cotización de venta; para vender, la que tenga la mayor cotización de compra. También importa el spread: cuanto menor es la diferencia entre compra y venta, mejor el precio.',
      },
    ],
  },
  en: {
    curNames: { USD: 'US dollar', EUR: 'euro', BRL: 'Brazilian real', ARS: 'Argentine peso' },
    rateQ: cur => `What is the ${cur} rate in Uruguay today?`,
    rateA: p =>
      `Today ${p.date}, the ${p.cur} sells from $${p.minSell} and is bought up to $${p.maxBuy} at Uruguay's exchange houses. The average sell rate is $${p.avgSell}. Data is updated every 10 minutes.`,
    buyQ: cur => `Where is the best place to buy ${cur} in Uruguay today?`,
    buyA: p =>
      `To buy ${p.cur}, the cheapest option today is ${p.house}, selling at $${p.rate} (you save $${p.savings} per unit versus the market average).`,
    sellQ: cur => `Where is the best place to sell ${cur} in Uruguay today?`,
    sellA: p =>
      `To sell ${p.cur}, you get paid the most today at ${p.house}, which buys it at $${p.rate}.`,
    spreadQ: cur => `What is the ${cur} spread today and who has the lowest?`,
    spreadA: p =>
      `The lowest ${p.cur} spread today is at ${p.house}, with $${p.spread} between buy and sell (the average sell rate is $${p.avg}).`,
    disclaimer: ' Informational only, not financial advice.',
    evergreen: [
      {
        id: 'types',
        question: 'What is the difference between BILLETE, CABLE, TRANSFERENCIA and INTERBANCARIO?',
        answer:
          'BILLETE is cash; CABLE is an international bank wire; TRANSFERENCIA is a local bank transfer; INTERBANCARIO is the interbank reference rate, exclusive to banks and not available to the public. To buy or sell, use the BILLETE, CABLE or TRANSFERENCIA quotes.',
      },
      {
        id: 'update-freq',
        question: 'How often are the exchange rates updated?',
        answer:
          'Rates are updated automatically every 10 minutes from the data published by exchange houses across the country.',
      },
      {
        id: 'data-source',
        question: 'Where does the exchange-rate data come from?',
        answer:
          'Data comes from the Central Bank of Uruguay (BCU) and over 40 exchange houses nationwide, queried in real time and compared in one place.',
      },
      {
        id: 'how-choose',
        question: 'How do you choose the best exchange house?',
        answer:
          'To buy, pick the house with the lowest sell rate; to sell, the one with the highest buy rate. The spread also matters: the smaller the gap between buy and sell, the better the price.',
      },
    ],
  },
  pt: {
    curNames: { USD: 'dólar', EUR: 'euro', BRL: 'real', ARS: 'peso argentino' },
    rateQ: cur => `Qual é a cotação do ${cur} no Uruguai hoje?`,
    rateA: p =>
      `Hoje ${p.date}, o ${p.cur} é vendido a partir de $${p.minSell} e comprado até $${p.maxBuy} nas casas de câmbio do Uruguai. A média de venda é $${p.avgSell}. Dados atualizados a cada 10 minutos.`,
    buyQ: cur => `Onde é melhor comprar ${cur} no Uruguai hoje?`,
    buyA: p =>
      `Para comprar ${p.cur}, a opção mais barata hoje é ${p.house}, que vende a $${p.rate} (você economiza $${p.savings} por unidade em relação à média do mercado).`,
    sellQ: cur => `Onde é melhor vender ${cur} no Uruguai hoje?`,
    sellA: p => `Para vender ${p.cur}, hoje quem paga mais é ${p.house}, que compra a $${p.rate}.`,
    spreadQ: cur => `Qual é o spread do ${cur} hoje e quem tem o menor?`,
    spreadA: p =>
      `O menor spread do ${p.cur} hoje é da ${p.house}, com $${p.spread} entre compra e venda (a média de venda é $${p.avg}).`,
    disclaimer: ' Informação orientativa, não é aconselhamento financeiro.',
    evergreen: [
      {
        id: 'types',
        question: 'Qual a diferença entre BILLETE, CABLE, TRANSFERENCIA e INTERBANCARIO?',
        answer:
          'BILLETE é dinheiro em espécie; CABLE é uma transferência bancária internacional; TRANSFERENCIA é uma transferência bancária local; INTERBANCARIO é a cotação de referência exclusiva entre bancos, indisponível ao público. Para comprar ou vender, use as cotações BILLETE, CABLE ou TRANSFERENCIA.',
      },
      {
        id: 'update-freq',
        question: 'Com que frequência as cotações são atualizadas?',
        answer:
          'As cotações são atualizadas automaticamente a cada 10 minutos a partir dos dados publicados pelas casas de câmbio de todo o país.',
      },
      {
        id: 'data-source',
        question: 'De onde vêm os dados das cotações?',
        answer:
          'Os dados vêm do Banco Central do Uruguai (BCU) e de mais de 40 casas de câmbio do país, consultados em tempo real e comparados em um só lugar.',
      },
      {
        id: 'how-choose',
        question: 'Como escolher a melhor casa de câmbio?',
        answer:
          'Para comprar, escolha a casa com a menor cotação de venda; para vender, a com a maior cotação de compra. O spread também importa: quanto menor a diferença entre compra e venda, melhor o preço.',
      },
    ],
  },
}

export function buildFaqItems(
  rates: ExchangeRate[],
  lang: FaqLang,
  opts?: { today?: Date }
): FaqItem[] {
  const L = LABELS[lang] ?? LABELS.es
  const dateStr = fmtDate(freshestDate(rates, opts?.today ?? new Date()))
  const items: FaqItem[] = []

  const pushLive = (code: string) => {
    const f = factsFor(rates, code)
    if (!f) return
    const cur = L.curNames[code] ?? code
    items.push({
      id: `rate-${code}`,
      question: L.rateQ(cur),
      answer: L.rateA({
        date: dateStr,
        cur,
        minSell: f.minSell.toFixed(2),
        maxBuy: f.maxBuy.toFixed(2),
        avgSell: f.avgSell.toFixed(2),
      }),
    })
    if (f.bestBuyHouse) {
      items.push({
        id: `buy-${code}`,
        question: L.buyQ(cur),
        answer:
          L.buyA({
            cur,
            house: f.bestBuyHouse.name,
            rate: f.bestBuyHouse.rate.toFixed(2),
            savings: Math.max(0, f.bestBuyHouse.savingsVsAvg).toFixed(2),
          }) + L.disclaimer,
      })
    }
    if (f.bestSellHouse) {
      items.push({
        id: `sell-${code}`,
        question: L.sellQ(cur),
        answer:
          L.sellA({ cur, house: f.bestSellHouse.name, rate: f.bestSellHouse.rate.toFixed(2) }) +
          L.disclaimer,
      })
    }
    if (code === 'USD' && f.minSpreadHouse) {
      items.push({
        id: `spread-${code}`,
        question: L.spreadQ(cur),
        answer: L.spreadA({
          cur,
          house: f.minSpreadHouse.name,
          spread: f.minSpreadHouse.spread.toFixed(2),
          avg: f.avgSell.toFixed(2),
        }),
      })
    }
  }

  // USD first (incl. spread), then evergreen, then the other currencies.
  pushLive('USD')
  for (const ev of L.evergreen) items.push({ ...ev })
  for (const code of CURRENCIES) if (code !== 'USD') pushLive(code)

  return items
}
