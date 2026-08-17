// What to read next, computed from the navigation model.
//
// WHY THIS EXISTS: the analytics say the site is a collection of dead ends. A
// tweet put 471 sessions on `/tarjetas-de-credito-uruguay` in one morning and
// the whole site served 1,21 pages per session — people read the page they were
// sent to, found no visible way deeper, and left. Meanwhile the long tail that
// organic search actually feeds on (guides, tools, the programmatic families)
// gets almost no internal links pointing at it.
//
// So this module answers one question per route: given where the reader is,
// which five other pages are worth a click? It is deliberately computed rather
// than hand-curated — a hand-written adjacency map for ~100 hubs plus 1.255
// programmatic URLs would rot the day somebody adds a page, and `siteNav.ts`
// already carries the signal (per-entry Spanish keywords, section membership,
// sitemap priority) that a good answer needs.
//
// The block renders server-side on purpose: these are crawlable <a> links, so
// they spread internal PageRank into the long tail as well as giving the reader
// somewhere to go.
//
// PURE module (no Vue/Nuxt imports, relative imports only) so vitest can
// exercise the ranking directly — same contract as `siteNav.ts` and `ads.ts`.

import { isBareRoute } from './bareRoutes'
import { NAV_SECTIONS, tokenize } from './siteNav'

/** Locale prefixes the router can put in front of a path. */
const LOCALE_PREFIXES = ['/en', '/pt'] as const

/**
 * Routes that show no "what to read next" block.
 *
 * Three reasons, none of them about the page being unimportant:
 *   - it IS the navigation (`/`, `/buscar`, `/mapa-del-sitio`) and a second,
 *     worse list of links below it only competes with the good one;
 *   - it is a conversion or an account flow (`/conectar`, `/contacto`,
 *     `/cuenta`) where the job is to finish a form, not to leave;
 *   - it is plumbing (`/offline`, `/estado`) or legal boilerplate nobody browses.
 *
 * The chrome-free routes (`/widget`, `/pizarra`) drop out separately through
 * `isBareRoute`: they render without site chrome by design.
 */
const NO_RELATED = [
  '/cuenta',
  '/conectar',
  '/contacto',
  '/offline',
  '/estado',
  '/buscar',
  '/mapa-del-sitio',
  '/privacidad',
  '/terminos',
  '/acerca',
] as const

/**
 * Routes with no block of their own, whose children keep theirs.
 *
 * Both are indexes: `/herramientas` is already a wall of links to the tools and
 * `/newsletter` is the signup form. What sits below them is the opposite kind of
 * page — a calculator someone reached from Google, an archived issue someone is
 * reading — and those are among the best recirculation opportunities on the
 * site. Prefix-matching them into {@link NO_RELATED} silently took the block off
 * every tool page, which is the mistake this list exists to prevent.
 */
const NO_RELATED_EXACT = ['/herramientas', '/newsletter'] as const

/** Shown as a destination nowhere: same reasoning as {@link NO_RELATED}, plus the home page. */
const NEVER_SUGGEST = new Set<string>([
  '/',
  '/pizarra',
  '/estado',
  '/conectar',
  '/contacto',
  '/mapa-del-sitio',
  '/privacidad',
  '/terminos',
  '/acerca',
  '/estadisticas-del-sitio',
  '/analiticas',
])

/**
 * Tokens with no discriminating power in this corpus.
 *
 * Two families, both load-bearing. `uruguay` appears in roughly half the slugs
 * on the site, so leaving it in would make every page "related" to every other
 * page. The second family is the *intent* vocabulary — `mejor`, `ranking`,
 * `comparativa`, `conviene` — which the keyword lists use to catch search
 * phrasing. Those words say how a reader is asking, never what about: without
 * this list the credit-card ranking's nearest neighbour is the casa-de-cambio
 * ranking, on the strength of sharing the words "mejor" and "ranking".
 */
