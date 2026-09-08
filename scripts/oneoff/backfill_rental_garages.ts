// Explicit, reviewable classification correction. Never renews an observation, changes a URL,
// rewrites an advert, or infers identity between adverts. Run through the companion lock wrapper.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { appConnection } from "../../classes/appdb";
import { RentalListingModel } from "../../classes/models/RentalListing";
import { flatten, inferPropertyType } from "../../classes/rentals/normalize";

const RULE_VERSION = "standalone-garage-v1";
// The installed driver exports BSON at runtime; the older mongoose declaration omits that field.
const EJSON = (mongoose.mongo as typeof mongoose.mongo & { BSON: { EJSON: typeof import("bson").EJSON } }).BSON.EJSON;
type Document = Record<string, any>;
const record = (value: unknown): value is Document => !!value && typeof value === "object" && !Array.isArray(value);
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical)
  : record(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;

export const garageHash = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(canonical(EJSON.serialize(value, { relaxed: false })))).digest("hex");

/** Conservative rejection: housing or office evidence goes to human review, even if title says garage. */
export function garageSkipReason(row: Document): string | null {
  if (row.propertyType !== "otro") return "type_not_other";
  if (!Array.isArray(row.offers) || row.offers.length !== 1 || !record(row.offers[0])) return "not_single_advert";
  const offer = row.offers[0];
  if (!record(offer.identity) || offer.identity.version !== 1 || offer.identity.propertyType !== "otro") return "missing_own_other_identity";
  if (typeof row.title !== "string" || typeof offer.title !== "string"
    || inferPropertyType(row.title) !== "garaje" || inferPropertyType(offer.title) !== "garaje") return "title_not_standalone_garage";
  if (!/^[a-z0-9][a-z0-9-]{1,180}$/.test(row.key || "")
    || typeof offer.source !== "string" || typeof offer.listingId !== "string" || !offer.listingId) return "invalid_advert_identity";
  for (const evidence of [row, offer, offer.identity]) {
    for (const field of ["bedrooms", "bathrooms"]) {
      const value = evidence[field];
      if (value != null && (typeof value !== "number" || !Number.isFinite(value) || value !== 0)) return `conflicting_${field}`;
    }
    if (evidence.furnished === true || evidence.petsAllowed === true) return "conflicting_residential_amenity";
  }
  const text = flatten([row.title, offer.title, offer.identity.description, offer.details?.description].filter(value => typeof value === "string").join("\n"));
  if (/\b(?:dormitorios?|habitaciones?|monoambiente|living|cocina|amueblad[oa]|oficina|consultorio|local comercial|galpon)\b/.test(text)
    || /\bpara\s+(?:vivir|vivienda)\b/.test(text)) return "conflicting_residential_text";
  return null;
}

export function garageAfter(row: Document): Document {
  return { ...row, propertyType: "garaje", offers: [{ ...row.offers[0], identity: { ...row.offers[0].identity, propertyType: "garaje" } }] };
}

export function garageCasFilter(before: Document): Document {
  // Mongo's query optimizer rejects direct $eq on $$ROOT on the deployed server. Compare the
  // complete key/value array instead: added/removed fields, BSON dates and offer contents all count.
  return { _id: before._id, $expr: { $eq: [
    { $objectToArray: "$$ROOT" },
    { $literal: Object.entries(before).map(([k, v]) => ({ k, v })) },
  ] } };
}

export function makeGaragePlan(rows: Document[]) {
  const skipped: Record<string, number> = {};
  const before: Document[] = [];
  for (const row of [...rows].sort((a, b) => String(a.key).localeCompare(String(b.key)))) {
    const reason = garageSkipReason(row);
    if (reason) skipped[reason] = (skipped[reason] || 0) + 1;
    else before.push(row);
  }
  const planHash = garageHash({ version: RULE_VERSION, before, after: before.map(garageAfter) });
  return { version: RULE_VERSION, planHash, before, skipped };
}

function planDirectory(): string {
  const repository = fs.realpathSync(process.cwd());
  const directory = path.join(repository, ".sdd-rental-garages");
  if (fs.existsSync(directory) && (fs.lstatSync(directory).isSymbolicLink() || !fs.statSync(directory).isDirectory())) throw Error("Unsafe plan directory");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!fs.realpathSync(directory).startsWith(repository + path.sep)) throw Error("Plan directory escapes repository");
  return directory;
}

function privateFile(filename: string, value: unknown): void {
  const payload = EJSON.stringify(value, { relaxed: false });
  if (fs.existsSync(filename)) {
    if (garageHash(EJSON.parse(fs.readFileSync(filename, "utf8"))) !== garageHash(value)) throw Error("Existing snapshot differs; refusing overwrite");
    return;
  }
  fs.writeFileSync(filename, payload, { flag: "wx", mode: 0o600 });
}

function validateLock(): void {
  if (process.platform !== "linux" || process.env.RENTAL_GARAGE_LOCKED !== "1"
    || fs.readlinkSync("/proc/self/fd/9") !== (process.env.RENTALS_LOCK_FILE || "/tmp/cambio-uruguay-rentals-sync.lock")) {
    throw Error("Use scripts/oneoff/backfill-rental-garages.sh to hold the rental lock");
  }
}

