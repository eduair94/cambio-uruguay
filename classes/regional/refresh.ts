// One run of the regional board: fetch everything, judge it, derive from it.
//
// Every source runs in parallel and independently. A source that throws, times
// out or returns garbage becomes a failed `RegionalSourceRun` — the snapshot is
// published with whatever answered, and the run list says exactly who did not.
// Thirteen upstreams in six countries WILL have one down on any given day; a
// pipeline that treats that as an error publishes nothing most days.
//
// The Uruguayan row is not fetched: it is built from rows this backend already
// holds. `buildSnapshot` takes them as an argument rather than importing the
// scraper registry, so the whole pipeline stays unit-testable without Mongo.
import { LIVE_SOURCES } from "./catalog";
import { compareRoutes, type RegionalRouteComparison } from "./compare";
import { buildBoard, buildCross, buildGaps, oldestQuoteAt } from "./derive";
import { buildUyQuotes, type LocalRateRow } from "./sources/uy_local";
import { dedupeQuotes, validateQuotes } from "./validate";
import type { RegionalQuote, RegionalSnapshot, RegionalSourceRun } from "./types";

export interface RefreshResult {
  snapshot: RegionalSnapshot;
  routes: RegionalRouteComparison[];
  runs: RegionalSourceRun[];
}

/** Hard ceiling per source, so one stalled host cannot hold the whole run. */
const SOURCE_TIMEOUT_MS = Number(process.env.REGIONAL_SOURCE_TIMEOUT_MS || 30_000);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} no respondió en ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Fetch every live source. Never throws: a failure is one row of the result. */
export async function fetchAllSources(): Promise<RegionalSourceRun[]> {
  return Promise.all(
    LIVE_SOURCES.map(async (source): Promise<RegionalSourceRun> => {
      const startedAt = Date.now();
      try {
        const quotes = await withTimeout(source.fetch(), SOURCE_TIMEOUT_MS, source.meta.name);
        return {
          id: source.meta.id,
          ok: quotes.length > 0,
          quotes,
          note: quotes.length ? `${quotes.length} cotizaciones` : "respondió sin cotizaciones utilizables",
          ms: Date.now() - startedAt,
        };
      } catch (error) {
        return {
          id: source.meta.id,
          ok: false,
          quotes: [],
          note: error instanceof Error ? error.message : String(error),
          ms: Date.now() - startedAt,
        };
      }
    })
  );
}

/** Assemble the snapshot from raw source runs plus this site's own board. */
export function buildSnapshot(runs: RegionalSourceRun[], localRows: LocalRateRow[] = []): RefreshResult {
  const local = buildUyQuotes(localRows);
  const localRun: RegionalSourceRun = {
    id: "uy_local",
    ok: local.length > 0,
    quotes: local,
    note: local.length ? `${local.length} cotizaciones propias` : "sin filas locales del día",
    ms: 0,
  };
  const allRuns = [...runs, localRun];

  const raw: RegionalQuote[] = allRuns.flatMap((run) => run.quotes);
  const { kept, rejected } = validateQuotes(raw);
  const quotes = dedupeQuotes(kept);

  const board = buildBoard(quotes);
  const routes = compareRoutes(quotes);
  const snapshot: RegionalSnapshot = {
    generatedAt: new Date().toISOString(),
    oldestQuoteAt: oldestQuoteAt(quotes),
    quotes,
    board,
    gaps: buildGaps(board),
    cross: buildCross(quotes),
    routes,
    sources: allRuns.map((run) => ({
      id: run.id,
      ok: run.ok,
      note: run.note,
      ms: run.ms,
      quotes: run.quotes.length,
    })),
    rejected,
  };

  return { snapshot, routes, runs: allRuns };
}

/** Fetch and assemble in one call. `localRows` comes from this backend's own board. */
export async function refreshRegional(localRows: LocalRateRow[] = []): Promise<RefreshResult> {
  return buildSnapshot(await fetchAllSources(), localRows);
}