const STOPWORDS = new Set([
  'uruguay',
  'uruguayo',
  'uruguaya',
  'mejor',
  'peor',
  'ranking',
  'tier',
  'list',
  'comparativa',
  'comparar',
  'compara',
  'comparacion',
  'conviene',
  'convenient',
  'cual',
  'top',
  'guia',
  'tip',
  'info',
  'informacion',
  'todo',
  'toda',
  'ahora',
  'necesito',
  'quiero',
  'puedo',
  'saber',
  'hacer',
  'tener',
  'sirve',
  'paso',
  'del',
  'la',
  'el',
  'lo',
  'los',
  'las',
  'un',
  'una',
  'con',
  'sin',
  'por',
  'para',
  'que',
  'como',
  'mas',
  'muy',
  'hoy',
  'ser',
  'son',
  'esta',
  'este',
  'mi',
  'tu',
  'su',
  'me',
  'te',
  'le',
  'se',
  'no',
  'si',
  'donde',
  'cuando',
  'quien',
  'cual',
  'online',
  'web',
])

/** Below this the block would read as broken, so it gets padded. Above it, short is fine. */
const MIN_RELATED = 3

/** One suggestion, resolved to what the component needs to render a card. */
export interface RelatedPage {
  /** App-relative route, pre-`localePath()`. */
  to: string
  /** i18n key for the label — never a raw literal, so the block is trilingual for free. */
  labelKey: string
  /** MDI icon name. */
  icon: string
  /** i18n key of the owning section, rendered as the card's chip. */
  sectionKey: string
}

interface Candidate extends RelatedPage {
  section: string
  tokens: Set<string>
  priority: number
}

/** Crude Spanish singulariser: `tarjetas` → `tarjeta`, so plural and singular slugs meet. */
function singular(token: string): string {
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2)
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

/** Folded, de-pluralised, stopword-free content words. */
function contentTokens(phrases: readonly string[]): Set<string> {
  const out = new Set<string>()
  for (const phrase of phrases) {
    for (const raw of tokenize(phrase.replace(/[/-]/g, ' '))) {
      if (STOPWORDS.has(raw)) continue
      const token = singular(raw)
      if (token.length < 3 || STOPWORDS.has(token)) continue
      out.add(token)
    }
  }
  return out
}

/** Every internal nav route, flattened once and reused for every lookup. */
const CANDIDATES: readonly Candidate[] = Object.freeze(
  NAV_SECTIONS.flatMap(section =>
    section.entries
      .filter(entry => !!entry.to && !NEVER_SUGGEST.has(entry.to))
      .map(entry => ({
        to: entry.to as string,
        labelKey: entry.labelKey,
        icon: entry.icon,
        sectionKey: section.titleKey,
        section: section.id,
        tokens: contentTokens([entry.to as string, ...(entry.keywords ?? [])]),
        priority: entry.priority ?? 0.6,
      }))
  )
)

/**
 * Inverse document frequency per token, over the nav corpus.
 *
 * Counting shared words flat gets this wrong in a specific, predictable way:
 * `dolar` occurs in a third of the pages on a currency-exchange site, so two
 * pages sharing it have told you almost nothing, while two pages sharing
 * `clearing` or `aduana` are about the same thing. Weighting each shared token
 * by `log(N / df)` prices that in, and it needs no maintenance — the weights
 * follow the corpus as pages are added.
 */
const IDF: ReadonlyMap<string, number> = (() => {
  const df = new Map<string, number>()
  for (const candidate of CANDIDATES) {
    for (const token of candidate.tokens) df.set(token, (df.get(token) ?? 0) + 1)
  }
  const total = CANDIDATES.length
  return new Map([...df].map(([token, count]) => [token, Math.log(total / count)]))
})()

/** A shared token this weak is corpus noise, not a topic. */
const MIN_SIGNAL = 1

/** Suggestions must score at least this fraction of the best hit to be shown at all. */
const RELEVANCE_FLOOR = 0.4

/** Overlap this strong is topical on its own, however good the page's best neighbour is. */
const STRONG_SIGNAL = 3.5

/** Strips the query, a trailing slash and the locale prefix. `/en/mapa` → `/mapa`. */
export function normalizeRelatedPath(path: string): string {
  const clean = (path.split('?')[0] ?? '').split('#')[0]?.replace(/\/+$/, '') || '/'
  for (const prefix of LOCALE_PREFIXES) {
    if (clean === prefix) return '/'
    if (clean.startsWith(`${prefix}/`)) return clean.slice(prefix.length)
  }
  return clean
}

/** Exact match or a real path segment below it — `/casa` must not match `/casas-de-cambio`. */
function matches(path: string, list: readonly string[]): boolean {
  return list.some(entry => path === entry || path.startsWith(`${entry}/`))
}

