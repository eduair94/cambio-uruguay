// Inspect a real harvest and selected confirmed conflicts, then apply exactly that reviewed plan.
// Run under scripts/run-rentals.sh's flock. No crawl, expiration, or invented fresh observation.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { gzipSync } from "node:zlib";
import { appConnection } from "../../classes/appdb";
import { RentalListingModel } from "../../classes/models/RentalListing";
import { buildRentalProperties } from "../../classes/rentals/dedupe";
import { detachedRentalKey, propertyFromRentalOffers } from "../../classes/rentals/reconcile";
import { assertRentalConflictSeparation, validateRentalConflictManifest } from "../../classes/rentals/repairAudit";
import {
  dropReassignedOffers, loadRentalMeta, planRentalPropertyUpdates,
  rentalHistoryFromRows, saveRentalMeta, writeRentalPropertyPlan,
} from "../../classes/rentals/store";
import {
  RENTAL_SOURCES, RENTAL_PROPERTY_TYPES, RENTAL_META_KEY,
  type RawRental, type RentalProperty, type RentalSourceRun,
} from "../../classes/rentals/types";

const arg = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
function workspaceFile(name: string): string {
  const path = resolve(name);
  const rel = relative(process.cwd(), path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Files must be inside this worktree");
  return path;
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])
  );
  return value;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(stable(value)) ?? "undefined").digest("hex");

