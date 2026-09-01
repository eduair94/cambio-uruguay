// Shape of the Search Console pipeline: what the API answers, what gets archived day by day, and
// what the dashboard reads.
//
// Two collections, two different jobs, on purpose:
//   * `searchconsoledays` — one compact document PER DAY. This is the archive, and it is the whole
//     reason the job exists at a fixed hour: Search Console throws away everything older than 16
//     months, so a site that never copies it out can never answer "how did this query behave two
//     years ago". Compact arrays rather than a row per (day, query) because 15k queries × 365 days
//     is 5.5M documents to say the same thing 70 MB of arrays says.
//   * `searchconsolesnapshots` — ONE living document with the computed dashboard + opportunities.
//     Recomputed every run from the last window; nothing in it is unrecoverable.

/** A row as Search Console answers it, flattened. `keys` order follows the requested dimensions. */
export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  /** 0..1, as the API reports it. */
  ctr: number;
  /** 1-based average position. */
  position: number;
}

/** The four metrics, for any grouping. */
export interface GscMetrics {
  clicks: number;
  impressions: number;
  /** 0..1. */
  ctr: number;
  position: number;
}

export interface GscKeyed extends GscMetrics {
  key: string;
}

/** One (page, query) pair — the pairing that makes cannibalisation visible. */
export interface GscPageQuery extends GscMetrics {
  page: string;
  query: string;
}

/** The compact per-day archive document. */
export interface GscDay {
  /** `YYYY-MM-DD`, the Search Console day (Pacific time, as Google reports it). */
  day: string;
  totals: GscMetrics;
  /** Top queries of the day, impression-ordered, capped. */
  queries: GscKeyed[];
  /** Top pages of the day, impression-ordered, capped. */
  pages: GscKeyed[];
  countries: GscKeyed[];
  devices: GscKeyed[];
  /** How many rows the API actually returned before the cap, so a truncated day is never mistaken
   * for a quiet one. */
  queryRowsSeen: number;
  pageRowsSeen: number;
}

export interface GscWindow {
  startDate: string;
  endDate: string;
}

/** One entry of the site's OWN click-through curve, derived from its own data (see opportunities.ts). */
export interface CtrCurvePoint {
  position: number;
  /** 0..1, impression-weighted. */
  ctr: number;
  /** Impressions behind the estimate — below `CURVE_MIN_IMPRESSIONS` the point is interpolated. */
  impressions: number;
  derived: boolean;
}

export interface Opportunity {
  kind:
    | "striking-distance"
    | "ctr-below-curve"
    | "cannibalisation"
    | "rising"
    | "falling"
    | "new-query"
    | "dead-weight";
  /** Query or URL, depending on kind. */
  subject: string;
  impressions: number;
  clicks: number;
  position: number;
  /** Clicks per 28 days this would add if the fix worked. Estimated, never observed. */
  potentialClicks: number;
  /** Human-readable, Spanish — this string is what the dashboard shows. */
  note: string;
  /** For cannibalisation: the competing URLs. For the rest: the URL that already ranks, if known. */
  urls?: string[];
}

/** A template family (`/guias/*`, `/convertir/*`, …) with its measured yield. */
export interface PageTypeRow extends GscMetrics {
  bucket: string;
  urls: number;
  /** Ad density the route table assigns to this family, so the click and the money line up. */
  adDensity?: string;
}

export interface GscAlert {
  level: "info" | "warn" | "critical";
  code: string;
  message: string;
}

export interface GscSnapshot {
  key: string;
  siteUrl: string;
  /** When the job ran, `YYYY-MM-DD`. */
  asOf: string;
  window: GscWindow;
  previousWindow: GscWindow;
  totals: GscMetrics;
  previousTotals: GscMetrics;
  /** Day series, longest range the job keeps in the snapshot (180 days). */
  daily: Array<{ day: string } & GscMetrics>;
  topQueries: GscKeyed[];
  topPages: GscKeyed[];
  countries: GscKeyed[];
  devices: GscKeyed[];
  pageTypes: PageTypeRow[];
  ctrCurve: CtrCurvePoint[];
  opportunities: Opportunity[];
  /** Impressions on queries that structurally never yield a click (answer box, converter widget). */
  zeroClickPool: { queries: number; impressions: number; clicks: number; shareOfImpressions: number };
  alerts: GscAlert[];
  /** Days the archive holds, so the dashboard can say how deep the moat is. */
  archivedDays: number;
  /** Rotating URL Inspection sample — the only programmatic answer to "is this page indexed". */
  indexation: IndexationSample;
}

export interface IndexationSample {
  /** When the sample was taken, `YYYY-MM-DD`. Older than a few days means the quota ran out. */
  asOf: string;
  checked: number;
  indexed: number;
  notIndexed: number;
  /** Verdict per URL, newest sample only. */
  rows: Array<{ url: string; verdict: string; coverageState: string; lastCrawlTime: string | null }>;
  /** Set when the API refused (read-only permission, or the 2000/day quota). */
  skippedReason?: string;
}
