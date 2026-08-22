// Two collections in the BACKEND database (`cambio-uy`, the one the public API
// reads), never the app one:
//
//   * `regional_data` (colección real `regional_datas`) — a single document holding the latest snapshot. Always
//     read whole, always written whole, so `GET /regional` is one lookup.
//   * `regional_history` (colección real `regional_histories`) — one row per market per day, unique on (key, day).
//     This is the collection that makes the endpoint worth integrating against:
//     the Argentine series alone goes back to 2011, and a comparison of the
//     region that only knows today can describe a level but never a trend.
//
// The snapshot write has a guard the videos and bankos jobs taught us: a run
// that comes back with a fraction of what is already stored is an outage
// upstream, not a region that stopped publishing prices. It refuses rather than
// overwrite a good snapshot with a thin one.
import { MongooseServer, Schema } from "../database";
import type { RegionalHistoryPoint, RegionalSnapshot } from "./types";

const SNAPSHOT_KEY = "regional_snapshot";

const snapshotSchema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });

const historySchema = new Schema(
  {
    key: { type: String, required: true },
    country: { type: String, required: true },
    market: { type: String, required: true },
    base: { type: String, required: true },
    quote: { type: String, required: true },
    day: { type: String, required: true },
    buy: { type: Number, default: null },
    sell: { type: Number, default: null },
    avg: { type: Number, required: true },
    source: { type: String, required: true },
  },
  { strict: true }
);
historySchema.index({ key: 1, day: 1 }, { unique: true });
historySchema.index({ country: 1, market: 1, day: -1 });
historySchema.index({ day: -1 });

const snapshotDb = (): MongooseServer => MongooseServer.getInstance("regional_data", snapshotSchema);
const historyDb = (): MongooseServer => MongooseServer.getInstance("regional_history", historySchema);

export async function loadRegionalSnapshot(): Promise<RegionalSnapshot | null> {
  const rows = await snapshotDb().aggregate([{ $match: { key: SNAPSHOT_KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as RegionalSnapshot | undefined) ?? null;
}

/**
 * A run must bring at least this share of the stored snapshot's quotes to be
 * allowed to replace it. Half is generous on purpose: Argentina alone is a third
 * of the board, and a bad afternoon at one publisher must not blank the region.
 */
export const COLLAPSE_RATIO = Number(process.env.REGIONAL_COLLAPSE_RATIO || 0.5);

export interface SaveResult {
  saved: boolean;
  reason: string;
}

/**
 * Whether a run may replace what is stored. Pure so the rule can be tested
 * without a database — it is the rule that decides whether an outage upstream
 * blanks the board.
 */
export function publishDecision(nextCount: number, previousCount: number): SaveResult {
  if (nextCount <= 0) {
    return { saved: false, reason: "la corrida no trajo ninguna cotización — se conserva la anterior" };
  }
  if (previousCount > 10 && nextCount < previousCount * COLLAPSE_RATIO) {
    return {
      saved: false,
      reason: `la corrida trajo ${nextCount} cotizaciones contra ${previousCount} guardadas (< ${Math.round(
        COLLAPSE_RATIO * 100
      )} %) — se conserva la anterior`,
    };
  }
  return { saved: true, reason: `${nextCount} cotizaciones publicadas` };
}

export async function saveRegionalSnapshot(snapshot: RegionalSnapshot): Promise<SaveResult> {
  const previous = snapshot.quotes.length ? await loadRegionalSnapshot() : null;
  const decision = publishDecision(snapshot.quotes.length, previous?.quotes?.length ?? 0);
  if (!decision.saved) return decision;
  await snapshotDb().updateOne({ key: SNAPSHOT_KEY }, { key: SNAPSHOT_KEY, doc: snapshot });
  return decision;
}

/** Upsert daily points. Idempotent: the same day written twice keeps one row. */
export async function saveRegionalHistory(points: RegionalHistoryPoint[]): Promise<number> {
  if (!points.length) return 0;
  const CHUNK = 1_000;
  let written = 0;
  for (let index = 0; index < points.length; index += CHUNK) {
    const chunk = points.slice(index, index + CHUNK);
    await historyDb().bulkUpsert(
      chunk.map((point) => ({
        filter: { key: point.key, day: point.day },
        update: point,
      }))
    );
    written += chunk.length;
  }
  return written;
}

export interface HistoryQuery {
  country?: string;
  market?: string;
  base?: string;
  quote?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Read a series back, newest last so a chart can plot it without reversing. */
export async function loadRegionalHistory(query: HistoryQuery = {}): Promise<RegionalHistoryPoint[]> {
  const match: Record<string, any> = {};
  if (query.country) match.country = query.country.toUpperCase();
  if (query.market) match.market = query.market;
  if (query.base) match.base = query.base.toUpperCase();
  if (query.quote) match.quote = query.quote.toUpperCase();
  if (query.from || query.to) {
    match.day = {};
    if (query.from) match.day.$gte = query.from;
    if (query.to) match.day.$lte = query.to;
  }
  const limit = Math.min(Math.max(query.limit ?? 5_000, 1), 20_000);

  const rows = await historyDb().aggregate([
    { $match: match },
    // Newest first for the limit, then flipped back to chronological order.
    { $sort: { day: -1 } },
    { $limit: limit },
    { $project: { _id: 0 } },
    { $sort: { key: 1, day: 1 } },
  ]);
  return rows as RegionalHistoryPoint[];
}

/** Distinct series present in the history collection, for the API's catalogue. */
export async function listRegionalSeries(): Promise<
  Array<{ key: string; country: string; market: string; base: string; quote: string; days: number; from: string; to: string }>
> {
  const rows = await historyDb().aggregate([
    {
      $group: {
        _id: "$key",
        country: { $first: "$country" },
        market: { $first: "$market" },
        base: { $first: "$base" },
        quote: { $first: "$quote" },
        days: { $sum: 1 },
        from: { $min: "$day" },
        to: { $max: "$day" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row: any) => ({
    key: row._id,
    country: row.country,
    market: row.market,
    base: row.base,
    quote: row.quote,
    days: row.days,
    from: row.from,
    to: row.to,
  }));
}

export async function countRegionalHistory(): Promise<number> {
  return historyDb().countEntries({});
}
