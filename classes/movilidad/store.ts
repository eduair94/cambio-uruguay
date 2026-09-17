// Reading and writing the monopatines/bicicletas catalogue in the APP database.
//
// Same two properties classes/equipar/store.ts protects, for the same reasons:
//   * An item that vanished from the market is NOT deleted. Its price history is the only record of
//     what a scooter used to cost here, and a category can go quiet for a day for reasons that have
//     nothing to do with whether it still exists.
//   * A thin run never overwrites a good one (enforced by the caller, sync_movilidad.ts — this module
//     just does the read/write).
//
// The store-SNAPSHOT mechanics (merge, row-trimming, size check) are reused as-is from
// classes/equipar/storeSnapshot.ts rather than copied: those functions are already generic over
// `RetailListing[]` and carry no equipar-specific identifier beyond a Mongo key, which this file
// supplies its own value for. Duplicating that module would only risk the two domains drifting on
// the SAME merge rule; importing it means a fix there is a fix here too.
import { MovilidadItemModel } from "../models/MovilidadItem";
import { MovilidadMetaModel } from "../models/MovilidadMeta";
import { MovilidadStoreSnapshotModel } from "../models/MovilidadStoreSnapshot";
import type { RetailListing } from "../retail/types";
import { storeSnapshotBytes, storeSnapshotRows, STORE_SNAPSHOT_MAX_BYTES } from "../equipar/storeSnapshot";
import type { EquiparItem } from "../equipar/types";
import type { MovilidadMeta } from "./types";

export const MOVILIDAD_META_KEY = "movilidad-electrica-uruguay";
export const MOVILIDAD_STORE_SNAPSHOT_KEY = "movilidad-store-listings";

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
  const rows = (await MovilidadItemModel.find({})
    .select({ key: 1, firstSeen: 1, history: 1 })
    .lean()) as unknown as Array<{ key: string; firstSeen: string; history?: StoredHistoryPoint[] }>;
  return new Map(rows.map((row) => [row.key, { firstSeen: row.firstSeen, history: row.history ?? [] }]));
}

export async function countStoredItems(): Promise<number> {
  return MovilidadItemModel.countDocuments({});
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

export async function saveMovilidadCatalog(
  items: ReadonlyArray<EquiparItem & { firstSeen: string; lastSeen: string; history: StoredHistoryPoint[] }>,
  meta: MovilidadMeta
): Promise<void> {
  if (items.length) {
    await MovilidadItemModel.bulkWrite(
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
  await MovilidadMetaModel.updateOne(
    { key: MOVILIDAD_META_KEY },
    { $set: { ...meta, key: MOVILIDAD_META_KEY } },
    { upsert: true }
  );
}

/**
 * Writes the daily run's store listings for the hourly run. Returns the measured size in bytes, or
 * null-ish `saved: false` above {@link STORE_SNAPSHOT_MAX_BYTES} — the previous snapshot is kept
 * rather than risking a failed 16 MB write.
 */
export async function saveStoreSnapshot(
  listings: readonly RetailListing[],
  generatedAt: string
): Promise<{ bytes: number; saved: boolean }> {
  const rows = storeSnapshotRows(listings);
  const bytes = storeSnapshotBytes(rows);
  if (bytes > STORE_SNAPSHOT_MAX_BYTES) return { bytes, saved: false };
  await MovilidadStoreSnapshotModel.updateOne(
    { key: MOVILIDAD_STORE_SNAPSHOT_KEY },
    { $set: { key: MOVILIDAD_STORE_SNAPSHOT_KEY, generatedAt, listings: rows } },
    { upsert: true }
  );
  return { bytes, saved: true };
}

/** The daily run's store listings, or null when there is none yet. */
export async function loadStoreSnapshot(): Promise<{ generatedAt: string; listings: RetailListing[] } | null> {
  const row = (await MovilidadStoreSnapshotModel.findOne({ key: MOVILIDAD_STORE_SNAPSHOT_KEY })
    .select({ generatedAt: 1, listings: 1 })
    .lean()) as unknown as { generatedAt: string; listings?: RetailListing[] } | null;
  return row ? { generatedAt: row.generatedAt, listings: row.listings ?? [] } : null;
}
