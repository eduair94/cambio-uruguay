// Recurring money/economy topics on Reddit Uruguay — pure classifier + aggregator
// for /temas-de-dinero-reddit and its daily refresh.
//
// PURE module (no Vue/Nuxt runtime) so it is unit-tested in plain Node and shared by
// the server store and the page. It turns the harvested corpus into "what Uruguayans
// keep asking about money", ranks the topics, and points each one at OUR relevant
// guide/tool — closing the loop from real demand to our content.
//
// Deterministic on purpose: counts and rankings come from keyword rules, never from a
// model. A topic matches only when a post's title/body hits its matcher AND is not
// obvious off-topic noise (NOISE), so a "pc gamer" or "Historias Bizarras" thread that
// merely contains a stray money word does not inflate a topic.

export interface RelatedLink {
  label: string
  to: string
}

export interface TopicDef {
  id: string
  label: string
  icon: string
  /** One line describing what people ask under this topic. */
  blurb: string
  /** A post matches the topic when this hits its title+body. */
  match: RegExp
  /** Broad search queries used to harvest this topic into the corpus. */
  queries: readonly string[]
  /** Our own pages/tools that answer this topic. */
  related: readonly RelatedLink[]
}

// Threads that carry a stray money word but are not money questions. Kept small and
// specific so it never swallows a real topic.
export const TOPIC_NOISE =
  /historias bizarras|meteorito|pc gamer|armar(?:me)? (?:una )?pc|placa de video|gpu|profesorado|licencia|vacaciones|receta|f[uú]tbol|mundial|videojuego|steam|anime/i

