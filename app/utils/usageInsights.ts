// Tipos y utilidades del tablero de uso que escribe `currency-usage-insights`
// (classes/insights/). SÓLO la página privada /estadisticas-de-uso.
//
// Espejo a mano del contrato de `classes/insights/types.ts` (secciones 1.2–1.7 de la spec). Las
// reglas (umbrales, señales, cobertura, plegado de plantillas) viven en el backend y están testeadas
// ahí; acá sólo se ordena, se filtra y se formatea lo que ya viene calculado. Un test de la raíz
// (`tests/insights/app_contract.test.ts`) compara UI_SOURCE_IDS y UI_SIGNAL_IDS con los del backend,
// así que van un string por línea y en el mismo orden.
//
// Nada de esto sale del navegador del dueño: no hay script nuevo, ni cookie, ni pedido del visitante.
import { prIsStale, prNumber, prSeconds } from './pageRanking'

// ---------------------------------------------------------------------------------------------
// 1.2 ids y tipos compartidos
// ---------------------------------------------------------------------------------------------

export const UI_SOURCE_IDS = [
  'cloudflareRum',
  'ga4Behavior',
  'indexation',
  'feedback',
  'clarity',
  'bing',
  'cloudflareZone',
  'crux',
] as const
export type SourceId = (typeof UI_SOURCE_IDS)[number]

export const UI_SIGNAL_IDS = [
  'consent-gap',
  'mobile-worse',
  'low-reading',
  'poor-vitals',
  'search-no-results',
  'outbound-rate',
  'not-indexed',
  'helpful-no',
  'friction',
  'bing-only-queries',
  'ai-crawler-errors',
  'edge-errors',
] as const
export type SignalId = (typeof UI_SIGNAL_IDS)[number]

export type SourceStatus = 'ok' | 'partial' | 'thin' | 'failed' | 'inactive' | 'skipped'
export const UI_SOURCE_STATUSES: SourceStatus[] = [
  'ok',
  'partial',
  'thin',
  'failed',
  'inactive',
  'skipped',
]

export interface DayWindow {
  start: string
  end: string
  days: number
  tz: 'America/Montevideo' | 'UTC'
}

export interface SourceBlock<D> {
  id: SourceId
  status: SourceStatus
  ok: boolean
  fetchedAt: string | null
  attemptedAt: string
  lastOkAt: string | null
  failingSince: string | null
  note: string | null
  enableHint: string | null
  window: DayWindow | null
  truncated: boolean
  carried: string[]
  rowsSeen: Record<string, number>
  data: D | null
}

export type Rating = 'good' | 'ni' | 'poor'
export interface Rated {
  good: number
  ni: number
  poor: number
  total: number
  rating: Rating | null
  poorShare: number | null
}

export type CoverageClass =
  | 'indexed'
  | 'indexed-warning'
  | 'crawled-not-indexed'
  | 'discovered-not-indexed'
  | 'duplicate-google-chose'
  | 'duplicate-no-canonical'
  | 'alternate-canonical'
  | 'redirect'
  | 'noindex'
  | 'not-found'
  | 'soft-404'
  | 'server-error'
  | 'redirect-error'
  | 'blocked-robots'
  | 'blocked-4xx'
  | 'unknown-to-google'
  | 'other'

// ---------------------------------------------------------------------------------------------
// 1.3 datos por fuente
// ---------------------------------------------------------------------------------------------

export interface CfVitalRow {
  path: string
  device: string
  samples: number
  realSamples: number
  lcp: Rated
  inp: Rated
  cls: Rated
  p75Approx: {
    lcpMs: number | null
    inpMs: number | null
    cls: number | null
    fcpMs: number | null
    ttfbMs: number | null
    day: string
  } | null
}

export interface CfElementRow {
  metric: 'cls' | 'inp' | 'lcp'
  path: string
  device: string
  element: string
  inpName: string | null
  events: number
}

export interface CfRumData {
  daysCovered: string[]
  suspectDays: string[]
  settings: {
    pageloadNotOlderThanDays: number | null
    vitalsNotOlderThanDays: number | null
    maxPageSize: number | null
  } | null
  totals: {
    uy: { loads: number; visits: number }
    all: { loads: number; visits: number }
    uyShare: number | null
  }
  daily: {
    day: string
    loadsUy: number
    visitsUy: number
    loadsAll: number
    sampleInterval: number
  }[]
  devices: { device: string; loads: number; visits: number }[]
  pages: {
    path: string
    loads: number
    visits: number
    mobile: number
    desktop: number
    tablet: number
  }[]
  referrers: {
    host: string
    kind: 'search' | 'ai' | 'social' | 'internal' | 'direct' | 'other'
    loads: number
    visits: number
  }[]
  countries: { country: string; loads: number; visits: number }[]
  vitals: CfVitalRow[]
  vitalsByDevice: CfVitalRow[]
  elements: CfElementRow[]
  consent: {
    range: { start: string; end: string }
    days: number
    totals: { loads: number; visits: number; realVisits: number }
    pages: { path: string; loads: number; visits: number; realVisits: number }[]
    /** Algún día del rango llegó al tope de la consulta de páginas: las cifras por ruta son un piso. */
    pagesTruncated?: boolean
    /** Y además no se pudo leer su total: el total del sitio queda corto. */
    totalsUndercount?: boolean
  } | null
  internalLoadsShare: number | null
  /** Días a los que les faltó una parte y quedan afuera de esa suma (snapshots viejos no lo traen). */
  partialDays?: {
    countries: number
    vitals: number
    pagesTruncated: number
    totalsUndercount: number
  }
}

export interface DeviceSlice {
  views: number
  sessions: number
  engagementRate: number | null
  avgEngagementSec: number | null
  bounceRate: number | null
  landingSessions: number
}
export interface Ga4Events {
  read50: number
  read90: number
  readAny: number
  outbound: number
  internalNav: number
  recommendationViews: number
  helpfulViews: number
  ctaClicks: number
}
export interface Ga4Rates {
  read50: number | null
  read90: number | null
  outbound: number | null
  internalNav: number | null
  readMeasured: boolean
  measured: boolean
}
export interface Ga4PageRow {
  path: string
  family: string
  views: number
  sessions: number
  engagementRate: number | null
  avgEngagementSec: number | null
  landingSessions: number
  landingEngagementRate: number | null
  mobile: DeviceSlice | null
  desktop: DeviceSlice | null
  template: string | null
  events: Ga4Events | null
  rates: Ga4Rates | null
}
export interface Ga4TemplateRow {
  template: string
  family: string
  realPaths: number
  views: number
  events: Ga4Events
  rates: Ga4Rates
  approx: true
}

export interface Ga4BehaviorData {
  customDimensions: string[]
  timeZone: string | null
  quotaRemaining: number | null
  totals: { views: number; sessions: number; engagedSessions: number; eventCount: number }
  devices: {
    device: string
    sessions: number
    views: number
    engagementRate: number | null
    avgEngagementSec: number | null
    users: number
  }[]
  daily: { day: string; views: number; sessions: number }[]
  consent: {
    range: { start: string; end: string }
    truncated: boolean
    totals: { views: number; landingSessions: number }
    pages: { path: string; views: number; landingSessions: number }[]
  } | null
  pages: Ga4PageRow[]
  templates: Ga4TemplateRow[]
  events: { name: string; count: number }[]
  outbound: { path: string; domain: string; events: number }[]
  flows: { from: string; to: string; views: number }[]
  flowsTotalViews: number
  linkAreas: { path: string; area: string; navigations: number; exposures: number }[]
  navTargets: { path: string; destination: string; area: string; navigations: number }[]
  placements: { placement: string; event: string; count: number }[]
  search: {
    qRegistered: boolean
    opens: number
    selects: number
    noResults: number
    resultsViews: number
    noResultTerms: { term: string; events: number }[]
    selectTerms: { term: string; events: number }[]
    pageTerms: { term: string; events: number }[]
    noResultPages: { path: string; events: number }[]
  }
}

