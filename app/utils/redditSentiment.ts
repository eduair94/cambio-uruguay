// app/utils/redditSentiment.ts
// Pure scoring core for "qué dice Reddit" on /mejores-bancos-uruguay.
//
// The tier list is our judgement; this is the counterweight — what Uruguayans
// actually say about each bank/fintech in r/uruguay, r/Burises, r/UruguayFinanzas…
// The server harvests threads (server/utils/reddit.ts), stores them in MongoDB and
// runs THIS module over them. Everything here is deterministic and framework-free so
// the numbers on the page can be re-derived, audited and unit-tested — no AI in the
// loop. (An optional AI pass only writes the prose summary on top; it never moves a
// number.)
//
// Honesty rules baked into the maths:
//   - Reddit is a complaint amplifier. A loud minority is not the market, so a thin
//     sample yields `sin datos` instead of a verdict (see `MIN_SAMPLE`).
//   - Old rants decay (half-life ~18 months): what a bank was in 2019 is not what it is now.
//   - Upvotes weigh, but logarithmically — a 500-upvote comment is not 500 opinions.
//   - Every published quote must carry its permalink, so the reader can check us.

/** The dimensions of the tier-list rubric a comment can be *about*. */
export type ThemeId = 'app' | 'comisiones' | 'atencion' | 'usd' | 'productos' | 'cobertura'

export type SentimentLabel =
  | 'muy positivo'
  | 'positivo'
  | 'mixto'
  | 'negativo'
  | 'muy negativo'
  | 'sin datos'

/** One thing somebody said: a post (title+body) or a comment. */
export interface RedditMention {
  id: string
  kind: 'post' | 'comment'
  text: string
  /** Reddit score (upvotes − downvotes). */
  score: number
  /** 'YYYY-MM-DD'. */
  date: string
  permalink: string
  sub: string
  /**
   * Did this sentence NAME the bank, or did it inherit the subject from its thread?
   * Inherited sentences still count towards the score, but they are never QUOTED: inside a
   * Santander thread, "recomiendo la web Deku deals para ofertas de juegos" is on-topic enough
   * to survive the theme filter, and publishing it as a quote about Santander would be a lie.
   */
  named?: boolean
}

export interface Quote {
  text: string
  permalink: string
  date: string
  score: number
  sub: string
  polarity: number
}

export interface EntitySentiment {
  id: string
  /** Everything attributed to the entity, opinions and passing references alike. */
  mentions: number
  positive: number
  negative: number
  neutral: number
  /** positive + negative — the only mentions that can move `net`. */
  opinions: number
  /** Weighted net sentiment over the OPINIONS, −100 (todos lo odian) … +100 (todos lo aman). */
  net: number
  label: SentimentLabel
  themes: Array<{ theme: ThemeId; count: number }>
  quotes: Quote[]
}

// ---------------------------------------------------------------------------
// Entity catalogue — what to search for, and how to recognise a mention
// ---------------------------------------------------------------------------

export interface RedditEntity {
  id: string
  name: string
  /** Search queries fed to the Reddit API by the harvester. */
  queries: readonly string[]
  /** Recognisers run over normalised (lower-case, unaccented) text. */
  patterns: readonly RegExp[]
}

/** `\b` is unreliable next to accented letters; we normalise first, then guard with these. */
const L = 'a-z0-9'
const bounded = (body: string) => new RegExp(`(?<![${L}])(?:${body})(?![${L}])`, 'i')

