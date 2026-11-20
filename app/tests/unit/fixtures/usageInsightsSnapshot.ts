// Snapshot de mentira del tablero de uso, escrito a mano desde la spec (secciones 1.2–1.7). Sirve para
// los tests de `utils/usageInsights.ts` y para mirar /estadisticas-de-uso sin el job: un bloque por
// cada estado de fuente (ok, partial, thin, failed, inactive, skipped), señales en los tres estados
// (ok con filas, stale, unavailable) y cinco páginas. Ninguna cifra es real.
import type {
  ClarityData,
  CfRumData,
  CfZoneData,
  CruxData,
  BingData,
  FeedbackData,
  Ga4BehaviorData,
  IndexationData,
  InsightPageRow,
  Rated,
  Signal,
  SignalRow,
  SourceBlock,
  SourceId,
  UsageInsightSnapshot,
} from '../../../utils/usageInsights'

const AS_OF = '2026-11-20T12:21:00.000Z'
const OLD = '2026-11-10T12:21:00.000Z'
const WINDOW = {
  start: '2026-10-23',
  end: '2026-11-19',
  days: 28,
  tz: 'America/Montevideo' as const,
}

function block<D>(
  id: SourceId,
  status: SourceBlock<D>['status'],
  data: D | null,
  extra: Partial<SourceBlock<D>> = {}
): SourceBlock<D> {
  const ok = status === 'ok' || status === 'partial'
  return {
    id,
    status,
    ok,
    fetchedAt: data ? (ok ? AS_OF : OLD) : null,
    attemptedAt: AS_OF,
    lastOkAt: data ? (ok ? AS_OF : OLD) : null,
    failingSince: status === 'thin' || status === 'failed' ? '2026-11-18T12:21:00.000Z' : null,
    note: null,
    enableHint: null,
    window: data ? WINDOW : null,
    truncated: false,
    carried: [],
    rowsSeen: {},
    data,
    ...extra,
  }
}

const rated = (good: number, ni: number, poor: number): Rated => {
  const total = good + ni + poor
  const poorShare = total ? poor / total : null
  const rating = !total ? null : poor / total > 0.25 ? 'poor' : good / total >= 0.75 ? 'good' : 'ni'
  return { good, ni, poor, total, rating, poorShare }
}

const cfRum: CfRumData = {
  daysCovered: ['2026-11-17', '2026-11-18', '2026-11-19'],
  suspectDays: [],
  settings: { pageloadNotOlderThanDays: 30, vitalsNotOlderThanDays: 30, maxPageSize: 10000 },
  totals: {
    uy: { loads: 52_000, visits: 31_000 },
    all: { loads: 80_000, visits: 47_000 },
    uyShare: 0.65,
  },
  daily: [
    { day: '2026-11-17', loadsUy: 17_000, visitsUy: 10_000, loadsAll: 26_000, sampleInterval: 1 },
    { day: '2026-11-18', loadsUy: 18_000, visitsUy: 11_000, loadsAll: 27_000, sampleInterval: 1 },
    { day: '2026-11-19', loadsUy: 17_000, visitsUy: 10_000, loadsAll: 27_000, sampleInterval: 1 },
  ],
  devices: [
    { device: 'mobile', loads: 38_000, visits: 23_000 },
    { device: 'desktop', loads: 14_000, visits: 8_000 },
  ],
  pages: [
    { path: '/', loads: 20_000, visits: 15_000, mobile: 15_000, desktop: 5_000, tablet: 0 },
    {
      path: '/alquileres-uruguay',
      loads: 9_000,
      visits: 4_000,
      mobile: 7_000,
      desktop: 2_000,
      tablet: 0,
    },
  ],
  referrers: [
    { host: 'www.google.com', kind: 'search', loads: 18_000, visits: 17_000 },
    { host: '', kind: 'direct', loads: 9_000, visits: 9_000 },
    { host: 'chatgpt.com', kind: 'ai', loads: 400, visits: 400 },
  ],
  countries: [
    { country: 'UY', loads: 52_000, visits: 31_000 },
    { country: 'SG', loads: 15_000, visits: 10_000 },
  ],
  vitals: [
    {
      path: '/alquileres-uruguay',
      device: 'mobile',
      samples: 900,
      realSamples: 900,
      lcp: rated(500, 200, 200),
      inp: rated(800, 60, 40),
      cls: rated(400, 100, 400),
      p75Approx: {
        lcpMs: 3900,
        inpMs: 180,
        cls: 0.31,
        fcpMs: 2100,
        ttfbMs: 600,
        day: '2026-11-19',
      },
    },
  ],
  vitalsByDevice: [],
  elements: [
    {
      metric: 'cls',
      path: '/alquileres-uruguay',
      device: 'mobile',
      element: '#main>div.container_custom--rail',
      inpName: null,
      events: 320,
    },
    { metric: 'inp', path: '/', device: 'mobile', element: '', inpName: 'pointer', events: 40 },
  ],
  consent: {
    range: { start: '2026-11-10', end: '2026-11-18' },
    days: 9,
    totals: { loads: 35_000, visits: 21_000, realVisits: 21_000 },
    pages: [{ path: '/', loads: 13_000, visits: 10_000, realVisits: 10_000 }],
    pagesTruncated: false,
    totalsUndercount: false,
  },
  internalLoadsShare: 0.18,
  partialDays: { countries: 0, vitals: 0, pagesTruncated: 0, totalsUndercount: 0 },
}

