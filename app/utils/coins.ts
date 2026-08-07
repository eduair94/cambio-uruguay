// Content + helpers for the "where to get coins / small change in Uruguay"
// landing page (`pages/donde-conseguir-monedas-uruguay.vue`).
//
// This module is PURE (no Vue/Nuxt runtime, no global state, relative imports
// only) so it can be unit-tested in plain Node via vitest and reused by the page
// without duplicating the catalogue.
//
// It answers a real, poorly-served question: where an individual can get a large
// quantity of COINS / small change (e.g. $10.000–$90.000 in monedas), not the
// handful a kiosk or supermarket will spare. Mirrors the tri-locale content-tree
// pattern of `withdrawCash.ts` so locale parity is auditable and unit-testable.
//
// IMPORTANT — accuracy / YMYL: there is no published "coin-vending" service in
// Uruguay, and coin availability is a per-branch, per-day stock matter, not a
// uniform national policy. The copy therefore never asserts that a given bank or
// branch WILL hand out coins; it explains the realistic path (BCU → banks →
// businesses) and tells the reader to confirm with the specific branch. Facts
// are grounded in the sources listed in {@link COINS_SOURCES}, last checked on
// {@link LAST_RESEARCHED}.

/** The three supported UI locales. */
export type CoinsLocale = 'es' | 'en' | 'pt'

/** Date (YYYY-MM-DD) the facts on this page were last verified against sources. */
export const LAST_RESEARCHED = '2026-08-07'

/** App-relative path of the page; same slug for every locale (i18n prefixes en/pt). */
export const COINS_PATH = '/donde-conseguir-monedas-uruguay'

/** A titled prose section: one or more paragraphs plus optional bullet points. */
export interface CoinsSection {
  /** Stable id, used as the `<h2>` anchor and the `:key`. */
  id: string
  /** Section heading, rendered as an `<h2>`. */
  heading: string
  /** Body paragraphs (each a `<p>`). */
  paragraphs: string[]
  /** Optional bullet list rendered under the paragraphs. */
  bullets?: string[]
}

/** One step of the "how to get coins" HowTo (also emitted as HowToStep JSON-LD). */
export interface CoinsStep {
  /** Short imperative step name. */
  name: string
  /** One-sentence explanation. */
  text: string
}

/** A FAQ entry (also emitted as a Question in FAQPage JSON-LD). */
export interface CoinsFaq {
  /** Question. */
  q: string
  /** Answer (plain prose). */
  a: string
}

/** A related internal link rendered at the foot of the page. */
export interface CoinsLink {
  /** Visible label. */
  label: string
  /** App-relative path (passed through `localePath`). */
  to: string
}

/** UI chrome strings (labels, buttons, headings) for one locale. */
export interface CoinsUi {
  backToHome: string
  tldrTitle: string
  stepsTitle: string
  faqTitle: string
  sourcesTitle: string
  relatedTitle: string
  ctaTitle: string
  ctaText: string
  ctaButton: string
  disclaimer: string
  lastChecked: string
}

/** The complete, localized content tree for one locale. */
export interface CoinsContent {
  locale: CoinsLocale
  /** BCP-47 language tag for `inLanguage` / `<html lang>`. */
  lang: string
  /** `<h1>` / OG title. */
  title: string
  /** `<title>` (site name appended by the page). */
  metaTitle: string
  /** Meta description / OG description / lead paragraph. */
  description: string
  /** Comma-separated keywords meta. */
  keywords: string
  /** Quick-answer bullets shown at the top. */
  tldr: string[]
  /** Prose sections. */
  sections: CoinsSection[]
  /** Ordered how-to steps. */
  steps: CoinsStep[]
  /** FAQ entries. */
  faq: CoinsFaq[]
  /** Related internal links. */
  related: CoinsLink[]
  /** UI chrome. */
  ui: CoinsUi
}

/**
 * External sources the facts are grounded in. Kept to official/first-party
 * pages (BCU, BROU) so the "where does the coin actually come from" chain is
 * verifiable rather than asserted.
 */
