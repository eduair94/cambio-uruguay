// Facebook Marketplace "Vehículos", parsed from the page's own GraphQL payloads (pure part; the
// browser lives in facebookBrowser.ts). Measured 2026-09-17 in Uruguay: every `vehicle_*` field is
// null, `listing_price.currency` is always "UYU" even for dollar prices ("Chevrolet Aveo 1.6" at
// "UYU4,000"), and only 39 % of titles name a make or model. So the car is identified from the
// text, the currency is read from the text or deduced against the same car's reference, and the
// seller's NAME is never copied anywhere (only its opaque id, for the per-seller cap).
import type { CarDictionary } from "../catalog/dictionary";
import { declaredCurrencyFor, matchCar } from "../catalog/match";
import { CAR_DEPARTMENTS, descriptionFlags, fold } from "../normalize";
import type { CarCurrency, CarDetail, RawCarListing } from "../types";
import type { WebCarContext } from "./common";

export const FB_VEHICLES_CATEGORY = "807311116002614";

export interface FbCard {
  id: string;
  title: string;
  amount: number | null;
  city: string | null;
  createdAt: string | null;
  sellerId: string | null;
  picture: string | null;
  isSold: boolean;
  isPending: boolean;
  isLive: boolean;
  categoryId: string | null;
}

export interface FbItem {
  id: string;
  title: string | null;
  description: string;
  amount: number | null;
  isLive: boolean;
  isSold: boolean;
  readAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>;

/** An embedded `<script type="application/json">` is one document; a GraphQL response is one per line. */
function blobs(text: string): unknown[] {
  const out: unknown[] = [];
  const whole = String(text || "").replace(/^for \(;;\);/, "").trim();
  if (whole.startsWith("{") || whole.startsWith("[")) {
    try {
      return [JSON.parse(whole)];
    } catch {
      // Several documents, one per line: parsed below.
    }
  }
  for (const line of String(text || "").split("\n")) {
    const trimmed = line.replace(/^for \(;;\);/, "").trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // Not every line of a streamed response is JSON.
    }
  }
  return out;
}

function walk(node: unknown, test: (node: Node) => boolean, out: Node[], depth = 0): void {
  if (!node || typeof node !== "object" || depth > 80) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, test, out, depth + 1);
    return;
  }
  if (test(node as Node)) out.push(node as Node);
  for (const value of Object.values(node as Node)) walk(value, test, out, depth + 1);
}

const amountOf = (value: unknown): number | null => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};
const idOf = (value: unknown): string | null => (typeof value === "string" && /^\d{6,20}$/.test(value) ? value : null);

export function fbCardsFromText(text: string): FbCard[] {
  const nodes: Node[] = [];
  for (const blob of blobs(text)) {
    walk(blob, node => !!node.listing_price && !!(node.marketplace_listing_title || node.custom_title) && !!idOf(node.id), nodes);
  }
  const cards = new Map<string, FbCard>();
  for (const node of nodes) {
    const id = idOf(node.id)!;
    if (cards.has(id)) continue;
    const created = Number(node.creation_time);
    const picture = node.primary_listing_photo?.image?.uri;
    cards.set(id, {
      id,
      title: String(node.marketplace_listing_title || node.custom_title || "").replace(/\s+/g, " ").trim().slice(0, 200),
      amount: amountOf(node.listing_price?.amount),
      city: typeof node.location?.reverse_geocode?.city_page?.display_name === "string" ? node.location.reverse_geocode.city_page.display_name : null,
      createdAt: Number.isFinite(created) && created > 0 ? new Date(created * 1000).toISOString() : null,
      sellerId: idOf(node.marketplace_listing_seller?.id),
      picture: typeof picture === "string" ? picture : null,
      isSold: node.is_sold === true,
      isPending: node.is_pending === true,
      isLive: node.is_live !== false,
      categoryId: idOf(node.marketplace_listing_category_id),
    });
  }
  return [...cards.values()];
}

export function fbItemFromTexts(id: string, texts: readonly string[], readAt: string): FbItem | null {
  const nodes: Node[] = [];
  for (const text of texts) {
    for (const blob of blobs(text)) {
      walk(blob, node => node.id === id && !!node.listing_price && typeof node.redacted_description?.text === "string", nodes);
    }
  }
  const node = nodes[0];
  if (!node) return null;
  return {
    id,
    title: typeof node.marketplace_listing_title === "string" ? node.marketplace_listing_title : null,
    description: String(node.redacted_description.text).slice(0, 5_000),
    amount: amountOf(node.listing_price?.amount),
    isLive: node.is_live !== false,
    isSold: node.is_sold === true,
    readAt,
  };
}

