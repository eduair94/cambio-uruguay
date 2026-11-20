// La orquestación de `currency-usage-insights`: cada fuente en su propio try, en el orden en que las
// siguientes reusan lo de las anteriores (2.7 del diseño).
//
//   1. snapshot y estado anteriores
//   2. sitemap (alimenta el plan de inspección y la memoria de "primera vez")
//   3. Cloudflare RUM (días archivados + los que se traen hoy; el rango de consentimiento)
//   4. GA4 (consulta los reportes de consentimiento sobre EXACTAMENTE el rango de Cloudflare)
//   5. opiniones del sitio
//   6. Cloudflare zona, Clarity, Bing (+ consultas de Search Console), CrUX
//   7. inspección de URLs (la última y la más lenta: usa el ranking de tráfico)
//   8. páginas, señales, tendencia, tope de tamaño
//   9. escrituras (salvo dry run), cada una en su propio try
//
// Una fuente que falla nunca le cuesta nada a las otras y conserva su bloque anterior con su fecha
// vieja. Ningún objeto de error llega al log: sólo `sanitizeError()`.
import { lastFinalDay } from "../gsc/client";
import { gscConfigProblem, inspectUrlDetailed } from "../gsc/client";
import type { InspectionOutcome } from "../gsc/client";
import { addDays, analyticsWindows, ymdInTimeZone } from "../site-analytics/refresh";
import { emptyBlock, nextBlock } from "./blocks";
import type { BlockOutcome } from "./blocks";
import { enforceBudget } from "./budget";
import { DAY_SIGNAL_KEYS, INSPECT_MAX_CEILING, INSPECT_MAX_DEFAULT, INSPECT_MINUTES_DEFAULT, envInt } from "./caps";
import { sanitizeError } from "./errors";
import { buildConsentCheck, buildPages, buildTrend } from "./pages";
import type { ArchiveTrendDay } from "./pages";
import { buildSignals } from "./signals";
import { BING_INACTIVE_LINE, joinGsc, runBing } from "./sources/bing";
import type { BingHttp } from "./sources/bing";
import { CLARITY_INACTIVE_LINE, runClarity } from "./sources/clarity";
import type { ClarityHttp } from "./sources/clarity";
import { createCfClient } from "./sources/cloudflare";
import type { CfClient } from "./sources/cloudflare";
import { runCloudflareRum } from "./sources/cloudflareRum";
import { ZONE_INACTIVE_LINE, runCloudflareZone } from "./sources/cloudflareZone";
import { CRUX_INACTIVE_LINE, runCrux } from "./sources/crux";
import type { CruxHttp } from "./sources/crux";
import { runFeedback } from "./sources/feedback";
import { defaultGa4Api, runGa4Behavior } from "./sources/ga4Behavior";
import type { Ga4Api } from "./sources/ga4Behavior";
import {
  INDEXATION_PERMISSION_HINT,
  buildIndexationBlock,
  indexationOutcome,
  isPending,
  mergeInspections,
  pickedOf,
  planInspections,
  runInspections,
} from "./sources/indexation";
import { fetchSitemapPaths, firstSeenLookup, isNewPath, updateFirstSeen } from "./sources/sitemap";
import type { InsightStore, StateKey } from "./store";
import { GOOGLE_QUOTA_TZ, SOURCE_IDS, TIMEZONE, USAGE_INSIGHTS_KEY } from "./types";
import type {
  CfRumDay,
  CoverageClass,
  DaySignal,
  DaySlices,
  DayWindow,
  IndexationData,
  InsightSources,
  InsightState,
  SignalId,
  SourceBlock,
  SourceId,
  UsageInsightSnapshot,
} from "./types";

export interface RefreshDeps {
  cfClient: () => CfClient;
  ga4: Ga4Api;
  gscProblem: () => string | null;
  inspect: (url: string) => Promise<InspectionOutcome>;
  fetchSitemap: () => Promise<string[]>;
  clarityHttp?: ClarityHttp;
  bingHttp?: BingHttp;
  cruxHttp?: CruxHttp;
  cruxSleep?: (ms: number) => Promise<void>;
}

export const defaultDeps = (): RefreshDeps => ({
  cfClient: () => createCfClient(),
  ga4: defaultGa4Api,
  gscProblem: gscConfigProblem,
  inspect: (url) => inspectUrlDetailed(url, { languageCode: "en-US" }),
  fetchSitemap: () => fetchSitemapPaths(),
});