export const REDDIT_ENTITIES: readonly RedditEntity[] = Object.freeze([
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    queries: ['Mercado Pago', 'MercadoPago rendimiento', 'Mercado Pago tarjeta'],
    // Deliberately NOT matching "MercadoLibre": the marketplace collects its own rage
    // ("cada vez peor ese sitio", the seller-fee threads) and it is not the wallet we rank.
    patterns: [bounded('mercado\\s?pago')],
  },
  {
    id: 'itau',
    name: 'Itaú',
    queries: ['Itau', 'Itaú', 'app Itau'],
    patterns: [bounded('itau')],
  },
  {
    id: 'santander',
    name: 'Santander',
    queries: ['Santander', 'Santander Apple Pay', 'Apple Pay'],
    patterns: [bounded('santander')],
  },
  {
    id: 'brou',
    name: 'BROU',
    queries: ['BROU', 'eBROU', 'app BROU'],
    patterns: [bounded('brou'), bounded('ebrou'), bounded('banco republica')],
  },
  {
    id: 'bbva',
    name: 'BBVA',
    queries: ['BBVA', 'app BBVA'],
    patterns: [bounded('bbva')],
  },
  {
    id: 'takenos',
    name: 'Takenos',
    queries: ['Takenos'],
    patterns: [bounded('takenos')],
  },
  {
    id: 'heritage',
    name: 'Banco Heritage',
    queries: ['Banco Heritage', 'Heritage'],
    patterns: [bounded('heritage')],
  },
  {
    id: 'astropay',
    name: 'Astropay',
    queries: ['Astropay'],
    patterns: [bounded('astropay')],
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    queries: ['Scotiabank', 'Scotia'],
    patterns: [bounded('scotiabank'), bounded('scotia')],
  },
  {
    id: 'prex',
    name: 'Prex',
    queries: ['Prex', 'Prex soporte'],
    patterns: [bounded('prex')],
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    queries: ['BTG Pactual', 'BTG'],
    patterns: [bounded('btg')],
  },
  {
    // Kept as its own entity even though the board now lists BTG: Uruguayans still say "HSBC",
    // and folding that chatter into BTG would credit a two-day-old brand with a decade of
    // other people's reputation. The tier list shows BTG; this is the historical record.
    id: 'hsbc',
    name: 'HSBC (hoy BTG Pactual)',
    queries: ['HSBC'],
    patterns: [bounded('hsbc')],
  },
  // --- Card issuers (for /tarjetas-de-debito-uruguay and /tarjetas-de-credito-uruguay) ---
  {
    id: 'oca',
    name: 'OCA',
    queries: ['OCA Uruguay', 'tarjeta OCA', 'OCA Blue'],
    // `bounded` guards the word edges, so "boca", "poca", "loca", "toca" and "Boca"
    // cannot match — the preceding letter is inside the [a-z0-9] lookbehind.
    patterns: [bounded('oca'), bounded('oca\\s?blue')],
  },
  {
    id: 'midinero',
    name: 'MiDinero',
    queries: ['MiDinero', 'tarjeta MiDinero'],
    // ONE WORD ONLY, deliberately. "mi dinero" is ordinary Spanish for "my money"
    // ("saqué mi dinero", "perdí mi dinero"); matching it with a space would attribute
    // half the subreddit's savings talk to this card.
    patterns: [bounded('midinero')],
  },
  {
    id: 'creditel',
    name: 'Creditel',
    queries: ['Creditel'],
    patterns: [bounded('creditel')],
  },
  {
    id: 'passcard',
    name: 'PassCard',
    queries: ['PassCard'],
    // One word only: "pass card" as two words is generic English.
    patterns: [bounded('passcard')],
  },
  {
    id: 'cabal',
    name: 'Cabal',
    queries: ['tarjeta Cabal', 'Cabal Uruguay'],
    patterns: [bounded('cabal')],
  },
  {
    id: 'tiendainglesa',
    name: 'Tienda Inglesa',
    queries: ['Tienda Inglesa', 'Club Card Tienda Inglesa'],
    patterns: [bounded('tienda\\s?inglesa')],
  },
  // Deliberately NOT tracked — their names are ordinary Spanish words and any
  // pattern loose enough to catch the brand also catches everyday speech, which
  // would poison the sentiment rather than measure it:
  //   ANDA    → "anda" / "no anda la app" (the verb, everywhere in complaint threads)
  //   Pronto! → "pronto" ("soon")
  //   Líder   → "lider" ("leader")
  // If we ever want them, they need a disambiguating second token, not a bare word.
])

/**
 * Which entities belong to which page's conversation. The catalogue is shared
 * (one harvest, one score), but each page should only quote the brands it ranks:
 * the bank tier list has no business listing Creditel, and the card pages have no
 * business listing Banco Heritage.
 */
export const REDDIT_BANK_IDS: readonly string[] = Object.freeze([
  'brou',
  'itau',
  'santander',
  'scotiabank',
  'bbva',
  'btg',
  'hsbc',
  'heritage',
  'mercadopago',
  'prex',
  'astropay',
  'takenos',
])

