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
import { NOT_A_CAR, type WebCarContext } from "./common";

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

/**
 * A 0 km on Marketplace. "0 km" in a description is mostly history: of the 286 stored item pages that
 * said it (2026-11-25), about two in three were used cars ("ficha oficial desde 0km", "igual a 0km",
 * "cubiertas 0km", "comprada 0 km en febrero") and all of them were left out of the directory. In the
 * description it now counts only for a car of this or last model year whose text states no km.
 */
export function fbIsNew(title: string, description: string, match: { year: number | null; km: number | null }, maxYear: number): boolean {
  if (/\b0 ?km\b/.test(fold(title))) return true;
  return match.km === null && match.year !== null && match.year >= maxYear - 1 && /\b0 ?km\b/.test(fold(description));
}

export function fbCardToCar(card: FbCard, item: FbItem | null, context: FbContext): { listing: RawCarListing; detail: CarDetail | null } | null {
  if (card.isSold || item?.isSold || item?.isLive === false) return null;
  // The title only: descriptions say "acepto moto" or "cambio por camión".
  if (NOT_A_CAR.test(fold(card.title))) return null;
  const text = `${card.title} ${item?.description ?? ""}`;
  const match = matchCar(text, context.dictionary, {}, context.maxYear);
  if (!match || !match.year || fbIsNew(card.title, item?.description ?? "", match, context.maxYear)) return null;
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

/** A card as stored: `itemMissedAt` is the last time its page was opened and did not carry the listing. */
export type FbStoredCard = FbCard & { lastSeen: string; item: FbItem | null; itemMissedAt?: string | null };

/**
 * Which item pages to open this run, in four groups: the candidates the analysis asked for; cards
 * never read whose title lacks the year or the km; the other cards never read; and only then pages
 * read more than 3 days ago, the oldest read first. Inside the two unread groups the newest and the
 * oldest card take turns.
 *
 * Measured 2026-11-25: ~400 pages a day against 150–880 new cars a day. Newest first, with every
 * read page coming back each 3 days, no card older than 10 days had been opened in the last 3 days
 * and 9.980 of 20.614 published Marketplace cars had no description — so no km and no declared
 * crash, like fb-963318253481029 ("16 mil km ... Airbag rotos"), seen daily for 8 weeks. Taking turns
 * keeps the new cars quick and drains the backlog; a page that could not be read waits 3 days like a
 * read one, so a card whose page never parses cannot head the oldest-first turn every hour.
 */
export function fbDetailQueue(
  cards: readonly FbStoredCard[],
  dictionary: CarDictionary,
  options: { now: Date; max: number; wanted: ReadonlySet<string>; maxYear: number },
): string[] {
  const now = options.now.getTime();
  const recent = (at: string | null | undefined): boolean => !!at && Date.parse(at) >= now - 3 * DAY;
  type Entry = { id: string; group: number; created: number; readAt: number };
  const entries: Entry[] = [];
  for (const card of cards) {
    if (!(Date.parse(card.lastSeen) >= now - 4 * DAY) || card.isSold) continue;
    if (recent(card.item?.readAt) || recent(card.itemMissedAt)) continue;
    const match = matchCar(card.title, dictionary, {}, options.maxYear);
    if (!match) continue;
    const group = options.wanted.has(card.id) ? 0 : card.item ? 3 : match.year === null || match.km === null ? 1 : 2;
    const created = Date.parse(card.createdAt ?? "");
    entries.push({ id: card.id, group, created: Number.isFinite(created) ? created : 0, readAt: card.item ? Date.parse(card.item.readAt) || 0 : 0 });
  }
  const byId = (a: Entry, b: Entry): number => a.id.localeCompare(b.id);
  const wanted = entries.filter(entry => entry.group === 0).sort((a, b) => b.created - a.created || byId(a, b));
  const unread = entries.filter(entry => entry.group === 1 || entry.group === 2);
  const newest = [...unread].sort((a, b) => a.group - b.group || b.created - a.created || byId(a, b));
  const oldest = [...unread].sort((a, b) => a.group - b.group || a.created - b.created || byId(a, b));
  const turns: Entry[] = [];
  const taken = new Set<string>();
  const lanes = [{ list: newest, next: 0 }, { list: oldest, next: 0 }];
  for (let turn = 0; turns.length < unread.length; turn++) {
    const lane = lanes[turn % 2]!;
    while (lane.next < lane.list.length && taken.has(lane.list[lane.next]!.id)) lane.next++;
    const entry = lane.list[lane.next];
    if (!entry) continue;
    taken.add(entry.id);
    turns.push(entry);
  }
  const reread = entries.filter(entry => entry.group === 3).sort((a, b) => a.readAt - b.readAt || byId(a, b));
  return [...wanted, ...turns, ...reread].slice(0, Math.max(0, options.max)).map(entry => entry.id);
}
