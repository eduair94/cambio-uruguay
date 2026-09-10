// Reading and writing the household catalogue in the APP database.
//
// Two properties the job depends on:
//   * An item that vanished from the market is NOT deleted. Its price history is the only record of
//     what a 250-litre fridge used to cost here, and a category can go quiet for a day because one
//     storefront changed its sitemap.
//   * A thin run never overwrites a good one. Publishing an empty catalogue over a working one
//     turns a source outage into "nothing exists".
import { EquiparItemModel } from "../models/EquiparItem";
import { EquiparMetaModel } from "../models/EquiparMeta";
import type { EquiparItem, EquiparMeta } from "./types";

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
