import { engineOf, kmQuality, slugify, titleFlags, trimLabel, trimOf } from "./normalize";
import type { CarDetail, CarListing, CarPricePoint, RawCarListing } from "./types";

export interface EnrichContext {
  usdUyu: number;
  trims: readonly string[];
  firstSeen: string;
  lastSeen: string;
  priceHistory: readonly CarPricePoint[];
  detail: CarDetail | null;
}

export function carKey(id: string): string {
  return `ml-${id}`;
}

/** A drop we OBSERVED: the previous stored price was higher, in the same currency. */
export function priceDropOf(listing: Pick<RawCarListing, "price" | "currency">, history: readonly CarPricePoint[]): CarListing["priceDrop"] {
  if (history.length < 2) return null;
  const current = history[history.length - 1]!;
  const previous = history[history.length - 2]!;
  if (current.price !== listing.price || current.currency !== listing.currency) return null;
  if (previous.currency !== listing.currency || previous.price <= listing.price) return null;
  return { from: previous.price, currency: listing.currency, since: current.observedAt };
}

export function enrichCarListing(raw: RawCarListing, context: EnrichContext): CarListing {
  const trim = trimOf(raw.title, context.trims);
  const brandSlug = slugify(raw.brand);
  const modelSlug = slugify(raw.model);
  const flags = new Set([...titleFlags(raw.title, raw.price, raw.currency), ...(context.detail?.flags ?? [])]);
  return {
    ...raw,
    key: carKey(raw.id),
    brandSlug,
    modelSlug,
    marketSlug: `${brandSlug}-${modelSlug}`,
    engine: raw.fuel === "electrico" ? "EV" : engineOf(raw.title),
    trim,
    trimLabel: trimLabel(trim, context.trims),
    kmQuality: kmQuality(raw.km),
    flags: [...flags].sort(),
    priceUsd: raw.currency === "USD" ? raw.price : Math.round(raw.price / context.usdUyu),
    priceConverted: raw.currency !== "USD",
    firstSeen: context.firstSeen,
    lastSeen: context.lastSeen,
    priceDrop: priceDropOf(raw, context.priceHistory),
    detail: context.detail,
  };
}