/** Issuers behind the debit/prepaid and credit cards we rank. */
export const REDDIT_CARD_IDS: readonly string[] = Object.freeze([
  'prex',
  'oca',
  'midinero',
  'mercadopago',
  'astropay',
  'takenos',
  'brou',
  'itau',
  'santander',
  'scotiabank',
  'bbva',
  'btg',
  'creditel',
  'passcard',
  'cabal',
  'tiendainglesa',
])

/** Lower-case + strip diacritics, so "PÉSIMO" and "pesimo" are the same word. */
export function normalize(text: string): string {
  // NFD splits "é" into "e" + a combining mark; dropping the marks leaves plain ASCII letters.
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/** Which entities a piece of text is talking about (possibly none, possibly several). */
export function matchEntities(text: string): string[] {
  const norm = normalize(text)
  return REDDIT_ENTITIES.filter(e => e.patterns.some(p => p.test(norm))).map(e => e.id)
}

/** A sentence (or clause) attributed to exactly one entity. */
export interface AttributedSegment {
  entityId: string
  text: string
  /** True when the sentence named the bank itself; false when it inherited the subject. */
  named: boolean
}

/** Split into sentence-ish units. Reddit punctuation is sloppy, so newlines count too. */
function splitSegments(text: string): string[] {
  return text
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Who each sentence is really about.
 *
 * Attribution is per-SENTENCE, not per-comment, and that is load-bearing. Uruguayans rank
 * banks in one breath — "Santander es un asco, la app es horrible. Itaú en cambio anda joya."
 * Attributing the whole comment to every bank it names would put the Santander insult in
 * Itaú's mouth (and it did, on the real corpus). So:
 *
 *   - a sentence naming exactly ONE bank belongs to that bank;
 *   - a sentence naming SEVERAL is a comparison and belongs to nobody — we drop it rather
 *     than smear the same rant across three banks;
 *   - a sentence naming NONE continues the last bank named in the comment, or, failing that,
 *     inherits the thread's subject — but only when the thread is unambiguously about one bank.
 *
 * We would rather lose a real mention than credit the wrong bank with it.
 */
export function extractMentions(
  text: string,
  /**
   * The thread's SUBJECT — derived from its title, not from every bank named somewhere in
   * the body. A thread titled "Peor experiencia con BBVA" is about BBVA; one that happens to
   * mention BBVA in passing while discussing Sony's prices is not, and its comments must not
   * be scored as BBVA sentiment (they were).
   */
  subjectEntities: readonly string[] = []
): AttributedSegment[] {
  const threadSubject = subjectEntities.length === 1 ? subjectEntities[0]! : null
  const out: AttributedSegment[] = []
  let current: string | null = null // last bank named in THIS comment

  for (const seg of splitSegments(text)) {
    const named = matchEntities(seg)
    if (named.length === 1) {
      current = named[0]!
      out.push({ entityId: current, text: seg, named: true })
    } else if (named.length > 1) {
      current = null // a comparison: stop carrying a subject, and attribute nothing
    } else {
      // An unnamed sentence only counts if it is actually ABOUT banking. Threads wander —
      // an Itaú-loan thread drifts into the OP's relationship — and without this guard
      // "su familia es malísima" was being scored as sentiment about Itaú.
      const subject = current ?? threadSubject
      if (subject && themesFor(seg).length) out.push({ entityId: subject, text: seg, named: false })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Sentiment lexicon (Rioplatense Spanish — the way people actually complain here)
// ---------------------------------------------------------------------------

interface LexEntry {
  /** Canonical, accented form — this is what we report back as "matched". */
  term: string
  weight: number
}

/** Weights: ±1 mild, ±2 clear, ±3 damning/glowing. Order matters only for reporting. */
const LEXICON: readonly LexEntry[] = Object.freeze([
  // — negative —
  { term: 'una bosta', weight: -3 },
  { term: 'una cagada', weight: -3 },
  { term: 'estafa', weight: -3 },
  { term: 'estafaron', weight: -3 },
  { term: 'me robaron', weight: -3 },
  { term: 'robaron', weight: -3 },
  { term: 'chorros', weight: -3 },
  { term: 'garcas', weight: -3 },
  { term: 'pésimo', weight: -3 },
  { term: 'pésima', weight: -3 },
  { term: 'horrible', weight: -2 },
  { term: 'espantosa', weight: -2 },
  { term: 'espantoso', weight: -2 },
  { term: 'asco', weight: -3 },
  { term: 'nefasto', weight: -3 },
  { term: 'desastre', weight: -3 },
  { term: 'terrible', weight: -2 },
  { term: 'malísimo', weight: -2 },
  { term: 'malisima', weight: -2 },
  { term: 'una porquería', weight: -3 },
  { term: 'no sirve', weight: -2 },
  { term: 'se cuelga', weight: -2 },
  { term: 'no anda', weight: -2 },
  { term: 'no funciona', weight: -2 },
  { term: 'nunca funciona', weight: -3 },
  { term: 'lenta', weight: -1 },
  { term: 'lento', weight: -1 },
  { term: 'fea', weight: -1 },
  { term: 'feo', weight: -1 },
  { term: 'anticuada', weight: -1 },
  { term: 'obsoleta', weight: -2 },
  { term: 'incómoda', weight: -1 },
  { term: 'engorroso', weight: -1 },
  { term: 'burocracia', weight: -1 },
  { term: 'burocrático', weight: -1 },
  { term: 'carísimo', weight: -2 },
  { term: 'carísima', weight: -2 },
  { term: 'caro', weight: -1 },
  { term: 'cara', weight: -1 },
  { term: 'te cagan', weight: -3 },
  { term: 'te clavan', weight: -2 },
  { term: 'chantas', weight: -3 },
  { term: 'no te atienden', weight: -3 },
  { term: 'no atienden', weight: -2 },
  { term: 'no responden', weight: -2 },
  { term: 'me cerraron la cuenta', weight: -3 },
  { term: 'congelaron', weight: -3 },
  { term: 'bloquearon', weight: -2 },
  { term: 'phishing', weight: -2 },
  { term: 'fraude', weight: -2 },
  { term: 'reclamo', weight: -1 },
  { term: 'queja', weight: -1 },
  { term: 'huí', weight: -1 },
  { term: 'me fui', weight: -1 },
  { term: 'no lo recomiendo', weight: -3 },
  { term: 'evitá', weight: -2 },
  { term: 'evitalo', weight: -2 },
  { term: 'la peor', weight: -3 },
  { term: 'el peor', weight: -3 },
  { term: 'lo peor', weight: -3 },
  { term: 'peor', weight: -2 },
  { term: 'mal', weight: -1 },
  { term: 'malo', weight: -1 },
  { term: 'mala', weight: -1 },
  { term: 'decepción', weight: -2 },
  { term: 'vergüenza', weight: -2 },
  { term: 'un bajón', weight: -2 },
  { term: 'imposible', weight: -1 },
  { term: 'demora', weight: -1 },
  { term: 'demoras', weight: -1 },
  { term: 'perdí', weight: -1 },
  // — positive —
  { term: 'excelente', weight: 3 },
  { term: 'impecable', weight: 3 },
  { term: 'buenísimo', weight: 3 },
  { term: 'buenísima', weight: 3 },
  { term: 'lo mejor', weight: 3 },
  { term: 'la mejor', weight: 3 },
  { term: 'el mejor', weight: 3 },
  { term: 'mejor', weight: 1 },
  { term: 'recomiendo', weight: 2 },
  { term: 'recomendable', weight: 2 },
  { term: 'súper', weight: 1 },
  { term: 'genial', weight: 2 },
  { term: 'bárbaro', weight: 2 },
  { term: 'de diez', weight: 2 },
  { term: 'joya', weight: 2 },
  { term: 'anda bien', weight: 2 },
  { term: 'anda joya', weight: 3 },
  { term: 'funciona', weight: 1 },
  { term: 'rápida', weight: 1 },
  { term: 'rápido', weight: 1 },
  { term: 'cómoda', weight: 1 },
  { term: 'cómodo', weight: 1 },
  { term: 'práctica', weight: 1 },
  { term: 'práctico', weight: 1 },
  { term: 'sin problemas', weight: 2 },
  { term: 'sin drama', weight: 2 },
  { term: 'gratis', weight: 1 },
  { term: 'barato', weight: 1 },
  { term: 'conviene', weight: 1 },
  { term: 'me gusta', weight: 2 },
  { term: 'buena', weight: 1 },
  { term: 'bueno', weight: 1 },
  { term: 'contento', weight: 2 },
  { term: 'conforme', weight: 1 },
  { term: 'atienden bien', weight: 3 },
  { term: 'resolvieron', weight: 2 },
  { term: 'recomendado', weight: 2 },
])

/** Words that flip the term that follows them within `NEGATION_WINDOW` tokens. */
const NEGATORS = ['no', 'nunca', 'jamas', 'ni', 'tampoco', 'sin', 'nada']
const NEGATION_WINDOW = 3

/** Pre-compiled matchers, longest term first so "no anda" wins over "anda bien". */
const MATCHERS: ReadonlyArray<LexEntry & { re: RegExp; norm: string }> = Object.freeze(
  [...LEXICON]
    .map(e => ({ ...e, norm: normalize(e.term) }))
    .sort((a, b) => b.norm.length - a.norm.length)
    .map(e => ({ ...e, re: bounded(e.norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }))
)

export interface ScoredText {
  polarity: number
  matched: Array<{ term: string; weight: number; negated: boolean }>
}

/** True when a negator sits within the few tokens before `index` in `norm`. */
function isNegated(norm: string, index: number): boolean {
  const before = norm.slice(0, index).trim().split(/\s+/).slice(-NEGATION_WINDOW)
  return before.some(tok => NEGATORS.includes(tok.replace(/[^a-z]/g, '')))
}

/**
 * Lexicon polarity of a piece of text. Positive = praise, negative = complaint, 0 = no
 * sentiment terms at all. Longer phrases are consumed first and masked out, so a phrase
 * like "no anda" is scored once as a phrase rather than twice as "no" + "anda bien".
 */
export function scoreText(text: string): ScoredText {
  let norm = normalize(text)
  const matched: ScoredText['matched'] = []
  let polarity = 0

  for (const m of MATCHERS) {
    let guard = 0
    for (;;) {
      const hit = m.re.exec(norm)
      if (!hit || guard++ > 20) break
      const negated = isNegated(norm, hit.index)
      // A negated praise ("no funciona") becomes a complaint; a negated complaint
      // ("no es una bosta") is merely damped — people rarely defend a bank that way.
      const weight = negated ? (m.weight > 0 ? -m.weight : m.weight * 0.5) : m.weight
      polarity += weight
      matched.push({ term: m.term, weight, negated })
      // Mask the hit so shorter terms inside it cannot double-count.
      norm =
        norm.slice(0, hit.index) + ' '.repeat(hit[0].length) + norm.slice(hit.index + hit[0].length)
    }
  }

  return { polarity: Math.round(polarity * 100) / 100, matched }
}

// ---------------------------------------------------------------------------
// Themes — which rubric dimension a comment is about
// ---------------------------------------------------------------------------

const THEME_TERMS: Record<ThemeId, readonly string[]> = Object.freeze({
  app: [
    'app',
    'aplicacion',
    'aplicación',
    'home banking',
    'homebanking',
    'ebrou',
    'se cuelga',
    'login',
    'interfaz',
    'diseño',
    'ux',
    'ui',
    'web',
    'sitio',
    'pagina',
    'página',
    'plataforma',
    'actualizacion',
    'actualización',
    'actualizo',
    'bug',
    'celular',
    'token',
  ],
  comisiones: [
    'comision',
    'comisión',
    'comisiones',
    'mantenimiento',
    'costo',
    'costos',
    'tarifa',
    'tarifas',
    'cargo',
    'cobran',
    'cobraron',
    'me cobraron',
    'caro',
    'gratis',
  ],
  atencion: [
    'atencion',
    'atención',
    'soporte',
    'call center',
    'callcenter',
    'reclamo',
    'reclamos',
    'atienden',
    'atiende',
    'respuesta',
    'responden',
    'ejecutivo',
    'oficial de cuenta',
    'chat',
    'telefono',
    'teléfono',
  ],
  usd: [
    'dolar',
    'dólar',
    'dolares',
    'dólares',
    'usd',
    'exterior',
    'transferencia internacional',
    'wire',
    'swift',
    'freelance',
    'zona franca',
  ],
  productos: [
    'tarjeta',
    'tarjetas',
    'credito',
    'crédito',
    'prestamo',
    'préstamo',
    'hipoteca',
    'plazo fijo',
    'rendimiento',
    'rendimientos',
    'beneficio',
    'beneficios',
    'descuento',
    'descuentos',
    'puntos',
    'cashback',
  ],
  cobertura: [
    'cajero',
    'cajeros',
    'sucursal',
    'sucursales',
    'banred',
    'atm',
    'red',
    'interior',
    'cola',
    'colas',
  ],
})

const THEME_MATCHERS: ReadonlyArray<{ theme: ThemeId; re: RegExp }> = Object.freeze(
  (Object.keys(THEME_TERMS) as ThemeId[]).flatMap(theme =>
    THEME_TERMS[theme].map(t => ({
      theme,
      re: bounded(normalize(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    }))
  )
)

/** Which rubric dimensions a comment touches (deduped, in rubric order). */
export function themesFor(text: string): ThemeId[] {
  const norm = normalize(text)
  const found = new Set<ThemeId>()
  for (const m of THEME_MATCHERS) if (m.re.test(norm)) found.add(m.theme)
  return (Object.keys(THEME_TERMS) as ThemeId[]).filter(t => found.has(t))
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Below this many OPINIONS we refuse to publish a verdict. Note it counts opinions, not
 * mentions: a bank named 500 times in passing and actually judged twice has not been judged
 * by Reddit, and silence is not evidence.
 */
export const MIN_SAMPLE = 5

/** Rants age: a 2019 complaint counts for a fraction of a 2026 one. */
const HALF_LIFE_DAYS = 548 // ~18 months
const MIN_RECENCY = 0.15

/** Cap on how much a single comment can weigh, so one rant can't define a bank. */
const POLARITY_CAP = 3

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function recencyWeight(date: string, now: Date): number {
  const t = Date.parse(date)
  if (!Number.isFinite(t)) return MIN_RECENCY
  const ageDays = Math.max(0, (now.getTime() - t) / 86_400_000)
  return Math.max(MIN_RECENCY, 0.5 ** (ageDays / HALF_LIFE_DAYS))
}

/** Upvotes count, but sub-linearly: 500 upvotes is not 500 people writing 500 comments. */
function voteWeight(score: number): number {
  return 1 + Math.log10(1 + Math.max(0, score))
}

/** The published label for a net score — `sin datos` when too few people actually judged it. */
export function labelForNet(net: number, opinions: number): SentimentLabel {
  if (opinions < MIN_SAMPLE) return 'sin datos'
  if (net >= 45) return 'muy positivo'
  if (net >= 15) return 'positivo'
  if (net > -15) return 'mixto'
  if (net > -45) return 'negativo'
  return 'muy negativo'
}

const MAX_QUOTES_PER_POLARITY = 3
const QUOTE_MAX_CHARS = 280
/** How much of the sentence to keep before the bank's name, so the quote reads in context. */
const QUOTE_LEAD_CHARS = 70

/**
 * Normalise for matching while keeping a map back to the ORIGINAL indices — `normalize('NFD')`
 * changes the string's length, so a match offset found in the normalised text does not point at
 * the same character in the text we actually publish.
 */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const folded = text[i]!.toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
    for (const ch of folded) {
      norm += ch
      map.push(i)
    }
  }
  return { norm, map }
}

/**
 * A quote short enough to read, and centred on the bank it is attributed to.
 *
 * Naively cutting the first 280 chars published two BROU quotes whose visible text never said
 * "BROU" — the name sat further into a long post — which reads as us making it up. So when the
 * mention falls outside the window, the excerpt slides to include it.
 */
function trimQuote(text: string, entityId: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= QUOTE_MAX_CHARS) return clean

  const entity = REDDIT_ENTITIES.find(e => e.id === entityId)
  const { norm, map } = normalizeWithMap(clean)
  let at = -1
  for (const p of entity?.patterns ?? []) {
    const hit = p.exec(norm)
    if (hit && (at === -1 || hit.index < at)) at = hit.index
  }
  const nameAt = at >= 0 ? (map[at] ?? 0) : 0

  // Keep the head of the sentence unless the name lives past the cut.
  if (nameAt < QUOTE_MAX_CHARS - 20) {
    return clean.slice(0, QUOTE_MAX_CHARS).replace(/\s+\S*$/, '') + '…'
  }

  const rawStart = Math.max(0, nameAt - QUOTE_LEAD_CHARS)
  // Snap to a word boundary so the excerpt never starts mid-word.
  const spaceAt = clean.indexOf(' ', rawStart)
  const start = spaceAt > 0 && spaceAt - rawStart < 20 ? spaceAt + 1 : rawStart
  const slice = clean.slice(start, start + QUOTE_MAX_CHARS)
  const body = slice.length < clean.length - start ? slice.replace(/\s+\S*$/, '') + '…' : slice
  return (start > 0 ? '…' : '') + body
}

export interface AggregateOptions {
  /** Injectable clock — keeps the recency decay testable. */
  now?: Date
}

/**
 * Fold every mention of one entity into a publishable verdict: counts, a weighted net
 * score, the themes people keep raising, and the strongest cited quote of each polarity.
 */
export function aggregateEntitySentiment(
  id: string,
  mentions: readonly RedditMention[],
  opts: AggregateOptions = {}
): EntitySentiment {
  const now = opts.now ?? new Date()

  if (!mentions.length) {
    return {
      id,
      mentions: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      opinions: 0,
      net: 0,
      label: 'sin datos',
      themes: [],
      quotes: [],
    }
  }

  let positive = 0
  let negative = 0
  let neutral = 0
  let weightedSum = 0
  let weightTotal = 0
  const themeCounts = new Map<ThemeId, number>()
  const scored: Array<{ m: RedditMention; polarity: number; strength: number }> = []

  for (const m of mentions) {
    const { polarity } = scoreText(m.text)
    const isOpinion = Math.abs(polarity) > 0.5
    if (polarity > 0.5) positive++
    else if (polarity < -0.5) negative++
    else neutral++

    // Only opinions move the needle. Averaging over every passing reference would drag
    // every bank to a meaningless "mixto" — on the real corpus it dragged Prex, the most
    // hated fintech in the country, to a net of −2.
    if (isOpinion) {
      const w = recencyWeight(m.date, now) * voteWeight(m.score)
      weightedSum += clamp(polarity, -POLARITY_CAP, POLARITY_CAP) * w
      weightTotal += w * POLARITY_CAP
      scored.push({ m, polarity, strength: Math.abs(polarity) * w })
    }

    for (const t of themesFor(m.text)) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1)
  }

  const opinions = positive + negative
  const net = weightTotal ? Math.round(clamp((100 * weightedSum) / weightTotal, -100, 100)) : 0

  // We only ever publish a quote that NAMES the bank (see `RedditMention.named`). An inherited
  // sentence can move the number, but it can never be put in someone's mouth as a verdict.
  const citable = scored.filter(
    s => s.m.permalink && Math.abs(s.polarity) >= 1 && s.m.named !== false
  )
  const byStrength = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b.strength - a.strength
  const quotes: Quote[] = [
    ...citable
      .filter(s => s.polarity < 0)
      .sort(byStrength)
      .slice(0, MAX_QUOTES_PER_POLARITY),
    ...citable
      .filter(s => s.polarity > 0)
      .sort(byStrength)
      .slice(0, MAX_QUOTES_PER_POLARITY),
  ]
    .sort(byStrength)
    .map(s => ({
      text: trimQuote(s.m.text, id),
      permalink: s.m.permalink,
      date: s.m.date,
      score: s.m.score,
      sub: s.m.sub,
      polarity: s.polarity,
    }))

  const themes = [...themeCounts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))

  return {
    id,
    mentions: mentions.length,
    positive,
    negative,
    neutral,
    opinions,
    net,
    label: labelForNet(net, opinions),
    themes,
    quotes,
  }
}

/** Group loose mentions by entity and aggregate each — the whole board in one call. */
export function aggregateBoard(
  byEntity: Record<string, readonly RedditMention[]>,
  opts: AggregateOptions = {}
): EntitySentiment[] {
  return REDDIT_ENTITIES.map(e => aggregateEntitySentiment(e.id, byEntity[e.id] ?? [], opts)).sort(
    (a, b) => b.mentions - a.mentions
  )
}