const ga4: Ga4BehaviorData = {
  customDimensions: ['customEvent:content_path', 'customEvent:destination_path'],
  timeZone: 'America/Montevideo',
  quotaRemaining: 30_000,
  totals: { views: 40_000, sessions: 22_000, engagedSessions: 14_000, eventCount: 160_000 },
  devices: [
    {
      device: 'mobile',
      sessions: 16_000,
      views: 28_000,
      engagementRate: 0.6,
      avgEngagementSec: 40,
      users: 12_000,
    },
    {
      device: 'desktop',
      sessions: 6_000,
      views: 12_000,
      engagementRate: 0.72,
      avgEngagementSec: 75,
      users: 4_000,
    },
  ],
  daily: [],
  consent: {
    range: { start: '2026-11-10', end: '2026-11-18' },
    truncated: false,
    totals: { views: 15_000, landingSessions: 8_600 },
    pages: [{ path: '/', views: 6_000, landingSessions: 4_100 }],
  },
  pages: [],
  templates: [
    {
      template: '/autos-usados-uruguay/:item',
      family: '/autos-usados-uruguay/*',
      realPaths: 340,
      views: 3_000,
      events: {
        read50: 30,
        read90: 10,
        readAny: 60,
        outbound: 900,
        internalNav: 400,
        recommendationViews: 100,
        helpfulViews: 0,
        ctaClicks: 0,
      },
      rates: {
        read50: 0.01,
        read90: 0.003,
        outbound: 0.3,
        internalNav: 0.13,
        readMeasured: true,
        measured: true,
      },
      approx: true,
    },
  ],
  events: [{ name: 'page_view', count: 40_000 }],
  outbound: [
    { path: '/autos-usados-uruguay/:item', domain: 'auto.mercadolibre.com.uy', events: 800 },
  ],
  flows: [{ from: '/', to: '/alquileres-uruguay', views: 700 }],
  flowsTotalViews: 12_400,
  linkAreas: [],
  navTargets: [],
  placements: [],
  search: {
    qRegistered: true,
    opens: 600,
    selects: 300,
    noResults: 200,
    resultsViews: 150,
    noResultTerms: [{ term: 'cambio en salto', events: 12 }],
    selectTerms: [],
    pageTerms: [],
    noResultPages: [{ path: '/', events: 80 }],
  },
}