/** True when `path` should render the "what to read next" block. */
export function relatedEnabledForPath(path: string): boolean {
  if (isBareRoute(path)) return false
  const clean = normalizeRelatedPath(path)
  if (clean === '/') return false
  if (NO_RELATED_EXACT.includes(clean as (typeof NO_RELATED_EXACT)[number])) return false
  return !matches(clean, NO_RELATED)
}

/**
 * Hand-picked neighbours for the routes that carry the traffic.
 *
 * The computed ranking is good enough for the long tail and needs no upkeep,
 * but on the handful of pages GA4 shows people actually landing on, "good
 * enough" is the difference between a click and a bounce — so those get an
 * editor's answer and the engine fills whatever is left. Keys resolve like nav
 * hubs do (longest path prefix), which is what lets one `/historico` entry
 * cover every casa-and-currency page under it.
 *
 * `tests/unit/relatedPages.test.ts` fails if any target here stops existing.
 */
export const CURATED: Readonly<Record<string, readonly string[]>> = Object.freeze({
  '/tarjetas-de-credito-uruguay': [
    '/conviene-comprar-en-cuotas',
    '/pagar-cuentas-con-tarjeta',
    '/tarjetas-de-debito-uruguay',
    '/mejores-bancos-uruguay',
    '/prestamos-uruguay',
    '/salud-financiera',
  ],
  '/tarjetas-de-debito-uruguay': [
    '/tarjetas-de-credito-uruguay',
    '/cobrar-en-dolares-gastar-en-pesos',
    '/retirar-efectivo-uruguay',
    '/mejores-bancos-uruguay',
  ],
  '/mejores-bancos-uruguay': [
    '/tarjetas-de-credito-uruguay',
    '/tarjetas-de-debito-uruguay',
    '/comparativas',
    '/apps-economia-uruguay',
    '/salir-del-clearing',
  ],
  // The three programmatic families are 1.250-odd URLs between them, so the
  // tail of a computed list repeats itself across hundreds of pages. Six
  // curated entries each cover the whole family through the prefix rule.
  '/historico': [
    '/dolar-hoy',
    '/por-que-sube-el-dolar',
    '/comparar',
    '/dolar/records',
    '/cotizacion',
    '/casas-de-cambio',
  ],
  '/casa': [
    '/casas-de-cambio',
    '/mejor-casa-de-cambio',
    '/historico',
    '/comparativas',
    '/sucursales',
    '/dolar-hoy',
  ],
  '/sucursal': [
    '/mapa',
    '/casa-de-cambio-cerca-de-mi',
    '/casas-de-cambio',
    '/mejor-casa-de-cambio',
    '/dolar-hoy',
  ],
  '/sucursales': [
    '/mapa',
    '/casa-de-cambio-cerca-de-mi',
    '/casas-de-cambio',
    '/mejor-casa-de-cambio',
    '/dolar-hoy',
  ],
  '/comparativas': [
    '/mejor-casa-de-cambio',
    '/casas-de-cambio',
    '/mejores-bancos-uruguay',
    '/tarjetas-de-credito-uruguay',
    '/dolar-hoy',
  ],
  '/herramientas/calculadora-plazo-fijo': [
    '/inversiones-uruguay',
    '/impuestos-inversiones-uruguay',
    '/indicadores',
    '/salud-financiera',
  ],
  '/herramientas/calculadora-sueldo-liquido': [
    '/cuanto-me-tienen-que-pagar-uruguay',
    '/vivir-con-25000-pesos-uruguay',
    '/declaracion-de-irpf-uruguay',
    '/salud-financiera',
  ],
  '/alquilar-estando-en-clearing': [
    '/salir-del-clearing',
    '/alquilar-en-uruguay',
    '/saldar-deudas-uruguay',
  ],
  '/prestamos-uruguay': [
    '/salir-del-clearing',
    '/saldar-deudas-uruguay',
    '/conviene-comprar-en-cuotas',
    '/tarjetas-de-credito-uruguay',
  ],
})

/** The curated neighbours for `clean`, resolved through the same longest-prefix rule as hubs. */
function curatedFor(clean: string): Candidate[] {
  let key: string | undefined
  for (const candidate of Object.keys(CURATED)) {
    if (clean === candidate) {
      key = candidate
      break
    }
    if (clean.startsWith(`${candidate}/`) && candidate.length > (key?.length ?? 0)) key = candidate
  }
  if (!key) return []
  return (
    (CURATED[key] ?? [])
      // A family key may legitimately list its own hub (`/casa` → `/historico`),
      // but never the page being viewed nor a hub the viewer is already inside.
      .filter(to => to !== clean && !clean.startsWith(`${to}/`))
      .map(to => CANDIDATES.find(c => c.to === to))
      .filter((c): c is Candidate => !!c)
  )
}

