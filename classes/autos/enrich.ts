import { buildTrimIndex, matchTrim, trimLabelFor, type TrimIndex } from "./catalog/trims";
import { engineOf, kmQuality, slugify, titleFlags } from "./normalize";
import { CAR_SOURCES, carKeyFor } from "./sources/registry";
import type { CarPhotoVerdict } from "./llm/vision";
import type { CarDetail, CarListing, CarPricePoint, CarSource, RawCarListing } from "./types";

export interface EnrichContext {
  usdUyu: number;
  trims: readonly string[];
  /** Built once per model by the caller: the alias-aware reader of this model's versions. */
  trimIndex?: TrimIndex;
  firstSeen: string;
  lastSeen: string;
  priceHistory: readonly CarPricePoint[];
  detail: CarDetail | null;
  photoCheck?: CarPhotoVerdict | null;
}

export function carKey(id: string, source: CarSource = "mercadolibre"): string {
  return carKeyFor(source, id);
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
  // Structured sources carry version/engine words outside the title; the same rules read both.
  const identity = `${raw.title} ${raw.specText ?? ""}`.trim();
  const trim = matchTrim(identity, context.trimIndex ?? buildTrimIndex(context.trims));
  const brandSlug = slugify(raw.brand);
  const modelSlug = slugify(raw.model);
  const flags = new Set([...titleFlags(raw.title, raw.price, raw.currency), ...(context.detail?.flags ?? [])]);
  return {
    ...raw,
    key: carKey(raw.id, raw.source),
    sourceName: CAR_SOURCES[raw.source].name,
    brandSlug,
    modelSlug,
    marketSlug: `${brandSlug}-${modelSlug}`,
    engine: raw.fuel === "electrico" ? "EV" : engineOf(identity),
    trim,
    trimLabel: trimLabelFor(trim, context.trims),
    kmQuality: kmQuality(raw.km),
    flags: [...flags].sort(),
    priceUsd: raw.currency === "USD" ? raw.price : Math.round(raw.price / context.usdUyu),
    priceConverted: raw.currency !== "USD",
    firstSeen: context.firstSeen,
    lastSeen: context.lastSeen,
    priceDrop: priceDropOf(raw, context.priceHistory),
    detail: context.detail,
    photoCheck: context.photoCheck ?? null,
    reference: null,
  };
}