export const TOPIC_DEFS: readonly TopicDef[] = Object.freeze([
  {
    id: 'dolar-cambio',
    label: 'Dólar y cambio',
    icon: 'mdi-currency-usd',
    blurb: 'Cuándo comprar dólares, dónde conviene cambiar y a cuánto está.',
    match:
      /\bd[oó]lar(?:es)?\b|comprar d[oó]lares|casa de cambio|cotizaci[oó]n del d[oó]lar|tipo de cambio/i,
    queries: ['dolar', 'comprar dolares', 'casa de cambio', 'cotizacion dolar'],
    related: [
      { label: 'Dólar hoy', to: '/dolar-hoy' },
      { label: 'Mejor casa de cambio', to: '/mejor-casa-de-cambio' },
      { label: 'Convertir monedas', to: '/convertir' },
    ],
  },
  {
    id: 'ahorro-inversion',
    label: 'Ahorro e inversión',
    icon: 'mdi-chart-line',
    blurb: 'Dónde poner los pesos o dólares para que rindan sin arriesgar de más.',
    match:
      /\bahorr\w*|invert\w*|inversi[oó]n|plazo fijo|\bfci\b|renta fija|obligaciones negociables|\betf\b|d[oó]nde (?:poner|invertir)|hacer rendir/i,
    queries: ['ahorro', 'invertir', 'inversion', 'plazo fijo', 'donde invertir', 'renta fija'],
    related: [
      { label: 'Invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
    ],
  },
  {
    id: 'alquiler-vivienda',
    label: 'Alquiler y vivienda',
    icon: 'mdi-home-city-outline',
    blurb: 'Garantías, depósito, comisión, contrato y comprar contra alquilar.',
    match:
      /\balquil\w*|arriend\w*|inquilin\w*|garant[ií]a de alquiler|inmobiliar\w*|hipoteca|comprar (?:casa|apto|apartamento|vivienda)/i,
    queries: [
      'alquiler',
      'alquilar',
      'garantia alquiler',
      'inmobiliaria',
      'comprar casa',
      'hipoteca',
    ],
    related: [
      { label: 'Cómo alquilar en Uruguay', to: '/alquilar-en-uruguay' },
      { label: 'Alquilar estando en clearing', to: '/alquilar-estando-en-clearing' },
    ],
  },
  {
    id: 'deuda-clearing',
    label: 'Deudas y clearing',
    icon: 'mdi-account-alert-outline',
    blurb: 'Salir del clearing, negociar deudas y frenar los intereses.',
    match:
      /\bclearing\b|\bveraz\b|endeud\w*|salir de (?:la )?deuda|saldar deuda|refinanci\w*|me embargaron|\busura\b|central de riesgo/i,
    queries: ['clearing', 'deuda', 'salir de deudas', 'refinanciar', 'usura'],
    related: [
      { label: 'Salir del clearing', to: '/salir-del-clearing' },
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
    ],
  },
  {
    id: 'credito-prestamo',
    label: 'Créditos y préstamos',
    icon: 'mdi-hand-coin-outline',
    blurb: 'Qué tasa te cobran de verdad, cuotas y dónde pedir sin que te fundan.',
    match:
      /\bpr[eé]stamo\b|\bcr[eé]dito\b|financiar|\bcuotas\b|tasa de inter[eé]s|\btea\b|financiera|creditel|pronto|oca\b/i,
    queries: ['prestamo', 'credito', 'cuotas', 'tasa de interes', 'financiera'],
    related: [
      { label: 'Préstamos en Uruguay', to: '/prestamos-uruguay' },
      { label: '¿Conviene comprar en cuotas?', to: '/conviene-comprar-en-cuotas' },
    ],
  },
  {
    id: 'tarjetas',
    label: 'Tarjetas y beneficios',
    icon: 'mdi-credit-card-outline',
    blurb: 'Qué tarjeta da mejores beneficios y cómo pagar cuentas juntando puntos.',
    match:
      /tarjeta de (?:cr[eé]dito|d[eé]bito)|cashback|\bmillas\b|beneficios? (?:de|con) tarjeta|puntos? (?:de|con) tarjeta|\bvisa\b|mastercard|\bamex\b/i,
    queries: ['tarjeta de credito', 'cashback', 'millas', 'beneficios tarjeta'],
    related: [
      { label: 'Mejores tarjetas de crédito', to: '/tarjetas-de-credito-uruguay' },
      { label: 'Pagar cuentas con tarjeta', to: '/pagar-cuentas-con-tarjeta' },
    ],
  },
  {
    id: 'bancos-fintech',
    label: 'Bancos y fintech',
    icon: 'mdi-bank-outline',
    blurb: 'Qué banco o app conviene, cuenta sueldo y experiencias reales.',
    match:
      /\bbanco\b|\bbrou\b|\bit[aá]u\b|santander|scotia\w*|\bbbva\b|\bhsbc\b|\bprex\b|mercado pago|astropay|\bfintech\b|cuenta sueldo|mi dinero/i,
    queries: ['banco', 'brou', 'itau', 'prex', 'mercado pago', 'cuenta sueldo', 'mejor banco'],
    related: [
      { label: 'Mejores bancos de Uruguay', to: '/mejores-bancos-uruguay' },
      { label: 'Apps de dinero', to: '/apps-economia-uruguay' },
    ],
  },
  {
    id: 'impuestos',
    label: 'Impuestos',
    icon: 'mdi-percent-outline',
    blurb: 'IRPF, devolución, IASS y cómo tributan alquileres, inversiones e importaciones.',
    match:
      /\birpf\b|\biass\b|\bdgi\b|impuest\w*|declaraci[oó]n jurada|\biva\b|patrimonio|retenci[oó]n|devoluci[oó]n de irpf|cr[eé]dito fiscal/i,
    queries: ['irpf', 'iass', 'dgi', 'impuesto', 'devolucion irpf', 'declaracion jurada'],
    related: [
      { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
      { label: 'Franquicia y aduana', to: '/franquicia-aduana-uruguay' },
    ],
  },
  {
    id: 'sueldo-trabajo',
    label: 'Sueldo y trabajo',
    icon: 'mdi-cash-multiple',
    blurb: 'Sueldo líquido, aguinaldo, cobrar en dólares y organizar la plata.',
    match:
      /sueldo l[ií]quido|\bnominal\b|aguinaldo|cu[aá]nto (?:gan\w+|se cobra)|me pagan en d[oó]lares|salario m[ií]nimo|liquidaci[oó]n de sueldo/i,
    queries: ['sueldo liquido', 'aguinaldo', 'cuanto gana', 'salario', 'cobrar en dolares'],
    related: [
      { label: 'Calculadora de sueldo líquido', to: '/herramientas/calculadora-sueldo-liquido' },
      { label: 'Salud financiera', to: '/salud-financiera' },
    ],
  },
  {
    id: 'compras-import',
    label: 'Compras e importación',
    icon: 'mdi-truck-fast-outline',
    blurb: 'Courier, franquicia, aduana y comprar en Amazon, AliExpress o Shein.',
    match:
      /\bimportar\b|\bcourier\b|aliexpress|\bamazon\b|\bebay\b|\bshein\b|\baduana\b|franquicia|tiendamia|traer del exterior|compra internacional/i,
    queries: ['importar', 'courier', 'aliexpress', 'amazon', 'aduana', 'franquicia'],
    related: [
      { label: 'Couriers en Uruguay', to: '/couriers-uruguay' },
      { label: 'Carrito de importación', to: '/herramientas/carrito-importacion' },
    ],
  },
  {
    id: 'precios-inflacion',
    label: 'Precios e inflación',
    icon: 'mdi-basket-outline',
    blurb: 'Costo de vida, si algo está caro y cuánto gasta la gente por mes.',
    match:
      /inflaci[oó]n|carest[ií]a|costo de vida|est[aá] (?:muy )?car[oa]|canasta b[aá]sica|cu[aá]nto gastan|precios? (?:de|en) uruguay/i,
    queries: ['inflacion', 'costo de vida', 'esta caro', 'cuanto gastan', 'precios'],
    related: [
      { label: 'Calculadora de costo de vida', to: '/herramientas/costo-de-vida' },
      { label: 'Indicadores (UI, UR, BPC)', to: '/indicadores' },
    ],
  },
  {
    id: 'emprender-empresa',
    label: 'Emprender y empresa',
    icon: 'mdi-briefcase-outline',
    blurb: 'Qué empresa abrir, monotributo, facturar y arrancar un negocio.',
    match:
      /emprend\w*|monotributo|unipersonal|\bsas\b|\bsrl\b|abrir (?:una )?empresa|negocio propio|facturar(?:le)?/i,
    queries: ['emprender', 'monotributo', 'unipersonal', 'abrir empresa', 'facturar'],
    related: [{ label: 'Qué empresa abrir', to: '/que-empresa-abrir-uruguay' }],
  },
  {
    id: 'jubilacion-afap',
    label: 'Jubilación y AFAP',
    icon: 'mdi-account-clock-outline',
    blurb: 'AFAP, la reforma jubilatoria y cómo conviene armar el retiro.',
    match:
      /jubilaci[oó]n|\bafap\b|reforma (?:jubilatoria|de la seguridad social)|caja (?:profesional|bancaria|notarial)|edad de retiro/i,
    queries: ['jubilacion', 'afap', 'reforma jubilatoria', 'retiro'],
    related: [{ label: 'Invertir en Uruguay', to: '/inversiones-uruguay' }],
  },
  {
    id: 'cripto',
    label: 'Cripto',
    icon: 'mdi-bitcoin',
    blurb: 'Comprar cripto en Uruguay, cómo tributa y dónde tener la wallet.',
    match:
      /\bcripto\b|criptomoneda|bitcoin|ethereum|\busdt\b|stablecoin|\bbinance\b|\bwallet\b|blockchain/i,
    queries: ['cripto', 'bitcoin', 'usdt', 'invertir cripto'],
    related: [
      { label: 'Invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
    ],
  },
])

export const TOPIC_BY_ID = new Map(TOPIC_DEFS.map(t => [t.id, t]))

/** A post-like shape the classifier and aggregator read. */
export interface TopicPost {
  redditId: string
  title: string
  selftext?: string
  score: number
  numComments: number
  permalink: string
  date: string
  createdUtc: number
  sub: string
}

/** Which topics a post belongs to. Empty when it is off-topic or noise. */
export function classifyPost(post: { title: string; selftext?: string }): string[] {
  const hay = `${post.title} ${post.selftext ?? ''}`
  if (
    TOPIC_NOISE.test(hay) &&
    !/\b(?:irpf|dgi|clearing|alquil|d[oó]lar|pr[eé]stamo|jubilaci)/i.test(hay)
  ) {
    return []
  }
  return TOPIC_DEFS.filter(t => t.match.test(hay)).map(t => t.id)
}

export interface TopicThread {
  title: string
  permalink: string
  score: number
  numComments: number
  date: string
  sub: string
}

export interface TopicAggregate {
  id: string
  label: string
  icon: string
  blurb: string
  total: number
  recent: number
  related: RelatedLink[]
  sample: TopicThread[]
}

const isQuestion = (t: string) =>
  /[?¿]|consulta|duda|ayuda|alguien sabe|c[oó]mo|conviene|vale la pena|me pueden|qu[eé] opinan|recomiendan/i.test(
    t
  )

/**
 * Fold the corpus into ranked topics. `recentDays` counts how many posts landed
 * recently (momentum). Sample threads prefer questions and higher engagement, so the
 * page shows real doubts, not memes.
 */
export function aggregateTopics(
  posts: readonly TopicPost[],
  nowSec: number,
  recentDays = 90,
  sampleSize = 5
): TopicAggregate[] {
  const recentCut = nowSec - recentDays * 86_400
  const buckets = new Map<string, TopicPost[]>()
  for (const p of posts) {
    for (const id of classifyPost(p)) {
      const list = buckets.get(id)
      if (list) list.push(p)
      else buckets.set(id, [p])
    }
  }

  const out: TopicAggregate[] = []
  for (const def of TOPIC_DEFS) {
    const list = buckets.get(def.id) ?? []
    if (!list.length) continue
    const recent = list.filter(p => p.createdUtc >= recentCut).length
    const sample = [...list]
      .sort((a, b) => {
        const qa = isQuestion(`${a.title} ${a.selftext ?? ''}`) ? 1 : 0
        const qb = isQuestion(`${b.title} ${b.selftext ?? ''}`) ? 1 : 0
        if (qa !== qb) return qb - qa
        return b.numComments - a.numComments || b.createdUtc - a.createdUtc
      })
      .slice(0, sampleSize)
      .map(p => ({
        title: p.title,
        permalink: p.permalink,
        score: p.score,
        numComments: p.numComments,
        date: p.date,
        sub: p.sub,
      }))
    out.push({
      id: def.id,
      label: def.label,
      icon: def.icon,
      blurb: def.blurb,
      total: list.length,
      recent,
      related: [...def.related],
      sample,
    })
  }
  // Rank by momentum first (recent), then overall volume.
  return out.sort((a, b) => b.recent - a.recent || b.total - a.total)
}

/** Every distinct harvest query across all topics (deduped). */
export function topicHarvestQueries(): string[] {
  return [...new Set(TOPIC_DEFS.flatMap(t => t.queries))]
}
