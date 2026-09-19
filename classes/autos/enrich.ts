import { priceBasisOf } from "./cashPrice";
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
  // The car's price is the cash price the advert states, not the listed number: dealers list the down
  // payment ("US$8990 y cuotas") and write "US$12990 Contado" in the description (./cashPrice.ts).
  const basis = priceBasisOf(raw, context.detail?.description, context.priceHistory);
  // The title is checked against the car's price, so a title that states the cash price is not a
  // second, mismatching price.
  const flags = new Set([...titleFlags(raw.title, basis.price, raw.currency), ...(context.detail?.flags ?? [])]);
  // A stated cash price settles what the car costs; a listed down payment without one leaves it unknown.
  if (basis.cashKnown) flags.delete("financing");
  if (basis.financing) flags.add("financing");
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
    price: basis.price,
    listedPrice: basis.listedPrice,
    priceUsd: raw.currency === "USD" ? basis.price : Math.round(basis.price / context.usdUyu),
    priceConverted: raw.currency !== "USD",
    firstSeen: context.firstSeen,
    lastSeen: context.lastSeen,
    // The history is of LISTED numbers: once the cash price is the price, a drop in the listed number
    // (a smaller down payment) is not a drop in what the car costs.
    priceDrop: basis.listedPrice === null ? priceDropOf(raw, context.priceHistory) : null,
    detail: context.detail,
    photoCheck: context.photoCheck ?? null,
    reference: null,
  };
}
