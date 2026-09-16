// Tipos y utilidades puras del termómetro del mercado IT (/mercado-it-uruguay). Lo comparten la
// página, el buscador y la API (server/api/charruadevs/*). El snapshot lo escribe el job del
// backend `currency-charruadevs` (classes/charruadevs/analyze.ts): los tipos de abajo son su espejo.

export interface StanceMeta {
  value: number
  label: string
  phrase: string
  color: string
}

/**
 * La escala −2…+2 con la que se clasificó cada texto, en palabras del propio sub. Colores del
 * sistema (DESIGN.md, "Sentiment"): el tono canónico para ±1 —donde está casi toda la masa— y un
 * paso más profundo de la misma rampa para los extremos. Son rellenos, nunca color de texto.
 */
export const STANCE_META: StanceMeta[] = [
  { value: -2, label: 'Catastrofista', phrase: '«se terminó»', color: '#e60b00' },
  { value: -1, label: 'Pesimista', phrase: '«está brava»', color: '#ff655d' },
  { value: 0, label: 'Neutral', phrase: '«depende»', color: '#7d8aa3' },
  { value: 1, label: 'Optimista', phrase: '«hay laburo»', color: '#35d07f' },
  { value: 2, label: 'Muy optimista', phrase: '«sobra trabajo»', color: '#208952' },
]

export function stanceMeta(value: number | null | undefined): StanceMeta {
  return STANCE_META.find(s => s.value === value) ?? STANCE_META[2]!
}

export const THEME_LABELS: Record<string, string> = {
  ia: 'IA y el trabajo',
  despidos: 'Despidos y recortes',
  busqueda: 'Buscar trabajo',
  junior: 'Entrar al mercado (juniors)',
  sueldos: 'Sueldos y tarifas',
  dolar_costos: 'Dólar, costos e impuestos',
  exterior: 'Trabajar para afuera',
  saturacion: 'Saturación y competencia',
  entrevistas: 'Entrevistas y procesos',
  estudio: 'Estudiar o no',
  condiciones: 'Burnout y condiciones',
  emigrar: 'Emigrar',
  empresas_uy: 'Empresas uruguayas',
  emprender: 'Freelance y emprender',
}

export const AI_LABELS: Record<string, string> = {
  amenaza: 'La ve como amenaza',
  herramienta: 'La ve como herramienta',
  hype: 'Dice que es puro hype',
  mixto: 'Mixto',
}

export const EVENT_LABELS: Record<string, string> = {
  busca: 'Busca y no consigue',
  consiguio: 'Consiguió laburo',
  despedido: 'Lo echaron',
  contrata: 'Está contratando',
}

export const PERSONA_LABELS: Record<string, string> = {
  estudiante: 'Estudiantes',
  junior: 'Juniors',
  semisenior: 'Semi senior',
  senior: 'Seniors',
  cambio_carrera: 'Cambio de carrera',
  empresa_reclutador: 'Empresas y reclutadores',
  desconocido: 'Sin dato',
}

// ---------------------------------------------------------------- búsqueda

export type SearchSort = 'recent' | 'votes' | 'relevance'

export interface SearchQuery {
  q: string
  stance: number[]
  kind: '' | 'post' | 'comment'
  theme: string
  ai: string
  event: string
  from: number | null
  to: number | null
  sort: SearchSort
  page: number
}

export const SEARCH_PER_PAGE = 20
export const SEARCH_MAX_PAGE = 250

export const DEFAULT_SEARCH_QUERY: SearchQuery = {
  q: '',
  stance: [],
  kind: '',
  theme: '',
  ai: '',
  event: '',
  from: null,
  to: null,
  sort: 'recent',
  page: 1,
}

function first(v: unknown): string {
  const x = Array.isArray(v) ? v[0] : v
  if (typeof x === 'string') return x
  if (typeof x === 'number') return String(x)
  return ''
}

