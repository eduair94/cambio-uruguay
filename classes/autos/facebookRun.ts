// One Facebook pass of the used-car job: read cards (and a capped number of item pages), store
// them privately, then turn every card of the last 4 days that names a dated car into a listing.
import type { CarDictionary } from "./catalog/dictionary";
import { fbCardToCar, fbDetailQueue, type FbCard, type FbItem } from "./sources/facebook";
import { facebookSessionOk, readFacebookVehicles } from "./sources/facebookBrowser";
import { loadFbCards, loadFbWanted, saveFbItems, upsertFbCards } from "./store";
import type { CarSourceResult } from "./types";

const DAY = 86_400_000;
// Each scroll brings ~24 cards. The daily run reads the newest-first feed to its end (or 150
// pages) and every brand search to 20 pages; the hourly one reads the feed until it reaches 6 h
// back — measured 2026-10-08, 15 fixed scrolls reached ~1.5 h and missed cars that Facebook
// surfaces late. The lock wait is for another job's Marketplace read (rentals, retail).
export const FB_BUDGET = {
  full: {
    feed: { maxScrolls: 150, stagnantRounds: 8 },
    query: { maxScrolls: 20, stagnantRounds: 5 },
    items: 120, minutes: 45, lockWaitMinutes: 30,
  },
  fast: {
    feed: { maxScrolls: 40, stagnantRounds: 6, reachBackHours: 6 },
    query: { maxScrolls: 0, stagnantRounds: 0 },
    items: 15, minutes: 8, lockWaitMinutes: 10,
  },
  itemGapMs: 6_000,
} as const;

type StoredCard = FbCard & { lastSeen: string; item: FbItem | null };

/** Cards read now, merged over what was stored (dry runs keep everything in memory). */
export function mergeFbCards(stored: readonly StoredCard[], cards: readonly FbCard[], items: readonly FbItem[], observedAt: string): StoredCard[] {
  const merged = new Map<string, StoredCard>(stored.map(card => [card.id, card]));
  for (const card of cards) merged.set(card.id, { ...card, lastSeen: observedAt, item: merged.get(card.id)?.item ?? null });
  for (const item of items) {
    const card = merged.get(item.id);
    if (card) merged.set(item.id, { ...card, item });
  }
  return [...merged.values()];
}

const later = (a: string, b: string | null): string => (b && b > a ? b : a);

export async function runFacebook(options: {
  fast: boolean;
  dryRun: boolean;
  now: Date;
  dictionary: CarDictionary;
  maxYear: number;
  usdUyu: number;
  brandQueries: readonly string[];
  referenceUsd: (brandId: string, modelId: string, year: number) => number | null;
}): Promise<{ result: CarSourceResult; retireKeys: string[]; cardsRead: number; itemsRead: number }> {
  const startedAt = new Date().toISOString();
  const result: CarSourceResult = {
    source: "facebook", ok: true, complete: false, listings: [], details: new Map(), requests: 0, note: null, startedAt, finishedAt: startedAt,
  };
  const retireKeys: string[] = [];
  if (!(await facebookSessionOk())) {
    result.ok = false;
    result.note = "sesión de Facebook no disponible";
    result.finishedAt = new Date().toISOString();
    return { result, retireKeys, cardsRead: 0, itemsRead: 0 };
  }
  const budget = options.fast ? FB_BUDGET.fast : FB_BUDGET.full;
  const since = new Date(options.now.getTime() - 4 * DAY).toISOString();
  const stored = options.dryRun ? [] : await loadFbCards(since);
  const wanted = options.dryRun ? new Set<string>() : await loadFbWanted();
  const read = await readFacebookVehicles({
    feed: budget.feed,
    queries: options.fast ? [] : options.brandQueries,
    query: budget.query,
    itemGapMs: FB_BUDGET.itemGapMs,
    maxDurationMs: budget.minutes * 60_000,
    lockWaitMs: budget.lockWaitMinutes * 60_000,
    itemIds: async cards => fbDetailQueue(mergeFbCards(stored, cards, [], startedAt), options.dictionary, {
      now: options.now, max: budget.items, wanted, maxYear: options.maxYear,
    }),
  });
  result.requests = read.pages;
  result.note = [
    `${read.lists} listas (${read.exhausted} leídas hasta el final, ${read.stalled} frenadas)`,
    read.note,
  ].filter(Boolean).join("; ");
  result.ok = !read.busy && !read.sessionLost && !(read.note ?? "").startsWith("falla");
  if (!options.dryRun) {
    await upsertFbCards(read.cards, startedAt);
    await saveFbItems(read.items);
  }
  const cards = options.dryRun ? mergeFbCards([], read.cards, read.items, startedAt) : await loadFbCards(since);
  for (const card of cards) {
    const live = card.item && card.item.isLive && !card.item.isSold ? card.item.readAt : null;
    const car = fbCardToCar(card, card.item, {
      observedAt: later(card.lastSeen, live), maxYear: options.maxYear, dictionary: options.dictionary,
      usdUyu: options.usdUyu, referenceUsd: options.referenceUsd,
    });
    if (!car) {
      if (card.isSold || (card.item && (!card.item.isLive || card.item.isSold))) retireKeys.push(`fb-${card.id}`);
      continue;
    }
    result.listings.push(car.listing);
    if (car.detail) result.details.set(`fb-${card.id}`, car.detail);
  }
  result.finishedAt = new Date().toISOString();
  return { result, retireKeys, cardsRead: read.cards.length, itemsRead: read.items.length };
}