const BAND = { low: 0.4, high: 2.5 } as const;

export function resolveFbCurrency(amount: number, declared: CarCurrency | null, referenceUsd: number | null, usdUyu: number): { currency: CarCurrency; inferred: boolean } | null {
  if (declared) return { currency: declared, inferred: false };
  if (!referenceUsd || !(referenceUsd > 0) || !(usdUyu > 0)) return null;
  const fits = (usd: number): boolean => usd / referenceUsd >= BAND.low && usd / referenceUsd <= BAND.high;
  const asUsd = fits(amount);
  const asUyu = fits(amount / usdUyu);
  if (asUsd === asUyu) return null;
  return { currency: asUsd ? "USD" : "UYU", inferred: true };
}

export function fbDepartment(city: string | null): string | null {
  const parts = String(city || "").split(",").map(part => part.trim()).filter(part => part && fold(part) !== "uruguay");
  for (const part of parts.reverse()) {
    const department = CAR_DEPARTMENTS.find(name => fold(name) === fold(part));
    if (department) return department;
  }
  return null;
}

export interface FbContext extends WebCarContext {
  usdUyu: number;
  referenceUsd: (brandId: string, modelId: string, year: number) => number | null;
}

export function fbCardToCar(card: FbCard, item: FbItem | null, context: FbContext): { listing: RawCarListing; detail: CarDetail | null } | null {
  if (card.isSold || item?.isSold || item?.isLive === false) return null;
  const text = `${card.title} ${item?.description ?? ""}`;
  const match = matchCar(text, context.dictionary, {}, context.maxYear);
  if (!match || !match.year || match.isNew) return null;
  const amount = item?.amount ?? card.amount;
  if (!amount) return null;
  const currency = resolveFbCurrency(amount, declaredCurrencyFor(text, amount), context.referenceUsd(match.brandId, match.modelId, match.year), context.usdUyu);
  if (!currency) return null;
  const permalink = `https://www.facebook.com/marketplace/item/${card.id}/`;
  const listing: RawCarListing = {
    id: card.id,
    source: "facebook",
    brandId: match.brandId,
    brand: match.brand,
    modelId: match.modelId,
    model: match.model,
    title: card.title,
    year: match.year,
    km: match.km,
    price: amount,
    currency: currency.currency,
    transmission: match.transmission,
    fuel: match.fuel,
    neighborhood: null,
    department: fbDepartment(card.city),
    // Marketplace does not say who sells; the page never labels these as "dueño" either.
    sellerType: "private",
    sellerId: card.sellerId,
    picture: card.picture,
    pictureCount: card.picture ? 1 : null,
    permalink,
    observedAt: context.observedAt,
    specText: "",
    dealerName: null,
    currencyInferred: currency.inferred,
  };
  const detail: CarDetail | null = item
    ? {
      readAt: item.readAt,
      price: amount,
      currency: currency.currency,
      active: item.isLive && !item.isSold,
      brand: match.brand,
      model: match.model,
      year: match.year,
      km: match.km,
      version: text,
      engineText: null,
      sellerName: null,
      bodyType: null,
      color: null,
      doors: null,
      flags: descriptionFlags(text),
      description: item.description,
    }
    : null;
  return { listing, detail };
}

const DAY = 86_400_000;

/** Which item pages to open this run: wanted candidates, then cards still missing year or km, newest first. */
export function fbDetailQueue(
  cards: readonly (FbCard & { lastSeen: string; item: FbItem | null })[],
  dictionary: CarDictionary,
  options: { now: Date; max: number; wanted: ReadonlySet<string>; maxYear: number },
): string[] {
  const now = options.now.getTime();
  const ranked: Array<{ id: string; rank: number; created: number }> = [];
  for (const card of cards) {
    if (!(Date.parse(card.lastSeen) >= now - 4 * DAY) || card.isSold) continue;
    if (card.item && Date.parse(card.item.readAt) >= now - 3 * DAY) continue;
    const match = matchCar(card.title, dictionary, {}, options.maxYear);
    if (!match) continue;
    const rank = options.wanted.has(card.id) ? 0 : match.year === null || match.km === null ? 1 : 2;
    const created = Date.parse(card.createdAt ?? "");
    ranked.push({ id: card.id, rank, created: Number.isFinite(created) ? created : 0 });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || b.created - a.created || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, options.max))
    .map(item => item.id);
}