export async function garageBackfillMain(): Promise<void> {
  validateLock();
  const args = process.argv.slice(2);
  const requested = args.find(value => value.startsWith("--apply="))?.slice(8);
  if (args.some(value => value !== "--dry-run" && !/^--apply=[a-f0-9]{64}$/.test(value))
    || args.length > 1 || (requested && !/^[a-f0-9]{64}$/.test(requested))) throw Error("Use --dry-run or --apply=<reviewed hash>");
  dotenv.config();
  const appEnv = fs.existsSync("app/.env") ? dotenv.parse(fs.readFileSync("app/.env")) : {};
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || appEnv.APP_MONGO_URI || appEnv.MONGO_URI;
  if (!process.env.APP_MONGO_URI) throw Error("App database is not configured");
  const connection = appConnection();
  await connection.asPromise();
  try {
    // The proxy's .collection is only a name stub; use the actual app connection's collection.
    const collection = connection.collection(RentalListingModel.collection.name);
    const directory = planDirectory();
    if (!requested) {
      const cutoff = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
      const rows = await collection.find({ propertyType: "otro", lastSeen: { $gte: cutoff }, "offers.0.lastSeen": { $gte: cutoff } }).limit(2001).toArray();
      if (rows.length > 2000) throw Error("Candidate scan exceeded its reviewed bound");
      const plan = makeGaragePlan(rows);
      const filename = path.join(directory, `plan-${plan.planHash}.json`);
      privateFile(filename, plan);
      // Verify the real Mongo predicate against the persisted EJSON snapshot, without writing.
      const saved: unknown = EJSON.parse(fs.readFileSync(filename, "utf8"));
      if (!record(saved) || !Array.isArray(saved.before)) throw Error("Invalid saved snapshot");
      const casRows = saved.before.length ? await collection.find({ $or: saved.before.map(garageCasFilter) }).project({ _id: 1 }).toArray() : [];
      if (casRows.length !== saved.before.length) throw Error("Read-only compare-and-set verification failed");
      console.log(JSON.stringify({ mode: "dry-run", planHash: plan.planHash, scanned: rows.length, eligible: plan.before.length, casVerified: casRows.length, skipped: plan.skipped,
        changesOnly: ["propertyType", "offers.0.identity.propertyType"], datesChanged: 0,
        candidates: plan.before.map(row => ({ key: row.key, source: row.offers[0].source, listingId: row.offers[0].listingId })) }, null, 2));
      return;
    }
    const plan: unknown = EJSON.parse(fs.readFileSync(path.join(directory, `plan-${requested}.json`), "utf8"));
    if (!record(plan) || plan.version !== RULE_VERSION || !Array.isArray(plan.before) || !plan.before.length
      || plan.before.length > 2000 || garageHash({ version: RULE_VERSION, before: plan.before, after: plan.before.map(garageAfter) }) !== requested
      || plan.before.some((row: Document) => garageSkipReason(row) !== null)) throw Error("Plan no longer passes the reviewed rules");
    const ids = plan.before.map((row: Document) => row._id);
    const current = await collection.find({ _id: { $in: ids } }).toArray();
    const byId = new Map(current.map(row => [String(row._id), row]));
    if (byId.size !== ids.length) throw Error("A planned property disappeared; make a new plan");
    const pending: Document[] = [];
    let alreadyApplied = 0;
    for (const before of plan.before) {
      const actual = byId.get(String(before._id));
      if (garageHash(actual) === garageHash(garageAfter(before))) alreadyApplied++;
      else if (garageHash(actual) === garageHash(before)) pending.push(before);
      else throw Error("A planned property changed; make a new plan before any write");
    }
    privateFile(path.join(directory, `before-${requested}.json`), plan);
    for (const before of pending) {
      const result = await collection.updateOne(garageCasFilter(before),
        { $set: { propertyType: "garaje", "offers.0.identity.propertyType": "garaje" } });
      if (result.matchedCount !== 1 || result.modifiedCount !== 1) throw Error("Concurrent change stopped the repair; retain backup and retry the same plan");
    }
    const final = await collection.find({ _id: { $in: ids } }).toArray();
    const finalById = new Map(final.map(row => [String(row._id), row]));
    if (plan.before.some((before: Document) => garageHash(finalById.get(String(before._id))) !== garageHash(garageAfter(before)))) throw Error("Post-write verification failed; retain backup");
    console.log(JSON.stringify({ mode: "apply", planHash: requested, changed: pending.length, alreadyApplied, verified: final.length, datesChanged: 0,
      changesOnly: ["propertyType", "offers.0.identity.propertyType"] }, null, 2));
  } finally {
    await connection.close();
  }
}

if (require.main === module) garageBackfillMain().catch(() => {
  // Never put full database errors/documents/contact fields into shared terminal logs.
  console.error("[rental-garages] stopped without completing verification; inspect the private plan and current state before retrying");
  process.exitCode = 1;
});
