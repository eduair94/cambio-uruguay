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

const accounts = () => appConnection().collection(RentalTiktokAccountModel.collection.name);
const posts = () => appConnection().collection(RentalTiktokPostModel.collection.name);

/** The real store; without `APP_MONGO_URI` it remembers nothing and writes nothing. */
export const appDbTiktokStore: TiktokStore = {
  async loadAccounts() {
    if (!appDbConfigured()) return [];
    const docs = await accounts().find({}, { projection: { _id: 0 } }).toArray();
    return docs as unknown as TiktokAccountRow[];
  },
  async saveAccounts(rows) {
    if (!appDbConfigured() || !rows.length) return;
    await accounts().bulkWrite(rows.map(row => ({
      updateOne: { filter: { uniqueId: row.uniqueId }, update: { $set: row }, upsert: true },
    })), { ordered: false });
  },
  async loadPosts(ids) {
    if (!appDbConfigured() || !ids.length) return new Map();
    const docs = await posts().find({ id: { $in: [...ids] } }, { projection: { _id: 0 } }).toArray();
    return new Map(docs.map(doc => [String(doc.id), doc as unknown as TiktokPostRow]));
  },
  async savePosts(rows) {
    if (!appDbConfigured() || !rows.length) return;
    await posts().bulkWrite(rows.map(row => ({
      updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true },
    })), { ordered: false });
  },
};