function intIn(v: unknown, min: number, max: number): number | null {
  const n = Number.parseInt(first(v), 10)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

function pick(v: unknown, table: Record<string, string>): string {
  const x = first(v)
  return Object.prototype.hasOwnProperty.call(table, x) ? x : ''
}

/**
 * La query de la URL → una búsqueda válida. La usan la página (la URL es el estado) y la API, así
 * que un parámetro inventado nunca llega a Mongo: se descarta y queda el valor por defecto.
 */
export function normalizeSearchQuery(raw: Record<string, unknown>): SearchQuery {
  const q = first(raw.q).replace(/\s+/g, ' ').trim().slice(0, 100)
  const stance = [
    ...new Set(
      first(raw.s)
        .split(',')
        .map(s => Number.parseInt(s.replace('−', '-'), 10))
        .filter(n => Number.isInteger(n) && n >= -2 && n <= 2)
    ),
  ].sort((a, b) => a - b)
  const kindRaw = first(raw.k)
  const kind: SearchQuery['kind'] = kindRaw === 'post' || kindRaw === 'comment' ? kindRaw : ''
  let from = intIn(raw.desde, 2021, 2100)
  let to = intIn(raw.hasta, 2021, 2100)
  if (from != null && to != null && from > to) [from, to] = [to, from]
  const sortRaw = first(raw.orden)
  let sort: SearchSort = sortRaw === 'votes' || sortRaw === 'relevance' ? sortRaw : 'recent'
  if (sort === 'relevance' && !q) sort = 'recent'
  return {
    q,
    stance,
    kind,
    theme: pick(raw.t, THEME_LABELS),
    ai: pick(raw.ia, AI_LABELS),
    event: pick(raw.ev, EVENT_LABELS),
    from,
    to,
    sort,
    page: intIn(raw.p, 1, SEARCH_MAX_PAGE) ?? 1,
  }
}

/** La búsqueda → parámetros de URL, omitiendo todo lo que ya es el valor por defecto. */
export function searchQueryToParams(q: SearchQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (q.q) out.q = q.q
  if (q.stance.length) out.s = q.stance.join(',')
  if (q.kind) out.k = q.kind
  if (q.theme) out.t = q.theme
  if (q.ai) out.ia = q.ai
  if (q.event) out.ev = q.event
  if (q.from != null) out.desde = String(q.from)
  if (q.to != null) out.hasta = String(q.to)
  if (q.sort !== 'recent') out.orden = q.sort
  if (q.page > 1) out.p = String(q.page)
  return out
}

export function isDefaultSearch(q: SearchQuery): boolean {
  return Object.keys(searchQueryToParams(q)).length === 0
}

function foldChar(ch: string): string {
  const f = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  return f.length === 1 ? f : ch
}

/**
 * Plegado 1:1 por unidad UTF-16 (sin tildes, minúsculas). Que conserve el largo es el punto: los
 * índices de una coincidencia en el texto plegado sirven para cortar el original.
 */
export function fold(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) out += foldChar(text[i]!)
  return out
}

