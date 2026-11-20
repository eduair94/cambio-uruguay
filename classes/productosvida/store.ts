// Reading and writing the /productos-que-te-cambian-la-vida-uruguay catalogue in the APP database.
//
// Same two properties classes/equipar/store.ts protects, for the same reasons:
//   * An item that vanished from the market is NOT deleted: its daily median history is the only
//     record of what it used to cost here, and a search can come back thin for a day.
//   * A thin run never overwrites a good one (enforced by the caller, sync_productos_vida.ts, with
//     `countPricedRecentItems` below — this module only reads and writes).
//
// `withHistory`, the listing upsert and the prune cutoff are IMPORTED from equipar instead of copied:
// they are the same rules, and a fix there must be a fix here. Importing this module opens no
// connection: the models go through `appModel`, which resolves the APP connection on first use only.
import { ProductosVidaItemModel } from "../models/ProductosVidaItem";
import { ProductosVidaListingModel } from "../models/ProductosVidaListing";
import { ProductosVidaMetaModel } from "../models/ProductosVidaMeta";
import { equiparListingPruneCutoff, equiparListingUpsert, type PreviousItem, type StoredHistoryPoint } from "../equipar/store";
import type { EquiparListingRow } from "../equipar/listings";
import type { EquiparItem } from "../equipar/types";
import { PRODUCTOS_VIDA_META_KEY } from "./registry";
import type { ProductosVidaMeta } from "./types";

export { PRODUCTOS_VIDA_META_KEY } from "./registry";
export { withHistory, type StoredHistoryPoint, type PreviousItem } from "../equipar/store";

export type StoredProductosVidaItem = EquiparItem & { firstSeen: string; lastSeen: string; history: StoredHistoryPoint[] };

/** How far back an item with a NEW band still counts as "what we had" for the thin-run guard. */
export const PRODUCTOS_VIDA_RECENT_DAYS = 3;

/** `YYYY-MM-DD` minus `days` calendar days (read at noon UTC, so the day never shifts). */
export function dayMinus(today: string, days: number): string {
  return new Date(Date.parse(`${today}T12:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

export async function loadPreviousItems(): Promise<Map<string, PreviousItem>> {
  const rows = (await ProductosVidaItemModel.find({})
    .select({ key: 1, firstSeen: 1, history: 1 })
    .lean()) as unknown as Array<{ key: string; firstSeen: string; history?: StoredHistoryPoint[] }>;
  return new Map(rows.map((row) => [row.key, { firstSeen: row.firstSeen, history: row.history ?? [] }]));
}

/**
 * Items seen in the last {@link PRODUCTOS_VIDA_RECENT_DAYS} days WITH A NEW BAND: the denominator of
 * the thin-run guard. Only new bands count because v1 publishes only new bands — a run whose new bands
 * collapse while a few used ones survive would otherwise pass and blank the page. And not
 * `countDocuments({})`: items are never deleted, so a total only grows (the celulares lesson in
 * AGENTS.md: count what is stored WITH a publishable band).
 */
export async function countPricedRecentItems(today: string): Promise<number> {
  return ProductosVidaItemModel.countDocuments({
    lastSeen: { $gte: dayMinus(today, PRODUCTOS_VIDA_RECENT_DAYS) },
    newBand: { $ne: null },
  });
}

export async function saveProductosVidaCatalog(
  items: readonly StoredProductosVidaItem[],
  meta: ProductosVidaMeta
): Promise<void> {
  if (items.length) {
    await ProductosVidaItemModel.bulkWrite(
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
  await ProductosVidaMetaModel.updateOne(
    { key: PRODUCTOS_VIDA_META_KEY },
    { $set: { ...meta, key: PRODUCTOS_VIDA_META_KEY } },
    { upsert: true }
  );
}

/** Upserts in batches, like equipar's — one bulkWrite with thousands of ops is a needless risk. */
const LISTING_BATCH = 500;

/** One row per accepted listing (for v2's per-product pages), then the 30-day prune of equipar. */
export async function saveProductosVidaListings(
  rows: readonly EquiparListingRow[],
  today: string
): Promise<{ written: number; pruned: number }> {
  let written = 0;
  for (let at = 0; at < rows.length; at += LISTING_BATCH) {
    const batch = rows.slice(at, at + LISTING_BATCH).map(equiparListingUpsert);
    await ProductosVidaListingModel.bulkWrite(batch as any, { ordered: false });
    written += batch.length;
  }
  const pruned = await ProductosVidaListingModel.deleteMany({ lastSeen: { $lt: equiparListingPruneCutoff(today) } });
  return { written, pruned: pruned.deletedCount ?? 0 };
}
