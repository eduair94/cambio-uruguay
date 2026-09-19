import { appConnection } from "../../appdb";
import type { WaterNotice } from "./parse";

export const WATER_COLLECTION = "waterinterruptions";

/** One document per OSE notice, keyed by its slug. The barrio is derived at read time from the text. */
export interface WaterNoticeDoc extends WaterNotice {
  firstSeenAt: string;
  lastSeenAt: string;
}
export interface WaterStore {
  upsert(notices: WaterNotice[], seenAt: string): Promise<void>;
}

export function mongoWaterStore(): WaterStore {
  return {
    async upsert(notices, seenAt) {
      if (!notices.length) return;
      await appConnection().collection(WATER_COLLECTION).bulkWrite(notices.map(({ id, ...notice }) => ({
        updateOne: {
          filter: { _id: id as any },
          update: { $set: { id, ...notice, lastSeenAt: seenAt }, $setOnInsert: { firstSeenAt: seenAt } },
          upsert: true,
        },
      })), { ordered: false });
    },
  };
}

/** Notices whose window ends on or after `fromIso`, bounded. */
export async function readWaterNotices(fromIso: string): Promise<WaterNoticeDoc[]> {
  return await appConnection().collection(WATER_COLLECTION)
    .find({ to: { $gte: fromIso } }, { projection: { _id: 0 }, maxTimeMS: 30_000 }).limit(100_000).toArray() as unknown as WaterNoticeDoc[];
}