/** Los términos a resaltar: palabras de 2+ letras, sin comillas ni operadores, máximo 6. */
export function queryTerms(q: string): string[] {
  return [
    ...new Set(
      fold(q)
        .replace(/["'()*+?[\]{}\\^$|.,;:!¡¿]/g, ' ')
        .split(/\s+/)
        .map(t => t.replace(/^-+/, ''))
        .filter(t => t.length >= 2)
    ),
  ].slice(0, 6)
}

export interface Segment {
  text: string
  hit: boolean
}

const WORD_CHAR = /[\p{L}\p{N}]/u

/**
 * La próxima aparición de `term` que empieza una palabra. Los términos de hasta 3 letras además
 * tienen que terminarla: buscar "IA" no puede resaltar el "ia" de "industrias" (el buscador de Mongo
 * ya compara palabras enteras; el resaltado tiene que decir lo mismo). Los largos admiten sufijo,
 * como el stemming: "despid" encuentra "despidieron".
 */
function findWord(folded: string, term: string, from = 0): number {
  let i = folded.indexOf(term, from)
  while (i >= 0) {
    const end = i + term.length
    const startsWord = i === 0 || !WORD_CHAR.test(folded[i - 1]!)
    const endsWord = term.length > 3 || end === folded.length || !WORD_CHAR.test(folded[end]!)
    if (startsWord && endsWord) return i
    i = folded.indexOf(term, i + 1)
  }
  return -1
}

/** Corta `text` en tramos con y sin coincidencia, sin tildes ni mayúsculas. Nunca HTML. */
export function highlightSegments(text: string, terms: string[]): Segment[] {
  if (!text) return []
  if (!terms.length) return [{ text, hit: false }]
  const folded = fold(text)
  const ranges: Array<[number, number]> = []
  for (const term of terms) {
    let i = findWord(folded, term)
    while (i >= 0) {
      ranges.push([i, i + term.length])
      i = findWord(folded, term, i + term.length)
    }
  }
  if (!ranges.length) return [{ text, hit: false }]
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  const out: Segment[] = []
  let pos = 0
  for (const [a, b] of merged) {
    if (a > pos) out.push({ text: text.slice(pos, a), hit: false })
    out.push({ text: text.slice(a, b), hit: true })
    pos = b
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false })
  return out
}

/** Un extracto de hasta `max` caracteres centrado en la primera coincidencia. */
export function excerptAround(body: string, terms: string[], max = 320): string {
  const text = (body || '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const folded = fold(text)
  let at = -1
  for (const t of terms) {
    const i = findWord(folded, t)
    if (i >= 0 && (at < 0 || i < at)) at = i
  }
  if (at < 0) return `${text.slice(0, max).replace(/\s+\S*$/, '')} …`
  let start = Math.max(0, at - Math.floor(max / 3))
  let end = Math.min(text.length, start + max)
  start = Math.max(0, end - max)
  if (start > 0) {
    const sp = text.indexOf(' ', start)
    if (sp >= 0 && sp < at) start = sp + 1
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(' ', end)
    if (sp > at) end = sp
  }
  return `${start > 0 ? '… ' : ''}${text.slice(start, end)}${end < text.length ? ' …' : ''}`
}

export interface SearchItem {
  rid: string
  kind: 'post' | 'comment'
  url: string
  title: string
  excerpt: string
  createdAt: string
  score: number
  stance: number | null
  themes: string[]
  ai: string | null
  event: string
}

/**
 * El tono de la búsqueda. Se calcula SIN el filtro de sentimiento: `all` es cuántas opiniones hay
 * sobre lo buscado, y `stance`/`byYear` cómo se reparten, aunque la lista muestre sólo una parte.
 */
export interface SearchFacets {
  stance: Record<string, number>
  byYear: Array<{ y: number; neg: number; neu: number; pos: number }>
  all: number
}

export interface SearchResponse {
  total: number
  page: number
  perPage: number
  items: SearchItem[]
  facets: SearchFacets
}

// ---------------------------------------------------------------- snapshot

type Num = number | null

export interface WindowStats {
  n: Num
  raw: number
  mean: Num
  neg: Num
  pos: Num
  net: Num
  negOfOpinion: Num
  aiShare: Num
  aiNeg: Num
  negPosts: Num
  negComments: Num
}

export interface MonthStat {
  m: string
  partial: boolean
  posts: number
  comments: number
  rel: number
  relShare: Num
  neg: Num
  pos: Num
  net: Num
  negOfOpinion: Num
  rel3: number
  neg3: Num
  pos3: Num
  net3: Num
  negOfOpinion3: Num
  aiShare3: Num
  offers: number
}

export interface YearStat {
  y: number
  n: Num
  raw: number
  mean: Num
  neg: Num
  pos: Num
  net: Num
  negOfOpinion: Num
  dist: Record<string, Num>
  aiShare: Num
  negPosts: Num
  negComments: Num
}

export interface QuarterStat {
  q: string
  n: Num
  raw: number
  neg: Num
  pos: Num
  net: Num
  negOfOpinion: Num
  all: Num
  ev: Record<'busca' | 'consiguio' | 'despedido' | 'contrata', Num>
  themeShare: Record<string, Num>
  ai: { n: Num; raw: number; amenaza: Num; herramienta: Num; hype: Num; mixto: Num }
}

export interface ThemeStat {
  th: string
  n: number
  neg: Num
  net: Num
  n12: number
  neg12: Num
  net12: Num
  share12: Num
  byYear: Record<string, Num>
  byYearNeg: Record<string, Num>
}

export interface PersonaStat {
  persona: string
  n: number
  neg: Num
  net: Num
  n12: number
  neg12: Num
}

export interface Engagement {
  n: number
  median: Num
  mean: Num
}

export interface LexMonth {
  m: string
  n: number
  no_hay_laburo: Num
  saturado: Num
  despidos: Num
  reemplazo_ia: Num
  ia_menciones: Num
  optimismo: Num
}

export interface Quote {
  rid: string
  date: string
  score: number
  stance: number
  themes: string[]
  ai: string | null
  event: string
  text: string
  thread: string
  url: string
}

export interface TopPost {
  rid: string
  date: string
  title: string
  score: number
  comments: number
  stance: number
  themes: string[]
  url: string
}

export interface ValidationRow {
  n: number
  relAgreement: number
  signAgreement: number
  within1: number
  kappa4: number
  bias: number
}

export interface CharruaSnapshot {
  generatedAt: string
  model: string
  corpus: {
    posts: number
    comments: number
    candidates: number
    texts: number
    classifiedPosts: number
    classifiedComments: number
    relPosts: number
    relComments: number
    from: string | null
    to: string | null
  }
  windows: Record<string, WindowStats>
  monthly: MonthStat[]
  yearly: YearStat[]
  quarterly: QuarterStat[]
  themes: ThemeStat[]
  persona: PersonaStat[]
  engagementPosts: Record<string, Engagement>
  engagementComments: Record<string, Engagement>
  lexMonthly: LexMonth[]
  quotesNeg: Quote[]
  quotesPos: Quote[]
  postsNeg12: TopPost[]
  postsPos12: TopPost[]
  fred: Array<{ m: string; v: number }>
  validation: { date: string; reader: string; posts: ValidationRow; comments: ValidationRow }
  /** Puede faltar: un snapshot escrito antes del ranking no lo trae. */
  authors?: AuthorsBlock
}

// ------------------------------------------------- ranking de autores

export interface AuthorRow {
  a: string
  n: number
  texts: number
  neg: number
  pos: number
  doom: number
  mean: number
  score: number
  karma: number
  negK: number
  posK: number
  first: string
  last: string
  themes: Array<{ th: string; n: number }>
}

export interface AuthorShift extends AuthorRow {
  oldN: number
  oldMean: number
  recentN: number
  recentMean: number
  delta: number
}

export interface AuthorsBlock {
  minOps: number
  k: number
  prior: number
  authors: number
  opinions: number
  negatives: number
  concentration: {
    top1: number
    top1Neg: number
    top5: number
    top10: number
    top10Neg: number
    top25: number
    top20Abs: number
    single: number
    singleShare: number
    gini: number
    tableNegShare: number
  }
  mix: { minOps: number; n: number; negative: number; positive: number; mixed: number }
  karmaByOrientation: {
    negative: number | null
    mixed: number | null
    positive: number | null
    n: number
  }
  shift: { both: number; morePessimistic: number; moreOptimistic: number; window: string }
  negative: AuthorRow[]
  positive: AuthorRow[]
  doomers: AuthorRow[]
  loudest: AuthorRow[]
  mostUpvotedNeg: AuthorRow[]
  mostUpvotedPos: AuthorRow[]
  pessimistic: AuthorShift[]
  optimistic: AuthorShift[]
}

/** Un nombre de Reddit es [A-Za-z0-9_-]; cualquier otra cosa no se convierte en enlace. */
export function isRedditUsername(a: string | null | undefined): boolean {
  return !!a && /^[\w-]{2,20}$/.test(a)
}

export function redditUserUrl(a: string): string {
  return `https://www.reddit.com/user/${encodeURIComponent(a)}/`
}

/** El espejo sin login ni JS, para leer el perfil sin entrar a Reddit. */
export function ghostdditUserUrl(a: string): string {
  return `https://ghostddit.aeddit.com/user/${encodeURIComponent(a)}`
}

export type Orientation = 'negative' | 'positive' | 'mixed'

/** La misma regla que usa el job: "mayormente" pide 10 puntos de diferencia, no uno. */
export function orientationOf(row: { neg: number; pos: number }): Orientation {
  if (row.neg > row.pos + 0.1) return 'negative'
  if (row.pos > row.neg + 0.1) return 'positive'
  return 'mixed'
}

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  negative: 'Mayormente negativo',
  positive: 'Mayormente positivo',
  mixed: 'Mixto',
}

// ---------------------------------------------------------------- formato

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function monthLabel(m: string): string {
  const i = Number(m.slice(5, 7)) - 1
  return `${MES[i] ?? m.slice(5, 7)} ${m.slice(0, 4)}`
}

export function quarterLabel(q: string): string {
  return q.replace('-T', ' T')
}

export function fmtPct(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)} %`
}

export function fmtInt(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('es-UY')
}

/** 0,72 → "7" (de cada 10). */
export function outOfTen(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : String(Math.round(v * 10))
}

/** Diferencia en puntos porcentuales con signo tipográfico: 0,72 − 0,38 → "+34 puntos". */
export function fmtPts(a: number | null | undefined, b: number | null | undefined): string {
  if (a == null || b == null) return '—'
  const d = Math.round((a - b) * 100)
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} puntos`
}

