/** Read-only inventory audit. Never harvests portals or changes an advert's observation date.
 * npx ts-node scripts/oneoff/rentals_coverage_audit.ts [--ids-file=sample.json]
 * The optional JSON is an array of source-prefixed advert IDs observed in a separate source probe.
 * Missing IDs prove a gap only in that sample, never the size of a portal's whole inventory.
 */
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
dotenv.config({ path: "app/.env" });
import { appConnection } from "../../classes/appdb";
import { RentalListingModel } from "../../classes/models/RentalListing";
import { RentalMetaModel } from "../../classes/models/RentalMeta";
import { RENTAL_FULL_META_KEY, RENTAL_META_KEY, RENTAL_SOURCES } from "../../classes/rentals/types";

async function main(): Promise<void> {
  const appEnv = fs.existsSync("app/.env") ? dotenv.parse(fs.readFileSync("app/.env")) : {};
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || appEnv.APP_MONGO_URI || appEnv.MONGO_URI;
  if (!process.env.APP_MONGO_URI) throw new Error("App database is not configured");
  const now = new Date();
  // Mirrors the public directory's observation window, not the 21-day historical pruning rule.
  const cutoff = new Date(now.getTime() - 10 * 86_400_000).toISOString().slice(0, 10);
  const idsPath = process.argv.find(arg => arg.startsWith("--ids-file="))?.slice(11);
  let sample: string[] = [];
  if (idsPath) {
    const input: unknown = JSON.parse(fs.readFileSync(idsPath, "utf8"));
    if (!Array.isArray(input) || input.length > 100_000 || input.some(id =>
      typeof id !== "string" || id.length > 160 || !RENTAL_SOURCES.some(source => id.startsWith(`${source}:`)))) {
      throw new Error("Expected at most 100000 source-prefixed advert IDs");
    }
    sample = [...new Set(input)];
  }
  const currentOffer = {
    $and: [
      { $eq: [{ $type: "$offers.lastSeen" }, "string"] },
      { $gte: ["$offers.lastSeen", cutoff] },
      { $isNumber: "$offers.priceUyu" },
      { $gt: ["$offers.priceUyu", 0] },
    ],
  };
  try {
    const [meta, inventory, sampled] = await Promise.all([
      RentalMetaModel.find({ key: { $in: [RENTAL_META_KEY, RENTAL_FULL_META_KEY] } })
        .select({ _id: 0, __v: 0 }).lean(),
      RentalListingModel.aggregate([
        { $unwind: "$offers" },
        { $set: { currentOffer } },
        { $facet: {
          sources: [
            { $group: { _id: { source: "$offers.source", id: "$offers.listingId" },
              memberships: { $sum: 1 }, current: { $max: { $cond: ["$currentOffer", 1, 0] } },
              lastSeen: { $max: "$offers.lastSeen" } } },
            { $group: { _id: "$_id.source", storedAdverts: { $sum: 1 },
              currentAdverts: { $sum: "$current" },
              duplicateMemberships: { $sum: { $subtract: ["$memberships", 1] } },
              latestObservation: { $max: "$lastSeen" } } },
            { $sort: { _id: 1 } },
          ],
          sourceProperties: [
            { $match: { currentOffer: true, lastSeen: { $gte: cutoff } } },
            { $group: { _id: { source: "$offers.source", key: "$key" } } },
            { $group: { _id: "$_id.source", properties: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          observations: [
            { $group: { _id: { source: "$offers.source", day: "$offers.lastSeen" }, offers: { $sum: 1 } } },
            { $sort: { "_id.source": 1, "_id.day": -1 } },
          ],
        } },
      ]).option({ maxTimeMS: 30_000 }),
      sample.length ? RentalListingModel.aggregate([
        { $match: { "offers.listingId": { $in: sample } } },
        { $unwind: "$offers" },
        { $match: { "offers.listingId": { $in: sample } } },
        { $group: { _id: "$offers.listingId", lastSeen: { $max: "$offers.lastSeen" },
          current: { $max: { $cond: [currentOffer, 1, 0] } } } },
      ]).option({ maxTimeMS: 30_000 }) : Promise.resolve([]),
    ]);
    const found = new Map(sampled.map(row => [String(row._id), row]));
    console.log(JSON.stringify({
      observedAt: now.toISOString(), cutoff, scope: "stored inventory; no claim of exhaustive portal coverage",
      meta, inventory: inventory[0],
      ...(idsPath ? { sample: {
        uniqueIds: sample.length, stored: found.size,
        current: sampled.filter(row => row.current === 1).length,
        missing: sample.filter(id => !found.has(id)),
        outdated: sampled.filter(row => row.current !== 1).map(row => ({ id: row._id, lastSeen: row.lastSeen })),
      } } : {}),
    }, null, 2));
  } finally {
    await appConnection().close();
  }
}
main().catch(error => {
  // Connection errors may contain credentials; expose only a safe error class.
  console.error(`[rentals-coverage] audit failed (${error instanceof Error ? error.name : "unknown"})`);
  process.exitCode = 1;
});
