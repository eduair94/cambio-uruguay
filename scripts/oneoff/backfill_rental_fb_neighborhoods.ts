// One-off: give the stored Facebook Marketplace adverts the barrio their own title names.
//
// The harvester applies `neighborhoodFromText` to every card it reads from now on, but Marketplace
// only re-shows a card when its search happens to return it again: 1.850 of the 3.067 stored
// Marketplace offers (2026-09-22) had not been seen since 2026-09-15, and they stay "sin informar"
// until they are re-read or pruned. This applies the SAME rule to what is already stored, once.
//
// What it changes, and only that: `offers.0.identity.neighborhood` (and `identity.department`
// when it was empty) of a single-advert Marketplace property, and the property's own
// `neighborhood`/`department`, which for a single advert are that advert's. It never renews
// `lastSeen`/`firstSeen`, never touches a URL, a key, a price, a coordinate or another portal's
// advert, and skips any property that holds more than one advert. Every write is a
// compare-and-set on the field still being empty, so a harvest that ran in between wins.
//
// Run through the companion wrapper, which holds the rentals flock:
//   scripts/oneoff/backfill-rental-fb-neighborhoods.sh --dry-run
//   scripts/oneoff/backfill-rental-fb-neighborhoods.sh --apply
import fs from "node:fs";
import dotenv from "dotenv";
import { appConnection } from "../../classes/appdb";
import { RentalListingModel } from "../../classes/models/RentalListing";
import { neighborhoodFromText } from "../../classes/rentals/neighborhoods";

type Document = Record<string, any>;

function validateLock(): void {
  if (process.platform !== "linux" || process.env.RENTAL_FB_BARRIOS_LOCKED !== "1"
    || fs.readlinkSync("/proc/self/fd/9") !== (process.env.RENTALS_LOCK_FILE || "/tmp/cambio-uruguay-rentals-sync.lock")) {
    throw Error("Use scripts/oneoff/backfill-rental-fb-neighborhoods.sh to hold the rental lock");
  }
}

export interface FbNeighborhoodPlanRow {
  _id: unknown;
  key: string;
  listingId: string;
  title: string;
  set: Record<string, string>;
}

/** Pure planning, so the rule can be tested without a database. */
export function planFbNeighborhood(row: Document): { row?: FbNeighborhoodPlanRow; skip?: string } {
  if (!Array.isArray(row.offers) || row.offers.length !== 1) return { skip: "not_single_advert" };
  const offer = row.offers[0];
  if (!offer || offer.source !== "facebook" || typeof offer.listingId !== "string") return { skip: "not_facebook" };
  const identity = offer.identity;
  if (!identity || identity.version !== 1) return { skip: "no_identity" };
  if (typeof identity.neighborhood === "string" && identity.neighborhood.trim()) return { skip: "already_named" };
  const department = typeof identity.department === "string" ? identity.department : "";
  const named = neighborhoodFromText(String(offer.title || ""), department);
  if (!named) return { skip: "title_names_nothing" };
  const set: Record<string, string> = { "offers.0.identity.neighborhood": named.neighborhood, neighborhood: named.neighborhood };
  if (!department) {
    set["offers.0.identity.department"] = named.department;
    set.department = named.department;
  }
  return { row: { _id: row._id, key: String(row.key), listingId: offer.listingId, title: String(offer.title || ""), set } };
}

export async function fbNeighborhoodBackfillMain(): Promise<void> {
  validateLock();
  const args = process.argv.slice(2);
  if (args.length !== 1 || !["--dry-run", "--apply"].includes(args[0]!)) throw Error("Use --dry-run or --apply");
  const apply = args[0] === "--apply";
  dotenv.config();
  const appEnv = fs.existsSync("app/.env") ? dotenv.parse(fs.readFileSync("app/.env")) : {};
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || appEnv.APP_MONGO_URI || appEnv.MONGO_URI;
  if (!process.env.APP_MONGO_URI) throw Error("App database is not configured");
  const connection = appConnection();
  await connection.asPromise();
  try {
    const collection = connection.collection(RentalListingModel.collection.name);
    const cursor = collection.find(
      { "offers.source": "facebook", "offers.identity.version": 1 },
      { projection: { key: 1, offers: 1 }, batchSize: 200 },
    );
    const skipped: Record<string, number> = {};
    const planned: FbNeighborhoodPlanRow[] = [];
    let scanned = 0;
    for await (const row of cursor) {
      scanned++;
      const plan = planFbNeighborhood(row);
      if (plan.skip) skipped[plan.skip] = (skipped[plan.skip] || 0) + 1;
      else if (plan.row) planned.push(plan.row);
    }
    const byName: Record<string, number> = {};
    for (const row of planned) {
      const name = `${row.set.department ? `${row.set.department} (dep. del título)|` : ""}${row.set.neighborhood}`;
      byName[name] = (byName[name] || 0) + 1;
    }
    console.log(JSON.stringify({
      mode: apply ? "apply" : "dry-run", scanned, planned: planned.length, skipped,
      byName: Object.fromEntries(Object.entries(byName).sort((a, b) => b[1] - a[1])),
      sample: planned.slice(0, 25).map((row) => ({ key: row.key, title: row.title.slice(0, 90), set: row.set })),
    }, null, 2));
    if (!apply) return;
    let written = 0;
    let stale = 0;
    for (let index = 0; index < planned.length; index += 400) {
      const batch = planned.slice(index, index + 400);
      const result = await collection.bulkWrite(batch.map((row) => ({
        updateOne: {
          // Compare-and-set: still a single advert, still this advert, still unnamed.
          filter: { _id: row._id, offers: { $size: 1 }, "offers.0.listingId": row.listingId, "offers.0.identity.neighborhood": "" },
          update: { $set: row.set },
        },
      })), { ordered: false });
      written += result.modifiedCount;
      stale += batch.length - result.matchedCount;
    }
    console.log(JSON.stringify({ written, stale }));
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  fbNeighborhoodBackfillMain().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
