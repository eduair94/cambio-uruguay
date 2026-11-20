// Datos de fuente mínimos para los tests de señales, páginas y presupuesto. No es un test.
import type {
  CfRumData,
  CfVitalRow,
  ClarityData,
  ClarityMetrics,
  FeedbackData,
  Ga4BehaviorData,
  Ga4PageRow,
  IndexationData,
  Rated,
} from "../../classes/insights/types";
import { ratedFromTuple } from "../../classes/insights/sources/cloudflareRum";

export const rated = (g: number, ni: number, p: number): Rated => ratedFromTuple([g, ni, p]);

export function cfData(over: Partial<CfRumData> = {}): CfRumData {
  return {
    daysCovered: ["2026-11-20"],
    suspectDays: [],
    settings: null,
    totals: { uy: { loads: 10000, visits: 4000 }, all: { loads: 20000, visits: 8000 }, uyShare: 0.5 },
    daily: [],
    devices: [],
    pages: [],
    referrers: [],
    countries: [],
    vitals: [],
    vitalsByDevice: [],
    elements: [],
    consent: null,
    internalLoadsShare: null,
    partialDays: { countries: 0, vitals: 0, pagesTruncated: 0, totalsUndercount: 0 },
    ...over,
  };
}

export function vital(path: string, device: string, realSamples: number, cls: Rated, over: Partial<CfVitalRow> = {}): CfVitalRow {
  return {
    path,
    device,
    samples: realSamples * 10,
    realSamples,
    lcp: rated(10, 0, 0),
    inp: rated(10, 0, 0),
    cls,
    p75Approx: { lcpMs: 1200, inpMs: 100, cls: 0.3, fcpMs: null, ttfbMs: null, day: "2026-11-20" },
    ...over,
  };
}

export function ga4Page(path: string, over: Partial<Ga4PageRow> = {}): Ga4PageRow {
  return {
    path,
    family: path,
    views: 1000,
    sessions: 800,
    engagementRate: 0.5,
    avgEngagementSec: 30,
    landingSessions: 500,
    landingEngagementRate: 0.5,
    mobile: null,
    desktop: null,
    template: null,
    events: { read50: 0, read90: 0, readAny: 0, outbound: 0, internalNav: 0, recommendationViews: 0, helpfulViews: 0, ctaClicks: 0 },
    rates: { read50: 0, read90: 0, outbound: 0, internalNav: 0, readMeasured: false, measured: false },
    ...over,
  };
}

export function ga4Data(over: Partial<Ga4BehaviorData> = {}): Ga4BehaviorData {
  return {
    customDimensions: [],
    timeZone: "America/Montevideo",
    quotaRemaining: 30000,
    totals: { views: 10000, sessions: 8000, engagedSessions: 4000, eventCount: 30000 },
    devices: [],
    daily: [],
    consent: null,
    pages: [],
    templates: [],
    events: [],
    outbound: [],
    flows: [],
    flowsTotalViews: 0,
    linkAreas: [],
    navTargets: [],
    placements: [],
    search: {
      qRegistered: false,
      opens: 0,
      selects: 0,
      noResults: 0,
      resultsViews: 0,
      noResultTerms: [],
      selectTerms: [],
      pageTerms: [],
      noResultPages: [],
    },
    ...over,
  };
}

export function feedbackData(pages: Partial<FeedbackData["pages"][number]>[]): FeedbackData {
  return {
    totals: { helpfulYes: 0, helpfulNo: 0, suggestion: 0, bug: 0, praise: 0 },
    pages: pages.map((p) => ({
      path: "/x",
      family: "/x",
      helpfulYes: 0,
      helpfulNo: 0,
      distinctYes: 0,
      distinctNo: 0,
      suggestion: 0,
      bug: 0,
      praise: 0,
      last: "",
      ...p,
    })),
    daily: [],
  };
}

export const metrics = (over: Partial<ClarityMetrics> = {}): ClarityMetrics => ({
  sessions: 200,
  botSessions: 0,
  users: null,
  pagesPerSession: null,
  activeSec: null,
  totalSec: null,
  scrollDepth: 40,
  rage: null,
  dead: null,
  quickback: null,
  excessiveScroll: null,
  scriptErrors: null,
  errorClicks: null,
  ...over,
});

export function clarityData(over: Partial<ClarityData> = {}): ClarityData {
  return {
    windowEnd: "2026-11-21T12:21:00Z",
    hours: 24,
    callsThisRun: 6,
    callsTodayUtc: 6,
    totals: metrics(),
    urls: [],
    urlsUy: null,
    urlDevice: [],
    deviceBrowser: [],
    channelDevice: [],
    unknownKeys: [],
    ...over,
  };
}

export function indexationData(over: Partial<IndexationData> = {}): IndexationData {
  return {
    today: {
      budget: 400,
      quotaUsedBefore: 0,
      quotaDay: "2026-11-21",
      picked: { new: 0, top: 0, random: 0 },
      checked: 0,
      stoppedBy: null,
      minutes: 0,
    },
    sitemap: null,
    totals28d: { checked: 0, indexed: 0, byDesign: 0, actionable: 0, pending: 0, randomChecked: 0, randomActionable: 0 },
    families: [],
    newUrls: { checked: 0, indexed: 0, pending: 0, medianAgeDays: null },
    rows: [],
    ...over,
  };
}
