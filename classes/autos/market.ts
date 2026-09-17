// Descriptive asking-price bands per model — what the model pages publish. Not a valuation: same
// quality gates as the opportunity engine, and a row needs five adverts.
import { quantile } from "./stats";
import { EXCLUDING_FLAGS } from "./analyze";
import { guideYearsFor, type CarGuideEntry } from "./catalog/guide";
import type { PublicCarMarketRow, PublicCarMarketSnapshot } from "./publicTypes";
import type { CarListing } from "./types";

const MIN_ROW = 5;

function row(group: readonly CarListing[], shape: Pick<PublicCarMarketRow, "year" | "trim" | "engine" | "transmission">): PublicCarMarketRow {
  const prices = group.map(listing => listing.priceUsd);
  return {
    ...shape,
    n: group.length,
    sellers: new Set(group.map(listing => listing.sellerId ?? listing.key)).size,
    p25: Math.round(quantile(prices, 0.25)),
    median: Math.round(quantile(prices, 0.5)),
    p75: Math.round(quantile(prices, 0.75)),
    kmMedian: Math.round(quantile(group.map(listing => listing.km!), 0.5)),
  };
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    const group = groups.get(name);
    if (group) group.push(item);
    else groups.set(name, [item]);
  }
  return groups;
}

export function buildMarketSnapshots(
  listings: readonly CarListing[],
  options: { now: Date; generatedAt: string; freshDays: number; guide?: ReadonlyMap<string, CarGuideEntry> },
): PublicCarMarketSnapshot[] {
  const cutoff = options.now.getTime() - options.freshDays * 86_400_000;
  const fresh = listings.filter(listing => Date.parse(listing.lastSeen) >= cutoff);
  const snapshots: PublicCarMarketSnapshot[] = [];
  for (const [slug, group] of groupBy(fresh, listing => listing.marketSlug)) {
    if (group.length < MIN_ROW) continue;
    const clean = group.filter(listing => !listing.priceConverted && !listing.currencyInferred && listing.priceUsd >= 1_000 && listing.priceUsd <= 500_000 &&
      listing.kmQuality === "ok" && !listing.flags.some(flag => EXCLUDING_FLAGS.has(flag)));
    const years = [...groupBy(clean, listing => String(listing.year))]
      .filter(([, items]) => items.length >= MIN_ROW)
      .map(([, items]) => row(items, { year: items[0]!.year, trim: null, engine: null, transmission: null }))
      .sort((a, b) => b.year - a.year);
    const rows = [...groupBy(clean.filter(listing => listing.trim && listing.engine && listing.transmission),
      listing => [listing.year, listing.trim, listing.engine, listing.transmission].join("|"))]
      .filter(([, items]) => items.length >= MIN_ROW)
      .map(([, items]) => row(items, { year: items[0]!.year, trim: items[0]!.trimLabel, engine: items[0]!.engine, transmission: items[0]!.transmission }))
      // Fully disambiguated (trim alone ties when the same trim spans two engines/gearboxes), so the
      // order never depends on Map iteration order, which itself tracks input order.
      .sort((a, b) => b.year - a.year || b.n - a.n ||
        String(a.trim).localeCompare(String(b.trim)) ||
        String(a.engine).localeCompare(String(b.engine)) ||
        String(a.transmission).localeCompare(String(b.transmission)));
    const newest = [...group].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))[0]!;
    snapshots.push({
      version: 1, slug, brand: newest.brand, model: newest.model, brandSlug: newest.brandSlug, modelSlug: newest.modelSlug,
      generatedAt: options.generatedAt, listings: group.length, years, rows,
      ...guideYearsFor(newest.brandSlug, newest.modelSlug, options.guide ?? new Map()),
    });
  }
  return snapshots.sort((a, b) => b.listings - a.listings || a.slug.localeCompare(b.slug));
}
