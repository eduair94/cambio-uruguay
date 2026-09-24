// The social harvesters' memory, one set of collections per network, plus the copy guard's claims.
//
// Private collections in the APP database. Nothing here touches `rentallistings`: the offers
// travel through the ordinary harvest → dedupe → store path like every other portal's. Collection
// names are passed in so TikTok keeps the collections it has written since 2026-09-23.
import { appConnection, appDbConfigured } from "../../../appdb";
import type { RentalTiktokPostDocument } from "../../../models/RentalTiktokPost";
import type { SocialSource } from "./post";

/** What a post said last time: the parse, the geocode, and enough to rebuild the post unread. */
export interface SocialPostRow extends RentalTiktokPostDocument {
  url?: string;
  authorName?: string;
  image?: string | null;
}

export interface SocialPostStore {
  /** Stored posts by post id. */
  loadPosts(ids: readonly string[]): Promise<Map<string, SocialPostRow>>;
  /** Every stored post of these handles, by post id. */
  loadPostsByAuthors(authors: readonly string[]): Promise<Map<string, SocialPostRow>>;
  savePosts(rows: SocialPostRow[]): Promise<void>;
}

export interface SocialAccountStore<T> {
  loadAccounts(): Promise<T[]>;
  saveAccounts(rows: T[]): Promise<void>;
}

/** One key of the copy guard, owned by the listing that published it first. */
export interface SocialClaim {
  key: string;
  listingId: string;
  source: SocialSource;
  firstPublishedAt: string;
  lastSeenAt: string;
}

export interface ClaimStore {
  /** Claims whose owner was seen on or after `since`, by key. */
  loadLiveClaims(since: string): Promise<Map<string, SocialClaim>>;
  saveClaims(rows: SocialClaim[]): Promise<void>;
  /** Forget claims not seen since `before`. */
  pruneClaims(before: string): Promise<void>;
}

export const SOCIAL_CLAIMS_COLLECTION = "rentalsocialclaims";

/**
 * The connection, OPEN. The harvest runs in parallel with the history load in sync_rentals.ts, so
 * nothing guarantees anyone connected before this store is first used — and a raw collection on
 * a connection that is still opening is mongoose's buffering wrapper, whose `find` throws
 * "Collection method find is synchronous" (measured on the VPS, 2026-09-23).
 */
async function collection(name: string) {
  const connection = appConnection();
  await connection.asPromise();
  return connection.collection(name);
}

const byId = (docs: unknown[]): Map<string, SocialPostRow> =>
  new Map(docs.map(doc => [String((doc as SocialPostRow).id), doc as SocialPostRow]));

/** Without `APP_MONGO_URI` it remembers nothing and writes nothing. */
export function mongoPostStore(name: string): SocialPostStore {
  return {
    async loadPosts(ids) {
      if (!appDbConfigured() || !ids.length) return new Map();
      return byId(await (await collection(name)).find({ id: { $in: [...ids] } }, { projection: { _id: 0 } }).toArray());
    },
    async loadPostsByAuthors(authors) {
      if (!appDbConfigured() || !authors.length) return new Map();
      return byId(await (await collection(name)).find({ uniqueId: { $in: [...authors] } }, { projection: { _id: 0 } }).toArray());
    },
    async savePosts(rows) {
      if (!appDbConfigured() || !rows.length) return;
      await (await collection(name)).bulkWrite(rows.map(row => ({
        updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true },
      })), { ordered: false });
    },
  };
}

export function mongoAccountStore<T extends object>(name: string, key: keyof T & string): SocialAccountStore<T> {
  return {
    async loadAccounts() {
      if (!appDbConfigured()) return [];
      return (await (await collection(name)).find({}, { projection: { _id: 0 } }).toArray()) as unknown as T[];
    },
    async saveAccounts(rows) {
      if (!appDbConfigured() || !rows.length) return;
      await (await collection(name)).bulkWrite(rows.map(row => ({
        updateOne: { filter: { [key]: (row as Record<string, unknown>)[key] }, update: { $set: row }, upsert: true },
      })), { ordered: false });
    },
  };
}

export const mongoClaimStore: ClaimStore = {
  async loadLiveClaims(since) {
    if (!appDbConfigured()) return new Map();
    const docs = await (await collection(SOCIAL_CLAIMS_COLLECTION)).find({ lastSeenAt: { $gte: since } }, { projection: { _id: 0 } }).toArray();
    return new Map(docs.map(doc => [String(doc.key), doc as unknown as SocialClaim]));
  },
  async saveClaims(rows) {
    if (!appDbConfigured() || !rows.length) return;
    await (await collection(SOCIAL_CLAIMS_COLLECTION)).bulkWrite(rows.map(row => ({
      updateOne: { filter: { key: row.key }, update: { $set: row }, upsert: true },
    })), { ordered: false });
  },
  async pruneClaims(before) {
    if (!appDbConfigured()) return;
    await (await collection(SOCIAL_CLAIMS_COLLECTION)).deleteMany({ lastSeenAt: { $lt: before } });
  },
};
