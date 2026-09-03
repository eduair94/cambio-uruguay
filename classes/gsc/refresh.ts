// Pulls Search Console, archives the days, computes the dashboard.
//
// One run costs roughly 20 API calls: the day series, six window queries, and two per day being
// archived. Search Console's quota is 1.200 queries/minute and 30.000/day per property, so the job
// is nowhere near it even in backfill mode — the limit that actually binds is wall-clock, which is
// why the backfill takes a day budget instead of trying to fetch 16 months in one go.
import {
  dayOffset,
  inspectUrl,
  lastFinalDay,
  searchAnalytics,
  siteUrl,
} from "./client";
import {
  buildAlerts,
  cannibalisation,
  ctrBelowCurve,
  ctrCurve,
  deadWeight,
  movers,
  newQueries,
  pageTypes,
  rankOpportunities,
  strikingDistance,
  zeroClickPool,
} from "./opportunities";
import type { GscDay, GscKeyed, GscMetrics, GscPageQuery, GscRow, GscSnapshot, IndexationSample } from "./types";

/** Days in the reporting window. 28 rather than 30 so it always covers whole weeks — this site's
 *  traffic has a strong weekday shape and a 30-day window compares 4 Mondays against 5. */
export const WINDOW_DAYS = 28;
/** How much day series the snapshot carries, for the trend chart. */
export const SERIES_DAYS = 180;
/** Caps for the per-day archive. Beyond these the tail is single-impression noise that would triple
 *  the document size to add nothing. */
export const ARCHIVE_QUERY_CAP = 5000;
export const ARCHIVE_PAGE_CAP = 3000;

