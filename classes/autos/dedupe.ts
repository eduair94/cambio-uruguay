// Dealers publish the same car on Mercado Libre, on their own website and on Facebook (multiaviso
// does it in one click). Counting it three times would fake a cohort, so a car seen in several
// sources keeps ONE row: the source with the lowest priority number (ML, then websites, then
// Facebook). Same brand, model and year, km within max(500, 1 %) and price within 3 %.
import { EXCLUDING_FLAGS } from "./analyze";
import { referenceFor, type CarGuideEntry } from "./catalog/guide";
import type { PublicCarListing, PublicCarSourceCoverage } from "./publicTypes";
import { CAR_SOURCES, CAR_SOURCE_LIST } from "./sources/registry";
import { quantile } from "./stats";
import type { CarListing, CarSource } from "./types";

const DUPLICATE = { kmAbsolute: 500, kmRatio: 0.01, priceRatio: 0.03 } as const;

/** The same car in two adverts: same brand, model and year, km within max(500, 1 %), price within 3 %. */
export function carTwins(a: CarListing, b: CarListing): boolean {
  return a.brandId === b.brandId && a.modelId === b.modelId && a.year === b.year && a.km !== null && b.km !== null &&
    Math.abs(a.km - b.km) <= Math.max(DUPLICATE.kmAbsolute, a.km * DUPLICATE.kmRatio) &&
    Math.abs(a.priceUsd - b.priceUsd) <= a.priceUsd * DUPLICATE.priceRatio;
}

export function dedupeAcrossSources(listings: readonly CarListing[]): { kept: CarListing[]; duplicates: Partial<Record<CarSource, number>> } {
  const sorted = [...listings].sort((a, b) => CAR_SOURCES[a.source].priority - CAR_SOURCES[b.source].priority || a.key.localeCompare(b.key));
  const keptByCar = new Map<string, CarListing[]>();
  const kept: CarListing[] = [];
  const duplicates: Partial<Record<CarSource, number>> = {};
  for (const listing of sorted) {
    const car = `${listing.brandId}|${listing.modelId}|${listing.year}`;
    const peers = keptByCar.get(car) ?? [];
    const copy = peers.some(peer => peer.source !== listing.source && carTwins(peer, listing));
    if (copy) {
      duplicates[listing.source] = (duplicates[listing.source] ?? 0) + 1;
      continue;
    }
    peers.push(listing);
    keptByCar.set(car, peers);
    kept.push(listing);
  }
  return { kept, duplicates };
}

export function attachReferences(listings: readonly CarListing[], guide: ReadonlyMap<string, CarGuideEntry>): CarListing[] {
  return listings.map(listing => ({ ...listing, reference: referenceFor(listing, guide) }));
}

/** Our own median asking price per brand+model+year (≥3 clean dollar adverts): the first reference for a deduced currency. */
export function referenceMedians(listings: readonly CarListing[]): Map<string, number> {
  const prices = new Map<string, number[]>();
  for (const listing of listings) {
    if (listing.priceConverted || listing.currencyInferred || listing.priceUsd < 1_000 || listing.priceUsd > 500_000) continue;
    if (listing.flags.some(flag => EXCLUDING_FLAGS.has(flag))) continue;
    const key = `${listing.brandId}|${listing.modelId}|${listing.year}`;
    const group = prices.get(key);
    if (group) group.push(listing.priceUsd);
    else prices.set(key, [listing.priceUsd]);
  }
  const medians = new Map<string, number>();
  for (const [key, group] of prices) if (group.length >= 3) medians.set(key, quantile(group, 0.5));
  return medians;
}

export function sourceCoverage(
  rows: readonly Pick<PublicCarListing, "source">[],
  duplicates: Partial<Record<CarSource, number>>,
  metas: ReadonlyMap<CarSource, { lastOkAt: string | null; ok: boolean }>,
): PublicCarSourceCoverage[] {
  return CAR_SOURCE_LIST.map(source => ({
    source,
    name: CAR_SOURCES[source].name,
    listings: rows.filter(row => row.source === source).length,
    duplicates: duplicates[source] ?? 0,
    lastReadAt: metas.get(source)?.lastOkAt ?? null,
    ok: metas.get(source)?.ok ?? false,
  }));
}
