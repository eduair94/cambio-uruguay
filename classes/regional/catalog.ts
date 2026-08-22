// The source registry: what the regional board reads, and which reading wins
// when two publishers describe the same market.
//
// Adding a source is adding an entry here and nothing else — `refresh.ts` walks
// this list, `GET /regional/sources` publishes it, and the dedupe rule below is
// the only place that decides precedence.
//
// The list is deliberately redundant. A country covered by ONE publisher has no
// way to notice that publisher breaking: the day the only international feed
// started quoting the boliviano 39% off, nothing in the pipeline could tell
// "the rate moved" from "the feed broke". Everything here that looks like a
// duplicate is there so the validator has something to compare against.
import { fetchArAmbito, meta as arAmbito } from "./sources/ar_ambito";
import { fetchArBcra, meta as arBcra } from "./sources/ar_bcra";
import { fetchArBluelytics, meta as arBluelytics } from "./sources/ar_bluelytics";
import { fetchArCriptoYa, meta as arCriptoYa } from "./sources/ar_criptoya";
import { fetchArDolarApi, meta as arDolarApi } from "./sources/ar_dolarapi";
import { fetchArDolarHoy, meta as arDolarHoy } from "./sources/ar_dolarhoy";
import { meta as arArgentinaDatos } from "./sources/ar_argentinadatos";
import { fetchBoBcb, meta as boBcb } from "./sources/bo_bcb";
import { fetchBoDolarApi, meta as boDolarApi } from "./sources/bo_dolarapi";
import { fetchBrAwesome, meta as brAwesome } from "./sources/br_awesomeapi";
import { fetchBrBcb, meta as brBcb } from "./sources/br_bcb";
import { fetchClBoostr, meta as clBoostr } from "./sources/cl_boostr";
import { fetchClDolarApi, meta as clDolarApi } from "./sources/cl_dolarapi";
import { fetchClMindicador, meta as clMindicador } from "./sources/cl_mindicador";
import { fetchPyBcp, meta as pyBcp } from "./sources/py_bcp";
import { fetchPyDolarPy, meta as pyDolarPy } from "./sources/py_dolarpy";
import { fetchPyMaxicambios, meta as pyMaxicambios } from "./sources/py_maxicambios";
import { fetchUyExternal, meta as uyExternal } from "./sources/uy_external";
import { meta as uyLocal } from "./sources/uy_local";
import { fetchWorldErApi, meta as worldErApi } from "./sources/world_erapi";
import {
  coinbaseMeta,
  currencyApiMeta,
  fetchWorldCoinbase,
  fetchWorldCurrencyApi,
  fetchWorldFloatRates,
  floatRatesMeta,
} from "./sources/world_feeds";
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
  // Argentina: cinco lecturas de los mismos siete mercados.
  { meta: arDolarApi, fetch: fetchArDolarApi },
  { meta: arBluelytics, fetch: fetchArBluelytics },
  { meta: arAmbito, fetch: fetchArAmbito },
  { meta: arDolarHoy, fetch: fetchArDolarHoy },
  { meta: arCriptoYa, fetch: fetchArCriptoYa },
  { meta: arBcra, fetch: fetchArBcra },
  // Brasil: el fixing oficial y el mercado.
  { meta: brBcb, fetch: fetchBrBcb },
  { meta: brAwesome, fetch: fetchBrAwesome },
  // Chile: dos lecturas del observado, más el mostrador.
  { meta: clMindicador, fetch: fetchClMindicador },
  { meta: clBoostr, fetch: fetchClBoostr },
  { meta: clDolarApi, fetch: fetchClDolarApi },
  // Paraguay: el banco central por dos caminos, y once casas.
  { meta: pyBcp, fetch: fetchPyBcp },
  { meta: pyDolarPy, fetch: fetchPyDolarPy },
  { meta: pyMaxicambios, fetch: fetchPyMaxicambios },
  // Bolivia: el oficial por dos caminos, y el paralelo.
  { meta: boBcb, fetch: fetchBoBcb },
  { meta: boDolarApi, fetch: fetchBoDolarApi },
  // Uruguay: el control externo sobre nuestro propio relevamiento.
  { meta: uyExternal, fetch: fetchUyExternal },
  // Globales: cuatro, para que ninguno sea la única palabra.
  { meta: currencyApiMeta, fetch: fetchWorldCurrencyApi },
  { meta: floatRatesMeta, fetch: fetchWorldFloatRates },
  { meta: coinbaseMeta, fetch: fetchWorldCoinbase },
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
 * outranks a newspaper; a single casa speaks only for itself; and the worldwide
 * mid-market feeds are last because they update once a day and nobody trades at
 * them. Within a rank, the row with both sides and the newest stamp wins — see
 * `dedupeQuotes`.
 */
const PUBLISHER_RANK: Record<RegionalSourceMeta["publisher"], number> = {
  "central-bank": 0,
  "market-data": 1,
  media: 2,
  "exchange-house": 3,
};

const RANK_BY_SOURCE: Record<string, number> = Object.fromEntries(
  ALL_SOURCE_METAS.map((meta) => [meta.id, meta.global ? 9 : PUBLISHER_RANK[meta.publisher]])
);

export function sourceRank(id: string): number {
  return RANK_BY_SOURCE[id] ?? 5;
}

export function sourceMeta(id: string): RegionalSourceMeta | null {
  return ALL_SOURCE_METAS.find((meta) => meta.id === id) ?? null;
}