const indexation: IndexationData = {
  today: {
    budget: 400,
    quotaUsedBefore: 0,
    quotaDay: '2026-11-10',
    picked: { new: 20, top: 80, random: 300 },
    checked: 400,
    stoppedBy: null,
    minutes: 11,
  },
  sitemap: {
    urls: 9_000,
    esUrls: 4_000,
    newLast14d: 60,
    fetchedAt: OLD,
    seededAt: '2026-11-01T12:21:00.000Z',
    capped: false,
  },
  totals28d: {
    checked: 1_200,
    indexed: 900,
    byDesign: 100,
    actionable: 150,
    pending: 50,
    randomChecked: 800,
    randomActionable: 120,
  },
  families: [
    {
      family: '/alquileres/*',
      localized: false,
      checked: 200,
      indexed: 100,
      byDesign: 0,
      actionable: 90,
      pending: 10,
      randomChecked: 150,
      randomActionable: 75,
      shareActionable: 0.5,
      newChecked: 5,
      newIndexed: 1,
      topReason: 'crawled-not-indexed',
    },
  ],
  newUrls: { checked: 20, indexed: 8, pending: 12, medianAgeDays: 6 },
  rows: [
    {
      path: '/guias/ahorro',
      family: '/guias/*',
      checkedAt: '2026-11-10T13:00:00.000Z',
      reason: 'top',
      verdict: 'NEUTRAL',
      coverageState: 'Crawled - currently not indexed',
      class: 'crawled-not-indexed',
      pending: false,
      pageFetchState: 'SUCCESSFUL',
      indexingState: 'INDEXING_ALLOWED',
      robotsTxtState: 'ALLOWED',
      lastCrawlTime: '2026-11-02T08:00:00Z',
      googleCanonical: '=',
      userCanonical: '=',
      crawledAs: 'MOBILE',
      firstSeenInSitemap: '2026-10-01',
      resultLink:
        'https://search.google.com/search-console/inspect?resource_id=sc-domain%3Acambio-uruguay.com',
    },
  ],
}

const feedback: FeedbackData = {
  totals: { helpfulYes: 40, helpfulNo: 30, suggestion: 4, bug: 2, praise: 1 },
  pages: [
    {
      path: '/guias/ahorro',
      family: '/guias/*',
      helpfulYes: 4,
      helpfulNo: 9,
      distinctYes: 4,
      distinctNo: 7,
      suggestion: 1,
      bug: 0,
      praise: 0,
      last: '2026-11-15T10:00:00.000Z',
    },
  ],
  daily: [],
}

const bing: BingData = {
  siteUrl: 'https://cambio-uruguay.com/',
  buckets: ['2026-10-26', '2026-11-02'],
  traffic: [],
  queries: [
    {
      query: 'cotizacion real hoy',
      impressions: 300,
      clicks: 4,
      avgPosition: 5.2,
      avgClickPosition: 4.1,
      weeks: 2,
    },
  ],
  pages: [],
  crawl: [],
  issues: [],
}

const cfZone: CfZoneData = {
  crawlers: [
    {
      crawler: 'GPTBot',
      requests: 900,
      ok2xx: 600,
      notModified304: 20,
      redirects: 200,
      errors4xx: 80,
      errors5xx: 0,
    },
  ],
  crawlerPaths: [{ crawler: 'GPTBot', path: '/vieja-pagina', status: 404, requests: 40 }],
  errors: [{ path: '/vieja-pagina', status: 404, requests: 120, crawlerShare: 0.6 }],
  cache: [{ path: '/', requests: 40_000, hitShare: 0.82, dynamicShare: 0.1 }],
  statusTotals: [{ status: 200, requests: 400_000 }],
}

function row(
  signal: string,
  path: string | null,
  impact: number,
  extra: Record<string, string | number | boolean | null> = {},
  isNew = false
): SignalRow {
  return { key: path ?? signal, path, family: path ? '/' : null, impact, isNew, ...extra }
}

function signal(partial: Partial<Signal> & Pick<Signal, 'id' | 'status' | 'severity'>): Signal {
  const rows = partial.rows ?? []
  return {
    title: `Título de ${partial.id}`,
    question: `¿Pregunta de ${partial.id}?`,
    reason: null,
    impact: rows.reduce((a, r) => a + r.impact, 0),
    impactUnit: 'cf-loads',
    sources: ['cloudflareRum'],
    dataAsOf: AS_OF,
    window: WINDOW,
    thresholds: {},
    count: rows.length,
    newRows: rows.filter(r => r.isNew).length,
    groups: [],
    summary: `Resumen de ${partial.id}.`,
    ...partial,
    rows,
  }
}