export type InspectionStratum = 'new' | 'top' | 'random'
export interface InspectionRow {
  path: string
  family: string
  checkedAt: string
  reason: InspectionStratum
  verdict: string
  coverageState: string
  class: CoverageClass
  pending: boolean
  pageFetchState: string | null
  indexingState: string | null
  robotsTxtState: string | null
  lastCrawlTime: string | null
  googleCanonical: string | null
  userCanonical: string | null
  crawledAs: string | null
  firstSeenInSitemap: string | null
  resultLink: string | null
}
export interface IndexationData {
  today: {
    budget: number
    quotaUsedBefore: number
    quotaDay: string
    picked: { new: number; top: number; random: number }
    checked: number
    stoppedBy: null | 'quota' | 'counter' | 'permission' | 'time' | 'errors'
    minutes: number
  }
  sitemap: {
    urls: number
    esUrls: number
    newLast14d: number
    fetchedAt: string
    seededAt: string
    capped: boolean
  } | null
  totals28d: {
    checked: number
    indexed: number
    byDesign: number
    actionable: number
    pending: number
    randomChecked: number
    randomActionable: number
  }
  families: {
    family: string
    localized: boolean
    checked: number
    indexed: number
    byDesign: number
    actionable: number
    pending: number
    randomChecked: number
    randomActionable: number
    shareActionable: number | null
    newChecked: number
    newIndexed: number
    topReason: CoverageClass | null
  }[]
  newUrls: { checked: number; indexed: number; pending: number; medianAgeDays: number | null }
  rows: InspectionRow[]
}

export interface FeedbackData {
  totals: { helpfulYes: number; helpfulNo: number; suggestion: number; bug: number; praise: number }
  pages: {
    path: string
    family: string
    helpfulYes: number
    helpfulNo: number
    distinctYes: number
    distinctNo: number
    suggestion: number
    bug: number
    praise: number
    last: string
  }[]
  daily: { day: string; helpfulYes: number; helpfulNo: number; written: number }[]
}

export interface Friction {
  sessionsShare: number | null
  events: number
  sessions: number
}
export interface ClarityMetrics {
  sessions: number
  botSessions: number
  users: number | null
  pagesPerSession: number | null
  activeSec: number | null
  totalSec: number | null
  scrollDepth: number | null
  rage: Friction | null
  dead: Friction | null
  quickback: Friction | null
  excessiveScroll: Friction | null
  scriptErrors: Friction | null
  errorClicks: Friction | null
}
export interface ClarityData {
  windowEnd: string
  hours: 24
  callsThisRun: number
  callsTodayUtc: number
  totals: ClarityMetrics
  urls: (ClarityMetrics & { path: string })[]
  urlsUy: (ClarityMetrics & { path: string })[] | null
  urlDevice: (ClarityMetrics & { path: string; device: string })[]
  deviceBrowser: {
    device: string
    browser: string
    sessions: number
    rage: number | null
    dead: number | null
  }[]
  channelDevice: { channel: string; device: string; sessions: number }[]
  unknownKeys: string[]
}

export interface BingData {
  siteUrl: string
  buckets: string[]
  traffic: { day: string; clicks: number; impressions: number }[]
  queries: {
    query: string
    impressions: number
    clicks: number
    avgPosition: number | null
    avgClickPosition: number | null
    weeks: number
  }[]
  pages: { path: string; impressions: number; clicks: number; avgPosition: number | null }[]
  crawl: {
    day: string
    crawled: number
    inIndex: number
    errors: number
    code4xx: number
    code5xx: number
    code301: number
    code302: number
    blockedByRobots: number
  }[]
  issues: { path: string; httpCode: number; issuesRaw: number; inLinks: number }[]
}

export interface CfZoneData {
  crawlers: {
    crawler: string
    requests: number
    ok2xx: number
    notModified304: number
    redirects: number
    errors4xx: number
    errors5xx: number
  }[]
  crawlerPaths: { crawler: string; path: string; status: number; requests: number }[]
  errors: { path: string; status: number; requests: number; crawlerShare: number | null }[]
  cache: {
    path: string
    requests: number
    hitShare: number | null
    dynamicShare: number | null
  }[]
  statusTotals: { status: number; requests: number }[]
}

export interface CruxRecord {
  lcpMs: number | null
  inpMs: number | null
  cls: number | null
  fcpMs: number | null
  ttfbMs: number | null
  good: { lcp: number | null; inp: number | null; cls: number | null }
  rating: { lcp: Rating | null; inp: Rating | null; cls: Rating | null }
}
export interface CruxData {
  origin: { ALL: CruxRecord | null; PHONE: CruxRecord | null; DESKTOP: CruxRecord | null }
  urls: (CruxRecord & { path: string; formFactor: 'PHONE' | 'DESKTOP' })[]
  noData: number
  collectionPeriod: { first: string; last: string } | null
  history:
    | {
        formFactor: 'ALL' | 'PHONE' | 'DESKTOP'
        periods: string[]
        lcpP75: (number | null)[]
        inpP75: (number | null)[]
        clsP75: (number | null)[]
      }[]
    | null
  historyFetchedAt: string | null
}

// ---------------------------------------------------------------------------------------------
// 1.4 tabla de páginas, 1.5 señales, 1.6 tendencia, 1.7 snapshot
// ---------------------------------------------------------------------------------------------

export interface VitalBrief {
  lcp: Rating | null
  inp: Rating | null
  cls: Rating | null
  samples: number
  realSamples: number
}
export interface InsightPageRow {
  path: string
  family: string
  locale: string | null
  cf: { loads: number; visits: number; mobileShare: number | null } | null
  ga4: {
    views: number
    sessions: number
    engagementRate: number | null
    avgEngagementSec: number | null
    mobileEngagement: number | null
    desktopEngagement: number | null
    landingSessions: number
    read50Rate: number | null
    outboundRate: number | null
    readMeasured: boolean
    helpfulViews: number
    template: string | null
  } | null
  coverage: number | null
  coverageLoads: number | null
  vitals: { mobile: VitalBrief | null; desktop: VitalBrief | null } | null
  crux: { phone: CruxRecord['rating'] | null; desktop: CruxRecord['rating'] | null } | null
  clarity: {
    sessions: number
    rage: number | null
    dead: number | null
    quickback: number | null
    scrollDepth: number | null
  } | null
  index: { class: CoverageClass; checkedAt: string; pending: boolean } | null
  feedback: { yes: number; no: number; written: number } | null
  signals: SignalId[]
}

export type SignalRow = {
  key: string
  path: string | null
  family: string | null
  impact: number
  isNew: boolean
} & Record<string, string | number | boolean | null>

export interface Signal {
  id: SignalId
  title: string
  question: string
  status: 'ok' | 'stale' | 'unavailable'
  reason: string | null
  severity: 'high' | 'medium' | 'low' | 'none'
  impact: number
  impactUnit: 'cf-loads' | 'ga4-views' | 'events' | 'impressions' | 'requests'
  sources: SourceId[]
  dataAsOf: string | null
  window: DayWindow | null
  thresholds: Record<string, number>
  count: number
  newRows: number
  rows: SignalRow[]
  groups: { key: string; label: string; count: number; share: number | null }[]
  summary: string
}

export interface InsightTrend {
  days: string[]
  cfLoadsUy: (number | null)[]
  cfVisitsUy: (number | null)[]
  ga4ViewsUy: (number | null)[]
  ga4SessionsUy: (number | null)[]
  coverage: (number | null)[]
  inspected: (number | null)[]
  inspectedIndexedShare: (number | null)[]
}

export interface ConsentCheck {
  usable: boolean
  reason: string | null
  cfRange: { start: string; end: string } | null
  ga4Range: { start: string; end: string } | null
  ga4TimeZone: string | null
  days: number
  siteCoverage: number | null
  siteCoverageLoads: number | null
  cfInternalShare: number | null
  ga4InternalShare: number | null
  /** La consulta de páginas de Cloudflare llegó a su tope algún día del rango. */
  cfPagesTruncated?: boolean
  /** Algún reporte de consentimiento de GA4 vino cortado: las rutas que faltan se saltan. */
  ga4Truncated?: boolean
}

export interface UsageInsightSources {
  cloudflareRum: SourceBlock<CfRumData>
  ga4Behavior: SourceBlock<Ga4BehaviorData>
  indexation: SourceBlock<IndexationData>
  feedback: SourceBlock<FeedbackData>
  clarity: SourceBlock<ClarityData>
  bing: SourceBlock<BingData>
  cloudflareZone: SourceBlock<CfZoneData>
  crux: SourceBlock<CruxData>
}

