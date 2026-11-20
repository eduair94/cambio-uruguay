// El contrato de datos de `currency-usage-insights` y de la página privada /estadisticas-de-uso.
//
// El app lo copia a mano en `app/utils/usageInsights.ts` (sólo el snapshot: el documento de estado y
// el archivo por día no salen nunca del backend). `tests/insights/app_contract.test.ts` exige que las
// dos listas de ids (`SOURCE_IDS`, `SIGNAL_IDS`) sean iguales y en el mismo orden en los dos lados.
//
// PRIVADO: el snapshot mezcla tráfico por página de ocho fuentes. Lo sirve `/api/usage-insights` con
// `requireAdmin`. Sin IP, sin ids de usuario, sin texto de visitantes salvo los términos del buscador
// del sitio, y sin cifras de ingreso (este repo es público).

export const USAGE_INSIGHTS_KEY = "site";
export const USAGE_INSIGHTS_STATE_KEY = "state";
export const USAGE_INSIGHTS_SCHEMA_VERSION = 1;
export const SNAPSHOT_MAX_BYTES = 1_000_000;
export const DAY_MAX_BYTES = 800_000;
export const TIMEZONE = "America/Montevideo";
/** El día con el que Google reinicia sus cupos diarios (URL Inspection). */
export const GOOGLE_QUOTA_TZ = "America/Los_Angeles";