const signals: Signal[] = [
  // Desordenadas a propósito: la página y el test las ordenan con orderSignals.
  signal({
    id: 'friction',
    status: 'unavailable',
    severity: 'none',
    sources: ['clarity'],
    reason: 'falta CLARITY_EXPORT_TOKEN (docs/analytics/USAGE_INSIGHTS.md, paso 5.1)',
    dataAsOf: null,
  }),
  signal({
    id: 'bing-only-queries',
    status: 'stale',
    severity: 'low',
    sources: ['bing'],
    impactUnit: 'impressions',
    reason: 'Datos del 10/11',
    rows: [
      row('bing-only-queries', null, 300, {
        query: 'cotizacion real hoy',
        bingImpressions: 300,
        bingClicks: 4,
        bingPosition: 5.2,
        gscImpressions: 0,
        gscClicks: 0,
      }),
    ],
  }),
  signal({
    id: 'not-indexed',
    status: 'stale',
    severity: 'low',
    sources: ['indexation'],
    rows: [
      row('not-indexed', '/guias/ahorro', 800, {
        class: 'crawled-not-indexed',
        reason: 'top',
        coverageState: 'Crawled - currently not indexed',
        checkedAt: '2026-11-10T13:00:00.000Z',
        lastCrawlTime: '2026-11-02T08:00:00Z',
        googleCanonical: '=',
        pageFetchState: 'SUCCESSFUL',
      }),
    ],
    groups: [
      { key: '/alquileres/*', label: '/alquileres/* · 75 de 150 al azar', count: 75, share: 0.5 },
    ],
  }),
  signal({
    id: 'mobile-worse',
    status: 'ok',
    severity: 'medium',
    impactUnit: 'ga4-views',
    rows: [
      row(
        'mobile-worse',
        '/alquileres-uruguay',
        7_000,
        {
          mobileViews: 7_000,
          desktopViews: 2_000,
          mobileEngagement: 0.4,
          desktopEngagement: 0.7,
          gapPoints: 0.3,
          mobileAvgSec: 20,
          desktopAvgSec: 70,
          mobileCwv: 'LCP mal · INP bien · CLS mal',
          clarityRageMobile: null,
          cruxPhone: null,
        },
        true
      ),
    ],
  }),
  signal({
    id: 'consent-gap',
    status: 'ok',
    severity: 'high',
    sources: ['cloudflareRum', 'ga4Behavior'],
    thresholds: { CG_MIN_VISITS: 100, CG_MIN_SAMPLES: 20, CG_REL: 0.6 },
    rows: [
      row('consent-gap', '/', 20_000, {
        cfVisits: 10_000,
        cfRealVisits: 10_000,
        ga4LandingSessions: 2_000,
        landingCoverage: 0.2,
        siteCoverage: 0.41,
        cfLoads: 13_000,
        ga4Views: 6_000,
        loadsCoverage: 0.46,
      }),
    ],
  }),
  signal({
    id: 'poor-vitals',
    status: 'ok',
    severity: 'high',
    thresholds: { PV_MIN_SAMPLES: 30 },
    rows: [
      row(
        'poor-vitals',
        '/alquileres-uruguay',
        7_000,
        {
          device: 'mobile',
          metric: 'cls',
          samples: 900,
          realSamples: 900,
          poorShare: 0.44,
          goodShare: 0.44,
          p75Approx: 0.31,
          element: '#main>div.container_custom--rail',
          elementShare: 0.8,
          inpName: null,
          cruxP75: null,
        },
        true
      ),
      row('poor-vitals', '/alquileres-uruguay', 7_000, {
        device: 'mobile',
        metric: 'lcp',
        samples: 900,
        realSamples: 900,
        poorShare: 0.22,
        goodShare: 0.55,
        p75Approx: 3900,
        element: 'img.hero',
        elementShare: 0.6,
        inpName: null,
        cruxP75: 3600,
      }),
    ],
  }),
  signal({
    id: 'low-reading',
    status: 'ok',
    severity: 'low',
    impactUnit: 'ga4-views',
    rows: [
      row('low-reading', '/autos-usados-uruguay/:item', 3_000, {
        views: 3_000,
        read50: 30,
        readAny: 60,
        read50Rate: 0.01,
        read90Rate: 0.003,
        clarityScroll: null,
        template: true,
      }),
    ],
    groups: [{ key: 'sin-medicion', label: 'sin medición de lectura', count: 4, share: null }],
  }),
  signal({
    id: 'search-no-results',
    status: 'ok',
    severity: 'low',
    sources: ['ga4Behavior'],
    impactUnit: 'events',
    rows: [row('search-no-results', null, 12, { term: 'cambio en salto', events: 12 })],
  }),
  signal({
    id: 'outbound-rate',
    status: 'ok',
    severity: 'medium',
    impactUnit: 'ga4-views',
    rows: [
      row('outbound-rate', '/autos-usados-uruguay/:item', 3_000, {
        views: 3_000,
        outbound: 900,
        outboundRate: 0.3,
        topDomain: 'auto.mercadolibre.com.uy',
        topDomainShare: 0.89,
        template: true,
      }),
    ],
  }),
  signal({
    id: 'helpful-no',
    status: 'ok',
    severity: 'medium',
    sources: ['feedback', 'ga4Behavior', 'cloudflareRum'],
    impactUnit: 'cf-loads',
    rows: [
      row('helpful-no', '/guias/ahorro', 800, {
        yes: 4,
        no: 9,
        distinctNo: 7,
        noShare: 0.69,
        ga4Views: 650,
        helpfulViews: 300,
        answerRate: 0.043,
      }),
    ],
  }),
  signal({
    id: 'ai-crawler-errors',
    status: 'ok',
    severity: 'medium',
    sources: ['cloudflareZone'],
    impactUnit: 'requests',
    rows: [
      row('ai-crawler-errors', '/vieja-pagina', 40, {
        crawler: 'GPTBot',
        status: 404,
        requests: 40,
        kind: 'error',
      }),
    ],
    groups: [{ key: 'GPTBot', label: 'GPTBot', count: 1, share: 0.31 }],
  }),
  signal({
    id: 'edge-errors',
    status: 'ok',
    severity: 'low',
    sources: ['cloudflareZone'],
    impactUnit: 'requests',
    rows: [
      row('edge-errors', '/vieja-pagina', 120, { status: 404, requests: 120, crawlerShare: 0.6 }),
    ],
  }),
]