export interface RefreshOptions {
  now: Date;
  dryRun: boolean;
  /** Hay base del app (lecturas). En un dry run local puede no haberla. */
  hasDb: boolean;
  only?: SourceId[] | null;
  skip?: SourceId[];
  backfillDays?: number;
  /** `--inspect=N`: el techo del día de Google para esta corrida. */
  inspectBudget?: number | null;
  /** `--clarity` en un dry run. */
  allowClarity?: boolean;
  store: InsightStore;
  log: (line: string) => void;
  deps?: Partial<RefreshDeps>;
}

export interface RefreshResult {
  snapshot: UsageInsightSnapshot;
  state: InsightState;
  daySlices: Map<string, DaySlices>;
  exitCode: number;
  telegram: string | null;
  /** Las sub-claves de estado que corrieron (lo que `saveState` escribiría). */
  stateKeys: StateKey[];
}

export const BACKFILL_SOURCES: SourceId[] = ["cloudflareRum", "ga4Behavior", "feedback"];
export const BACKFILL_REFUSED: SourceId[] = ["indexation", "clarity", "crux"];

const INACTIVE_LINES: Partial<Record<SourceId, string>> = {
  clarity: CLARITY_INACTIVE_LINE,
  bing: BING_INACTIVE_LINE,
  crux: CRUX_INACTIVE_LINE,
};

function rowsOf(block: SourceBlock<any>): number {
  const seen = Object.values(block.rowsSeen || {}).reduce((s: number, n: any) => s + (Number(n) || 0), 0);
  return seen;
}

/** La línea de log de una fuente: armada SÓLO desde el bloque (estado, filas, nota ya saneada). */
export function sourceLogLine(block: SourceBlock<any>, ms: number): string {
  if (block.status === "inactive") {
    if (INACTIVE_LINES[block.id]) return INACTIVE_LINES[block.id]!;
    if (block.id === "cloudflareZone" && /Zona/.test(block.enableHint || "")) return ZONE_INACTIVE_LINE;
    return `[usage-insights] ${block.id}: inactivo — ${block.enableHint || "sin configurar"}`;
  }
  return `[usage-insights] ${block.id}: ${block.status} (${rowsOf(block)} filas, ${ms} ms)${block.note ? ` — ${block.note}` : ""}`;
}

/**
 * El texto de Telegram (≤ 12 líneas): sólo si una señal alta tiene filas nuevas o una fuente que
 * andaba ahora falla. Armado SÓLO con ids, títulos, conteos, resúmenes y la nota saneada: nunca un
 * objeto de error, un valor de fila, un término ni una consulta.
 */