/**
 * The nav entry a route belongs to: exact hit, else the longest hub it sits
 * under. `/sucursal/brou-centro` resolves to `/sucursal`, which is what makes a
 * programmatic leaf inherit its family's section bonus.
 */
function sourceEntry(clean: string): Candidate | undefined {
  let best: Candidate | undefined
  for (const candidate of CANDIDATES) {
    if (candidate.to === clean) return candidate
    if (clean.startsWith(`${candidate.to}/`) && candidate.to.length > (best?.to.length ?? 0)) {
      best = candidate
    }
  }
  return best
}

/**
 * The pages worth reading after `path`, best first.
 *
 * Ranking, in one line: shared content words dominate, sharing a section breaks
 * near-ties, and sitemap priority breaks the rest. Tokens come from the **path
 * itself** as well as the matched nav entry, which is the trick that lets the
 * programmatic families work — `/casa/brou/comprar-dolares` has no entry of its
 * own, but its slug still says `casa`, `brou` and `dolar`, so it gets the casa
 * and dollar pages rather than a generic list.
 *
 * When the signal runs out the block gets SHORTER rather than padded with the
 * highest-priority pages on the site: three links a reader recognises as
 * relevant are worth more than six where half are the same two hubs that would
 * then appear under every thin page on the site. Padding only happens below
 * {@link MIN_RELATED}, where an almost-empty block would read as breakage, and
 * it draws from the top hit's own section so the filler at least stays on topic.
 */
export function relatedFor(path: string, limit = 6): RelatedPage[] {
  const clean = normalizeRelatedPath(path)
  const source = sourceEntry(clean)
  const tokens = new Set<string>([...contentTokens([clean]), ...(source?.tokens ?? [])])

  // Curated first, computed for the rest. Keeps the pages that actually carry
  // traffic hand-quality without anyone having to maintain 1.255 lists.
  const pinned = curatedFor(clean)
  const pinnedSet = new Set(pinned.map(c => c.to))

  const scored = CANDIDATES.filter(
    c => c.to !== clean && !clean.startsWith(`${c.to}/`) && !pinnedSet.has(c.to)
  )
    .map(candidate => {
      let signal = 0
      for (const token of tokens) {
        if (candidate.tokens.has(token)) signal += IDF.get(token) ?? 0
      }
      const sameSection = !!source && candidate.section === source.section
      return {
        candidate,
        signal,
        score: signal + (sameSection ? 1.5 : 0) + candidate.priority,
      }
    })
    .filter(
      row => row.signal >= MIN_SIGNAL || (!!source && row.candidate.section === source.section)
    )
    .sort(
      (a, b) =>
        b.score - a.score || b.signal - a.signal || a.candidate.to.localeCompare(b.candidate.to)
    )
  // Relative cutoff: keep only what is in the same league as the best hit. An
  // absolute threshold cannot work here because a page's best neighbour may
  // score 12 (`/importar/celulares`, a dense customs cluster) or 3 (a lone
  // calculator), and the sixth-best is worth showing in the first case and is
  // filler in the second.
  const top = scored[0]?.score ?? 0
  const kept = scored
    .filter(row => row.signal >= STRONG_SIGNAL || row.score >= top * RELEVANCE_FLOOR)
    .map(row => row.candidate)

  const picked: Candidate[] = [...pinned, ...kept].slice(0, limit)
  if (picked.length < MIN_RELATED) {
    const taken = new Set(picked.map(c => c.to))
    const theme = source?.section ?? picked[0]?.section
    const filler = CANDIDATES.filter(c => !taken.has(c.to) && c.to !== clean).sort(
      (a, b) =>
        Number(b.section === theme) - Number(a.section === theme) ||
        b.priority - a.priority ||
        a.to.localeCompare(b.to)
    )
    for (const candidate of filler) {
      if (picked.length >= MIN_RELATED) break
      picked.push(candidate)
    }
  }

  return picked.map(({ to, labelKey, icon, sectionKey }) => ({ to, labelKey, icon, sectionKey }))
}