/** Orden de pantalla. `app/utils/usageInsights.ts` exporta `UI_SOURCE_IDS` con estas cadenas, en este orden. */
export const SOURCE_IDS = ["cloudflareRum", "ga4Behavior", "indexation", "feedback", "clarity", "bing", "cloudflareZone", "crux"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

/** Ids estables. `app/utils/usageInsights.ts` exporta `UI_SIGNAL_IDS` con estas cadenas, en este orden. */
export const SIGNAL_IDS = [
  "consent-gap",
  "mobile-worse",
  "low-reading",
  "poor-vitals",
  "search-no-results",
  "outbound-rate",
  "not-indexed",
  "helpful-no",
  "friction",
  "bing-only-queries",
  "ai-crawler-errors",
  "edge-errors",
] as const;
export type SignalId = (typeof SIGNAL_IDS)[number];

export type SourceStatus = "ok" | "partial" | "thin" | "failed" | "inactive" | "skipped";

/** YYYY-MM-DD, inclusive. */
export interface DayWindow {
  start: string;
  end: string;
  days: number;
  tz: "America/Montevideo" | "UTC";
}

export interface SourceBlock<D> {
  id: SourceId;
  status: SourceStatus;
  /** true sólo si ESTA corrida produjo `data` (status ok | partial). */
  ok: boolean;
  /** Cuándo se trajo el `data` que se conserva: la fecha VIEJA cuando se conservó. */
  fetchedAt: string | null;
  attemptedAt: string;
  lastOkAt: string | null;
  /** Primer intento de la racha actual thin/failed; null cuando ok/partial/inactive. */
  failingSince: string | null;
  /** Castellano, ≤ 300 caracteres, armado sólo por sanitizeError() o texto fijo. */
  note: string | null;
  /** Sólo con status inactive: qué configurar. */
  enableHint: string | null;
  window: DayWindow | null;
  truncated: boolean;
  carried: string[];
  rowsSeen: Record<string, number>;
  data: D | null;
}

/** Umbrales de Google: LCP 2.5/4 s, INP 200/500 ms, CLS 0.1/0.25, FCP 1.8/3 s, TTFB 0.8/1.8 s. */
export type Rating = "good" | "ni" | "poor";
export interface Rated {
  good: number;
  ni: number;
  poor: number;
  total: number;
  rating: Rating | null;
  poorShare: number | null;
}

export type CoverageClass =
  | "indexed"
  | "indexed-warning"
  | "crawled-not-indexed"
  | "discovered-not-indexed"
  | "duplicate-google-chose"
  | "duplicate-no-canonical"
  | "alternate-canonical"
  | "redirect"
  | "noindex"
  | "not-found"
  | "soft-404"
  | "server-error"
  | "redirect-error"
  | "blocked-robots"
  | "blocked-4xx"
  | "unknown-to-google"
  | "other";

export const ACTIONABLE_CLASSES: CoverageClass[] = [
  "crawled-not-indexed",
  "discovered-not-indexed",
  "duplicate-google-chose",
  "duplicate-no-canonical",
  "not-found",
  "soft-404",
  "server-error",
  "redirect-error",
  "blocked-robots",
  "blocked-4xx",
  "unknown-to-google",
];
/** Por diseño (se cuentan, nunca se marcan). `indexed-warning` está indexada. */
export const BY_DESIGN_CLASSES: CoverageClass[] = ["alternate-canonical", "redirect", "noindex"];

// ---- 1. cloudflareRum ---------------------------------------------------------------------------

export interface CfVitalRow {
  path: string;
  device: string;
  /** Eventos ESTIMADOS (count, ya × sampleInterval) sumados en daysCovered. */
  samples: number;
  /** Σ(count_d / sampleInterval_d): los beacons de verdad. Todo umbral de muestra usa éste. */
  realSamples: number;
  lcp: Rated;
  inp: Rated;
  cls: Rated;
  p75Approx: {
    lcpMs: number | null;
    inpMs: number | null;
    cls: number | null;
    fcpMs: number | null;
    ttfbMs: number | null;
    day: string;
  } | null;
}

export interface CfElementRow {
  metric: "cls" | "inp" | "lcp";
  path: string;
  device: string;
  /** "" se guarda como "", se muestra "sin atribuir". */
  element: string;
  inpName: string | null;
  /** Eventos malos (CLS > 0.1, INP > 200 ms, LCP > 2.5 s) sumados. */
  events: number;
}

export type ReferrerKind = "search" | "ai" | "social" | "internal" | "direct" | "other";

export interface CfRumData {
  daysCovered: string[];
  suspectDays: string[];
  settings: {
    pageloadNotOlderThanDays: number | null;
    vitalsNotOlderThanDays: number | null;
    maxPageSize: number | null;
  } | null;
  totals: {
    uy: { loads: number; visits: number };
    all: { loads: number; visits: number };
    uyShare: number | null;
  };
  daily: { day: string; loadsUy: number; visitsUy: number; loadsAll: number; sampleInterval: number }[];
  devices: { device: string; loads: number; visits: number }[];
  pages: { path: string; loads: number; visits: number; mobile: number; desktop: number; tablet: number }[];
  referrers: { host: string; kind: ReferrerKind; loads: number; visits: number }[];
  countries: { country: string; loads: number; visits: number }[];
  vitals: CfVitalRow[];
  vitalsByDevice: CfVitalRow[];
  elements: CfElementRow[];
  consent: {
    range: { start: string; end: string };
    days: number;
    totals: { loads: number; visits: number; realVisits: number };
    pages: { path: string; loads: number; visits: number; realVisits: number }[];
    /** Algún día del rango llegó al tope de la consulta de páginas: las cifras por ruta son un piso. */
    pagesTruncated?: boolean;
    /** Y además no se pudo leer su total sin dimensiones: el total del sitio queda corto. */
    totalsUndercount?: boolean;
  } | null;
  internalLoadsShare: number | null;
  /**
   * Días cubiertos a los que les faltó una parte y por eso quedan afuera de esa suma: sin `countries`
   * no entran a `totals.all`/`uyShare`, sin `vitals` no entran a las calificaciones. Opcional sólo
   * porque un snapshot guardado antes del 20/11/2026 no lo trae.
   */
  partialDays?: { countries: number; vitals: number; pagesTruncated: number; totalsUndercount: number };
}

// ---- 2. ga4Behavior -----------------------------------------------------------------------------

export interface DeviceSlice {
  views: number;
  sessions: number;
  engagementRate: number | null;
  avgEngagementSec: number | null;
  bounceRate: number | null;
  landingSessions: number;
}

export interface Ga4Events {
  read50: number;
  read90: number;
  readAny: number;
  outbound: number;
  internalNav: number;
  recommendationViews: number;
  helpfulViews: number;
  ctaClicks: number;
}

export interface Ga4Rates {
  read50: number | null;
  read90: number | null;
  outbound: number | null;
  internalNav: number | null;
  /** readAny ≥ LR_MIN_MEASURED para la página o su plantilla. */
  readMeasured: boolean;
  /** readAny + internalNav + outbound + recommendationViews ≥ OR_MIN_MEASURED. */
  measured: boolean;
}

export interface Ga4PageRow {
  path: string;
  family: string;
  views: number;
  sessions: number;
  engagementRate: number | null;
  avgEngagementSec: number | null;
  landingSessions: number;
  landingEngagementRate: number | null;
  mobile: DeviceSlice | null;
  desktop: DeviceSlice | null;
  /** Cuando la ruta real se plegó a una plantilla; entonces events/rates = null. */
  template: string | null;
  events: Ga4Events | null;
  rates: Ga4Rates | null;
}

export interface Ga4TemplateRow {
  template: string;
  family: string;
  realPaths: number;
  views: number;
  events: Ga4Events;
  rates: Ga4Rates;
  approx: true;
}

export interface Ga4BehaviorData {
  customDimensions: string[];
  timeZone: string | null;
  quotaRemaining: number | null;
  totals: { views: number; sessions: number; engagedSessions: number; eventCount: number };
  devices: {
    device: string;
    sessions: number;
    views: number;
    engagementRate: number | null;
    avgEngagementSec: number | null;
    users: number;
  }[];
  daily: { day: string; views: number; sessions: number }[];
  consent: {
    range: { start: string; end: string };
    truncated: boolean;
    totals: { views: number; landingSessions: number };
    pages: { path: string; views: number; landingSessions: number }[];
  } | null;
  pages: Ga4PageRow[];
  templates: Ga4TemplateRow[];
  events: { name: string; count: number }[];
  outbound: { path: string; domain: string; events: number }[];
  flows: { from: string; to: string; views: number }[];
  flowsTotalViews: number;
  linkAreas: { path: string; area: string; navigations: number; exposures: number }[];
  navTargets: { path: string; destination: string; area: string; navigations: number }[];
  placements: { placement: string; event: string; count: number }[];
  search: {
    qRegistered: boolean;
    opens: number;
    selects: number;
    noResults: number;
    resultsViews: number;
    noResultTerms: { term: string; events: number }[];
    selectTerms: { term: string; events: number }[];
    pageTerms: { term: string; events: number }[];
    noResultPages: { path: string; events: number }[];
  };
}

// ---- 3. indexation ------------------------------------------------------------------------------

export type InspectionStratum = "new" | "top" | "random";

export interface InspectionRow {
  path: string;
  family: string;
  checkedAt: string;
  reason: InspectionStratum;
  verdict: string;
  coverageState: string;
  class: CoverageClass;
  pending: boolean;
  pageFetchState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  crawledAs: string | null;
  firstSeenInSitemap: string | null;
  resultLink: string | null;
}

export interface IndexationData {
  today: {
    budget: number;
    quotaUsedBefore: number;
    quotaDay: string;
    picked: { new: number; top: number; random: number };
    checked: number;
    stoppedBy: null | "quota" | "counter" | "permission" | "time" | "errors";
    minutes: number;
  };
  sitemap: {
    urls: number;
    esUrls: number;
    newLast14d: number;
    fetchedAt: string;
    seededAt: string;
    capped: boolean;
  } | null;
  totals28d: {
    checked: number;
    indexed: number;
    byDesign: number;
    actionable: number;
    pending: number;
    randomChecked: number;
    randomActionable: number;
  };
  families: {
    family: string;
    localized: boolean;
    checked: number;
    indexed: number;
    byDesign: number;
    actionable: number;
    pending: number;
    randomChecked: number;
    randomActionable: number;
    shareActionable: number | null;
    newChecked: number;
    newIndexed: number;
    topReason: CoverageClass | null;
  }[];
  newUrls: { checked: number; indexed: number; pending: number; medianAgeDays: number | null };
  rows: InspectionRow[];
}

// ---- 4. feedback --------------------------------------------------------------------------------

export interface FeedbackData {
  totals: { helpfulYes: number; helpfulNo: number; suggestion: number; bug: number; praise: number };
  pages: {
    path: string;
    family: string;
    helpfulYes: number;
    helpfulNo: number;
    distinctYes: number;
    distinctNo: number;
    suggestion: number;
    bug: number;
    praise: number;
    last: string;
  }[];
  daily: { day: string; helpfulYes: number; helpfulNo: number; written: number }[];
}

// ---- 5. clarity ---------------------------------------------------------------------------------

/** sessionsShare 0..1 */
export interface Friction {
  sessionsShare: number | null;
  events: number;
  sessions: number;
}

export interface ClarityMetrics {
  sessions: number;
  botSessions: number;
  users: number | null;
  pagesPerSession: number | null;
  activeSec: number | null;
  totalSec: number | null;
  /** 0..100 */
  scrollDepth: number | null;
  rage: Friction | null;
  dead: Friction | null;
  quickback: Friction | null;
  excessiveScroll: Friction | null;
  scriptErrors: Friction | null;
  errorClicks: Friction | null;
}

export interface ClarityData {
  windowEnd: string;
  hours: 24;
  callsThisRun: number;
  callsTodayUtc: number;
  totals: ClarityMetrics;
  urls: (ClarityMetrics & { path: string })[];
  urlsUy: (ClarityMetrics & { path: string })[] | null;
  urlDevice: (ClarityMetrics & { path: string; device: string })[];
  deviceBrowser: { device: string; browser: string; sessions: number; rage: number | null; dead: number | null }[];
  channelDevice: { channel: string; device: string; sessions: number }[];
  unknownKeys: string[];
}

// ---- 6. bing ------------------------------------------------------------------------------------

export interface BingData {
  siteUrl: string;
  buckets: string[];
  traffic: { day: string; clicks: number; impressions: number }[];
  queries: {
    query: string;
    impressions: number;
    clicks: number;
    avgPosition: number | null;
    avgClickPosition: number | null;
    weeks: number;
  }[];
  pages: { path: string; impressions: number; clicks: number; avgPosition: number | null }[];
  crawl: {
    day: string;
    crawled: number;
    inIndex: number;
    errors: number;
    code4xx: number;
    code5xx: number;
    code301: number;
    code302: number;
    blockedByRobots: number;
  }[];
  issues: { path: string; httpCode: number; issuesRaw: number; inLinks: number }[];
}

// ---- 7. cloudflareZone --------------------------------------------------------------------------

export interface CfZoneData {
  crawlers: {
    crawler: string;
    requests: number;
    ok2xx: number;
    notModified304: number;
    redirects: number;
    errors4xx: number;
    errors5xx: number;
  }[];
  crawlerPaths: { crawler: string; path: string; status: number; requests: number }[];
  errors: { path: string; status: number; requests: number; crawlerShare: number | null }[];
  cache: { path: string; requests: number; hitShare: number | null; dynamicShare: number | null }[];
  statusTotals: { status: number; requests: number }[];
}

// ---- 8. crux ------------------------------------------------------------------------------------

export interface CruxRecord {
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  good: { lcp: number | null; inp: number | null; cls: number | null };
  rating: { lcp: Rating | null; inp: Rating | null; cls: Rating | null };
}

export interface CruxData {
  origin: { ALL: CruxRecord | null; PHONE: CruxRecord | null; DESKTOP: CruxRecord | null };
  urls: (CruxRecord & { path: string; formFactor: "PHONE" | "DESKTOP" })[];
  noData: number;
  collectionPeriod: { first: string; last: string } | null;
  history:
    | {
        formFactor: "ALL" | "PHONE" | "DESKTOP";
        periods: string[];
        lcpP75: (number | null)[];
        inpP75: (number | null)[];
        clsP75: (number | null)[];
      }[]
    | null;
  historyFetchedAt: string | null;
}

// ---- 1.4 la tabla de páginas --------------------------------------------------------------------

export interface VitalBrief {
  lcp: Rating | null;
  inp: Rating | null;
  cls: Rating | null;
  samples: number;
  realSamples: number;
}

export interface InsightPageRow {
  path: string;
  family: string;
  locale: string | null;
  cf: { loads: number; visits: number; mobileShare: number | null } | null;
  ga4: {
    views: number;
    sessions: number;
    engagementRate: number | null;
    avgEngagementSec: number | null;
    mobileEngagement: number | null;
    desktopEngagement: number | null;
    landingSessions: number;
    read50Rate: number | null;
    outboundRate: number | null;
    readMeasured: boolean;
    helpfulViews: number;
    template: string | null;
  } | null;
  coverage: number | null;
  coverageLoads: number | null;
  vitals: { mobile: VitalBrief | null; desktop: VitalBrief | null } | null;
  crux: { phone: CruxRecord["rating"] | null; desktop: CruxRecord["rating"] | null } | null;
  clarity: {
    sessions: number;
    rage: number | null;
    dead: number | null;
    quickback: number | null;
    scrollDepth: number | null;
  } | null;
  index: { class: CoverageClass; checkedAt: string; pending: boolean } | null;
  feedback: { yes: number; no: number; written: number } | null;
  signals: SignalId[];
}

// ---- 1.5 señales --------------------------------------------------------------------------------

export type SignalRow = { key: string; path: string | null; family: string | null; impact: number; isNew: boolean } & Record<
  string,
  string | number | boolean | null
>;

export interface Signal {
  id: SignalId;
  title: string;
  question: string;
  status: "ok" | "stale" | "unavailable";
  reason: string | null;
  severity: "high" | "medium" | "low" | "none";
  impact: number;
  impactUnit: "cf-loads" | "ga4-views" | "events" | "impressions" | "requests";
  sources: SourceId[];
  dataAsOf: string | null;
  window: DayWindow | null;
  thresholds: Record<string, number>;
  count: number;
  newRows: number;
  rows: SignalRow[];
  groups: { key: string; label: string; count: number; share: number | null }[];
  /** Nunca cita un término del buscador ni una consulta de Bing/GSC: va a los logs y a Telegram. */
  summary: string;
}

// ---- 1.6 tendencia ------------------------------------------------------------------------------

export interface InsightTrend {
  days: string[];
  cfLoadsUy: (number | null)[];
  cfVisitsUy: (number | null)[];
  ga4ViewsUy: (number | null)[];
  ga4SessionsUy: (number | null)[];
  coverage: (number | null)[];
  inspected: (number | null)[];
  inspectedIndexedShare: (number | null)[];
}

// ---- 1.7 snapshot y estado ----------------------------------------------------------------------

export interface InsightSources {
  cloudflareRum: SourceBlock<CfRumData>;
  ga4Behavior: SourceBlock<Ga4BehaviorData>;
  indexation: SourceBlock<IndexationData>;
  feedback: SourceBlock<FeedbackData>;
  clarity: SourceBlock<ClarityData>;
  bing: SourceBlock<BingData>;
  cloudflareZone: SourceBlock<CfZoneData>;
  crux: SourceBlock<CruxData>;
}

export interface ConsentCheck {
  usable: boolean;
  reason: string | null;
  cfRange: { start: string; end: string } | null;
  ga4Range: { start: string; end: string } | null;
  ga4TimeZone: string | null;
  days: number;
  siteCoverage: number | null;
  siteCoverageLoads: number | null;
  cfInternalShare: number | null;
  ga4InternalShare: number | null;
  /** La consulta de páginas de Cloudflare llegó a su tope algún día del rango. */
  cfPagesTruncated?: boolean;
  /** Algún reporte de consentimiento de GA4 vino cortado (2.500 filas): las rutas que faltan se saltan. */
  ga4Truncated?: boolean;
}

export interface UsageInsightSnapshot {
  key: "site";
  schemaVersion: 1;
  asOf: string;
  day: string;
  timezone: "America/Montevideo";
  window: DayWindow;
  run: { durationSec: number; flags: string[]; trimmed: string[]; bytes: number; siteLoadsUy: number | null };
  sources: InsightSources;
  pages: InsightPageRow[];
  signals: Signal[];
  trend: InsightTrend;
  consentCheck: ConsentCheck | null;
}

/** gc/uc: "=" cuando es igual a `path`; si no una ruta (mismo host) o la URL entera. */
export interface CompactInspection {
  path: string;
  at: string;
  r: InspectionStratum;
  v: string;
  cs: string;
  cls: CoverageClass;
  pf: string | null;
  ix: string | null;
  rb: string | null;
  lc: string | null;
  gc: string | null;
  uc: string | null;
  ca: string | null;
}

/** `day` en la zona del contador; lo escribe SÓLO store.reserveQuota(). */
export interface QuotaCounter {
  day: string;
  used: number;
}

export interface InsightState {
  quota: { clarity: QuotaCounter; inspection: QuotaCounter };
  clarity: { lastOkAt: string | null };
  /**
   * Sólo rutas en castellano. Una ruta traducida toma la fecha de su par en castellano; sin par, su
   * fecha es desconocida y nunca es "nueva". `gone`: las que salieron del sitemap y desde cuándo (se
   * borran a los 35 días).
   */
  sitemap: { seededAt: string; fetchedAt: string; capped: boolean; firstSeen: [string, string][]; gone?: [string, string][] };
  inspections: CompactInspection[];
  cfRum: { suspectSince: string | null; backfillTarget: string | null };
  crux: { historyFetchedAt: string | null; lastOkAt: string | null };
  bing: { lastBucket: string | null };
  /**
   * Las claves de TODAS las filas de cada señal en la última corrida en que estuvo disponible (tope
   * STATE_SIGNAL_KEYS_MAX, por encima del máximo de filas que cualquier señal puede tener). Contra esto
   * se marca `isNew`: el snapshot sólo guarda 20 filas por señal.
   */
  signalKeys: Partial<Record<SignalId, string[]>>;
}

export interface UsageInsightStateDoc {
  key: "state";
  state: InsightState;
}

// ---- 1.8 archivo por día ------------------------------------------------------------------------

export interface DaySlice<T> {
  fetchedAt: string;
  window: DayWindow;
  data: T;
}

/** Forma del archivo; total = suma, `ratedFromTuple()` reconstruye el Rated. */
export type RatedTuple = [good: number, ni: number, poor: number];

export interface CfRumDayVital {
  path: string;
  device: string;
  samples: number;
  sampleInterval: number;
  lcp: RatedTuple;
  inp: RatedTuple;
  cls: RatedTuple;
  fcp: RatedTuple;
  ttfb: RatedTuple;
  p75: { lcpMs: number | null; inpMs: number | null; cls: number | null; fcpMs: number | null; ttfbMs: number | null };
}

export interface CfRumDay {
  suspect: boolean;
  sampleInterval: number;
  /** Sub-partes que no se pudieron leer ese día: la próxima corrida lo vuelve a pedir mientras sea reciente. */
  missing?: string[];
  /**
   * La consulta de páginas llegó a su tope (2.000 grupos ruta × dispositivo). Los totales uruguayos
   * salen entonces de una consulta sin dimensiones; si ésa falló, `missing` lleva "totals".
   */
  pagesTruncated?: boolean;
  totals: { uy: { loads: number; visits: number }; all: { loads: number; visits: number } };
  pagesByDevice: { path: string; device: string; loads: number; visits: number }[];
  referrers: { host: string; device: string; loads: number; visits: number }[];
  countries: { country: string; loads: number; visits: number }[];
  vitals: CfRumDayVital[];
  elements: CfElementRow[];
}

export interface Ga4BehaviorDay {
  totals: Ga4BehaviorData["totals"];
  pages: { path: string; views: number; sessions: number; engagementRate: number | null; read50: number; outbound: number }[];
}

export interface DaySignal {
  id: SignalId;
  status: string;
  severity: string;
  count: number;
  impact: number;
  keys: string[];
}

export interface UsageInsightDay {
  day: string;
  schemaVersion: 1;
  sources: Partial<{
    cloudflareRum: DaySlice<CfRumDay>;
    ga4Behavior: DaySlice<Ga4BehaviorDay>;
    indexation: DaySlice<{ checked: number; results: CompactInspection[] }>;
    feedback: DaySlice<FeedbackData["totals"]>;
    clarity: DaySlice<ClarityData>;
    bing: DaySlice<Pick<BingData, "buckets" | "traffic" | "queries" | "pages">>;
    cloudflareZone: DaySlice<CfZoneData>;
    crux: DaySlice<Pick<CruxData, "origin" | "urls" | "collectionPeriod">>;
  }>;
  signals: DaySignal[];
}

export type DaySlices = UsageInsightDay["sources"];
