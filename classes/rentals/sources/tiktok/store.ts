// The harvester's memory: which accounts to read, and what every video said last time.
//
// Two private collections in the APP database. Nothing here touches `rentallistings`: the offers
// travel through the ordinary harvest → dedupe → store path like every other portal's.
import { appConnection, appDbConfigured } from "../../../appdb";
import { RentalTiktokAccountModel, type RentalTiktokAccountDocument } from "../../../models/RentalTiktokAccount";
import { RentalTiktokPostModel, type RentalTiktokPostDocument } from "../../../models/RentalTiktokPost";

export type TiktokAccountRow = RentalTiktokAccountDocument;
export type TiktokPostRow = RentalTiktokPostDocument;

export interface TiktokStore {
  loadAccounts(): Promise<TiktokAccountRow[]>;
  saveAccounts(rows: TiktokAccountRow[]): Promise<void>;
  /** Stored posts by video id. */
  loadPosts(ids: readonly string[]): Promise<Map<string, TiktokPostRow>>;
  savePosts(rows: TiktokPostRow[]): Promise<void>;
}

/**
 * The connection, OPEN. The harvest runs in parallel with the history load in sync_rentals.ts, so
 * nothing guarantees anyone connected before this store is first used — and a raw collection on
 * a connection that is still opening is mongoose's buffering wrapper, whose `find` throws
 * "Collection method find is synchronous" (measured on the VPS, 2026-09-23).
 */
const connected = async () => {
  const connection = appConnection();
  await connection.asPromise();
  return connection;
};
const accounts = async () => (await connected()).collection(RentalTiktokAccountModel.collection.name);
const posts = async () => (await connected()).collection(RentalTiktokPostModel.collection.name);

/** The real store; without `APP_MONGO_URI` it remembers nothing and writes nothing. */
export const appDbTiktokStore: TiktokStore = {
  async loadAccounts() {
    if (!appDbConfigured()) return [];
    const docs = await (await accounts()).find({}, { projection: { _id: 0 } }).toArray();
    return docs as unknown as TiktokAccountRow[];
  },
  async saveAccounts(rows) {
    if (!appDbConfigured() || !rows.length) return;
    await (await accounts()).bulkWrite(rows.map(row => ({
      updateOne: { filter: { uniqueId: row.uniqueId }, update: { $set: row }, upsert: true },
    })), { ordered: false });
  },
  async loadPosts(ids) {
    if (!appDbConfigured() || !ids.length) return new Map();
    const docs = await (await posts()).find({ id: { $in: [...ids] } }, { projection: { _id: 0 } }).toArray();
    return new Map(docs.map(doc => [String(doc.id), doc as unknown as TiktokPostRow]));
  },
  async savePosts(rows) {
    if (!appDbConfigured() || !rows.length) return;
    await (await posts()).bulkWrite(rows.map(row => ({
      updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true },
    })), { ordered: false });
  },
};
