// Las tres colecciones del seguimiento de precios, en la APP DB. `marketpricelogs` es privada: la app
// nunca la lee. `marketseries` (una por cohorte) y `marketseriesmetas` (`index:<mercado>` y `run`)
// son las que sirve /api/market-series.
import { appConnection } from "../appdb";
import { marketLogPruneFilter } from "./log";
import type { MarketPriceLog, MarketSeriesEntry, MarketSeriesIndex, MarketVertical } from "./types";

export const MARKET_LOG_COLLECTION = "marketpricelogs";
export const MARKET_SERIES_COLLECTION = "marketseries";
export const MARKET_META_COLLECTION = "marketseriesmetas";
/** Three years of daily points per cohort. */
export const MARKET_SERIES_MAX_POINTS = 1100;
/**
 * Daily shapes kept per cohort. A shape is ~40 numbers, a point ~20: three years of shapes for every
 * cohort would weigh more than all the series together, and the page only compares today against
 * about a month ago.
 */
export const MARKET_HIST_MAX_DAYS = 100;
const BATCH = 1000;

const lit = (value: unknown): { $literal: unknown } => ({ $literal: value });

/**
 * One cohort's upsert as an update PIPELINE: `points` is recomputed from the stored array, so today's
 * point replaces an earlier one of the same day instead of duplicating it. Every value goes through
 * `$literal`: in a pipeline `$set` a string starting with "$" is read as a field path and would write
 * `undefined` in silence (the trap documented in docs/app/PRICEWATCH.md).
 */
export function seriesOperation(entry: MarketSeriesEntry, today: string, maxPoints: number = MARKET_SERIES_MAX_POINTS) {
  const notToday = (field: string) => ({ $filter: { input: { $ifNull: [field, []] }, cond: { $ne: ["$$this.d", lit(today)] } } });
  return {
    updateOne: {
      filter: { key: entry.cohort.key },
      update: [
        {
          $set: {
            key: lit(entry.cohort.key),
            vertical: lit(entry.cohort.dims.vertical),
            dims: lit(entry.cohort.dims),
            labels: lit(entry.labels),
            label: lit(entry.label),
            latest: lit(entry.point),
            updatedAt: lit(today),
            points: { $slice: [{ $concatArrays: [notToday("$points"), [lit(entry.point)]] }, -maxPoints] },
            // A re-run the same day that no longer reaches 30 units drops the stale shape it left.
            hists: {
              $slice: [
                { $concatArrays: [notToday("$hists"), entry.hist ? [lit({ d: today, ...entry.hist })] : []] },
                -MARKET_HIST_MAX_DAYS,
              ],
            },
          },
        },
      ],
      upsert: true as const,
    },
  };
}

export async function ensureMarketIndexes(): Promise<void> {
  const db = appConnection();
  await db.collection(MARKET_LOG_COLLECTION).createIndex({ key: 1 }, { unique: true });
  await db.collection(MARKET_LOG_COLLECTION).createIndex({ vertical: 1, lastSeen: 1 });
  await db.collection(MARKET_SERIES_COLLECTION).createIndex({ key: 1 }, { unique: true });
  await db.collection(MARKET_SERIES_COLLECTION).createIndex({ vertical: 1 });
  await db.collection(MARKET_META_COLLECTION).createIndex({ key: 1 }, { unique: true });
}

export async function loadMarketLogs(vertical: MarketVertical): Promise<Map<string, MarketPriceLog>> {
  const logs = new Map<string, MarketPriceLog>();
  const cursor = appConnection()
    .collection(MARKET_LOG_COLLECTION)
    .find({ vertical }, { projection: { _id: 0 }, batchSize: 2000, maxTimeMS: 120_000 });
  try {
    for await (const row of cursor) {
      const log = row as unknown as MarketPriceLog;
      logs.set(log.key, log);
    }
  } finally {
    await cursor.close();
  }
  return logs;
}

/**
 * One changed log's write, conditional on the document being as this run read it. Since 2026-09-22
 * the rental harvest writes the same collection every hour with an atomic pipeline
 * (classes/pricehistory/marketLog.ts), while this job reads every log, computes, and only then writes:
 * a blind replace would delete whatever point the harvest appended in between. If the document moved,
 * the harvest recorded something newer than this run's observation and the write is skipped; a log
 * this run creates is only inserted if nobody created it first.
 */
export function marketLogWriteOperation(log: MarketPriceLog, before: MarketPriceLog | undefined) {
  if (!before) return { updateOne: { filter: { key: log.key }, update: { $setOnInsert: log }, upsert: true as const } };
  const last = before.points.length - 1;
  const filter: Record<string, unknown> = { key: log.key, lastSeen: before.lastSeen, points: { $size: before.points.length } };
  if (last >= 0) {
    filter[`points.${last}.d`] = before.points[last]!.d;
    filter[`points.${last}.p`] = before.points[last]!.p;
    filter[`points.${last}.c`] = before.points[last]!.c;
  }
  return { replaceOne: { filter, replacement: log } };
}

/** Writes the changed logs; returns how many were skipped because another writer moved them first. */
export async function writeMarketLogs(logs: readonly MarketPriceLog[], before: ReadonlyMap<string, MarketPriceLog>): Promise<number> {
  const collection = appConnection().collection(MARKET_LOG_COLLECTION);
  let skipped = 0;
  for (let i = 0; i < logs.length; i += BATCH) {
    const batch = logs.slice(i, i + BATCH);
    // Mixed replace/update ops are not in the driver's bulk-op typings as one union.
    const result = await collection.bulkWrite(batch.map(log => marketLogWriteOperation(log, before.get(log.key))) as any, { ordered: false });
    skipped += batch.length - result.matchedCount - result.upsertedCount;
  }
  return skipped;
}

export async function pruneMarketLogs(vertical: MarketVertical, today: string): Promise<number> {
  const { deletedCount } = await appConnection().collection(MARKET_LOG_COLLECTION).deleteMany(marketLogPruneFilter(vertical, today));
  return deletedCount ?? 0;
}

export async function writeMarketSeries(entries: readonly MarketSeriesEntry[], today: string): Promise<void> {
  const collection = appConnection().collection(MARKET_SERIES_COLLECTION);
  for (let i = 0; i < entries.length; i += BATCH)
    // Pipeline updates are not in the driver's bulk-op typings.
    await collection.bulkWrite(entries.slice(i, i + BATCH).map(entry => seriesOperation(entry, today)) as any, { ordered: false });
}

export async function readMarketIndex(vertical: MarketVertical): Promise<MarketSeriesIndex | null> {
  const doc = await appConnection()
    .collection(MARKET_META_COLLECTION)
    .findOne({ key: `index:${vertical}` }, { projection: { _id: 0 }, maxTimeMS: 5000 });
  return doc as unknown as MarketSeriesIndex | null;
}

export async function writeMarketIndex(index: MarketSeriesIndex): Promise<void> {
  await appConnection().collection(MARKET_META_COLLECTION).replaceOne({ key: index.key }, index, { upsert: true });
}

export async function writeMarketRun(vertical: MarketVertical, run: Record<string, unknown>): Promise<void> {
  await appConnection()
    .collection(MARKET_META_COLLECTION)
    .updateOne({ key: "run" }, { $set: { key: "run", [`verticals.${vertical}`]: run, updatedAt: new Date().toISOString() } }, { upsert: true });
}
