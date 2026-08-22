// The source registry: what the regional board reads, and which reading wins
// when two publishers describe the same market.
//
// Adding a source is adding an entry here and nothing else — `refresh.ts` walks
// this list, `GET /regional/sources` publishes it, and the dedupe rule below is
// the only place that decides precedence.
import { fetchArAmbito, meta as arAmbito } from "./sources/ar_ambito";
import { fetchArBcra, meta as arBcra } from "./sources/ar_bcra";
import { fetchArBluelytics, meta as arBluelytics } from "./sources/ar_bluelytics";
import { fetchArDolarApi, meta as arDolarApi } from "./sources/ar_dolarapi";
import { fetchArDolarHoy, meta as arDolarHoy } from "./sources/ar_dolarhoy";
import { meta as arArgentinaDatos } from "./sources/ar_argentinadatos";
import { fetchBoDolarApi, meta as boDolarApi } from "./sources/bo_dolarapi";
import { fetchBrAwesome, meta as brAwesome } from "./sources/br_awesomeapi";
import { fetchBrBcb, meta as brBcb } from "./sources/br_bcb";
import { fetchClDolarApi, meta as clDolarApi } from "./sources/cl_dolarapi";
import { fetchClMindicador, meta as clMindicador } from "./sources/cl_mindicador";
import { fetchPyBcp, meta as pyBcp } from "./sources/py_bcp";
import { fetchPyMaxicambios, meta as pyMaxicambios } from "./sources/py_maxicambios";
import { meta as uyLocal } from "./sources/uy_local";
import { fetchWorldErApi, meta as worldErApi } from "./sources/world_erapi";
import type { RegionalQuote, RegionalSourceMeta } from "./types";

/** A source the live snapshot fetches over the network. */
export interface RegionalSource {
  meta: RegionalSourceMeta;
  fetch: () => Promise<RegionalQuote[]>;
}

/**
 * Everything the snapshot reads, in no particular order — they all run in
 * parallel and a failure is recorded, never thrown.
 */
export const LIVE_SOURCES: RegionalSource[] = [
  { meta: arDolarApi, fetch: fetchArDolarApi },
  { meta: arBluelytics, fetch: fetchArBluelytics },
  { meta: arAmbito, fetch: fetchArAmbito },
  { meta: arDolarHoy, fetch: fetchArDolarHoy },
  { meta: arBcra, fetch: fetchArBcra },
  { meta: brAwesome, fetch: fetchBrAwesome },
  { meta: brBcb, fetch: fetchBrBcb },
  { meta: clMindicador, fetch: fetchClMindicador },
  { meta: clDolarApi, fetch: fetchClDolarApi },
  { meta: pyBcp, fetch: fetchPyBcp },
  { meta: pyMaxicambios, fetch: fetchPyMaxicambios },
  { meta: boDolarApi, fetch: fetchBoDolarApi },
  { meta: worldErApi, fetch: fetchWorldErApi },
];

/**
 * Every source the subsystem uses, including the two that are not fetched by the
 * live snapshot: our own board (built from Mongo rows, not HTTP) and the
 * Argentine daily history (only read by the backfill).
 */
export const ALL_SOURCE_METAS: RegionalSourceMeta[] = [
  ...LIVE_SOURCES.map((source) => source.meta),
  uyLocal,
  arArgentinaDatos,
];

/**
 * Precedence when two sources publish the same market.
 *
 * A central bank's own number outranks a vendor's survey of it; a vendor
 * outranks a newspaper; a single casa speaks only for itself; and the
 * international mid-market reference is last because it updates once a day and
 * nobody trades at it. Within a rank, the row with both sides and the newest
 * stamp wins — see `dedupeQuotes`.
 */
const PUBLISHER_RANK: Record<RegionalSourceMeta["publisher"], number> = {
  "central-bank": 0,
  "market-data": 1,
  media: 2,
  "exchange-house": 3,
};

const RANK_BY_SOURCE: Record<string, number> = Object.fromEntries(
  ALL_SOURCE_METAS.map((meta) => [meta.id, PUBLISHER_RANK[meta.publisher]])
);
// The global fallback always loses to a national source, whatever its publisher.
RANK_BY_SOURCE[worldErApi.id] = 9;

export function sourceRank(id: string): number {
  return RANK_BY_SOURCE[id] ?? 5;
}

export function sourceMeta(id: string): RegionalSourceMeta | null {
  return ALL_SOURCE_METAS.find((meta) => meta.id === id) ?? null;
}
