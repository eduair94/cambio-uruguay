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
import type { RegionalChange, RegionalState } from "./changes";
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

/**
 * Qué días ya están guardados de una serie.
 *
 * Es lo que convierte el backfill en incremental: los archivos que se recorren
 * día por día (el del Banco Central del Paraguay, el nuestro) sólo piden lo que
 * falta, así que la primera corrida hace el trabajo pesado y las siguientes no
 * hacen casi nada.
 */
export async function loadHistoryDays(key: string): Promise<Set<string>> {
  const rows = await historyDb().aggregate([
    { $match: { key } },
    { $group: { _id: null, days: { $addToSet: "$day" } } },
  ]);
  return new Set<string>((rows[0]?.days as string[] | undefined) ?? []);
}

// --- El ledger de movimientos ------------------------------------------------
//
// Append-only. La colección diaria se sobrescribe (guarda el cierre); ésta no se
// toca nunca: cada fila es un hecho fechado, y un hecho fechado no se corrige,
// se agrega otro al lado.

const changeSchema = new Schema(
  {
    key: { type: String, required: true },
    country: { type: String, required: true },
    market: { type: String, required: true },
    base: { type: String, required: true },
    quote: { type: String, required: true },
    source: { type: String, required: true },
    previousBuy: { type: Number, default: null },
    previousSell: { type: Number, default: null },
    previousAvg: { type: Number, required: true },
    buy: { type: Number, default: null },
    sell: { type: Number, default: null },
    avg: { type: Number, required: true },
    buyChanged: { type: Boolean, required: true },
    sellChanged: { type: Boolean, required: true },
    changePct: { type: Number, required: true },
    observedAt: { type: Date, required: true },
    sourceUpdatedAt: { type: String, default: null },
    sinceMinutes: { type: Number, default: null },
  },
  { strict: true }
);
// Único por (mercado, momento observado): una corrida que se repita —un reinicio
// de pm2, un reintento— no puede duplicar el movimiento.
changeSchema.index({ key: 1, observedAt: -1 }, { unique: true });
changeSchema.index({ observedAt: -1 });
changeSchema.index({ country: 1, market: 1, observedAt: -1 });

const changeDb = (): MongooseServer => MongooseServer.getInstance("regional_change", changeSchema);

export async function saveRegionalChanges(changes: RegionalChange[]): Promise<number> {
  if (!changes.length) return 0;
  await changeDb().bulkUpsert(
    changes.map((change) => ({
      filter: { key: change.key, observedAt: change.observedAt },
      update: change,
    }))
  );
  return changes.length;
}

/**
 * El último estado conocido de cada mercado.
 *
 * Sale del ledger, no del snapshot: el snapshot dice qué está publicado ahora y
 * el ledger dice de dónde vino. Si el ledger todavía no tiene ese mercado, el
 * snapshot guardado es el punto de partida — así la primera corrida después de
 * un despliegue no reporta el tablero entero como si se hubiera movido.
 */
export async function loadRegionalStates(): Promise<RegionalState[]> {
  const [fromLedger, snapshot] = await Promise.all([
    changeDb().aggregate([
      { $sort: { observedAt: -1 } },
      { $group: { _id: "$key", row: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
    loadRegionalSnapshot(),
  ]);

  const byKey = new Map<string, RegionalState>();
  for (const quote of snapshot?.quotes ?? []) {
    byKey.set(quote.id, {
      key: quote.id,
      buy: quote.buy,
      sell: quote.sell,
      avg: quote.avg,
      observedAt: new Date(snapshot!.generatedAt),
    });
  }
  for (const row of fromLedger) {
    byKey.set(row.key, {
      key: row.key,
      buy: row.buy ?? null,
      sell: row.sell ?? null,
      avg: row.avg,
      observedAt: new Date(row.observedAt),
    });
  }
  return [...byKey.values()];
}

export interface ChangeQuery {
  country?: string;
  market?: string;
  base?: string;
  quote?: string;
  key?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Movimientos, del más nuevo al más viejo. */
export async function loadRegionalChanges(query: ChangeQuery = {}): Promise<RegionalChange[]> {
  const match: Record<string, any> = {};
  if (query.key) match.key = query.key;
  if (query.country) match.country = query.country.toUpperCase();
  if (query.market) match.market = query.market;
  if (query.base) match.base = query.base.toUpperCase();
  if (query.quote) match.quote = query.quote.toUpperCase();
  if (query.from || query.to) {
    match.observedAt = {};
    if (query.from) match.observedAt.$gte = new Date(query.from);
    if (query.to) match.observedAt.$lte = new Date(query.to);
  }
  const limit = Math.min(Math.max(query.limit ?? 500, 1), 5_000);

  const rows = await changeDb().aggregate([
    { $match: match },
    { $sort: { observedAt: -1 } },
    { $limit: limit },
    { $project: { _id: 0 } },
  ]);
  return rows as RegionalChange[];
}

export async function countRegionalChanges(): Promise<number> {
  return changeDb().countEntries({});
}