export function buildTelegramText(snapshot: UsageInsightSnapshot, previous: UsageInsightSnapshot | null): string | null {
  const lines: string[] = [];
  for (const s of snapshot.signals) {
    if (s.status === "ok" && s.severity === "high" && s.newRows > 0)
      lines.push(`- ${s.title}: ${s.count} (${s.newRows} nuevas). ${s.summary}`);
  }
  for (const id of SOURCE_IDS) {
    const before = previous?.sources?.[id]?.status;
    const now = snapshot.sources[id];
    if ((before === "ok" || before === "partial") && now.status === "failed")
      lines.push(`- fuente ${id} falló${now.note ? `: ${now.note}` : ""}`);
  }
  if (!lines.length) return null;
  // Markdown de Telegram: un `_` o un `*` de un selector rompería el mensaje entero.
  const clean = (t: string) => t.replace(/[_*`[\]]/g, " ").slice(0, 300);
  return [`[usage-insights] ${snapshot.day}`, ...lines.slice(0, 10).map(clean), "Ver /estadisticas-de-uso"].join("\n");
}

function selectedFn(opts: RefreshOptions): (id: SourceId) => boolean {
  const only = opts.only?.length ? opts.only : opts.backfillDays ? BACKFILL_SOURCES : null;
  const skip = new Set(opts.skip || []);
  return (id) => (only ? only.includes(id) : true) && !skip.has(id);
}

export async function refreshUsageInsights(opts: RefreshOptions): Promise<RefreshResult> {
  const started = Date.now();
  const deps: RefreshDeps = { ...defaultDeps(), ...(opts.deps || {}) };
  const { store, log, now } = opts;
  const nowIso = now.toISOString();
  const runDay = ymdInTimeZone(now, TIMEZONE);
  const dataDay = addDays(runDay, -1);
  const w = analyticsWindows(now).current;
  const window: DayWindow = { start: w.start, end: w.end, days: w.days, tz: "America/Montevideo" };
  const selected = selectedFn(opts);

  const previous = await store.loadSnapshot();
  const state = await store.loadState();
  const stateKeys: StateKey[] = [];
  const prev = <K extends SourceId>(id: K): InsightSources[K] | null => (previous?.sources?.[id] as InsightSources[K]) || null;
  const sources = {} as InsightSources;
  const daySlices = new Map<string, DaySlices>();
  const slice = (day: string) => {
    let s = daySlices.get(day);
    if (!s) {
      s = {};
      daySlices.set(day, s);
    }
    return s;
  };
  const attempted: SourceId[] = [];
  const timings: Partial<Record<SourceId, number>> = {};

  async function step<K extends SourceId>(id: K, fn: () => Promise<BlockOutcome<any>>, skipNote = "--only/--skip"): Promise<void> {
    const t0 = Date.now();
    let outcome: BlockOutcome<any>;
    if (!selected(id)) outcome = { kind: "skipped", note: opts.backfillDays ? "no corre con --backfill" : skipNote };
    else {
      try {
        outcome = await fn();
      } catch (e) {
        outcome = { kind: "failed", note: sanitizeError(e, id) };
      }
    }
    if (outcome.kind !== "skipped" && outcome.kind !== "inactive") attempted.push(id);
    (sources as any)[id] = nextBlock(id, prev(id), outcome, nowIso);
    timings[id] = Date.now() - t0;
    log(sourceLogLine((sources as any)[id], timings[id]!));
  }

  // 2. sitemap — sólo si hay inspecciones para planificar
  const inspectCeiling =
    opts.inspectBudget !== null && opts.inspectBudget !== undefined
      ? Math.max(0, Math.min(INSPECT_MAX_CEILING, Math.floor(opts.inspectBudget)))
      : opts.dryRun
        ? 0
        : envInt("USAGE_INSIGHTS_INSPECT_MAX", INSPECT_MAX_DEFAULT, 0, INSPECT_MAX_CEILING);
  const quotaDay = ymdInTimeZone(now, GOOGLE_QUOTA_TZ);
  let usedBefore = 0;
  if (opts.hasDb) {
    try {
      usedBefore = await store.loadQuota("inspection", quotaDay);
    } catch (e) {
      log(`[usage-insights] cuota de inspección: no se pudo leer (${sanitizeError(e)})`);
    }
  }
  const inspectBudget = Math.max(0, inspectCeiling - usedBefore);
  let sitemapPaths: string[] | null = null;
  let sitemapUrls = 0;
  if (selected("indexation") && inspectBudget > 0 && !deps.gscProblem()) {
    try {
      sitemapPaths = await deps.fetchSitemap();
      sitemapUrls = sitemapPaths.length;
      state.sitemap = updateFirstSeen(state.sitemap, sitemapPaths, runDay, nowIso, log);
      stateKeys.push("sitemap");
    } catch (e) {
      log(`[usage-insights] sitemap: no se pudo leer, se usa la memoria guardada (${sanitizeError(e, "sitemap")})`);
    }
  }

  // 3. Cloudflare RUM
  const cf = deps.cfClient();
  await step("cloudflareRum", async () => {
    const archived = opts.hasDb ? await store.loadCfRumDays(addDays(dataDay, -40), dataDay) : [];
    const res = await runCloudflareRum({
      client: cf,
      dataDay,
      window,
      archived,
      state: state.cfRum,
      backfillDays: opts.backfillDays || 0,
      nowIso,
      log,
    });
    state.cfRum = res.state;
    stateKeys.push("cfRum");
    for (const f of res.fetched) {
      slice(f.day).cloudflareRum = {
        fetchedAt: nowIso,
        window: { start: f.day, end: f.day, days: 1, tz: "America/Montevideo" },
        data: f.data as CfRumDay,
      };
    }
    return res.outcome;
  });

  // 4. GA4
  await step("ga4Behavior", async () => {
    const consent = sources.cloudflareRum?.data?.consent || null;
    const res = await runGa4Behavior({
      window,
      consentRange: consent ? consent.range : null,
      consentPaths: (consent?.pages || []).map((p) => p.path),
      prevData: prev("ga4Behavior")?.data || null,
      api: deps.ga4,
    });
    if (res.day) slice(dataDay).ga4Behavior = { fetchedAt: nowIso, window, data: res.day };
    return res.outcome;
  });

  // 5. opiniones
  await step("feedback", async () => {
    const outcome = await runFeedback(window, opts.hasDb ? (p) => store.feedbackAggregate(p) : null);
    if (outcome.kind === "ok") slice(dataDay).feedback = { fetchedAt: nowIso, window, data: outcome.data.totals };
    return outcome;
  });

  // 6. las cuatro inertes hasta que exista su variable
  await step("cloudflareZone", async () => {
    const res = await runCloudflareZone(cf, now, prev("cloudflareZone")?.data || null);
    if (res.outcome.kind === "ok" || res.outcome.kind === "partial") {
      slice(dataDay).cloudflareZone = { fetchedAt: nowIso, window: res.outcome.window || window, data: res.outcome.data };
    }
    return res.outcome;
  });

  await step("clarity", async () => {
    const hasToken = !!String(process.env.CLARITY_EXPORT_TOKEN || "").trim();
    if (hasToken && opts.dryRun && !opts.allowClarity)
      return { kind: "skipped", note: "dry run: Clarity sólo con --clarity (cupo compartido)" };
    const utcDay = nowIso.slice(0, 10);
    const res = await runClarity({
      lastOkAt: state.clarity.lastOkAt,
      now,
      reserve: (max) => store.reserveQuota("clarity", utcDay, max),
      http: deps.clarityHttp,
      log,
      prevData: prev("clarity")?.data || null,
    });
    if (res.okAt) {
      state.clarity.lastOkAt = res.okAt;
      stateKeys.push("clarity.lastOkAt");
    }
    if (res.outcome.kind === "ok" || res.outcome.kind === "partial") {
      slice(dataDay).clarity = { fetchedAt: nowIso, window: { start: utcDay, end: utcDay, days: 1, tz: "UTC" }, data: res.outcome.data };
    }
    return res.outcome;
  });

  await step("bing", async () => {
    const res = await runBing({ http: deps.bingHttp, prevData: prev("bing")?.data || null, log });
    const o = res.outcome;
    if (o.kind === "ok" || o.kind === "partial") {
      const newest = [...o.data.buckets].sort().pop() || null;
      if (newest && (!state.bing.lastBucket || newest > state.bing.lastBucket)) {
        slice(dataDay).bing = {
          fetchedAt: nowIso,
          window,
          data: { buckets: o.data.buckets, traffic: o.data.traffic, queries: o.data.queries, pages: o.data.pages },
        };
        state.bing.lastBucket = newest;
        stateKeys.push("bing");
      }
    }
    return o;
  });

  // El cruce con Search Console se lee siempre que HAYA datos de Bing, frescos o conservados: con Bing
  // caído la señal muestra sus filas viejas como `stale`, no "no se pudo leer Search Console".
  let gscQueries: Map<string, { clicks: number; impressions: number }> | null = null;
  let gscUnavailable: string | null = null;
  if (sources.bing?.data) {
    if (!opts.hasDb) gscUnavailable = "sin base del app no se puede cruzar con Search Console (searchconsoledays)";
    else {
      try {
        const end = lastFinalDay(now.getTime());
        gscQueries = joinGsc(await store.loadGscQueries(addDays(end, -27), end));
      } catch (e) {
        log(`[usage-insights] bing: no se pudo leer searchconsoledays (${sanitizeError(e)})`);
        gscUnavailable = "no se pudo leer el archivo de Search Console (searchconsoledays)";
      }
    }
  }

  await step("crux", async () => {
    const cfPages = [...(sources.cloudflareRum?.data?.pages || [])].sort((a, b) => b.loads - a.loads).map((p) => p.path);
    const topPaths = cfPages.length ? cfPages : (sources.ga4Behavior?.data?.pages || []).map((p) => p.path);
    const res = await runCrux({
      http: deps.cruxHttp,
      topPaths,
      state: state.crux,
      prevData: prev("crux")?.data || null,
      now,
      sleep: deps.cruxSleep,
      log,
    });
    state.crux = res.state;
    stateKeys.push("crux");
    if (res.outcome.kind === "ok" || res.outcome.kind === "partial") {
      slice(dataDay).crux = {
        fetchedAt: nowIso,
        window,
        data: { origin: res.outcome.data.origin, urls: res.outcome.data.urls, collectionPeriod: res.outcome.data.collectionPeriod },
      };
    }
    return res.outcome;
  });

  // 7. inspección de URLs
  await step("indexation", async (): Promise<BlockOutcome<IndexationData>> => {
    const problem = deps.gscProblem();
    if (problem) return { kind: "inactive", enableHint: `Search Console: ${problem}` };
    if (inspectBudget <= 0) {
      if (opts.dryRun && (opts.inspectBudget === null || opts.inspectBudget === undefined)) {
        return { kind: "skipped", note: "dry run: sin inspecciones (--inspect=N para gastar cupo)" };
      }
      return {
        kind: "skipped",
        note: `cupo diario de inspección ya usado (${usedBefore} de ${inspectCeiling}, día de Google ${quotaDay})`,
      };
    }
    const paths = sitemapPaths || state.sitemap.firstSeen.map(([p]) => p);
    if (!paths.length) return { kind: "failed", note: "indexation: sin sitemap ni memoria de rutas" };
    const firstSeenOf = firstSeenLookup(state.sitemap);
    const lastInspected = new Map(state.inspections.map((r) => [r.path, r.at]));
    const cfRank = [...(sources.cloudflareRum?.data?.pages || [])].sort((a, b) => b.loads - a.loads).map((p) => p.path);
    const gaRank = (sources.ga4Behavior?.data?.pages || []).map((p) => p.path);
    const trafficRank = [...new Set([...cfRank, ...gaRank])];
    const plan = planInspections({
      sitemapPaths: paths,
      firstSeenOf,
      seededAt: state.sitemap.seededAt,
      lastInspected,
      trafficRank,
      budget: inspectBudget,
      day: runDay,
    });
    let lastUsed = usedBefore;
    const run = await runInspections(plan, {
      inspect: deps.inspect,
      reserve: async () => {
        const used = await store.reserveQuota("inspection", quotaDay, inspectCeiling);
        if (used !== null) lastUsed = used;
        return used;
      },
      now: () => Date.now(),
      maxMinutes: envInt("USAGE_INSIGHTS_INSPECT_MINUTES", INSPECT_MINUTES_DEFAULT, 1, 120),
      siteBase: (process.env.SITE_BASE_URL || "https://cambio-uruguay.com").replace(/\/+$/, ""),
      day: runDay,
    });
    if (run.results.length) {
      state.inspections = mergeInspections(state.inspections, run.results, runDay);
      stateKeys.push("inspections");
      slice(dataDay).indexation = {
        fetchedAt: nowIso,
        window: { start: runDay, end: runDay, days: 1, tz: "America/Montevideo" },
        data: { checked: run.results.length, results: run.results },
      };
    }
    const traffic = new Map<string, number>();
    for (const p of sources.cloudflareRum?.data?.pages || []) traffic.set(p.path, p.loads);
    for (const p of sources.ga4Behavior?.data?.pages || []) if (!traffic.has(p.path)) traffic.set(p.path, p.views);
    const newLast14d = paths.filter((p) => isNewPath(firstSeenOf(p), state.sitemap.seededAt, runDay, 14)).length;
    const data = buildIndexationBlock({
      inspections: state.inspections,
      firstSeenOf,
      seededAt: state.sitemap.seededAt,
      traffic,
      day: dataDay,
      links: run.links,
      today: {
        budget: inspectBudget,
        quotaUsedBefore: usedBefore,
        quotaDay,
        picked: pickedOf(plan),
        checked: run.results.length,
        stoppedBy: run.stoppedBy,
        minutes: run.minutes,
      },
      sitemap: state.sitemap.seededAt
        ? {
            urls: sitemapUrls || paths.length,
            esUrls: state.sitemap.firstSeen.length,
            newLast14d,
            fetchedAt: state.sitemap.fetchedAt,
            seededAt: state.sitemap.seededAt,
            capped: state.sitemap.capped,
          }
        : null,
    });
    const outcome = indexationOutcome(run, plan.length, data, { used: lastUsed, max: inspectCeiling, day: quotaDay });
    if (outcome.kind === "inactive") return { ...outcome, enableHint: INDEXATION_PERMISSION_HINT };
    return outcome;
  });

  for (const id of SOURCE_IDS) if (!(sources as any)[id]) (sources as any)[id] = prev(id) || emptyBlock(id, nowIso);

  // 8. páginas, señales, tendencia
  const consentCheck = buildConsentCheck(sources);
  const firstSeenOf = firstSeenLookup(state.sitemap);
  const index = new Map<string, { class: CoverageClass; checkedAt: string; pending: boolean }>();
  for (const r of state.inspections)
    index.set(r.path, { class: r.cls, checkedAt: r.at, pending: isPending(r, firstSeenOf(r.path), state.sitemap.seededAt) });
  const siteLoadsUy = sources.cloudflareRum.data?.totals?.uy?.loads ?? null;
  const keysOut = new Map<SignalId, string[]>();
  const signals = buildSignals({
    sources,
    consentCheck,
    previous,
    now,
    siteLoadsUy,
    gscQueries,
    gscUnavailable,
    previousKeys: state.signalKeys,
    keysOut,
  });
  // Una señal no disponible no pisa sus claves: la próxima vez que vuelva se compara contra la última
  // corrida en que se vio, y no se marca todo como nuevo.
  state.signalKeys = { ...(state.signalKeys || {}), ...Object.fromEntries(keysOut) };
  stateKeys.push("signalKeys");
  const pages = buildPages(sources, signals, consentCheck, { index });
  let archiveTrend: ArchiveTrendDay[] = [];
  if (opts.hasDb) {
    try {
      archiveTrend = await store.loadArchiveTrend(addDays(dataDay, -27), dataDay);
    } catch (e) {
      log(`[usage-insights] tendencia: no se pudo leer el archivo (${sanitizeError(e)})`);
    }
  }
  const todayIdx = daySlices.get(dataDay)?.indexation?.data;
  if (todayIdx) {
    archiveTrend = archiveTrend.filter((a) => a.day !== dataDay);
    archiveTrend.push({
      day: dataDay,
      inspected: todayIdx.checked,
      indexed: todayIdx.results.filter((r) => r.cls === "indexed" || r.cls === "indexed-warning").length,
    });
  }
  const flags = process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.split("=")[0]);
  const snapshot = enforceBudget({
    key: USAGE_INSIGHTS_KEY,
    schemaVersion: 1,
    asOf: nowIso,
    day: dataDay,
    timezone: "America/Montevideo",
    window,
    run: { durationSec: Math.round((Date.now() - started) / 1000), flags, trimmed: [], bytes: 0, siteLoadsUy },
    sources,
    pages,
    signals,
    trend: buildTrend(sources, dataDay, archiveTrend),
    consentCheck,
  });
  for (const t of snapshot.run.trimmed) log(`[usage-insights] recorte: ${t}`);

  const compactSignals: DaySignal[] = snapshot.signals.map((s) => ({
    id: s.id,
    status: s.status,
    severity: s.severity,
    count: s.count,
    impact: s.impact,
    // Del conjunto entero, no de las 20 filas del snapshot (que el recorte de tamaño puede achicar más).
    keys: (keysOut.get(s.id) || s.rows.map((r) => r.key)).slice(0, DAY_SIGNAL_KEYS),
  }));

  // 9. escrituras
  let exitCode = 0;
  if (!opts.dryRun) {
    const write = async (what: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        exitCode = 1;
        log(`[usage-insights] no se pudo guardar ${what}: ${sanitizeError(e)}`);
      }
    };
    for (const [day, slices] of daySlices) {
      if (day === dataDay) continue;
      await write(`el día ${day}`, () => store.saveDaySlices(day, slices, undefined, log));
    }
    await write(`el día ${dataDay}`, () => store.saveDaySlices(dataDay, daySlices.get(dataDay) || {}, compactSignals, log));
    await write("el estado", () => store.saveState(state, [...new Set(stateKeys)]));
    await write("el snapshot", () => store.saveSnapshot(snapshot));
  }
  if (attempted.length && attempted.every((id) => sources[id].status === "failed")) exitCode = 1;

  return {
    snapshot,
    state,
    daySlices,
    exitCode,
    telegram: opts.dryRun ? null : buildTelegramText(snapshot, previous),
    stateKeys: [...new Set(stateKeys)],
  };
}