export const COINS_SOURCES: readonly CoinsLink[] = [
  {
    label: 'BCU — Billetes y Monedas',
    to: 'https://www.bcu.gub.uy/Billetes-Monedas/Paginas/Inicio.aspx',
  },
  {
    label: 'BCU — Canje de billetes y monedas',
    to: 'https://subsitio.bcu.gub.uy/billetes-y-monedas/',
  },
  { label: 'BROU — Sucursales y servicios', to: 'https://www.brou.com.uy/sucursales-y-servicios' },
  { label: 'BROU — Asistencia (consultas)', to: 'https://asistencia.brou.com.uy/preguntas' },
  { label: 'BROU — Inicio', to: 'https://www.brou.com.uy/' },
]

const es: CoinsContent = {
  locale: 'es',
  lang: 'es-UY',
  title: 'Dónde conseguir monedas y cambio (sencillo) en Uruguay',
  metaTitle: 'Dónde conseguir monedas y cambio en cantidad en Uruguay',
  description:
    'Cómo conseguir monedas o cambio "sencillo" en cantidad en Uruguay ($10.000, $20.000 o más), sin depender de kioscos ni supermercados. Qué hace el BCU, cómo funciona en el BROU y otros bancos, y por qué depende de cada sucursal.',
  keywords:
    'dónde conseguir monedas Uruguay, cambiar billetes por monedas, conseguir sencillo, moneda fraccionaria, cambio chico, monedas BROU, canje de monedas BCU, monedas para comercio, conseguir cambio en cantidad',
  tldr: [
    'No existe un "servicio de venta de monedas" al público: la moneda la emite el BCU y baja a los bancos y comercios. Conseguir $10.000–$90.000 en monedas no es un trámite de mostrador estándar.',
    'El camino realista es pedirlas en un banco donde tengas cuenta y consultar en tesorería; muchas veces la sucursal las tiene que encargar según su stock.',
    'Que te lo cambien depende del stock de moneda fraccionaria de cada sucursal y del día, no de una política nacional uniforme; por eso funciona en una sucursal y en otra no.',
    'Llamá antes a la sucursal concreta, preguntá por tesorería, andá temprano y, si es recurrente o para un negocio, coordiná un pedido periódico con tu banco.',
  ],
  sections: [
    {
      id: 'de-donde-sale',
      heading: '¿De dónde salen las monedas?',
      paragraphs: [
        'El Banco Central del Uruguay (BCU) es el único que emite los billetes y acuña las monedas del país. Desde ahí la moneda se distribuye a los bancos del sistema financiero, y de los bancos y de la actividad diaria pasa a los comercios. No hay un mostrador público donde "comprar monedas": circulan a través de esa cadena.',
        'Por eso conseguir una cantidad grande de monedas de golpe (por ejemplo $10.000, $20.000 o más) no es un trámite estándar. La moneda fraccionaria es un recurso que cada punto de la cadena administra según lo que tiene, así que la disponibilidad varía mucho de un lugar a otro y de un día a otro.',
      ],
    },
    {
      id: 'donde-conseguir',
      heading: 'Dónde conseguir monedas en cantidad',
      paragraphs: ['Ordenadas de más a menos realista para una cantidad grande:'],
      bullets: [
        'Tu banco (como cliente): pedí en tesorería moneda fraccionaria. Es la vía más concreta para montos altos. Suele priorizarse a clientes con cuenta y, según la sucursal, puede requerir encargarlo con días de anticipación.',
        'Comercios de alto volumen de efectivo (supermercados, estaciones de servicio, empresas de ómnibus): son quienes más monedas mueven y a veces canjean, sobre todo si sos cliente habitual; pero rara vez sueltan $10.000–$90.000 de una vez.',
        'Si es para un negocio: un comercio puede pedir moneda fraccionaria a su propio banco, muchas veces con un pedido anticipado y coordinado con la sucursal.',
        'El BCU: canjea billetes y monedas deteriorados o desmonetizados (también se hace en los bancos del sistema financiero). Es canje de material dañado, no un servicio para proveerte de sencillo.',
      ],
    },
    {
      id: 'brou-todas-sucursales',
      heading: 'BROU: ¿lo hacen en todas las sucursales?',
      paragraphs: [
        'El BROU no publica un servicio garantizado de "billetes por monedas" igual en todas las sucursales. En la práctica, que una sucursal te cambie una cantidad de monedas depende del stock de moneda fraccionaria que tenga en su tesorería en ese momento.',
        'Eso explica tu experiencia: que te lo hicieran en una sucursal (por ejemplo la tesorería de un shopping) no significa que sea una política de esa sucursal sola ni que esté garantizado en todas. Antes de ir a otra —por ejemplo en Rocha— conviene llamar a esa sucursal específica, preguntar por tesorería y confirmar si te lo hacen, con qué límite y si necesitás ser cliente.',
      ],
    },
    {
      id: 'que-no-sirve',
      heading: 'Qué no te va a servir',
      paragraphs: ['Para una cantidad grande de monedas, estas opciones casi nunca alcanzan:'],
      bullets: [
        'Kioscos y supermercados: te pueden dar el vuelto o cambiar un billete chico, pero no fraccionar $10.000 o más en monedas; ellos también cuidan su sencillo.',
        'Casas de cambio: cambian divisas (dólares, reales, euros) por pesos y viceversa; no se dedican a fraccionar moneda nacional en cantidad.',
        'Cajeros automáticos: entregan billetes, nunca monedas.',
      ],
    },
    {
      id: 'interior-frontera',
      heading: 'En el interior y la frontera',
      paragraphs: [
        'Fuera de Montevideo la lógica es la misma, pero el stock de cada sucursal pesa todavía más: en ciudades chicas una sola tesorería abastece a toda la zona. Llamá antes a la sucursal local y, si podés, andá a primera hora, cuando es más probable que tengan moneda disponible.',
        'En las zonas de frontera el efectivo circula distinto por el movimiento con Brasil y Argentina, pero eso afecta sobre todo a las divisas: para conseguir monedas de peso uruguayo en cantidad seguís dependiendo del banco y su stock.',
      ],
    },
  ],
  steps: [
    {
      name: 'Llamá antes',
      text: 'Contactá a la sucursal o comercio concreto y preguntá directamente por tesorería y si tienen moneda fraccionaria disponible.',
    },
    {
      name: 'Confirmá las condiciones',
      text: 'Preguntá si necesitás ser cliente con cuenta, si hay un límite por día y qué documentación te piden.',
    },
    {
      name: 'Preguntá si hay que encargarlo',
      text: 'Para montos altos muchas sucursales tienen que pedir la moneda; consultá con cuántos días de anticipación.',
    },
    {
      name: 'Andá temprano y con los billetes contados',
      text: 'A primera hora suele haber más stock; llevá el importe exacto en billetes para agilizar el canje.',
    },
    {
      name: 'Coordiná un pedido recurrente',
      text: 'Si lo necesitás seguido o para un negocio, acordá con tu banco un pedido periódico de moneda fraccionaria.',
    },
  ],
  faq: [
    {
      q: '¿Los bancos cambian billetes por monedas?',
      a: 'Muchas sucursales lo hacen, sobre todo para clientes con cuenta, pero no es un servicio garantizado: depende del stock de moneda fraccionaria de esa sucursal ese día. Para cantidades grandes conviene consultarlo antes en tesorería.',
    },
    {
      q: '¿El BROU lo hace en todas las sucursales?',
      a: 'No de forma uniforme. Que una sucursal te cambie monedas depende de su stock; por eso puede funcionar en una y no en otra. Llamá a la sucursal específica y preguntá por tesorería antes de ir.',
    },
    {
      q: '¿Puedo conseguir monedas sin ser cliente del banco?',
      a: 'Es más difícil. Muchas sucursales priorizan a clientes con cuenta y a comercios para entregar moneda fraccionaria en cantidad. Sin cuenta puede que te limiten el monto o que no te lo hagan.',
    },
    {
      q: '¿Los kioscos o supermercados me dan cambio en cantidad?',
      a: 'No para $10.000–$90.000. Pueden darte el vuelto o cambiar un billete chico, pero necesitan su propio sencillo para operar, así que rara vez fraccionan montos altos.',
    },
    {
      q: '¿Las casas de cambio dan monedas?',
      a: 'No es su rubro. Las casas de cambio compran y venden divisas (dólares, reales, euros); no se dedican a fraccionar moneda nacional en monedas.',
    },
    {
      q: '¿El BCU cambia monedas al público?',
      a: 'El BCU emite la moneda y canjea billetes y monedas deteriorados o desmonetizados (también se hace en los bancos del sistema financiero). Ese canje es para reponer material dañado, no un servicio para proveerte de sencillo.',
    },
    {
      q: '¿Cómo consigo monedas para mi negocio?',
      a: 'Un comercio puede pedir moneda fraccionaria a su banco, normalmente con un pedido coordinado y a veces anticipado con la sucursal. Es la vía habitual para conseguir monedas de forma recurrente.',
    },
    {
      q: '¿Cuántas monedas puedo pedir?',
      a: 'Depende de la sucursal y de su stock del día; no hay un tope publicado único. Preguntá el límite al consultar en tesorería, porque puede variar según la disponibilidad.',
    },
  ],
  related: [
    { label: 'Retirar efectivo en Uruguay', to: '/retirar-efectivo-uruguay' },
    { label: 'Sucursales de casas de cambio y bancos', to: '/sucursales' },
    { label: 'Casas de cambio en Uruguay', to: '/casas-de-cambio' },
    { label: 'Mapa de sucursales', to: '/mapa' },
  ],
  ui: {
    backToHome: 'Volver al inicio',
    tldrTitle: 'Respuesta rápida',
    stepsTitle: 'Cómo conseguir monedas, paso a paso',
    faqTitle: 'Preguntas frecuentes',
    sourcesTitle: 'Fuentes',
    relatedTitle: 'Enlaces relacionados',
    ctaTitle: '¿Buscás una sucursal cerca?',
    ctaText: 'Encontrá la casa de cambio o el banco más cercano en el mapa y consultá antes de ir.',
    ctaButton: 'Ver el mapa de sucursales',
    disclaimer:
      'Información general, verificada con fuentes oficiales. La disponibilidad de monedas cambia por sucursal y por día: confirmá siempre con el local antes de ir.',
    lastChecked: 'Última verificación',
  },
}