const page = (
  p: Partial<InsightPageRow> & Pick<InsightPageRow, 'path' | 'family'>
): InsightPageRow => ({
  locale: null,
  cf: null,
  ga4: null,
  coverage: null,
  coverageLoads: null,
  vitals: null,
  crux: null,
  clarity: null,
  index: null,
  feedback: null,
  signals: [],
  ...p,
})

const ga4Row = (
  views: number,
  extra: Partial<NonNullable<InsightPageRow['ga4']>> = {}
): NonNullable<InsightPageRow['ga4']> => ({
  views,
  sessions: Math.round(views * 0.6),
  engagementRate: 0.6,
  avgEngagementSec: 45,
  mobileEngagement: 0.55,
  desktopEngagement: 0.7,
  landingSessions: Math.round(views * 0.4),
  read50Rate: 0.3,
  outboundRate: 0.05,
  readMeasured: true,
  helpfulViews: 0,
  template: null,
  ...extra,
})

const pages: InsightPageRow[] = [
  page({
    path: '/',
    family: '/',
    cf: { loads: 20_000, visits: 15_000, mobileShare: 0.75 },
    ga4: ga4Row(12_000),
    coverage: 0.2,
    coverageLoads: 0.46,
    vitals: {
      mobile: { lcp: 'good', inp: 'good', cls: 'ni', samples: 3_000, realSamples: 3_000 },
      desktop: null,
    },
    signals: ['consent-gap'],
  }),
  page({
    path: '/alquileres-uruguay',
    family: '/alquileres-uruguay',
    cf: { loads: 9_000, visits: 4_000, mobileShare: 0.78 },
    ga4: ga4Row(8_000, { mobileEngagement: 0.4, desktopEngagement: 0.7, engagementRate: 0.48 }),
    coverage: 0.5,
    coverageLoads: 0.6,
    vitals: {
      mobile: { lcp: 'ni', inp: 'good', cls: 'poor', samples: 900, realSamples: 900 },
      desktop: null,
    },
    signals: ['mobile-worse', 'poor-vitals'],
  }),
  page({
    path: '/guias/ahorro',
    family: '/guias/*',
    cf: { loads: 800, visits: 600, mobileShare: 0.7 },
    ga4: ga4Row(500, {
      read50Rate: null,
      readMeasured: false,
      outboundRate: null,
      helpfulViews: 300,
    }),
    index: { class: 'crawled-not-indexed', checkedAt: '2026-11-10T13:00:00.000Z', pending: false },
    feedback: { yes: 4, no: 9, written: 1 },
    signals: ['not-indexed', 'helpful-no'],
  }),
  page({
    path: '/fr/guias/epargne',
    family: '/guias/*',
    locale: 'fr',
    cf: { loads: 300, visits: 280, mobileShare: 0.5 },
    ga4: null,
    index: {
      class: 'discovered-not-indexed',
      checkedAt: '2026-11-10T13:00:00.000Z',
      pending: true,
    },
  }),
  page({
    path: '/vieja-pagina',
    family: '/vieja-pagina',
    cf: null,
    ga4: ga4Row(50, { engagementRate: 0.1 }),
    signals: ['ai-crawler-errors', 'edge-errors'],
  }),
]