async function main() {
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  const snapshotName = arg("snapshot");
  const manifestName = arg("confirmed");
  const reportName = arg("report");
  if (!snapshotName || !manifestName || !reportName) throw new Error("Required: --snapshot= --confirmed= --report=");
  const snapshot = JSON.parse(readFileSync(workspaceFile(snapshotName), "utf8"));
  const manifest = validateRentalConflictManifest(JSON.parse(readFileSync(workspaceFile(manifestName), "utf8")));
  const capture = Date.parse(snapshot.capturedAt);
  const started = Date.parse(snapshot.startedAt);
  if (snapshot.schemaVersion !== 1 || !Number.isFinite(capture) || capture > Date.now() + 120000
    || !Number.isFinite(started) || started > capture
    || Date.now() - capture > 86400000 || !(snapshot.usdUyu > 20 && snapshot.usdUyu < 100)
    || !Array.isArray(snapshot.listings) || snapshot.listings.length < 200
    || snapshot.listings.length > 100000 || !Array.isArray(snapshot.runs)) throw new Error("Invalid or stale harvest snapshot");
  const listings = snapshot.listings as RawRental[];
  for (const item of listings) {
    if (!RENTAL_SOURCES.includes(item.source) || !RENTAL_PROPERTY_TYPES.includes(item.propertyType)
      || typeof item.listingId !== "string" || !item.listingId.startsWith(`${item.source}:`)
      || !item.title || !/^https?:\/\//.test(item.url) || !(item.price > 0) || !Number.isFinite(item.price)
      || !["UYU", "USD"].includes(item.currency)
      || ![item.department, item.neighborhood, item.address, item.street, item.streetNumber].every(value => typeof value === "string")) {
      throw new Error("Malformed harvested advert; no writes allowed");
    }
  }
  if (snapshot.runs.length !== RENTAL_SOURCES.length || new Set(snapshot.runs.map((run: RentalSourceRun) => run.key)).size !== RENTAL_SOURCES.length
    || snapshot.runs.some((run: RentalSourceRun & { count: number; complete: boolean }) => !RENTAL_SOURCES.includes(run.key)
      || typeof run.ok !== "boolean" || typeof run.complete !== "boolean" || typeof run.note !== "string"
      || !Number.isInteger(run.count) || run.count < 0 || (run.access && run.access !== "external_only"))) {
    throw new Error("Invalid source observation summary");
  }
  const rows = await RentalListingModel.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
    .lean() as unknown as RentalProperty[];
  rows.sort((a, b) => a.key.localeCompare(b.key));
  const previousMeta = await loadRentalMeta();
  const history = rentalHistoryFromRows(rows);
  const today = new Date(capture).toISOString().slice(0, 10);
  if (rows.some(row => row.offers.some(offer => offer.lastSeen > today))) throw new Error("Stored observations are newer than this harvest");
  const incoming = buildRentalProperties(listings, { usdUyu: snapshot.usdUyu, today, ...history });
  const incomingIds = new Set(incoming.flatMap(row => row.offers.map(offer => offer.listingId)));
  const claimed = new Set(incoming.map(row => row.key));
  const selected = new Set<string>(manifest.confirmedKeys);
  let selectedLegacyOffers = 0;
  for (const row of rows.filter(row => selected.has(row.key))) {
    const eligible = row.offers.filter(offer => !incomingIds.has(offer.listingId)
      && history.offerToProperty.get(offer.listingId) === row.key)
      .sort((a, b) => Number(b.title === row.title) - Number(a.title === row.title) || a.listingId.localeCompare(b.listingId));
    for (const offer of eligible) {
      const key = !claimed.has(row.key) && history.propertyCanonicalOffer.get(row.key) === offer.listingId
        ? row.key : detachedRentalKey(offer);
      if (claimed.has(key)) throw new Error("Selected legacy key collision");
      incoming.push(propertyFromRentalOffers(key, [offer], snapshot.usdUyu, row));
      incomingIds.add(offer.listingId);
      claimed.add(key);
      selectedLegacyOffers++;
    }
  }
  const plan = await planRentalPropertyUpdates(incoming, {
    today, usdUyu: snapshot.usdUyu, offerOwners: history.offerToProperty,
    // A captured batch updates positive observations, but never proves a later absence.
    okSources: new Set(), staleOfferDays: 4,
  });
  const plannedIds = new Set(plan.assigned.flatMap(row => row.offers.map(offer => offer.listingId)));
  const owners = [
    ...rows.map(row => ({ ...row, offers: row.offers.filter(offer => !plannedIds.has(offer.listingId)
      && history.offerToProperty.get(offer.listingId) === row.key) })),
    ...plan.assigned,
  ];
  const expectedIds = new Set([...rows.flatMap(row => row.offers.map(offer => offer.listingId)), ...listings.map(row => row.listingId)]);
  const assignedIds = owners.flatMap(row => row.offers.map(offer => offer.listingId));
  if (assignedIds.length !== new Set(assignedIds).size || assignedIds.length !== expectedIds.size
    || assignedIds.some(id => !expectedIds.has(id))) throw new Error("Conservation or single-owner invariant failed");
  const ownership = new Map(owners.flatMap(row => row.offers.map(offer => [offer.listingId, row.key] as const)));
  const verifiedNegativePairs = assertRentalConflictSeparation(manifest, ownership);
  const canonicalContinuity = [...selected].map(key => ({ key, canonicalOffer: history.propertyCanonicalOffer.get(key) ?? null,
    ownerAfter: ownership.get(history.propertyCanonicalOffer.get(key) || "") ?? null }));
  const planHash = hash({ catalog: rows, snapshot, manifest, canonicalContinuity, assigned: plan.assigned });
  const summary = {
    mode: process.argv.includes("--apply") ? "apply" : "dry-run", planHash,
    capturedAt: snapshot.capturedAt, rowsBefore: rows.length,
    offersBefore: rows.reduce((sum, row) => sum + row.offers.length, 0),
    uniqueOffersBefore: new Set(rows.flatMap(row => row.offers.map(offer => offer.listingId))).size,
    harvested: listings.length, plannedProperties: plan.assigned.length,
    separatedGroups: plan.separated, selectedLegacyOffers, conservedDistinctOffers: expectedIds.size,
    verifiedNegativePairs, canonicalContinuity,
    plannedWithOriginalEvidence: plan.assigned.filter(row => row.offers.every(offer => offer.identity?.version === 1)).length,
    plannedWithoutDepartment: plan.assigned.filter(row => !row.department).length,
    selectedKeys: [...selected], sources: snapshot.runs,
  };
  writeFileSync(workspaceFile(reportName), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (!process.argv.includes("--apply")) return;
  if (arg("expect-plan") !== planHash) throw new Error("Plan or catalog changed; rerun dry-run and inspect before applying");
  // A complete pre-write backup permits restoring even a partially applied batch. No deletion
  // occurs before all destination rows are saved, and cleanup only follows explicit ownership.
  const backupName = `${reportName}.before.json.gz`;
  writeFileSync(workspaceFile(backupName), gzipSync(JSON.stringify({ rows, meta: previousMeta, planHash })), { flag: "wx" });
  const written = await writeRentalPropertyPlan(plan);
  const cleanup = await dropReassignedOffers(owners);
  const actual = await RentalListingModel.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
    .lean() as unknown as RentalProperty[];
  const actualIds = actual.flatMap(row => row.offers.map(offer => offer.listingId));
  if (actualIds.length !== expectedIds.size || new Set(actualIds).size !== expectedIds.size
    || actualIds.some(id => !expectedIds.has(id))) throw new Error("Post-write conservation verification failed; backup retained");
  const actualOwners = new Map(actual.flatMap(row => row.offers.map(offer => [offer.listingId, row.key] as const)));
  assertRentalConflictSeparation(manifest, actualOwners);
  const actualRows = new Map(actual.map(row => [row.key, row]));
  for (const expected of plan.assigned) {
    const saved = actualRows.get(expected.key);
    if (!saved || Object.keys(expected).some(key => hash(saved[key as keyof RentalProperty]) !== hash(expected[key as keyof RentalProperty]))) {
      throw new Error("Post-write property verification failed; backup retained");
    }
  }
  const total = actual.length;
  await saveRentalMeta({
    key: RENTAL_META_KEY, generatedAt: snapshot.capturedAt, mode: "full",
    durationMs: capture - started, usdUyu: snapshot.usdUyu,
    properties: total, offers: listings.length,
    merged: plan.assigned.filter(row => row.sources.length > 1).length,
    sources: snapshot.runs.map((run: RentalSourceRun & { count: number }) => ({
      key: run.key, ok: run.ok, listings: run.count, note: run.note,
      ...(run.access ? { access: run.access } : {}),
    })),
  });
  const result = { ...summary, written, cleanup, propertiesAfter: total, verifiedUniqueOffers: actualIds.length, backup: backupName };
  writeFileSync(workspaceFile(reportName), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ result: "applied", written, cleanup, propertiesAfter: total, verifiedUniqueOffers: actualIds.length }));
}

main().then(() => appConnection().close()).catch(error => {
  console.error(error instanceof Error ? error.message : "Rental reconciliation failed");
  process.exit(1);
});