function toKeyed(rows: GscRow[]): GscKeyed[] {
  return rows.map((r) => ({
    key: r.keys[0] || "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}

function toPageQuery(rows: GscRow[]): GscPageQuery[] {
  return rows.map((r) => ({
    page: r.keys[0] || "",
    query: r.keys[1] || "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}


/** Every `YYYY-MM-DD` from `start` to `end`, inclusive. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${start}T00:00:00Z`);
  const stop = Date.parse(`${end}T00:00:00Z`);
  while (t <= stop) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86400000;
  }
  return out;
}

/**
 * The site totals for a range, asked WITHOUT dimensions.
 *
 * This matters more than it looks. Summing a breakdown does not reproduce Google's own numbers:
 * summing queries understates impressions by a third (Search Console withholds rare queries —
 * measured 2026-09-01: 325.333 by query vs 569.826 by page over the same window), and summing pages
 * gets impressions right but reports an average position of 9,16 where the Search Console screen
 * says 8,37, because one query can show two of our URLs. A dashboard that disagrees with the
 * official screen is a dashboard nobody trusts, so the headline numbers come from the same
 * dimensionless query the screen uses.
 */
async function fetchTotals(startDate: string, endDate: string): Promise<GscMetrics> {
  const rows = await searchAnalytics({ startDate, endDate, maxRows: 1 });
  const row = rows[0];
  if (!row) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position };
}

/** Fetches one day's compact archive document. Five API calls. */
export async function fetchDay(day: string): Promise<GscDay> {
  const [totals, queries, pages, countries, devices] = await Promise.all([
    fetchTotals(day, day),
    searchAnalytics({ startDate: day, endDate: day, dimensions: ["query"], maxRows: ARCHIVE_QUERY_CAP }),
    searchAnalytics({ startDate: day, endDate: day, dimensions: ["page"], maxRows: ARCHIVE_PAGE_CAP }),
    searchAnalytics({ startDate: day, endDate: day, dimensions: ["country"], maxRows: 300 }),
    searchAnalytics({ startDate: day, endDate: day, dimensions: ["device"], maxRows: 10 }),
  ]);
  return {
    day,
    totals,
    queries: toKeyed(queries),
    pages: toKeyed(pages),
    countries: toKeyed(countries),
    devices: toKeyed(devices),
    queryRowsSeen: queries.length,
    pageRowsSeen: pages.length,
  };
}

/**
 * A rotating URL Inspection sample.
 *
 * The quota is 2.000 calls per property per day, and this site has ~1.900 URLs, so a full sweep is
 * technically one day's quota and practically a bad idea (it leaves nothing for a manual check and
 * takes an hour). Instead: a fixed-size sample that ROTATES by day index, so every URL comes around
 * eventually and a regression shows up as a trend rather than as one bad reading. Failures are
 * swallowed — an inspection that 403s (read-only permission) or 429s (quota) must never take the
 * rest of the job down with it.
 */
export async function sampleIndexation(urls: string[], now: number, size: number): Promise<IndexationSample> {
  const asOf = dayOffset(0, now);
  const base: IndexationSample = { asOf, checked: 0, indexed: 0, notIndexed: 0, rows: [] };
  if (!urls.length || size <= 0) return { ...base, skippedReason: "sin URLs para inspeccionar" };

  const dayIndex = Math.floor(now / 86400000);
  const offset = (dayIndex * size) % urls.length;
  const picked = Array.from({ length: Math.min(size, urls.length) }, (_, i) => urls[(offset + i) % urls.length]);

  for (const url of picked) {
    try {
      const res = await inspectUrl(url);
      if (!res) {
        return {
          ...base,
          skippedReason:
            "la API de inspección respondió 403/429: o la cuenta de servicio tiene permiso " +
            "restringido (hace falta 'Completo') o se agotó la cuota diaria de 2.000",
        };
      }
      base.checked++;
      if (res.verdict === "PASS") base.indexed++;
      else base.notIndexed++;
      base.rows.push({
        url,
        verdict: res.verdict,
        coverageState: res.coverageState,
        lastCrawlTime: res.lastCrawlTime,
      });
    } catch (e: any) {
      return { ...base, skippedReason: `inspección interrumpida: ${e?.message || String(e)}` };
    }
  }
  return base;
}

export interface RefreshOptions {
  /** Overrides "today" — tests pin this so the windows are deterministic. */
  now?: number;
  /** How many URLs the rotating indexation sample checks. 0 disables it. */
  inspectSize?: number;
  /** How many days back the archive may reach in this run. */
  backfillDays?: number;
  /** Days already stored, skipped by the backfill. */
  alreadyStored?: Set<string>;
  /** Days to always re-fetch even when stored, because Search Console is still revising them. */
  refetchRecentDays?: number;
}

export interface RefreshResult {
  snapshot: GscSnapshot;
  days: GscDay[];
}

export async function refreshSearchConsole(options: RefreshOptions = {}): Promise<RefreshResult> {
  const now = options.now ?? Date.now();
  const end = lastFinalDay(now);
  const start = dayOffset(WINDOW_DAYS + 2, now);
  const prevEnd = dayOffset(WINDOW_DAYS + 3, now);
  const prevStart = dayOffset(WINDOW_DAYS * 2 + 2, now);
  const seriesStart = dayOffset(SERIES_DAYS, now);

  const [
    totals,
    previousTotals,
    dateRows,
    queryRows,
    pageRows,
    pageQueryRows,
    countryRows,
    deviceRows,
    prevQueryRows,
    prevPageRows,
  ] = await Promise.all([
      fetchTotals(start, end),
      fetchTotals(prevStart, prevEnd),
      searchAnalytics({ startDate: seriesStart, endDate: end, dimensions: ["date"], maxRows: 400 }),
      searchAnalytics({ startDate: start, endDate: end, dimensions: ["query"], maxRows: 8000 }),
      searchAnalytics({ startDate: start, endDate: end, dimensions: ["page"], maxRows: 5000 }),
      searchAnalytics({ startDate: start, endDate: end, dimensions: ["page", "query"], maxRows: 25000 }),
      searchAnalytics({ startDate: start, endDate: end, dimensions: ["country"], maxRows: 300 }),
      searchAnalytics({ startDate: start, endDate: end, dimensions: ["device"], maxRows: 10 }),
      searchAnalytics({ startDate: prevStart, endDate: prevEnd, dimensions: ["query"], maxRows: 8000 }),
      searchAnalytics({ startDate: prevStart, endDate: prevEnd, dimensions: ["page"], maxRows: 5000 }),
    ]);

  const queries = toKeyed(queryRows);
  const pages = toKeyed(pageRows);
  const prevQueries = toKeyed(prevQueryRows);
  const prevPages = toKeyed(prevPageRows);
  const pairs = toPageQuery(pageQueryRows);

  const curve = ctrCurve(queries);
  const pool = zeroClickPool(queries);
  const { rising, falling } = movers(queries, prevQueries);
  // Page-level movement, kept separate from query-level movement. A query losing three clicks is
  // usually one competitor's new article; a PAGE losing thirty is something that happened to us —
  // a deploy, a canonical, a de-indexation — and it is the regression worth chasing first.
  const pageFalling = movers(pages, prevPages, 8).falling.map((o) => ({
    ...o,
    note: `${o.note} (página)`,
  }));

  const opportunities = rankOpportunities([
    strikingDistance(queries, curve),
    ctrBelowCurve(pages, curve),
    cannibalisation(pairs),
    pageFalling,
    falling,
    newQueries(queries, prevQueries),
    rising,
    deadWeight(pages),
  ]);

  const daily = toKeyed(dateRows)
    .map((d) => ({ day: d.key, clicks: d.clicks, impressions: d.impressions, ctr: d.ctr, position: d.position }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const snapshot: GscSnapshot = {
    key: "gsc_snapshot",
    siteUrl: siteUrl(),
    asOf: dayOffset(0, now),
    window: { startDate: start, endDate: end },
    previousWindow: { startDate: prevStart, endDate: prevEnd },
    totals,
    previousTotals,
    daily,
    topQueries: queries.slice(0, 300),
    topPages: pages.slice(0, 300),
    countries: toKeyed(countryRows).slice(0, 30),
    devices: toKeyed(deviceRows),
    pageTypes: pageTypes(pages),
    ctrCurve: curve,
    opportunities: opportunities.slice(0, 150),
    zeroClickPool: {
      queries: pool.queries,
      impressions: pool.impressions,
      clicks: pool.clicks,
      shareOfImpressions: pool.shareOfImpressions,
    },
    alerts: buildAlerts(daily),
    archivedDays: 0, // filled in by the entrypoint, which is the one that knows the collection
    indexation: await sampleIndexation(
      pages.map((p) => p.key),
      now,
      options.inspectSize ?? 20
    ),
  };

  // El canal de alertas, en el único lugar donde alguien las mira.
  //
  // `notifyAdmin` degrada sin lanzar cuando faltan las credenciales, y deja una línea en los logs
  // de pm2 que nadie lee. Verificado en el VPS el 2026-09-03: `TELEGRAM_BOT_TOKEN` tiene valor y
  // `TELEGRAM_ADMIN_CHAT_ID` está VACÍO, así que las alertas de dieciséis archivos —entre ellas el
  // disyuntor del bot de Reddit y la auditoría de cotizaciones— no llegan a ningún lado y el
  // síntoma es que no pasa nada. Esto lo pone arriba del tablero privado, que es donde el dueño
  // busca alertas por diseño.
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_ADMIN_CHAT_ID) {
    snapshot.alerts.push({
      level: "warn",
      code: "alerts-unconfigured",
      message:
        "El aviso por Telegram no está configurado (falta TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID en el .env del VPS): " +
        "ninguna alerta de ningún job está llegando, y eso incluye las de cotizaciones implausibles y el disyuntor del bot de Reddit.",
    });
  }

  if (snapshot.indexation.checked >= 10) {
    const rate = snapshot.indexation.indexed / snapshot.indexation.checked;
    if (rate < 0.6) {
      snapshot.alerts.push({
        level: "warn",
        code: "indexation-low",
        message: `Sólo ${snapshot.indexation.indexed} de ${snapshot.indexation.checked} URLs muestreadas están indexadas (${Math.round(rate * 100)} %).`,
      });
    }
  }

  // ---- the archive ----
  const refetch = options.refetchRecentDays ?? 7;
  const backfill = options.backfillDays ?? 0;
  const oldest = dayOffset(Math.max(refetch, backfill) + 3, now);
  const wanted = daysBetween(oldest, end);
  const stored = options.alreadyStored || new Set<string>();
  const recentCutoff = dayOffset(refetch + 3, now);
  const toFetch = wanted.filter((d) => d >= recentCutoff || !stored.has(d));

  const days: GscDay[] = [];
  for (const day of toFetch) {
    days.push(await fetchDay(day));
  }

  return { snapshot, days };
}