// ---------------------------------------------------------------- contexto fechado

export interface ContextFact {
  id: string
  value: string
  label: string
  detail: string
  source: string
  url: string
  date: string
}

/**
 * Lo que dicen fuentes de afuera del sub, con fecha. Se revisa a mano: son cifras publicadas por
 * terceros, y una cifra vieja pasa cualquier chequeo de forma.
 */
export const MARKET_CONTEXT: ContextFact[] = [
  {
    id: 'cuti-empleo',
    value: '20.500',
    label: 'personas ocupadas en la industria TI uruguaya en 2024',
    detail:
      'Un leve aumento sobre 2023. La facturación llegó a US$ 3.681 millones y creció 9 %: menos que en los años anteriores, que la cámara atribuye a "múltiples desafíos de mercado".',
    source: 'CUTI, estudio anual del sector (dic-2025)',
    url: 'https://rochaaldia.com/articulo/2025/12/industria-tecnologica-en-uruguay-facturo-mas-de-us-3.681-millones-en-2024-se-desacelero-su-crecimiento.php',
    date: '2025-12',
  },
  {
    id: 'demanda-2026',
    value: 'N.º 1',
    label: 'desarrollador de software: el puesto más pedido en Uruguay en lo que va de 2026',
    detail:
      'Relevamiento de Advice sobre 14.546 avisos para personas con formación terciaria publicados entre enero y mayo; le siguen ingeniero de software y ejecutivo de ventas.',
    source: 'Ámbito, con datos de Advice',
    url: 'https://www.ambito.com/uruguay/cuales-son-los-puestos-trabajo-mas-buscados-2026-n6293518',
    date: '2026-06',
  },
  {
    id: 'sabre',
    value: '150 a 200',
    label: 'despidos anunciados por Sabre en su centro de Zonamerica',
    detail:
      'La segunda reducción después de la de 2023 (unas 200 personas). La empresa la explicó como una reestructuración para bajar costos.',
    source: 'El Cronista',
    url: 'https://www.cronista.com/uruguay/actualidad-uy/empresa-de-software-despide-a-mas-de-150-empleados-y-evalua-mas-envios-al-seguro-de-paro/',
    date: '2026-02',
  },
  {
    id: 'junior-ia',
    value: '−7,7 %',
    label:
      'empleo junior en empresas que adoptan IA frente a las que no, según un estudio de Harvard',
    detail:
      'Citado en Uruguay para explicar el cambio: se venden equipos más chicos y más senior, y el primer escalón se achica aunque no desaparece.',
    source: 'El Observador',
    url: 'https://www.elobservador.com.uy/cafe-y-negocios/quienes-seran-los-seniors-2035-asi-esta-cambiando-la-inteligencia-artificial-el-camino-llegar-serlo-n6051559',
    date: '2026-07',
  },
  {
    id: 'so-survey',
    value: '46 %',
    label: 'de los desarrolladores del mundo desconfía de la exactitud de la IA (33 % confía)',
    detail:
      'Encuesta global de Stack Overflow 2025: el 84 % la usa o piensa usarla, y la opinión favorable bajó de más de 70 % a 60 % en un año.',
    source: 'Stack Overflow Developer Survey 2025',
    url: 'https://survey.stackoverflow.co/2025/ai',
    date: '2025',
  },
]
