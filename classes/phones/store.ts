// Reading and writing the phone catalogue in the APP database.
//
// Mirrors classes/equipar/store.ts and classes/chairs/store.ts, and the same two properties they
// depend on:
//   * A model that stops selling is NOT deleted. Its price history is the only record of what an
//     iPhone 17 Pro used to cost here, and a model can go quiet for a day because one storefront
//     changed its sitemap or the ML bridge answered 429.
//   * A thin run never overwrites a good one — that refusal itself lives in sync_phones.ts (it needs
//     the pre-catalogue listing count too), this file only ever upserts what it is handed.
import { PhoneModelModel } from "../models/PhoneModel";
import { PhoneMetaModel } from "../models/PhoneMeta";
import { PhoneStoreSnapshotModel } from "../models/PhoneStoreSnapshot";
import type { RetailListing } from "../retail/types";
import { PHONE_STORE_SNAPSHOT_KEY, PHONE_STORE_SNAPSHOT_MAX_BYTES, phoneStoreSnapshotBytes, phoneStoreSnapshotRows } from "./storeSnapshot";
import type { PhoneMeta, PhoneModel } from "./catalog";

export const PHONE_META_KEY = "celulares-uruguay";

/** One day's headline NEW price for a model, plus how many sellers backed it — see {@link withPhoneHistory}. */
export interface StoredPhoneHistoryPoint {
  date: string;
  newMin: number | null;
  newMedian: number | null;
  sellers: number;
}

export interface PreviousPhone {
  firstSeen: string;
  history: StoredPhoneHistoryPoint[];
}

export async function loadPreviousPhones(): Promise<Map<string, PreviousPhone>> {
  const rows = (await PhoneModelModel.find({})
    .select({ key: 1, firstSeen: 1, history: 1 })
    .lean()) as unknown as Array<{ key: string; firstSeen: string; history?: StoredPhoneHistoryPoint[] }>;
  return new Map(rows.map((row) => [row.key, { firstSeen: row.firstSeen, history: row.history ?? [] }]));
}

export async function countStoredPhones(): Promise<number> {
  return PhoneModelModel.countDocuments({});
}

/** Keeps at most a year of daily points — same horizon as classes/equipar/store.ts's own trimHistory. */
const trimHistory = (history: StoredPhoneHistoryPoint[]): StoredPhoneHistoryPoint[] => history.slice(-365);

/**
 * Adds today's point — the NEW-condition band's `min`/`median` (null when this run has no publishable
 * new band for the model, e.g. an ambiguous split or too few offers) plus `newSellers` — replacing any
 * existing point for `today` rather than duplicating it (a resync within the same day is not a second
 * observation), and inherits `firstSeen` from the previous run, or sets it to `today` the first time
 * this key is ever seen. Pure — no I/O — so it is testable without a database, same as
 * classes/equipar/store.ts's `withHistory`.
 */
export function withPhoneHistory(
  models: readonly PhoneModel[],
  previous: ReadonlyMap<string, PreviousPhone>,
  today: string
): Array<PhoneModel & { firstSeen: string; lastSeen: string; history: StoredPhoneHistoryPoint[] }> {
  return models.map((model) => {
    const before = previous.get(model.key);
    const newBand = model.bands.new ?? null;
    const history = trimHistory([
      ...(before?.history ?? []).filter((point) => point.date !== today),
      {
        date: today,
        newMin: newBand ? newBand.min : null,
        newMedian: newBand ? newBand.median : null,
        sellers: model.newSellers,
      },
    ]);
    return { ...model, firstSeen: before?.firstSeen ?? today, lastSeen: today, history };
  });
}

export async function savePhoneCatalog(
  models: ReadonlyArray<PhoneModel & { firstSeen: string; lastSeen: string; history: StoredPhoneHistoryPoint[] }>,
  meta: PhoneMeta
): Promise<void> {
  if (models.length) {
    await PhoneModelModel.bulkWrite(
      models.map((model) => ({
        updateOne: {
          filter: { key: model.key },
          // Cast: mongoose types `$set` as a dotted-path map, which a whole typed document does not
          // structurally satisfy even though replacing every field is exactly the intent.
          update: { $set: model as unknown as Record<string, unknown> },
          upsert: true,
        },
      })) as any,
      { ordered: false }
    );
  }
  await PhoneMetaModel.updateOne({ key: PHONE_META_KEY }, { $set: { ...meta, key: PHONE_META_KEY } }, { upsert: true });
}

/**
 * Writes the daily run's store listings for the hourly run — mirrors classes/equipar/store.ts's
 * `saveStoreSnapshot`. Returns the measured size in bytes, or null-saved when it refused: above
 * {@link PHONE_STORE_SNAPSHOT_MAX_BYTES} the previous snapshot is kept rather than risking a failed
 * 16 MB write.
 */
export async function savePhoneStoreSnapshot(
  listings: readonly RetailListing[],
  generatedAt: string
): Promise<{ bytes: number; saved: boolean }> {
  const rows = phoneStoreSnapshotRows(listings);
  const bytes = phoneStoreSnapshotBytes(rows);
  if (bytes > PHONE_STORE_SNAPSHOT_MAX_BYTES) return { bytes, saved: false };
  await PhoneStoreSnapshotModel.updateOne(
    { key: PHONE_STORE_SNAPSHOT_KEY },
    { $set: { key: PHONE_STORE_SNAPSHOT_KEY, generatedAt, listings: rows } },
    { upsert: true }
  );
  return { bytes, saved: true };
}

/** The daily run's store listings, or null when there is none yet. */
export async function loadPhoneStoreSnapshot(): Promise<{ generatedAt: string; listings: RetailListing[] } | null> {
  const row = (await PhoneStoreSnapshotModel.findOne({ key: PHONE_STORE_SNAPSHOT_KEY })
    .select({ generatedAt: 1, listings: 1 })
    .lean()) as unknown as { generatedAt: string; listings?: RetailListing[] } | null;
  return row ? { generatedAt: row.generatedAt, listings: row.listings ?? [] } : null;
}