export interface UsageInsightSnapshot {
  key: 'site'
  schemaVersion: 1
  asOf: string
  day: string
  timezone: 'America/Montevideo'
  window: DayWindow
  run: {
    durationSec: number
    flags: string[]
    trimmed: string[]
    bytes: number
    siteLoadsUy: number | null
  }
  sources: UsageInsightSources
  pages: InsightPageRow[]
  signals: Signal[]
  trend: InsightTrend
  consentCheck: ConsentCheck | null
}

export type UsageInsightsResponse =
  { snapshot: UsageInsightSnapshot } | { snapshot: null; hint: string }

// ---------------------------------------------------------------------------------------------
// Etiquetas
// ---------------------------------------------------------------------------------------------

export const UI_SOURCE_LABELS: Record<SourceId, string> = {
  cloudflareRum: 'Cloudflare: visitas reales',
  ga4Behavior: 'Google Analytics: comportamiento',
  indexation: 'Indexación en Google',
  feedback: 'Opiniones del sitio',
  clarity: 'Microsoft Clarity',
  bing: 'Bing Webmaster',
  cloudflareZone: 'Cloudflare: pedidos al borde',
  crux: 'Chrome UX Report',
}

export const UI_STATUS: Record<SourceStatus, { label: string; color: string }> = {
  ok: { label: 'al día', color: 'success' },
  partial: { label: 'parcial', color: 'warning' },
  thin: { label: 'rechazado por flaco', color: 'warning' },
  failed: { label: 'falló', color: 'error' },
  inactive: { label: 'inactiva', color: 'grey' },
  skipped: { label: 'no corrió', color: 'blue-grey' },
}

export type Severity = Signal['severity']
export const UI_SEVERITY: Record<Severity, { label: string; color: string }> = {
  high: { label: 'alta', color: 'error' },
  medium: { label: 'media', color: 'warning' },
  low: { label: 'baja', color: 'info' },
  none: { label: 'sin filas', color: 'grey' },
}

/** Nombre corto de cada señal, para chips y selectores (el título largo viene del backend). */
export const UI_SIGNAL_LABELS: Record<SignalId, string> = {
  'consent-gap': 'Brecha de consentimiento',
  'mobile-worse': 'Celular peor',
  'low-reading': 'Poca lectura',
  'poor-vitals': 'Web Vitals malos',
  'search-no-results': 'Búsquedas sin resultado',
  'outbound-rate': 'Se van afuera',
  'not-indexed': 'No indexada',
  'helpful-no': '«No me sirvió»',
  friction: 'Fricción (Clarity)',
  'bing-only-queries': 'Sólo en Bing',
  'ai-crawler-errors': 'Rastreadores de IA con error',
  'edge-errors': 'Errores en el borde',
}

export const UI_IMPACT_UNITS: Record<Signal['impactUnit'], string> = {
  'cf-loads': 'cargas',
  'ga4-views': 'vistas',
  events: 'eventos',
  impressions: 'impresiones',
  requests: 'pedidos',
}

export const UI_COVERAGE_LABELS: Record<CoverageClass, string> = {
  indexed: 'indexada',
  'indexed-warning': 'indexada con aviso',
  'crawled-not-indexed': 'rastreada, sin indexar',
  'discovered-not-indexed': 'descubierta, sin indexar',
  'duplicate-google-chose': 'duplicada (Google eligió otra)',
  'duplicate-no-canonical': 'duplicada sin canónica',
  'alternate-canonical': 'alternativa con canónica',
  redirect: 'redirige',
  noindex: 'noindex',
  'not-found': 'no existe (404)',
  'soft-404': '404 suave',
  'server-error': 'error del servidor',
  'redirect-error': 'error de redirección',
  'blocked-robots': 'bloqueada por robots.txt',
  'blocked-4xx': 'bloqueada (4xx)',
  'unknown-to-google': 'Google no la conoce',
  other: 'otro',
}

export const UI_RATING: Record<Rating, { label: string; color: string }> = {
  good: { label: 'bien', color: 'success' },
  ni: { label: 'regular', color: 'warning' },
  poor: { label: 'mal', color: 'error' },
}

export const UI_REFERRER_KINDS: Record<CfRumData['referrers'][number]['kind'], string> = {
  search: 'buscador',
  ai: 'IA',
  social: 'redes',
  internal: 'interno',
  direct: 'directo',
  other: 'otro',
}

export const CLARITY_DASHBOARD_URL =
  'https://clarity.microsoft.com/projects/view/zgf7vprwql/dashboard'

// ---------------------------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------------------------

/**
 * Cómo se dibuja un valor. `pts` = diferencia de dos proporciones (0,15 → "15 pts"); `depth` =
 * profundidad de scroll 0..100 de Clarity; `p75` = el p75 de la métrica de la fila (ms para LCP/INP,
 * sin unidad para CLS: la métrica está en `row.metric`); `link` = abre una URL externa.
 */
export type UiKind =
  | 'path'
  | 'text'
  | 'int'
  | 'num'
  | 'pct'
  | 'pts'
  | 'ms'
  | 'sec'
  | 'cls'
  | 'rating'
  | 'date'
  | 'bool'
  | 'depth'
  | 'p75'
  | 'link'

export interface UiColumn {
  key: string
  label: string
  kind: UiKind
  /** Para tablas de fuentes cuyo valor no es un campo plano de la fila. */
  get?: (row: any) => unknown
}

const nf1 = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 })
const nf3 = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Proporción 0..1 → "41 %"; bajo 10 % con un decimal ("3,5 %"), porque ahí vive la fricción. */
export function uiPercent(x: number | null | undefined): string {
  if (!isNum(x)) return '—'
  const p = x * 100
  return `${Math.abs(p) < 10 && p !== 0 ? nf1.format(p) : Math.round(p)} %`
}

/** `2026-11-20` o un instante ISO → `20/11/2026` (en Montevideo si trae hora). */
export function uiDate(value: string | null | undefined): string {
  if (!value) return '—'
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (plain) return `${Number(plain[3])}/${Number(plain[2])}/${plain[1]}`
  const t = Date.parse(value)
  if (!Number.isFinite(t)) return value
  return new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  }).format(new Date(t))
}

export function uiMs(ms: number | null | undefined): string {
  if (!isNum(ms)) return '—'
  if (Math.abs(ms) >= 1000) return `${nf1.format(ms / 1000)} s`
  return `${Math.round(ms)} ms`
}

export function uiFormat(value: unknown, kind: UiKind, row?: Record<string, unknown>): string {
  if (value === null || value === undefined || value === '') return '—'
  switch (kind) {
    case 'int':
      return isNum(value) ? prNumber(value) : String(value)
    case 'num':
      return isNum(value) ? nf1.format(value) : String(value)
    case 'pct':
      return isNum(value) ? uiPercent(value) : String(value)
    case 'pts': {
      if (!isNum(value)) return String(value)
      const pts = Math.abs(value) <= 1 ? value * 100 : value
      return `${Math.round(pts)} pts`
    }
    case 'ms':
      return isNum(value) ? uiMs(value) : String(value)
    case 'sec':
      return isNum(value) ? prSeconds(value) : String(value)
    case 'cls':
      return isNum(value) ? nf3.format(value) : String(value)
    case 'rating':
      return UI_RATING[value as Rating]?.label ?? String(value)
    case 'date':
      return uiDate(String(value))
    case 'bool':
      return value ? 'sí' : 'no'
    case 'depth':
      return isNum(value) ? `${Math.round(value)} %` : String(value)
    case 'p75': {
      if (!isNum(value)) return String(value)
      return row?.metric === 'cls' ? nf3.format(value) : uiMs(value)
    }
    case 'link':
      return 'abrir'
    case 'path':
    case 'text':
    default:
      return String(value)
  }
}

/**
 * Una ruta del sitio que se puede abrir: no una plantilla (`/x/:item`) ni el "=" de la canónica.
 * Las rutas salen de datos que un tercero puede falsificar (el beacon de Cloudflare, un hit de GA4,
 * una URL de Clarity), así que se exige la forma estricta: una barra y después sólo caracteres de
 * ruta. Afuera `//host`, `/\host` (el navegador normaliza `\` a `/` y se va a otro sitio), espacios,
 * caracteres de control y `:`.
 */