const en: CoinsContent = {
  locale: 'en',
  lang: 'en',
  title: 'Where to get coins and small change in Uruguay',
  metaTitle: 'Where to get coins and small change in bulk in Uruguay',
  description:
    'How to get coins or small change in quantity in Uruguay (UYU 10,000, 20,000 or more) without relying on kiosks or supermarkets. What the BCU does, how it works at BROU and other banks, and why it depends on each branch.',
  keywords:
    'where to get coins Uruguay, exchange bills for coins, get small change Uruguay, coins in bulk, BROU coins, BCU coin exchange, coins for a business',
  tldr: [
    'There is no public "coin shop": coins are issued by the BCU and flow down to banks and businesses. Getting UYU 10,000–90,000 in coins is not a standard over-the-counter transaction.',
    'The realistic path is to ask at a bank where you hold an account and check with the teller/treasury; branches often have to order the coins depending on their stock.',
    'Whether they do it depends on each branch’s coin stock and the day, not a uniform national policy — which is why it works at one branch and not another.',
    'Call the specific branch first, ask for the treasury, go early, and if it is recurring or for a business, arrange a periodic order with your bank.',
  ],
  sections: [
    {
      id: 'de-donde-sale',
      heading: 'Where do the coins come from?',
      paragraphs: [
        'The Central Bank of Uruguay (BCU) is the sole issuer of the country’s banknotes and coins. From there, currency is distributed to the banks of the financial system, and from banks and everyday trade it reaches businesses. There is no public counter to "buy coins": they circulate through that chain.',
        'That is why getting a large amount of coins at once (say UYU 10,000, 20,000 or more) is not a standard transaction. Small change is a resource each point in the chain manages based on what it has, so availability varies a lot from place to place and day to day.',
      ],
    },
    {
      id: 'donde-conseguir',
      heading: 'Where to get coins in quantity',
      paragraphs: ['From most to least realistic for a large amount:'],
      bullets: [
        'Your bank (as an account holder): ask the treasury for small change. This is the most concrete route for large amounts. It usually prioritizes account holders and, depending on the branch, may require ordering it a few days ahead.',
        'High-cash-volume businesses (supermarkets, gas stations, bus companies): they handle the most coins and sometimes swap them, especially for regular customers; but they rarely release UYU 10,000–90,000 at once.',
        'For a business: a shop can request small change from its own bank, often via a coordinated, sometimes advance, order with the branch.',
        'The BCU: exchanges damaged or demonetized notes and coins (also done at the banks of the financial system). That is exchanging damaged material, not a service to supply you with change.',
      ],
    },
    {
      id: 'brou-todas-sucursales',
      heading: 'BROU: do all branches do it?',
      paragraphs: [
        'BROU does not publish a guaranteed "bills for coins" service that is identical at every branch. In practice, whether a branch changes a quantity of coins for you depends on the small-change stock in its treasury at that moment.',
        'That explains a common experience: having it done at one branch (say a shopping-mall treasury) does not mean it is a policy of that branch alone, nor that it is guaranteed everywhere. Before going to another one — for example in Rocha — it is best to call that specific branch, ask for the treasury, and confirm whether they will do it, up to what limit, and whether you need to be a customer.',
      ],
    },
    {
      id: 'que-no-sirve',
      heading: 'What will not work',
      paragraphs: ['For a large amount of coins, these options almost never suffice:'],
      bullets: [
        'Kiosks and supermarkets: they may give change or break a small bill, but not split UYU 10,000 or more into coins; they guard their own change too.',
        'Exchange houses: they trade foreign currency (dollars, reais, euros) for pesos and vice versa; they do not split national currency into coins in bulk.',
        'ATMs: they dispense banknotes, never coins.',
      ],
    },
    {
      id: 'interior-frontera',
      heading: 'In the interior and on the border',
      paragraphs: [
        'Outside Montevideo the logic is the same, but each branch’s stock matters even more: in small towns a single treasury supplies the whole area. Call the local branch first and, if you can, go first thing in the morning, when coins are more likely to be available.',
        'In border areas cash circulates differently because of trade with Brazil and Argentina, but that mostly affects foreign currency: to get Uruguayan-peso coins in quantity you still depend on the bank and its stock.',
      ],
    },
  ],
  steps: [
    {
      name: 'Call ahead',
      text: 'Contact the specific branch or business and ask directly for the treasury and whether they have small change available.',
    },
    {
      name: 'Confirm the conditions',
      text: 'Ask whether you need to be an account holder, whether there is a daily limit, and what documents they require.',
    },
    {
      name: 'Ask if it must be ordered',
      text: 'For large amounts many branches have to order the coins; ask how many days ahead you need to request them.',
    },
    {
      name: 'Go early with the bills counted',
      text: 'There is usually more stock first thing in the morning; bring the exact amount in bills to speed up the swap.',
    },
    {
      name: 'Arrange a recurring order',
      text: 'If you need it often or for a business, agree a periodic small-change order with your bank.',
    },
  ],
  faq: [
    {
      q: 'Do banks exchange bills for coins?',
      a: 'Many branches do, especially for account holders, but it is not guaranteed: it depends on that branch’s small-change stock that day. For large amounts, check with the treasury first.',
    },
    {
      q: 'Does BROU do it at every branch?',
      a: 'Not uniformly. Whether a branch changes coins for you depends on its stock, which is why it works at one and not another. Call the specific branch and ask for the treasury before going.',
    },
    {
      q: 'Can I get coins without being a bank customer?',
      a: 'It is harder. Many branches prioritize account holders and businesses when handing out small change in quantity. Without an account they may cap the amount or decline.',
    },
    {
      q: 'Will kiosks or supermarkets give me change in bulk?',
      a: 'Not for UYU 10,000–90,000. They may give change or break a small bill, but they need their own change to operate, so they rarely split large amounts.',
    },
    {
      q: 'Do exchange houses give out coins?',
      a: 'That is not their business. Exchange houses buy and sell foreign currency (dollars, reais, euros); they do not split national currency into coins.',
    },
    {
      q: 'Does the BCU exchange coins for the public?',
      a: 'The BCU issues the currency and exchanges damaged or demonetized notes and coins (also done at the banks of the financial system). That exchange is to replace damaged material, not a service to supply you with change.',
    },
    {
      q: 'How do I get coins for my business?',
      a: 'A shop can request small change from its bank, usually via a coordinated and sometimes advance order with the branch. That is the usual way to get coins on a recurring basis.',
    },
    {
      q: 'How many coins can I request?',
      a: 'It depends on the branch and its stock that day; there is no single published cap. Ask the limit when you check with the treasury, as it can vary by availability.',
    },
  ],
  related: [
    { label: 'Withdraw cash in Uruguay', to: '/retirar-efectivo-uruguay' },
    { label: 'Exchange-house and bank branches', to: '/sucursales' },
    { label: 'Exchange houses in Uruguay', to: '/casas-de-cambio' },
    { label: 'Branch map', to: '/mapa' },
  ],
  ui: {
    backToHome: 'Back to home',
    tldrTitle: 'Quick answer',
    stepsTitle: 'How to get coins, step by step',
    faqTitle: 'Frequently asked questions',
    sourcesTitle: 'Sources',
    relatedTitle: 'Related links',
    ctaTitle: 'Looking for a branch nearby?',
    ctaText: 'Find the nearest exchange house or bank on the map and check before you go.',
    ctaButton: 'Open the branch map',
    disclaimer:
      'General information, verified against official sources. Coin availability changes by branch and by day: always confirm with the location before going.',
    lastChecked: 'Last checked',
  },
}