export const usageInsightsFixture: UsageInsightSnapshot = {
  key: 'site',
  schemaVersion: 1,
  asOf: AS_OF,
  day: '2026-11-19',
  timezone: 'America/Montevideo',
  window: WINDOW,
  run: { durationSec: 840, flags: [], trimmed: [], bytes: 412_000, siteLoadsUy: 52_000 },
  sources: {
    cloudflareRum: block('cloudflareRum', 'ok', cfRum),
    ga4Behavior: block('ga4Behavior', 'partial', ga4, { carried: ['linkAreas'] }),
    indexation: block('indexation', 'thin', indexation, {
      note: 'cero inspecciones: se conserva el bloque anterior',
    }),
    feedback: block('feedback', 'failed', feedback, { note: 'MongoNetworkError: timeout' }),
    clarity: block<ClarityData>('clarity', 'inactive', null, {
      enableHint: 'falta CLARITY_EXPORT_TOKEN (docs/analytics/USAGE_INSIGHTS.md, paso 5.1)',
    }),
    bing: block('bing', 'skipped', bing),
    cloudflareZone: block('cloudflareZone', 'ok', cfZone),
    crux: block<CruxData>('crux', 'inactive', null, {
      enableHint: 'falta CRUX_API_KEY (docs/analytics/USAGE_INSIGHTS.md, paso 5.4)',
    }),
  },
  pages,
  signals,
  trend: {
    days: ['2026-11-17', '2026-11-18', '2026-11-19'],
    cfLoadsUy: [17_000, 18_000, 17_000],
    cfVisitsUy: [10_000, 11_000, 10_000],
    ga4ViewsUy: [13_000, 14_000, 13_000],
    ga4SessionsUy: [4_100, 4_500, 4_000],
    coverage: [0.41, 0.41, null],
    inspected: [400, 400, null],
    inspectedIndexedShare: [0.75, 0.74, null],
  },
  consentCheck: {
    usable: true,
    reason: null,
    cfRange: { start: '2026-11-10', end: '2026-11-18' },
    ga4Range: { start: '2026-11-10', end: '2026-11-18' },
    ga4TimeZone: 'America/Montevideo',
    days: 9,
    siteCoverage: 0.41,
    siteCoverageLoads: 0.43,
    cfInternalShare: 0.18,
    ga4InternalShare: 0.31,
    cfPagesTruncated: false,
    ga4Truncated: false,
  },
}
