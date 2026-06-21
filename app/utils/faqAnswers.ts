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
  /** Plural nouns used where "comprar/vender {plural}" reads more naturally. */
  curNamesPlural: Record<string, string>
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
    curNamesPlural: {
      USD: 'dólares',
      EUR: 'euros',
      BRL: 'reales brasileños',
      ARS: 'pesos argentinos',
    },
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
          'Las cotizaciones se actualizan automáticamente cada 10 minutos a partir de los datos que publican las casas de cambio de todo el país, junto con la referencia del Banco Central del Uruguay (BCU). Esa frecuencia mantiene la foto muy cercana al mercado en vivo durante los días hábiles; los fines de semana y feriados, cuando el mercado cambiario no opera, el último precio queda como referencia. Por eso, al consultar el dólar conviene mirar la fecha y hora del dato: una cotización de hace minutos es mucho más confiable para decidir que una de ayer.',
      },
      {
        id: 'data-source',
        question: '¿De dónde salen los datos de las cotizaciones?',
        answer:
          'Los datos provienen de más de 40 casas de cambio y bancos de todo Uruguay, junto con la cotización de referencia del Banco Central del Uruguay (BCU). Cada casa publica sus propios precios de compra y venta, que se consultan en tiempo real y se reúnen en un solo lugar para compararlos. Cambio Uruguay no fija precios ni cobra por operar: solo releva y ordena la información para que veas de un vistazo dónde conviene comprar o vender. La cotización INTERBANCARIO se muestra solo como referencia mayorista entre bancos, porque no está disponible para el público.',
      },
      {
        id: 'how-choose',
        question: '¿Cómo se elige la mejor casa de cambio?',
        answer:
          'Para comprar conviene la casa de cambio con la menor cotización de venta; para vender, la que tenga la mayor cotización de compra. También importa el spread, que es la diferencia entre el precio de compra y el de venta: cuanto menor es ese spread, mejor el precio para vos. Entre dos casas con cotizaciones parecidas, la de menor spread casi siempre te deja mejor parado. Y conviene elegir el tipo de operación adecuado —billete, transferencia, cable o eBROU—, porque cada uno tiene un precio distinto. Comparar las tres cosas (precio, spread y canal) es la forma de encontrar el mejor precio.',
      },
      {
        id: 'moneda-uruguay',
        question: '¿Cuál es la moneda de Uruguay?',
        answer:
          'La moneda oficial de Uruguay es el peso uruguayo (código UYU, símbolo $ o $U), emitido por el Banco Central del Uruguay. Se divide en 100 centésimos y circula en billetes de 20, 50, 100, 200, 500, 1.000 y 2.000 pesos, y monedas de 1, 2, 5, 10 y 50 pesos. En la práctica, el dólar estadounidense también se usa mucho para ahorrar, fijar alquileres y operaciones grandes, pero los pagos del día a día son en pesos. A diferencia de Argentina, Uruguay no tiene mercado paralelo ("dólar blue"): el dólar se compra y vende libremente en casas de cambio y bancos.',
      },
      {
        id: 'pagar-dolares',
        question: '¿Se puede pagar en dólares en Uruguay?',
        answer:
          'En zonas turísticas muchos hoteles, restaurantes y comercios aceptan dólares estadounidenses, pero suelen aplicar un tipo de cambio propio menos favorable que el de una casa de cambio. Por eso, para gastos del día a día casi siempre conviene pagar en pesos uruguayos. Si traés dólares en efectivo, cambialos en una casa de cambio comparando el precio (en Cambio Uruguay ves dónde te dan más), y para compras grandes considerá la tarjeta. El peso es la moneda de curso legal, así que siempre podés pagar en pesos.',
      },
      {
        id: 'propinas',
        question: '¿Cuánto se deja de propina en Uruguay?',
        answer:
          'En Uruguay la propina no es obligatoria, pero es habitual dejar alrededor del 10% en restaurantes y bares cuando el servicio fue bueno; muchos posnet permiten agregarla al pagar con tarjeta. Ojo: el "cubierto" que aparece en la cuenta es un cargo por pan y servicio de mesa, no una propina. En los taxis no se acostumbra dejar propina (como mucho se redondea). A maleteros y cuidacoches se les suele dar unos $20 a $50. En cafés y mostradores, la propina es opcional.',
      },
      {
        id: 'iva-turistas',
        question: '¿Los turistas extranjeros pagan IVA en Uruguay?',
        answer:
          'Los turistas no residentes tienen beneficios de IVA en Uruguay si pagan con una tarjeta emitida en el exterior. El alojamiento en hoteles está exonerado del IVA durante todo el año (se factura sin el impuesto). Para gastronomía (restaurantes, bares y cafés independientes del hospedaje) existe una reducción del IVA que rige por temporada —típicamente en verano— y que puede cambiar de un año a otro, así que conviene verificar la vigencia del período en curso. Además, en compras de bienes se puede pedir la devolución "Tax Free" de una parte del IVA al salir del país. El pago en efectivo no accede a estos beneficios.',
      },
      {
        id: 'brou',
        question: '¿Cuánto vale el dólar en el BROU y conviene?',
        answer:
          'El BROU es el Banco de la República Oriental del Uruguay, el banco estatal más grande del país, y su cotización del dólar es una de las más buscadas. Al ser un banco público, suele ser algo más conservadora que la de las casas de cambio privadas, sobre todo para el dólar billete; a través de eBROU, su plataforma digital, se consiguen cotizaciones más competitivas operando en línea. Para saber si el dólar del BROU te conviene, lo mejor es compararlo con el resto del mercado: en Cambio Uruguay ves el precio del BROU lado a lado con más de 40 casas de cambio, actualizado automáticamente, para elegir dónde comprar o vender al mejor precio.',
      },
    ],
  },
  en: {
    curNames: { USD: 'US dollar', EUR: 'euro', BRL: 'Brazilian real', ARS: 'Argentine peso' },
    curNamesPlural: {
      USD: 'US dollars',
      EUR: 'euros',
      BRL: 'Brazilian reais',
      ARS: 'Argentine pesos',
    },
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
          'Rates are updated automatically every 10 minutes from the data published by exchange houses across the country, alongside the Central Bank of Uruguay (BCU) reference. That frequency keeps the snapshot very close to the live market on business days; on weekends and holidays, when the FX market is closed, the last price stays as a reference. So when you check the dollar, look at the date and time of the figure: a quote from minutes ago is far more reliable for deciding than one from yesterday.',
      },
      {
        id: 'data-source',
        question: 'Where does the exchange-rate data come from?',
        answer:
          'Data comes from over 40 exchange houses and banks across Uruguay, alongside the reference rate of the Central Bank of Uruguay (BCU). Each house publishes its own buy and sell prices, which are queried in real time and gathered in one place for comparison. Cambio Uruguay does not set prices or charge to trade: it only collects and organizes the information so you can see at a glance where to buy or sell. The INTERBANCARIO quote is shown only as a wholesale interbank reference, because it is not available to the public.',
      },
      {
        id: 'how-choose',
        question: 'How do you choose the best exchange house?',
        answer:
          'To buy, pick the exchange house with the lowest sell rate; to sell, the one with the highest buy rate. The spread also matters — the difference between the buy and sell price: the smaller that spread, the better the price for you. Between two houses with similar quotes, the one with the lower spread almost always leaves you better off. It also helps to choose the right operation type —cash (billete), transfer, cable or eBROU— because each has a different price. Comparing all three (price, spread and channel) is how you find the best deal.',
      },
      {
        id: 'moneda-uruguay',
        question: 'What is the currency of Uruguay?',
        answer:
          'Uruguay\'s official currency is the Uruguayan peso (code UYU, symbol $ or $U), issued by the Central Bank of Uruguay. It is divided into 100 centésimos and circulates in notes of 20, 50, 100, 200, 500, 1,000 and 2,000 pesos, plus coins of 1, 2, 5, 10 and 50 pesos. In practice, the US dollar is also widely used for savings, rent and large transactions, but everyday payments are in pesos. Unlike Argentina, Uruguay has no parallel ("blue") market: dollars are bought and sold freely at exchange houses and banks.',
      },
      {
        id: 'pagar-dolares',
        question: 'Can you pay in US dollars in Uruguay?',
        answer:
          'In tourist areas many hotels, restaurants and shops accept US dollars, but they usually apply their own, less favorable exchange rate than a casa de cambio. So for everyday spending it is almost always better to pay in Uruguayan pesos. If you bring US cash, change it at an exchange house and compare the rate (Cambio Uruguay shows where you get more); for large purchases, consider a card. The peso is legal tender, so you can always pay in pesos.',
      },
      {
        id: 'propinas',
        question: 'How much do you tip in Uruguay?',
        answer:
          'In Uruguay tipping is not mandatory, but it is customary to leave around 10% at restaurants and bars when the service was good; many card terminals let you add it. Note: the "cubierto" on the bill is a bread/table-service charge, not a tip. Taxi drivers are not usually tipped (rounding up at most). Porters and parking attendants ("cuidacoches") typically get about $20 to $50 in pesos. At cafés and counters, tipping is optional.',
      },
      {
        id: 'iva-turistas',
        question: 'Do foreign tourists pay VAT in Uruguay?',
        answer:
          'Non-resident tourists get VAT benefits in Uruguay when they pay with a foreign-issued card. Hotel lodging is VAT-exempt year-round (billed without the tax). For dining (restaurants, bars and cafés separate from lodging) there is a VAT reduction that applies seasonally —typically over the summer— and can change from year to year, so check the current period. In addition, on goods you can claim a "Tax Free" refund of part of the VAT when leaving the country. Cash payments do not qualify for these benefits.',
      },
      {
        id: 'brou',
        question: 'What is the BROU dollar rate and is it worth it?',
        answer:
          "BROU is the Banco de la República Oriental del Uruguay, the country's largest state-owned bank, and its dollar rate is one of the most searched. As a public bank it tends to be a bit more conservative than private exchange houses, especially for cash (dólar billete); through eBROU, its online platform, you can get more competitive rates. To know whether BROU's dollar is a good deal, compare it with the rest of the market: on Cambio Uruguay you see BROU's price side by side with over 40 exchange houses, updated automatically, so you can choose where to buy or sell at the best price.",
      },
    ],
  },
  pt: {
    curNames: { USD: 'dólar', EUR: 'euro', BRL: 'real', ARS: 'peso argentino' },
    curNamesPlural: { USD: 'dólares', EUR: 'euros', BRL: 'reais', ARS: 'pesos argentinos' },
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
          'As cotações são atualizadas automaticamente a cada 10 minutos a partir dos dados publicados pelas casas de câmbio de todo o país, junto com a referência do Banco Central do Uruguai (BCU). Essa frequência mantém a foto muito próxima do mercado ao vivo nos dias úteis; nos fins de semana e feriados, quando o mercado de câmbio não opera, o último preço fica como referência. Por isso, ao consultar o dólar, olhe a data e a hora do dado: uma cotação de minutos atrás é muito mais confiável para decidir do que uma de ontem.',
      },
      {
        id: 'data-source',
        question: 'De onde vêm os dados das cotações?',
        answer:
          'Os dados vêm de mais de 40 casas de câmbio e bancos de todo o Uruguai, junto com a cotação de referência do Banco Central do Uruguai (BCU). Cada casa publica seus próprios preços de compra e venda, consultados em tempo real e reunidos em um só lugar para comparação. A Cambio Uruguay não fixa preços nem cobra para operar: apenas coleta e organiza a informação para você ver de relance onde vale a pena comprar ou vender. A cotação INTERBANCARIO é mostrada apenas como referência atacadista entre bancos, pois não está disponível ao público.',
      },
      {
        id: 'how-choose',
        question: 'Como escolher a melhor casa de câmbio?',
        answer:
          'Para comprar, escolha a casa de câmbio com a menor cotação de venda; para vender, a com a maior cotação de compra. O spread também importa — a diferença entre o preço de compra e o de venda: quanto menor esse spread, melhor o preço para você. Entre duas casas com cotações parecidas, a de menor spread quase sempre te deixa em melhor situação. E convém escolher o tipo de operação certo —dinheiro (billete), transferência, cable ou eBROU—, porque cada um tem um preço diferente. Comparar as três coisas (preço, spread e canal) é como encontrar o melhor negócio.',
      },
      {
        id: 'moneda-uruguay',
        question: 'Qual é a moeda do Uruguai?',
        answer:
          'A moeda oficial do Uruguai é o peso uruguaio (código UYU, símbolo $ ou $U), emitido pelo Banco Central do Uruguai. Divide-se em 100 centésimos e circula em notas de 20, 50, 100, 200, 500, 1.000 e 2.000 pesos, além de moedas de 1, 2, 5, 10 e 50 pesos. Na prática, o dólar americano também é muito usado para poupança, aluguéis e operações grandes, mas os pagamentos do dia a dia são em pesos. Diferente da Argentina, o Uruguai não tem mercado paralelo ("dólar blue"): o dólar é comprado e vendido livremente em casas de câmbio e bancos.',
      },
      {
        id: 'pagar-dolares',
        question: 'É possível pagar em dólares no Uruguai?',
        answer:
          'Em áreas turísticas, muitos hotéis, restaurantes e lojas aceitam dólares americanos, mas costumam aplicar um câmbio próprio menos favorável que o de uma casa de câmbio. Por isso, para gastos do dia a dia quase sempre vale a pena pagar em pesos uruguaios. Se você traz dólares em espécie, troque numa casa de câmbio comparando o preço (a Cambio Uruguay mostra onde pagam mais); para compras grandes, considere o cartão. O peso é moeda de curso legal, então você sempre pode pagar em pesos.',
      },
      {
        id: 'propinas',
        question: 'Quanto se dá de gorjeta no Uruguai?',
        answer:
          'No Uruguai a gorjeta não é obrigatória, mas é comum deixar cerca de 10% em restaurantes e bares quando o serviço foi bom; muitas maquininhas permitem incluí-la no cartão. Atenção: o "cubierto" na conta é uma taxa de pão e serviço de mesa, não gorjeta. Em táxis não se costuma dar gorjeta (no máximo arredondar). A carregadores e "cuidacoches" costuma-se dar cerca de $20 a $50 em pesos. Em cafés e balcões, a gorjeta é opcional.',
      },
      {
        id: 'iva-turistas',
        question: 'Turistas estrangeiros pagam IVA no Uruguai?',
        answer:
          'Turistas não residentes têm benefícios de IVA no Uruguai ao pagar com cartão emitido no exterior. A hospedagem em hotéis é isenta de IVA o ano todo (faturada sem o imposto). Para gastronomia (restaurantes, bares e cafés independentes da hospedagem) há uma redução de IVA que vigora por temporada —geralmente no verão— e pode mudar de um ano para outro, então confira a vigência do período atual. Além disso, em compras de bens é possível pedir a devolução "Tax Free" de parte do IVA ao sair do país. Pagamentos em dinheiro não acessam esses benefícios.',
      },
      {
        id: 'brou',
        question: 'Quanto vale o dólar no BROU e vale a pena?',
        answer:
          'O BROU é o Banco de la República Oriental del Uruguay, o maior banco estatal do país, e sua cotação do dólar é uma das mais procuradas. Por ser um banco público, costuma ser um pouco mais conservadora que a das casas de câmbio privadas, sobretudo para o dólar em espécie (billete); pelo eBROU, sua plataforma online, é possível conseguir cotações mais competitivas. Para saber se o dólar do BROU vale a pena, compare-o com o resto do mercado: na Cambio Uruguay você vê o preço do BROU lado a lado com mais de 40 casas de câmbio, atualizado automaticamente, para escolher onde comprar ou vender pelo melhor preço.',
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
    // "comprar/vender dólares" reads better than "comprar dólar"; the rate/spread
    // questions keep the singular ("¿a cuánto está el dólar?").
    const curPlural = L.curNamesPlural[code] ?? cur
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
        question: L.buyQ(curPlural),
        answer:
          L.buyA({
            cur: curPlural,
            house: f.bestBuyHouse.name,
            rate: f.bestBuyHouse.rate.toFixed(2),
            savings: Math.max(0, f.bestBuyHouse.savingsVsAvg).toFixed(2),
          }) + L.disclaimer,
      })
    }
    if (f.bestSellHouse) {
      items.push({
        id: `sell-${code}`,
        question: L.sellQ(curPlural),
        answer:
          L.sellA({
            cur: curPlural,
            house: f.bestSellHouse.name,
            rate: f.bestSellHouse.rate.toFixed(2),
          }) + L.disclaimer,
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
