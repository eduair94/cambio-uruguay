// Reading and writing the household catalogue in the APP database.
//
// Two properties the job depends on:
//   * An item that vanished from the market is NOT deleted. Its price history is the only record of
//     what a 250-litre fridge used to cost here, and a category can go quiet for a day because one
//     storefront changed its sitemap.
//   * A thin run never overwrites a good one. Publishing an empty catalogue over a working one
//     turns a source outage into "nothing exists".
import { EquiparItemModel } from "../models/EquiparItem";
import { EquiparListingModel } from "../models/EquiparListing";
import { EquiparMetaModel } from "../models/EquiparMeta";
import { EquiparStoreSnapshotModel } from "../models/EquiparStoreSnapshot";
import type { RetailListing } from "../retail/types";
import { EQUIPAR_STORE_SNAPSHOT_KEY, STORE_SNAPSHOT_MAX_BYTES, storeSnapshotBytes, storeSnapshotRows } from "./storeSnapshot";
import type { EquiparItem, EquiparMeta } from "./types";
import type { EquiparListingRow } from "./listings";

export const EQUIPAR_META_KEY = "equipar-casa-uruguay";

export interface StoredHistoryPoint {
  date: string;
  newMedian: number | null;
  usedMedian: number | null;
}

export interface PreviousItem {
  firstSeen: string;
  history: StoredHistoryPoint[];
}

export async function loadPreviousItems(): Promise<Map<string, PreviousItem>> {
  const rows = (await EquiparItemModel.find({})
    .select({ key: 1, firstSeen: 1, history: 1 })
    .lean()) as unknown as Array<{ key: string; firstSeen: string; history?: StoredHistoryPoint[] }>;
  return new Map(rows.map((row) => [row.key, { firstSeen: row.firstSeen, history: row.history ?? [] }]));
}

export async function countStoredItems(): Promise<number> {
  return EquiparItemModel.countDocuments({});
}

/** Keeps at most a year of daily points; older ones stop telling us anything new. */
const trimHistory = (history: StoredHistoryPoint[]): StoredHistoryPoint[] => history.slice(-365);

export function withHistory(
  items: readonly EquiparItem[],
  previous: ReadonlyMap<string, PreviousItem>,
  today: string
): Array<EquiparItem & { firstSeen: string; lastSeen: string; history: StoredHistoryPoint[] }> {
  return items.map((item) => {
    const before = previous.get(item.key);
    const history = trimHistory([
      ...(before?.history ?? []).filter((point) => point.date !== today),
      {
        date: today,
        newMedian: item.newBand?.median ?? null,
        usedMedian: item.usedBand?.median ?? null,
      },
    ]);
    return { ...item, firstSeen: before?.firstSeen ?? today, lastSeen: today, history };
  });
}

export async function saveEquiparCatalog(
  items: ReadonlyArray<EquiparItem & { firstSeen: string; lastSeen: string; history: StoredHistoryPoint[] }>,
  meta: EquiparMeta
): Promise<void> {
  if (items.length) {
    await EquiparItemModel.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { key: item.key },
          // Cast: mongoose types `$set` as a dotted-path map, which a whole typed document does not
          // structurally satisfy even though replacing every field is exactly the intent.
          update: { $set: item as unknown as Record<string, unknown> },
          upsert: true,
        },
      })) as any,
      { ordered: false }
    );
  }
  await EquiparMetaModel.updateOne(
    { key: EQUIPAR_META_KEY },
    { $set: { ...meta, key: EQUIPAR_META_KEY } },
    { upsert: true }
  );
}

/**
 * Writes the daily run's store listings for the hourly run. Returns the measured size in bytes, or
 * null when it refused: above {@link STORE_SNAPSHOT_MAX_BYTES} the previous snapshot is kept rather
 * than risking a failed 16 MB write.
 */
export async function saveStoreSnapshot(listings: readonly RetailListing[], generatedAt: string): Promise<{ bytes: number; saved: boolean }> {
  const rows = storeSnapshotRows(listings);
  const bytes = storeSnapshotBytes(rows);
  if (bytes > STORE_SNAPSHOT_MAX_BYTES) return { bytes, saved: false };
  await EquiparStoreSnapshotModel.updateOne(
    { key: EQUIPAR_STORE_SNAPSHOT_KEY },
    { $set: { key: EQUIPAR_STORE_SNAPSHOT_KEY, generatedAt, listings: rows } },
    { upsert: true }
  );
  return { bytes, saved: true };
}

/** The daily run's store listings, or null when there is none yet. */
export async function loadStoreSnapshot(): Promise<{ generatedAt: string; listings: RetailListing[] } | null> {
  const row = (await EquiparStoreSnapshotModel.findOne({ key: EQUIPAR_STORE_SNAPSHOT_KEY })
    .select({ generatedAt: 1, listings: 1 })
    .lean()) as unknown as { generatedAt: string; listings?: RetailListing[] } | null;
  return row ? { generatedAt: row.generatedAt, listings: row.listings ?? [] } : null;
}

/**
 * How long a listing document outlives its last observation. The directory serves only the
 * freshness window (4 days, `/api/equipar/productos`); the rest of the month is for `?ids=` — the
 * reader's saved list asking "is this still published?" — after which the row is gone and the list
 * says so. Per-offer price HISTORY is pricewatchoffers' job, not this collection's.
 */
export const EQUIPAR_LISTING_KEEP_DAYS = 30;

export const equiparListingPruneCutoff = (today: string): string =>
  new Date(Date.parse(`${today}T12:00:00Z`) - EQUIPAR_LISTING_KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);

export interface EquiparListingUpsertOp {
  updateOne: {
    filter: { listingId: string };
    update: { $set: Omit<EquiparListingRow, "listingId">; $setOnInsert: { firstSeen: string } };
    upsert: true;
  };
}

/**
 * Everything is replaced on every observation except `firstSeen`, which only an insert writes: a
 * row re-seen tomorrow keeps the day it was first seen, which is the one field a later reader
 * ("publicado hace N días") cannot recompute.
 */
export function equiparListingUpsert(row: EquiparListingRow): EquiparListingUpsertOp {
  const { listingId, ...rest } = row;
  return {
    updateOne: {
      filter: { listingId },
      update: { $set: rest, $setOnInsert: { firstSeen: row.lastSeen } },
      upsert: true,
    },
  };
}

const LISTING_BATCH = 500;

/** Upserts every row in batches and prunes what has not been seen in {@link EQUIPAR_LISTING_KEEP_DAYS}. */
export async function saveEquiparListings(
  rows: readonly EquiparListingRow[],
  today: string
): Promise<{ written: number; pruned: number }> {
  let written = 0;
  for (let at = 0; at < rows.length; at += LISTING_BATCH) {
    const batch = rows.slice(at, at + LISTING_BATCH).map(equiparListingUpsert);
    await EquiparListingModel.bulkWrite(batch as any, { ordered: false });
    written += batch.length;
  }
  const pruned = await EquiparListingModel.deleteMany({ lastSeen: { $lt: equiparListingPruneCutoff(today) } });
  return { written, pruned: pruned.deletedCount ?? 0 };
}