const pt: CoinsContent = {
  locale: 'pt',
  lang: 'pt-BR',
  title: 'Onde conseguir moedas e troco (trocado) no Uruguai',
  metaTitle: 'Onde conseguir moedas e troco em quantidade no Uruguai',
  description:
    'Como conseguir moedas ou troco em quantidade no Uruguai (UYU 10.000, 20.000 ou mais) sem depender de quiosques nem supermercados. O que faz o BCU, como funciona no BROU e em outros bancos, e por que depende de cada agência.',
  keywords:
    'onde conseguir moedas Uruguai, trocar notas por moedas, conseguir trocado, moedas em quantidade, moedas BROU, troca de moedas BCU, moedas para comércio',
  tldr: [
    'Não existe uma "loja de moedas" ao público: a moeda é emitida pelo BCU e desce aos bancos e comércios. Conseguir UYU 10.000–90.000 em moedas não é um atendimento de balcão comum.',
    'O caminho realista é pedir num banco onde você tenha conta e consultar a tesouraria; muitas vezes a agência precisa encomendar as moedas conforme o estoque.',
    'Fazerem a troca depende do estoque de moedas de cada agência e do dia, não de uma política nacional uniforme — por isso funciona numa agência e em outra não.',
    'Ligue antes para a agência específica, pergunte pela tesouraria, vá cedo e, se for recorrente ou para um comércio, combine um pedido periódico com o seu banco.',
  ],
  sections: [
    {
      id: 'de-donde-sale',
      heading: 'De onde saem as moedas?',
      paragraphs: [
        'O Banco Central do Uruguai (BCU) é o único que emite as notas e cunha as moedas do país. De lá a moeda é distribuída aos bancos do sistema financeiro, e dos bancos e da atividade diária chega aos comércios. Não há um balcão público para "comprar moedas": elas circulam por essa cadeia.',
        'Por isso conseguir uma grande quantidade de moedas de uma vez (por exemplo UYU 10.000, 20.000 ou mais) não é um atendimento comum. O trocado é um recurso que cada ponto da cadeia administra conforme o que tem, então a disponibilidade varia muito de um lugar para outro e de um dia para outro.',
      ],
    },
    {
      id: 'donde-conseguir',
      heading: 'Onde conseguir moedas em quantidade',
      paragraphs: ['Da opção mais realista à menos realista para uma quantidade grande:'],
      bullets: [
        'Seu banco (como correntista): peça trocado na tesouraria. É a via mais concreta para valores altos. Costuma priorizar correntistas e, conforme a agência, pode exigir encomendar com alguns dias de antecedência.',
        'Comércios de alto volume de dinheiro (supermercados, postos de combustível, empresas de ônibus): são quem mais movimenta moedas e às vezes trocam, sobretudo para clientes habituais; mas raramente liberam UYU 10.000–90.000 de uma vez.',
        'Se for para um comércio: a loja pode pedir trocado ao próprio banco, muitas vezes com um pedido coordenado e às vezes antecipado com a agência.',
        'O BCU: troca notas e moedas deterioradas ou desmonetizadas (também é feito nos bancos do sistema financeiro). É troca de material danificado, não um serviço para lhe fornecer trocado.',
      ],
    },
    {
      id: 'brou-todas-sucursales',
      heading: 'BROU: fazem em todas as agências?',
      paragraphs: [
        'O BROU não publica um serviço garantido de "notas por moedas" igual em todas as agências. Na prática, uma agência trocar uma quantidade de moedas para você depende do estoque de trocado na tesouraria dela naquele momento.',
        'Isso explica uma experiência comum: terem feito a troca numa agência (por exemplo a tesouraria de um shopping) não significa que seja uma política só daquela agência, nem que esteja garantido em todas. Antes de ir a outra — por exemplo em Rocha — o melhor é ligar para aquela agência específica, perguntar pela tesouraria e confirmar se fazem, até que limite e se você precisa ser cliente.',
      ],
    },
    {
      id: 'que-no-sirve',
      heading: 'O que não vai adiantar',
      paragraphs: ['Para uma grande quantidade de moedas, estas opções quase nunca bastam:'],
      bullets: [
        'Quiosques e supermercados: podem dar o troco ou trocar uma nota pequena, mas não fracionar UYU 10.000 ou mais em moedas; eles também guardam o próprio trocado.',
        'Casas de câmbio: trocam divisas (dólares, reais, euros) por pesos e vice-versa; não fracionam moeda nacional em moedas em quantidade.',
        'Caixas eletrônicos: entregam notas, nunca moedas.',
      ],
    },
    {
      id: 'interior-frontera',
      heading: 'No interior e na fronteira',
      paragraphs: [
        'Fora de Montevidéu a lógica é a mesma, mas o estoque de cada agência pesa ainda mais: em cidades pequenas uma única tesouraria abastece toda a região. Ligue antes para a agência local e, se puder, vá logo cedo, quando é mais provável que haja moedas disponíveis.',
        'Nas zonas de fronteira o dinheiro circula de forma diferente pelo movimento com Brasil e Argentina, mas isso afeta principalmente as divisas: para conseguir moedas de peso uruguaio em quantidade você continua dependendo do banco e do estoque dele.',
      ],
    },
  ],
  steps: [
    {
      name: 'Ligue antes',
      text: 'Entre em contato com a agência ou comércio específico e pergunte diretamente pela tesouraria e se têm trocado disponível.',
    },
    {
      name: 'Confirme as condições',
      text: 'Pergunte se você precisa ser correntista, se há um limite por dia e quais documentos exigem.',
    },
    {
      name: 'Pergunte se precisa encomendar',
      text: 'Para valores altos muitas agências precisam pedir as moedas; consulte com quantos dias de antecedência.',
    },
    {
      name: 'Vá cedo e com as notas contadas',
      text: 'Logo cedo costuma haver mais estoque; leve o valor exato em notas para agilizar a troca.',
    },
    {
      name: 'Combine um pedido recorrente',
      text: 'Se você precisa com frequência ou para um comércio, combine com o seu banco um pedido periódico de trocado.',
    },
  ],
  faq: [
    {
      q: 'Os bancos trocam notas por moedas?',
      a: 'Muitas agências fazem, sobretudo para correntistas, mas não é garantido: depende do estoque de moedas daquela agência naquele dia. Para quantidades grandes, consulte antes a tesouraria.',
    },
    {
      q: 'O BROU faz em todas as agências?',
      a: 'Não de forma uniforme. Uma agência trocar moedas depende do estoque dela, por isso funciona numa e em outra não. Ligue para a agência específica e pergunte pela tesouraria antes de ir.',
    },
    {
      q: 'Posso conseguir moedas sem ser cliente do banco?',
      a: 'É mais difícil. Muitas agências priorizam correntistas e comércios para entregar trocado em quantidade. Sem conta, podem limitar o valor ou não fazer.',
    },
    {
      q: 'Quiosques ou supermercados me dão troco em quantidade?',
      a: 'Não para UYU 10.000–90.000. Podem dar o troco ou trocar uma nota pequena, mas precisam do próprio trocado para operar, então raramente fracionam valores altos.',
    },
    {
      q: 'As casas de câmbio dão moedas?',
      a: 'Não é o ramo delas. As casas de câmbio compram e vendem divisas (dólares, reais, euros); não fracionam moeda nacional em moedas.',
    },
    {
      q: 'O BCU troca moedas para o público?',
      a: 'O BCU emite a moeda e troca notas e moedas deterioradas ou desmonetizadas (também feito nos bancos do sistema financeiro). Essa troca é para repor material danificado, não um serviço para lhe fornecer trocado.',
    },
    {
      q: 'Como consigo moedas para o meu comércio?',
      a: 'Uma loja pode pedir trocado ao seu banco, normalmente com um pedido coordenado e às vezes antecipado com a agência. É a via habitual para conseguir moedas de forma recorrente.',
    },
    {
      q: 'Quantas moedas posso pedir?',
      a: 'Depende da agência e do estoque do dia; não há um limite único publicado. Pergunte o limite ao consultar a tesouraria, pois pode variar conforme a disponibilidade.',
    },
  ],
  related: [
    { label: 'Sacar dinheiro no Uruguai', to: '/retirar-efectivo-uruguay' },
    { label: 'Agências de casas de câmbio e bancos', to: '/sucursales' },
    { label: 'Casas de câmbio no Uruguai', to: '/casas-de-cambio' },
    { label: 'Mapa de agências', to: '/mapa' },
  ],
  ui: {
    backToHome: 'Voltar ao início',
    tldrTitle: 'Resposta rápida',
    stepsTitle: 'Como conseguir moedas, passo a passo',
    faqTitle: 'Perguntas frequentes',
    sourcesTitle: 'Fontes',
    relatedTitle: 'Links relacionados',
    ctaTitle: 'Procurando uma agência por perto?',
    ctaText: 'Encontre a casa de câmbio ou o banco mais próximo no mapa e consulte antes de ir.',
    ctaButton: 'Ver o mapa de agências',
    disclaimer:
      'Informação geral, verificada com fontes oficiais. A disponibilidade de moedas muda por agência e por dia: confirme sempre com o local antes de ir.',
    lastChecked: 'Última verificação',
  },
}

/** The complete content tree, keyed by locale. */
export const coinsContent: Record<CoinsLocale, CoinsContent> = { es, en, pt }

/** Resolve the content tree for a UI locale, falling back to Spanish. */
export function getCoinsContent(locale: string): CoinsContent {
  return coinsContent[locale as CoinsLocale] ?? coinsContent.es
}