export const isLinkablePath = (v: unknown): v is string =>
  typeof v === 'string' && /^\/(?![/\\])[\w\-./%~]*$/.test(v)

/** Un enlace externo (el informe de Search Console): sólo https, sin espacios ni barras invertidas. */
export const isExternalUrl = (v: unknown): v is string =>
  typeof v === 'string' && /^https:\/\/[^\s\\]+$/i.test(v)

const NUMERIC_KINDS = new Set<UiKind>([
  'int',
  'num',
  'pct',
  'pts',
  'ms',
  'sec',
  'cls',
  'depth',
  'p75',
])
/** Las columnas de números van a la derecha y sin cortar; las de texto pueden partirse. */
export const isNumericKind = (kind: UiKind) => NUMERIC_KINDS.has(kind)

export const uiCellValue = (col: UiColumn, row: any): unknown =>
  col.get ? col.get(row) : row?.[col.key]

export const uiCell = (col: UiColumn, row: any): string =>
  uiFormat(uiCellValue(col, row), col.kind, row)

/**
 * "llega a la mitad" / "sale afuera" de una fila de páginas. Una página que GA4 ve pero que no manda
 * eventos de lectura o de clics (sin `measurementPath`, más corta que la pantalla, nadie scrolleó)
 * dice "sin medición": un 0 % ahí sería afirmar que nadie lee.
 */
export function uiRate(row: InsightPageRow, which: 'read' | 'outbound'): string {
  if (!row.ga4) return '—'
  const rate = which === 'read' ? row.ga4.read50Rate : row.ga4.outboundRate
  return rate === null ? 'sin medición' : uiPercent(rate)
}

export const uiIsStale = (asOf: string, now?: Date) => prIsStale(asOf, now)

/** "datos del 20/11" (la fecha de los datos guardados, no la del intento). */
export function uiSourceDate(block: Pick<SourceBlock<unknown>, 'fetchedAt'> | null): string {
  if (!block?.fetchedAt) return 'sin datos'
  const t = Date.parse(block.fetchedAt)
  if (!Number.isFinite(t)) return 'sin datos'
  const dm = new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'America/Montevideo',
  }).format(new Date(t))
  return `datos del ${dm}`
}

/** "PV_MIN_SAMPLES 30 · PV_POOR_SHARE 0,25": los números exactos que usó el backend. */
export function uiThresholds(thresholds: Record<string, number> | null | undefined): string {
  return Object.entries(thresholds || {})
    .map(([k, v]) => `${k} ${isNum(v) ? nf1.format(v) : v}`)
    .join(' · ')
}

/** Para `Sparkline`, que sólo acepta números: se descartan los huecos. */
export const uiDropNulls = (values: (number | null)[] | null | undefined): number[] =>
  (values || []).filter(isNum)

// ---------------------------------------------------------------------------------------------
// Señales
// ---------------------------------------------------------------------------------------------

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2, none: 3 }

const signalTier = (s: Signal) =>
  s.status === 'ok' ? (s.rows.length > 0 ? 0 : 1) : s.status === 'stale' ? 2 : 3

/**
 * El orden de la spec 1.5 (el mismo del digest): `ok` con filas por severidad y después impacto;
 * `ok` sin filas; `stale`; `unavailable`. Desempata el orden fijo de UI_SIGNAL_IDS.
 */
export function orderSignals(signals: Signal[]): Signal[] {
  const idx = (id: SignalId) => {
    const i = UI_SIGNAL_IDS.indexOf(id)
    return i < 0 ? UI_SIGNAL_IDS.length : i
  }
  return [...signals].sort(
    (a, b) =>
      signalTier(a) - signalTier(b) ||
      (signalTier(a) === 0
        ? SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.impact - a.impact
        : 0) ||
      idx(a.id) - idx(b.id)
  )
}

/** Las señales que la página muestra arriba: `ok` y con filas. Ya ordenadas. */
export const actionableSignals = (signals: Signal[]) =>
  orderSignals(signals).filter(s => s.status === 'ok' && s.rows.length > 0)

/** Las que todavía no pueden decir nada (o lo dicen con datos viejos), con su motivo. */
export const waitingSignals = (signals: Signal[]) =>
  orderSignals(signals).filter(s => s.status !== 'ok')

/** Columnas propias de cada señal (además de página, impacto y "nuevo"), del cuadro 1.5. */
export const UI_SIGNAL_COLUMNS: Record<SignalId, UiColumn[]> = {
  'consent-gap': [
    { key: 'cfVisits', label: 'Entradas CF', kind: 'int' },
    { key: 'ga4LandingSessions', label: 'Entradas GA4', kind: 'int' },
    { key: 'landingCoverage', label: 'Cobertura', kind: 'pct' },
    { key: 'siteCoverage', label: 'Cobertura del sitio', kind: 'pct' },
    { key: 'cfRealVisits', label: 'Muestras reales', kind: 'int' },
    { key: 'cfLoads', label: 'Cargas CF', kind: 'int' },
    { key: 'ga4Views', label: 'Vistas GA4', kind: 'int' },
    { key: 'loadsCoverage', label: 'Cobertura por cargas', kind: 'pct' },
  ],
  'mobile-worse': [
    { key: 'mobileViews', label: 'Vistas cel.', kind: 'int' },
    { key: 'desktopViews', label: 'Vistas escr.', kind: 'int' },
    { key: 'mobileEngagement', label: 'Interacción cel.', kind: 'pct' },
    { key: 'desktopEngagement', label: 'Interacción escr.', kind: 'pct' },
    { key: 'gapPoints', label: 'Diferencia', kind: 'pts' },
    { key: 'mobileAvgSec', label: 'Tiempo cel.', kind: 'sec' },
    { key: 'desktopAvgSec', label: 'Tiempo escr.', kind: 'sec' },
    { key: 'mobileCwv', label: 'Web Vitals cel.', kind: 'text' },
    { key: 'clarityRageMobile', label: 'Bronca cel. (Clarity)', kind: 'pct' },
    { key: 'cruxPhone', label: 'CrUX cel.', kind: 'text' },
  ],
  'low-reading': [
    { key: 'views', label: 'Vistas', kind: 'int' },
    { key: 'read50Rate', label: 'Llega a la mitad', kind: 'pct' },
    { key: 'read90Rate', label: 'Llega al final', kind: 'pct' },
    { key: 'read50', label: 'Eventos 50 %', kind: 'int' },
    { key: 'readAny', label: 'Eventos de lectura', kind: 'int' },
    { key: 'clarityScroll', label: 'Scroll (Clarity)', kind: 'depth' },
    { key: 'template', label: 'Plantilla', kind: 'bool' },
  ],
  'poor-vitals': [
    { key: 'device', label: 'Disp.', kind: 'text' },
    { key: 'metric', label: 'Métrica', kind: 'text' },
    { key: 'poorShare', label: 'Malo', kind: 'pct' },
    { key: 'goodShare', label: 'Bien', kind: 'pct' },
    { key: 'p75Approx', label: 'p75 aprox.', kind: 'p75' },
    { key: 'element', label: 'Elemento', kind: 'text' },
    { key: 'elementShare', label: 'Del elemento', kind: 'pct' },
    { key: 'inpName', label: 'Interacción', kind: 'text' },
    { key: 'realSamples', label: 'Muestras reales', kind: 'int' },
    { key: 'cruxP75', label: 'p75 CrUX', kind: 'p75' },
  ],
  'search-no-results': [
    { key: 'term', label: 'Búsqueda', kind: 'text' },
    { key: 'events', label: 'Veces', kind: 'int' },
  ],
  'outbound-rate': [
    { key: 'views', label: 'Vistas', kind: 'int' },
    { key: 'outbound', label: 'Salidas', kind: 'int' },
    { key: 'outboundRate', label: 'Salidas / vistas', kind: 'pct' },
    { key: 'topDomain', label: 'Adónde', kind: 'text' },
    { key: 'topDomainShare', label: 'De las salidas', kind: 'pct' },
    { key: 'template', label: 'Plantilla', kind: 'bool' },
  ],
  'not-indexed': [
    { key: 'class', label: 'Estado', kind: 'text', get: r => coverageLabel(r?.class) },
    { key: 'coverageState', label: 'Google dice', kind: 'text' },
    { key: 'reason', label: 'Muestra', kind: 'text', get: r => stratumLabel(r?.reason) },
    { key: 'checkedAt', label: 'Inspeccionada', kind: 'date' },
    { key: 'lastCrawlTime', label: 'Último rastreo', kind: 'date' },
    {
      key: 'googleCanonical',
      label: 'Canónica de Google',
      kind: 'text',
      // "=" = la misma ruta (así lo guarda el job para no repetirla en cada fila).
      get: r => (r?.googleCanonical === '=' ? 'la misma' : r?.googleCanonical),
    },
    { key: 'pageFetchState', label: 'Descarga', kind: 'text' },
  ],
  'helpful-no': [
    { key: 'no', label: 'No', kind: 'int' },
    { key: 'yes', label: 'Sí', kind: 'int' },
    { key: 'distinctNo', label: 'Personas que dijeron no', kind: 'int' },
    { key: 'noShare', label: 'Porción de no', kind: 'pct' },
    { key: 'ga4Views', label: 'Vistas GA4', kind: 'int' },
    { key: 'helpfulViews', label: 'Vieron la pregunta (UY)', kind: 'int' },
    // Las respuestas son de todos los países y las vistas del widget sólo de Uruguay: es una cota.
    { key: 'answerRate', label: 'Contestaron (todas ÷ vistas UY)', kind: 'pct' },
  ],
  friction: [
    { key: 'device', label: 'Disp.', kind: 'text' },
    { key: 'population', label: 'Países', kind: 'text' },
    { key: 'sessions', label: 'Sesiones (sin bots)', kind: 'int' },
    { key: 'which', label: 'Qué', kind: 'text' },
    { key: 'rageRate', label: 'Bronca', kind: 'pct' },
    { key: 'deadRate', label: 'Clic muerto', kind: 'pct' },
    { key: 'quickbackRate', label: 'Vuelta atrás', kind: 'pct' },
    { key: 'scriptErrorRate', label: 'Errores JS', kind: 'pct' },
    { key: 'excessiveScrollRate', label: 'Scroll excesivo', kind: 'pct' },
    { key: 'scrollDepth', label: 'Scroll', kind: 'depth' },
  ],
  'bing-only-queries': [
    { key: 'query', label: 'Consulta', kind: 'text' },
    { key: 'bingImpressions', label: 'Impr. Bing', kind: 'int' },
    { key: 'bingClicks', label: 'Clics Bing', kind: 'int' },
    { key: 'bingPosition', label: 'Posición Bing', kind: 'num' },
    { key: 'gscImpressions', label: 'Impr. Google', kind: 'int' },
    { key: 'gscClicks', label: 'Clics Google', kind: 'int' },
  ],
  'ai-crawler-errors': [
    { key: 'crawler', label: 'Rastreador (user-agent declarado)', kind: 'text' },
    { key: 'status', label: 'Estado', kind: 'int' },
    {
      key: 'kind',
      label: 'Tipo',
      kind: 'text',
      get: r => (r?.kind === 'error' ? 'error' : 'redirige'),
    },
    { key: 'requests', label: 'Pedidos', kind: 'int' },
  ],
  'edge-errors': [
    { key: 'status', label: 'Estado', kind: 'int' },
    { key: 'requests', label: 'Pedidos', kind: 'int' },
    { key: 'crawlerShare', label: 'De rastreadores', kind: 'pct' },
  ],
}

