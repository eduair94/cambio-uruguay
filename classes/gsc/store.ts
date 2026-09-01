// Two collections in the APP database (the one the Nuxt frontend reads), following
// classes/site-analytics/store.ts.
//
//   * `searchconsoledays`  — the archive, one document per day, unique on `day`. Upserted, never
//     appended: Search Console keeps revising a day for ~3 days, so a run re-fetches the last week
//     and corrects in place. THIS is the collection that is worth something in a year — Google
//     deletes everything past 16 months and there is no way to ask for it back.
//   * `searchconsolesnapshots` — one living document, the computed dashboard. Fully recomputable
//     from the archive, so it is overwritten without ceremony.
//
// The snapshot write carries the same guard the videos and bankos jobs taught this repo: a run that
// comes back with a fraction of what is stored is an outage upstream, not a site that stopped
// ranking. It refuses rather than overwrite a good snapshot with a thin one.
import { SearchConsoleDayModel } from "../models/SearchConsoleDay";
import { SearchConsoleSnapshotModel } from "../models/SearchConsoleSnapshot";
import type { GscDay, GscSnapshot } from "./types";

export const SNAPSHOT_KEY = "gsc_snapshot";

export async function saveDay(day: GscDay): Promise<void> {
  await SearchConsoleDayModel.updateOne({ day: day.day }, { $set: day }, { upsert: true });
}

export async function saveDays(days: GscDay[]): Promise<number> {
  if (!days.length) return 0;
  const ops = days.map((d) => ({
    updateOne: { filter: { day: d.day }, update: { $set: d }, upsert: true },
  }));
  const res = await (SearchConsoleDayModel as any).bulkWrite(ops, { ordered: false });
  return (res?.upsertedCount || 0) + (res?.modifiedCount || 0);
}

/** Days already archived inside a range — so a backfill run skips what it already has. */
export async function storedDays(startDay: string, endDay: string): Promise<Set<string>> {
  const rows = await SearchConsoleDayModel.find({ day: { $gte: startDay, $lte: endDay } }, { day: 1 })
    .lean<{ day: string }[]>()
    .exec();
  return new Set(rows.map((r) => r.day));
}

export async function countDays(): Promise<number> {
  return SearchConsoleDayModel.countDocuments({});
}

export async function loadDays(startDay: string, endDay: string): Promise<GscDay[]> {
  return SearchConsoleDayModel.find({ day: { $gte: startDay, $lte: endDay } })
    .sort({ day: 1 })
    .lean<GscDay[]>()
    .exec();
}

/** True when the incoming snapshot looks like an upstream failure rather than a real reading. */
export function snapshotIsThin(next: GscSnapshot, previous: GscSnapshot | null): boolean {
  if (!previous) return next.totals.impressions === 0;
  if (next.totals.impressions === 0) return true;
  // Search Console does not lose 70 % of a site's impressions in a day without something breaking
  // on our side of the call (wrong property, partial pagination, a half-answered API).
  return next.totals.impressions < previous.totals.impressions * 0.3;
}

export async function loadSnapshot(): Promise<GscSnapshot | null> {
  return SearchConsoleSnapshotModel.findOne({ key: SNAPSHOT_KEY }).lean<GscSnapshot>().exec();
}

export async function saveSnapshot(snapshot: GscSnapshot): Promise<void> {
  await SearchConsoleSnapshotModel.updateOne(
    { key: SNAPSHOT_KEY },
    { $set: { ...snapshot, key: SNAPSHOT_KEY } },
    { upsert: true }
  );
}