export const coverageLabel = (c: unknown): string =>
  typeof c === 'string' ? (UI_COVERAGE_LABELS[c as CoverageClass] ?? c) : '—'

const STRATUM_LABELS: Record<InspectionStratum, string> = {
  new: 'nueva en el sitemap',
  top: 'de las más vistas',
  random: 'al azar',
}
export const stratumLabel = (s: unknown): string =>
  typeof s === 'string' ? (STRATUM_LABELS[s as InspectionStratum] ?? s) : '—'

/** "12.340 cargas". */
export const uiImpact = (s: Pick<Signal, 'impact' | 'impactUnit'>) =>
  `${prNumber(s.impact)} ${UI_IMPACT_UNITS[s.impactUnit] ?? ''}`.trim()

// ---------------------------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------------------------

export interface UiPageFilter {
  q?: string
  family?: string | null
  signal?: SignalId | null
  /** `null`/vacío = todos; `'es'` = sólo español (locale null); otro código = ese idioma. */
  locale?: string | null
}

const fold = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

export function filterPages(pages: InsightPageRow[], f: UiPageFilter): InsightPageRow[] {
  const q = fold(f.q || '').trim()
  return pages.filter(
    p =>
      (!q || fold(p.path).includes(q) || fold(p.family).includes(q)) &&
      (!f.family || p.family === f.family) &&
      (!f.signal || p.signals.includes(f.signal)) &&
      (!f.locale || (f.locale === 'es' ? p.locale === null : p.locale === f.locale))
  )
}

export type UiSortKey = 'loads' | 'views' | 'coverage' | 'engagement' | 'read' | 'outbound'

/** Lo que pesa una página: lo que más cuenta entre las cargas de Cloudflare y las vistas de GA4. */
export const pageWeight = (p: InsightPageRow) => Math.max(p.cf?.loads ?? 0, p.ga4?.views ?? 0)

// `dir` 1 = mayor primero (volumen, salidas); -1 = menor primero, porque en cobertura, interacción y
// lectura lo que hay que mirar es lo peor.
const SORTS: Record<UiSortKey, { dir: 1 | -1; get: (p: InsightPageRow) => number | null }> = {
  loads: { dir: 1, get: p => p.cf?.loads ?? null },
  views: { dir: 1, get: p => p.ga4?.views ?? null },
  coverage: { dir: -1, get: p => p.coverage },
  engagement: { dir: -1, get: p => p.ga4?.engagementRate ?? null },
  read: { dir: -1, get: p => p.ga4?.read50Rate ?? null },
  outbound: { dir: 1, get: p => p.ga4?.outboundRate ?? null },
}

/** Lo que no tiene valor va al final; desempata el peso de la página y después la ruta. */
export function sortPages(pages: InsightPageRow[], key: UiSortKey): InsightPageRow[] {
  const { dir, get } = SORTS[key]
  return [...pages].sort((a, b) => {
    const va = get(a)
    const vb = get(b)
    if (va === null && vb !== null) return 1
    if (vb === null && va !== null) return -1
    const byValue = va === null || vb === null ? 0 : (vb - va) * dir
    return byValue || pageWeight(b) - pageWeight(a) || a.path.localeCompare(b.path)
  })
}

/** Familias presentes, de la que más pesa a la que menos. */
export function uiFamilies(pages: InsightPageRow[]): string[] {
  const weight = new Map<string, number>()
  for (const p of pages) weight.set(p.family, (weight.get(p.family) || 0) + pageWeight(p))
  return [...weight.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([f]) => f)
}

/** Idiomas presentes: `'es'` primero si hay páginas en español, después los prefijos. */
export function uiLocales(pages: InsightPageRow[]): string[] {
  const set = new Set(pages.map(p => p.locale))
  const others = [...set].filter((l): l is string => !!l).sort()
  return [...(set.has(null) ? ['es'] : []), ...others]
}

/** Una ruta escrita a mano o pegada como URL → la forma en que el job guarda las rutas. */
export function normalizeInsightPath(raw: string): string {
  let s = (raw || '').trim()
  if (!s) return ''
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname
  } catch {
    return ''
  }
  s = s.split(/[?#]/)[0] || ''
  if (!s.startsWith('/')) s = `/${s}`
  if (s.length > 1) s = s.replace(/\/+$/, '')
  return s || '/'
}

export function pageDetail(
  snapshot: Pick<UsageInsightSnapshot, 'pages' | 'signals'>,
  path: string
): { row: InsightPageRow | null; signalRows: { signal: Signal; row: SignalRow }[] } {
  const p = normalizeInsightPath(path)
  const row = snapshot.pages.find(r => r.path === p) ?? null
  const signalRows = orderSignals(snapshot.signals).flatMap(signal =>
    signal.rows.filter(r => r.path === p).map(r => ({ signal, row: r }))
  )
  return { row, signalRows }
}

const ratingsLine = (r: { lcp: Rating | null; inp: Rating | null; cls: Rating | null }) =>
  `LCP ${uiFormat(r.lcp, 'rating')} · INP ${uiFormat(r.inp, 'rating')} · CLS ${uiFormat(r.cls, 'rating')}`

/** La ficha de una página agrupada por fuente, ya formateada, para la tarjeta "Una página". */
export function pageDetailFields(
  row: InsightPageRow
): { title: string; items: { label: string; value: string }[] }[] {
  const out: { title: string; items: { label: string; value: string }[] }[] = []
  out.push({
    title: 'Página',
    items: [
      { label: 'Familia', value: row.family },
      { label: 'Idioma', value: row.locale ?? 'español' },
      { label: 'Cobertura (entradas)', value: uiPercent(row.coverage) },
      { label: 'Cobertura (cargas, contexto)', value: uiPercent(row.coverageLoads) },
    ],
  })
  if (row.cf)
    out.push({
      title: UI_SOURCE_LABELS.cloudflareRum,
      items: [
        { label: 'Cargas', value: prNumber(row.cf.loads) },
        { label: 'Entradas', value: prNumber(row.cf.visits) },
        { label: 'Desde celular', value: uiPercent(row.cf.mobileShare) },
      ],
    })
  if (row.ga4)
    out.push({
      title: UI_SOURCE_LABELS.ga4Behavior,
      items: [
        { label: 'Vistas', value: prNumber(row.ga4.views) },
        { label: 'Sesiones', value: prNumber(row.ga4.sessions) },
        { label: 'Entradas', value: prNumber(row.ga4.landingSessions) },
        { label: 'Interacción', value: uiPercent(row.ga4.engagementRate) },
        {
          label: 'Interacción cel. / escr.',
          value: `${uiPercent(row.ga4.mobileEngagement)} / ${uiPercent(row.ga4.desktopEngagement)}`,
        },
        { label: 'Tiempo por sesión', value: uiFormat(row.ga4.avgEngagementSec, 'sec') },
        { label: 'Llega a la mitad', value: uiRate(row, 'read') },
        { label: 'Sale afuera', value: uiRate(row, 'outbound') },
        { label: 'Vieron «¿Te sirvió?»', value: prNumber(row.ga4.helpfulViews) },
        ...(row.ga4.template ? [{ label: 'Plantilla', value: row.ga4.template }] : []),
      ],
    })
  if (row.vitals) {
    const items: { label: string; value: string }[] = []
    if (row.vitals.mobile)
      items.push({
        label: `Celular (${prNumber(row.vitals.mobile.realSamples)} muestras)`,
        value: ratingsLine(row.vitals.mobile),
      })
    if (row.vitals.desktop)
      items.push({
        label: `Escritorio (${prNumber(row.vitals.desktop.realSamples)} muestras)`,
        value: ratingsLine(row.vitals.desktop),
      })
    if (items.length) out.push({ title: 'Web Vitals (Cloudflare)', items })
  }
  if (row.crux) {
    const items: { label: string; value: string }[] = []
    if (row.crux.phone) items.push({ label: 'Celular', value: ratingsLine(row.crux.phone) })
    if (row.crux.desktop) items.push({ label: 'Escritorio', value: ratingsLine(row.crux.desktop) })
    if (items.length) out.push({ title: UI_SOURCE_LABELS.crux, items })
  }
  if (row.clarity)
    out.push({
      title: UI_SOURCE_LABELS.clarity,
      items: [
        { label: 'Sesiones (24 h)', value: prNumber(row.clarity.sessions) },
        { label: 'Clics de bronca', value: uiPercent(row.clarity.rage) },
        { label: 'Clics muertos', value: uiPercent(row.clarity.dead) },
        { label: 'Vueltas atrás', value: uiPercent(row.clarity.quickback) },
        { label: 'Scroll', value: uiFormat(row.clarity.scrollDepth, 'depth') },
      ],
    })
  if (row.index)
    out.push({
      title: UI_SOURCE_LABELS.indexation,
      items: [
        {
          label: 'Estado',
          value: row.index.pending ? 'pendiente (nueva)' : coverageLabel(row.index.class),
        },
        { label: 'Inspeccionada', value: uiDate(row.index.checkedAt) },
      ],
    })
  if (row.feedback)
    out.push({
      title: UI_SOURCE_LABELS.feedback,
      items: [
        { label: '«Me sirvió»', value: prNumber(row.feedback.yes) },
        { label: '«No me sirvió»', value: prNumber(row.feedback.no) },
        { label: 'Mensajes escritos', value: prNumber(row.feedback.written) },
      ],
    })
  return out
}

/** "pendiente", la clase de cobertura o "—". */
export const uiIndexLabel = (row: InsightPageRow) =>
  row.index ? (row.index.pending ? 'pendiente' : coverageLabel(row.index.class)) : '—'

// ---------------------------------------------------------------------------------------------
// Encabezado: las cuatro tejas y la tabla de estado de las fuentes
// ---------------------------------------------------------------------------------------------

export interface UiKpi {
  id: 'loads' | 'coverage' | 'inspected' | 'signals'
  label: string
  value: string
  note: string
}

const whyMissing = (b: SourceBlock<unknown> | undefined) =>
  b?.enableHint || b?.note || 'la fuente todavía no trajo datos'

/** Las cuatro tejas de arriba. Una fuente sin datos muestra "—" y el motivo, nunca un cero. */
export function uiKpis(s: UsageInsightSnapshot): UiKpi[] {
  const rum = s.sources?.cloudflareRum
  const idx = s.sources?.indexation
  const cc = s.consentCheck
  const withRows = actionableSignals(s.signals || [])
  const out: UiKpi[] = []

  out.push(
    rum?.data
      ? {
          id: 'loads',
          label: 'Cargas reales (Cloudflare, Uruguay)',
          value: prNumber(rum.data.totals.uy.loads),
          note: `28 días · ${rum.data.daysCovered.length} días medidos`,
        }
      : {
          id: 'loads',
          label: 'Cargas reales (Cloudflare, Uruguay)',
          value: '—',
          note: whyMissing(rum),
        }
  )

  out.push(
    cc?.usable && cc.siteCoverage !== null
      ? {
          id: 'coverage',
          label: 'Entradas que ve Google Analytics',
          value: uiPercent(cc.siteCoverage),
          note: `de las entradas de Cloudflare, del ${uiDate(cc.cfRange?.start)} al ${uiDate(cc.cfRange?.end)}`,
        }
      : {
          id: 'coverage',
          label: 'Entradas que ve Google Analytics',
          value: '—',
          note: cc?.reason || 'todavía no se pueden comparar las dos fuentes',
        }
  )

  if (idx?.data) {
    const t = idx.data.totals28d
    out.push({
      id: 'inspected',
      label: 'URLs inspeccionadas (28 días)',
      value: prNumber(t.checked),
      note: `${uiPercent(t.checked ? t.indexed / t.checked : null)} indexadas · ${prNumber(t.randomActionable)} de ${prNumber(t.randomChecked)} al azar con problema`,
    })
  } else {
    out.push({
      id: 'inspected',
      label: 'URLs inspeccionadas (28 días)',
      value: '—',
      note: whyMissing(idx),
    })
  }

  const fresh = withRows.reduce((a, sig) => a + (sig.newRows || 0), 0)
  out.push({
    id: 'signals',
    label: 'Señales con páginas',
    value: prNumber(withRows.length),
    note: `${prNumber(fresh)} ${fresh === 1 ? 'fila nueva' : 'filas nuevas'} hoy`,
  })
  return out
}

export interface UiSourceStatusRow {
  id: SourceId
  label: string
  status: SourceStatus
  statusLabel: string
  color: string
  date: string
  lastOkAt: string
  failingSince: string
  note: string
  carried: string
}

/** Una fila por fuente, en el orden de UI_SOURCE_IDS. Una fuente que falta en el documento es "inactiva". */
export function uiSourceStatusRows(
  sources: Partial<UsageInsightSources> | null | undefined
): UiSourceStatusRow[] {
  return UI_SOURCE_IDS.map(id => {
    const b = sources?.[id] as SourceBlock<unknown> | undefined
    const status: SourceStatus = b?.status && UI_STATUS[b.status] ? b.status : 'inactive'
    return {
      id,
      label: UI_SOURCE_LABELS[id],
      status,
      statusLabel: UI_STATUS[status].label,
      color: UI_STATUS[status].color,
      date: uiSourceDate(b ?? null),
      lastOkAt: uiDate(b?.lastOkAt),
      failingSince: uiDate(b?.failingSince),
      note:
        (status === 'inactive' ? b?.enableHint || b?.note : b?.note || b?.enableHint) ||
        (b ? '' : 'sin bloque en el documento'),
      carried: (b?.carried || []).join(', '),
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Tablas por fuente (pestaña "Fuentes"). Cada tabla: título, filas y columnas.
// ---------------------------------------------------------------------------------------------

export interface UiSourceTable {
  id: string
  title: string
  rows: any[]
  columns: UiColumn[]
  /** Texto en lugar de la tabla cuando no hay filas por un motivo conocido. */
  empty?: string
}

const rated = (r: Rated | null | undefined) =>
  r?.rating ? `${UI_RATING[r.rating].label} (${uiPercent(r.poorShare)} mal)` : '—'

const frictionShare = (f: Friction | null | undefined) => f?.sessionsShare ?? null

const crux = (label: string, r: CruxRecord | null) =>
  r
    ? {
        label,
        lcpMs: r.lcpMs,
        inpMs: r.inpMs,
        cls: r.cls,
        lcp: r.rating.lcp,
        inp: r.rating.inp,
        clsRating: r.rating.cls,
      }
    : null

const CRUX_COLUMNS: UiColumn[] = [
  { key: 'lcpMs', label: 'LCP p75', kind: 'ms' },
  { key: 'lcp', label: 'LCP', kind: 'rating' },
  { key: 'inpMs', label: 'INP p75', kind: 'ms' },
  { key: 'inp', label: 'INP', kind: 'rating' },
  { key: 'cls', label: 'CLS p75', kind: 'cls' },
  { key: 'clsRating', label: 'CLS', kind: 'rating' },
]

const CLARITY_COLUMNS: UiColumn[] = [
  { key: 'sessions', label: 'Sesiones', kind: 'int' },
  { key: 'rage', label: 'Bronca', kind: 'pct', get: r => frictionShare(r?.rage) },
  { key: 'dead', label: 'Clic muerto', kind: 'pct', get: r => frictionShare(r?.dead) },
  { key: 'quickback', label: 'Vuelta atrás', kind: 'pct', get: r => frictionShare(r?.quickback) },
  {
    key: 'scriptErrors',
    label: 'Errores JS',
    kind: 'pct',
    get: r => frictionShare(r?.scriptErrors),
  },
  { key: 'scrollDepth', label: 'Scroll', kind: 'depth' },
  { key: 'activeSec', label: 'Tiempo activo', kind: 'sec' },
]

/** Las tablas de una fuente con datos. Sin datos devuelve `[]` (la página muestra el motivo). */
export function sourceTables(sources: UsageInsightSources, id: SourceId): UiSourceTable[] {
  switch (id) {
    case 'cloudflareRum': {
      const d = sources.cloudflareRum?.data
      if (!d) return []
      return [
        {
          id: 'devices',
          title: 'Dispositivos (Uruguay)',
          rows: d.devices,
          columns: [
            { key: 'device', label: 'Dispositivo', kind: 'text' },
            { key: 'loads', label: 'Cargas', kind: 'int' },
            { key: 'visits', label: 'Entradas', kind: 'int' },
          ],
        },
        {
          id: 'referrers',
          title: 'De dónde llegan',
          rows: d.referrers,
          columns: [
            { key: 'host', label: 'Origen', kind: 'text', get: r => r?.host || '(directo)' },
            {
              key: 'kind',
              label: 'Tipo',
              kind: 'text',
              get: r => UI_REFERRER_KINDS[r?.kind as keyof typeof UI_REFERRER_KINDS] ?? r?.kind,
            },
            { key: 'loads', label: 'Cargas', kind: 'int' },
            { key: 'visits', label: 'Entradas', kind: 'int' },
          ],
        },
        {
          id: 'countries',
          title: 'Países (todo el tráfico)',
          rows: d.countries,
          columns: [
            { key: 'country', label: 'País', kind: 'text' },
            { key: 'loads', label: 'Cargas', kind: 'int' },
            { key: 'visits', label: 'Entradas', kind: 'int' },
          ],
        },
        {
          id: 'vitals',
          title: 'Web Vitals por página y dispositivo',
          rows: d.vitals,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'device', label: 'Disp.', kind: 'text' },
            { key: 'lcp', label: 'LCP', kind: 'text', get: r => rated(r?.lcp) },
            { key: 'inp', label: 'INP', kind: 'text', get: r => rated(r?.inp) },
            { key: 'cls', label: 'CLS', kind: 'text', get: r => rated(r?.cls) },
            { key: 'realSamples', label: 'Muestras reales', kind: 'int' },
          ],
        },
        {
          id: 'elements',
          title: 'Elementos culpables',
          rows: d.elements,
          columns: [
            {
              key: 'metric',
              label: 'Métrica',
              kind: 'text',
              get: r => String(r?.metric || '').toUpperCase(),
            },
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'device', label: 'Disp.', kind: 'text' },
            {
              key: 'element',
              label: 'Elemento',
              kind: 'text',
              get: r => r?.element || 'sin atribuir',
            },
            { key: 'inpName', label: 'Interacción', kind: 'text' },
            { key: 'events', label: 'Eventos malos', kind: 'int' },
          ],
        },
      ]
    }
    case 'ga4Behavior': {
      const d = sources.ga4Behavior?.data
      if (!d) return []
      const terms = d.search.qRegistered
        ? d.search.noResultTerms
        : d.search.noResultPages.map(p => ({ term: p.path, events: p.events }))
      return [
        {
          id: 'devices',
          title: 'Dispositivos (Uruguay)',
          rows: d.devices,
          columns: [
            { key: 'device', label: 'Dispositivo', kind: 'text' },
            { key: 'views', label: 'Vistas', kind: 'int' },
            { key: 'sessions', label: 'Sesiones', kind: 'int' },
            { key: 'engagementRate', label: 'Interacción', kind: 'pct' },
            { key: 'avgEngagementSec', label: 'Tiempo', kind: 'sec' },
          ],
        },
        {
          id: 'search',
          title: d.search.qRegistered
            ? 'Búsquedas sin resultado'
            : 'Páginas donde una búsqueda no encontró nada',
          rows: terms,
          empty: 'Ninguna búsqueda sin resultado en la ventana.',
          columns: [
            {
              key: 'term',
              label: d.search.qRegistered ? 'Búsqueda' : 'Página',
              kind: d.search.qRegistered ? 'text' : 'path',
            },
            { key: 'events', label: 'Veces', kind: 'int' },
          ],
        },
        {
          id: 'templates',
          title: 'Plantillas (rutas dinámicas plegadas, aprox.)',
          rows: d.templates,
          columns: [
            { key: 'template', label: 'Plantilla', kind: 'text' },
            { key: 'realPaths', label: 'Rutas', kind: 'int' },
            { key: 'views', label: 'Vistas', kind: 'int' },
            { key: 'read50', label: 'Llega a la mitad', kind: 'pct', get: r => r?.rates?.read50 },
            { key: 'outbound', label: 'Sale afuera', kind: 'pct', get: r => r?.rates?.outbound },
          ],
        },
        {
          id: 'flows',
          title: 'De qué página a qué página',
          rows: d.flows,
          columns: [
            { key: 'from', label: 'Desde', kind: 'path' },
            { key: 'to', label: 'Hacia', kind: 'path' },
            { key: 'views', label: 'Vistas', kind: 'int' },
          ],
        },
        {
          id: 'linkAreas',
          title: 'Zonas de enlaces',
          rows: d.linkAreas,
          empty: 'Sin la dimensión link_area registrada en Analytics.',
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'area', label: 'Zona', kind: 'text' },
            { key: 'navigations', label: 'Clics', kind: 'int' },
            { key: 'exposures', label: 'Vistas de la zona', kind: 'int' },
          ],
        },
        {
          id: 'outbound',
          title: 'Salidas a otros sitios',
          rows: d.outbound,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'domain', label: 'Adónde', kind: 'text' },
            { key: 'events', label: 'Clics', kind: 'int' },
          ],
        },
      ]
    }
    case 'indexation': {
      const d = sources.indexation?.data
      if (!d) return []
      return [
        {
          id: 'families',
          title: 'Por familia',
          rows: d.families,
          columns: [
            { key: 'family', label: 'Familia', kind: 'text' },
            { key: 'checked', label: 'Inspeccionadas', kind: 'int' },
            { key: 'indexed', label: 'Indexadas', kind: 'int' },
            {
              key: 'random',
              label: 'Al azar con problema',
              kind: 'text',
              get: r =>
                `${prNumber(r?.randomActionable ?? 0)} de ${prNumber(r?.randomChecked ?? 0)}`,
            },
            { key: 'shareActionable', label: 'Proporción', kind: 'pct' },
            { key: 'pending', label: 'Pendientes', kind: 'int' },
            {
              key: 'topReason',
              label: 'Motivo más común',
              kind: 'text',
              get: r => (r?.topReason ? coverageLabel(r.topReason) : null),
            },
          ],
        },
        {
          id: 'rows',
          title: 'URLs con problema',
          rows: d.rows,
          empty: 'Ninguna URL inspeccionada tiene un problema accionable.',
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'class', label: 'Estado', kind: 'text', get: r => coverageLabel(r?.class) },
            { key: 'coverageState', label: 'Google dice', kind: 'text' },
            { key: 'reason', label: 'Muestra', kind: 'text', get: r => stratumLabel(r?.reason) },
            { key: 'checkedAt', label: 'Inspeccionada', kind: 'date' },
            { key: 'lastCrawlTime', label: 'Último rastreo', kind: 'date' },
            { key: 'resultLink', label: 'Search Console', kind: 'link' },
          ],
        },
      ]
    }
    case 'feedback': {
      const d = sources.feedback?.data
      if (!d) return []
      return [
        {
          id: 'pages',
          title: 'Por página',
          rows: d.pages,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'helpfulYes', label: 'Sí', kind: 'int' },
            { key: 'helpfulNo', label: 'No', kind: 'int' },
            { key: 'distinctNo', label: 'Personas que dijeron no', kind: 'int' },
            { key: 'suggestion', label: 'Sugerencias', kind: 'int' },
            { key: 'bug', label: 'Errores', kind: 'int' },
            { key: 'praise', label: 'Elogios', kind: 'int' },
            { key: 'last', label: 'Última', kind: 'date' },
          ],
        },
      ]
    }
    case 'clarity': {
      const d = sources.clarity?.data
      if (!d) return []
      return [
        {
          id: 'urls',
          title: d.urlsUy ? 'Páginas (Uruguay, últimas 24 h)' : 'Páginas (últimas 24 h)',
          rows: d.urlsUy ?? d.urls,
          columns: [{ key: 'path', label: 'Página', kind: 'path' }, ...CLARITY_COLUMNS],
        },
        {
          id: 'urlDevice',
          title: 'Página y dispositivo',
          rows: d.urlDevice,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'device', label: 'Disp.', kind: 'text' },
            ...CLARITY_COLUMNS,
          ],
        },
        {
          id: 'deviceBrowser',
          title: 'Dispositivo y navegador',
          rows: d.deviceBrowser,
          columns: [
            { key: 'device', label: 'Disp.', kind: 'text' },
            { key: 'browser', label: 'Navegador', kind: 'text' },
            { key: 'sessions', label: 'Sesiones', kind: 'int' },
            { key: 'rage', label: 'Bronca', kind: 'pct' },
            { key: 'dead', label: 'Clic muerto', kind: 'pct' },
          ],
        },
      ]
    }
    case 'bing': {
      const d = sources.bing?.data
      if (!d) return []
      return [
        {
          id: 'queries',
          title: 'Consultas (4 semanas)',
          rows: d.queries,
          columns: [
            { key: 'query', label: 'Consulta', kind: 'text' },
            { key: 'impressions', label: 'Impresiones', kind: 'int' },
            { key: 'clicks', label: 'Clics', kind: 'int' },
            { key: 'avgPosition', label: 'Posición', kind: 'num' },
          ],
        },
        {
          id: 'pages',
          title: 'Páginas',
          rows: d.pages,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'impressions', label: 'Impresiones', kind: 'int' },
            { key: 'clicks', label: 'Clics', kind: 'int' },
            { key: 'avgPosition', label: 'Posición', kind: 'num' },
          ],
        },
        {
          id: 'crawl',
          title: 'Rastreo',
          rows: d.crawl,
          columns: [
            { key: 'day', label: 'Día', kind: 'date' },
            { key: 'crawled', label: 'Rastreadas', kind: 'int' },
            { key: 'inIndex', label: 'En el índice', kind: 'int' },
            { key: 'code4xx', label: '4xx', kind: 'int' },
            { key: 'code5xx', label: '5xx', kind: 'int' },
            { key: 'blockedByRobots', label: 'Bloqueadas', kind: 'int' },
          ],
        },
        {
          id: 'issues',
          title: 'Problemas de rastreo',
          rows: d.issues,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'httpCode', label: 'Código', kind: 'int' },
            { key: 'inLinks', label: 'Enlaces que llegan', kind: 'int' },
          ],
        },
      ]
    }
    case 'cloudflareZone': {
      const d = sources.cloudflareZone?.data
      if (!d) return []
      return [
        {
          id: 'crawlers',
          title: 'Rastreadores (user-agent declarado, 7 días)',
          rows: d.crawlers,
          columns: [
            { key: 'crawler', label: 'Rastreador', kind: 'text' },
            { key: 'requests', label: 'Pedidos', kind: 'int' },
            { key: 'ok2xx', label: '2xx', kind: 'int' },
            { key: 'redirects', label: 'Redirige', kind: 'int' },
            { key: 'errors4xx', label: '4xx', kind: 'int' },
            { key: 'errors5xx', label: '5xx', kind: 'int' },
          ],
        },
        {
          id: 'crawlerPaths',
          title: 'Qué piden y no reciben bien',
          rows: d.crawlerPaths,
          columns: [
            { key: 'crawler', label: 'Rastreador', kind: 'text' },
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'status', label: 'Estado', kind: 'int' },
            { key: 'requests', label: 'Pedidos', kind: 'int' },
          ],
        },
        {
          id: 'errors',
          title: 'Errores a la gente',
          rows: d.errors,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'status', label: 'Estado', kind: 'int' },
            { key: 'requests', label: 'Pedidos', kind: 'int' },
            { key: 'crawlerShare', label: 'De rastreadores', kind: 'pct' },
          ],
        },
        {
          id: 'cache',
          title: 'Caché del HTML',
          rows: d.cache,
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'requests', label: 'Pedidos', kind: 'int' },
            { key: 'hitShare', label: 'Desde caché', kind: 'pct' },
            { key: 'dynamicShare', label: 'Dinámico', kind: 'pct' },
          ],
        },
      ]
    }
    case 'crux': {
      const d = sources.crux?.data
      if (!d) return []
      const origin = [
        crux('Todo el sitio', d.origin.ALL),
        crux('Celular', d.origin.PHONE),
        crux('Escritorio', d.origin.DESKTOP),
      ].filter(Boolean)
      return [
        {
          id: 'origin',
          title: 'El sitio entero (28 días, Google)',
          rows: origin,
          columns: [{ key: 'label', label: 'Dónde', kind: 'text' }, ...CRUX_COLUMNS],
        },
        {
          id: 'urls',
          title: 'Por URL',
          rows: d.urls.map(u => ({
            path: u.path,
            formFactor: u.formFactor === 'PHONE' ? 'celular' : 'escritorio',
            ...crux('', u),
          })),
          columns: [
            { key: 'path', label: 'Página', kind: 'path' },
            { key: 'formFactor', label: 'Disp.', kind: 'text' },
            ...CRUX_COLUMNS,
          ],
        },
      ]
    }
    default:
      return []
  }
}
