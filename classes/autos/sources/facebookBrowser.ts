// The browser half of the Facebook reader. It ATTACHES to the logged-in Chrome that pm2
// `facebook_profile_browser` keeps alive on the 104 box (the same contract as the trustpilot bridge
// on :9657, which only offers text search and drops the GraphQL fields): it opens its own tabs,
// closes them, and disconnects without ever closing the browser. A login or checkpoint page ends
// Facebook for the run — never retried, never "fixed" from here.
//
// Lists are read with the shared scroller (classes/facebook/browser.ts): to the bottom, or to a
// cap, with the cards taken from the GraphQL stream. Until 2026-10-09 this file scrolled a fixed
// number of screens and never knew whether the list had ended; measured on `carfbcards` over the
// previous 72 h, the daily run found 188 cars that no hourly run had seen, and 35 % of new cards
// were first read more than 2 h after they were published.
import type { Browser } from "puppeteer-core";
import { FacebookSessionError, connectFacebookBrowser, readFacebookPageTexts, scrollFacebookList, sleep } from "../../facebook/browser";
import { acquireFacebookProfile, type ReleaseFacebookProfile } from "../../facebook/lock";
import { FACEBOOK_BUSY_NOTE } from "../../facebook/search";
import { FB_VEHICLES_CATEGORY, fbCardsFromText, fbItemFromTexts, type FbCard, type FbItem } from "./facebook";

// One class for every Marketplace reader: the shared scroller throws this one on a login page.
export { FacebookSessionError };
// One gate for every Marketplace reader: see classes/facebook/browser.ts for why `error` passes.
export { facebookSessionOk } from "../../facebook/browser";

const FEED_URL = "https://www.facebook.com/marketplace/montevideo/vehicles?sortBy=creation_time_descend";
const searchUrl = (query: string): string => `https://www.facebook.com/marketplace/montevideo/search?query=${encodeURIComponent(query)}`;
const itemUrl = (id: string): string => `https://www.facebook.com/marketplace/item/${id}/`;

/** A first page this full that never grows is Facebook's throttle, not a short list. */
const STALL_FLOOR = 20;
/**
 * Cards older than the reach-back a newest-first feed must show before it counts as read far
 * enough. More than one: the feed slips a few older "suggested" cards in near the top.
 */
const OLD_CARDS_TO_STOP = 10;

export interface FacebookListBudget {
  maxScrolls: number;
  stagnantRounds: number;
  /** Newest-first lists only: stop once the list reaches this far back. */
  reachBackHours?: number;
}

export interface FacebookRead {
  cards: FbCard[];
  items: FbItem[];
  pages: number;
  lists: number;
  /** Lists that ran out of listings (or reached back far enough). */
  exhausted: number;
  /** Lists whose full first page never grew: the throttle. */
  stalled: number;
  note: string | null;
  sessionLost: boolean;
  busy: boolean;
}

export async function readFacebookVehicles(options: {
  feed: FacebookListBudget;
  queries: readonly string[];
  query: FacebookListBudget;
  /** Given the cards read so far, which item pages to open (see fbDetailQueue). */
  itemIds: (cards: readonly FbCard[]) => Promise<string[]>;
  itemGapMs: number;
  maxDurationMs: number;
  lockWaitMs: number;
  connect?: () => Promise<Browser>;
  lock?: (owner: string, waitMs: number) => Promise<ReleaseFacebookProfile | null>;
}): Promise<FacebookRead> {
  const cards = new Map<string, FbCard>();
  const items: FbItem[] = [];
  const result: FacebookRead = { cards: [], items, pages: 0, lists: 0, exhausted: 0, stalled: 0, note: null, sessionLost: false, busy: false };
  const release = await (options.lock ?? acquireFacebookProfile)("autos", options.lockWaitMs);
  if (!release) {
    result.busy = true;
    result.note = FACEBOOK_BUSY_NOTE;
    return result;
  }
  const deadline = Date.now() + options.maxDurationMs;
  let browser: Browser | null = null;
  let stalledInARow = 0;

  /** Reads one list; false when the throttle says to stop reading lists. */
  const readList = async (url: string, budget: FacebookListBudget): Promise<boolean> => {
    const seenHere = new Set<string>();
    const cutoff = budget.reachBackHours ? Date.now() - budget.reachBackHours * 3_600_000 : null;
    let old = 0;
    const run = await scrollFacebookList(browser!, url, {
      onText: text => {
        for (const card of fbCardsFromText(text)) {
          // Searches mix every category; the vehicles feed may carry "suggested" items too.
          if (card.categoryId && card.categoryId !== FB_VEHICLES_CATEGORY) continue;
          if (seenHere.has(card.id)) continue;
          seenHere.add(card.id);
          if (cutoff !== null && card.createdAt && Date.parse(card.createdAt) < cutoff) old++;
          if (!cards.has(card.id)) cards.set(card.id, card);
        }
      },
      count: () => seenHere.size,
      enough: cutoff === null ? undefined : () => old >= OLD_CARDS_TO_STOP,
      maxScrolls: budget.maxScrolls,
      stagnantRounds: budget.stagnantRounds,
      deadline,
    });
    result.pages++;
    result.lists++;
    if (run.exhausted || run.satisfied) result.exhausted++;
    if (!run.satisfied && run.initial >= STALL_FLOOR && seenHere.size <= run.initial) {
      result.stalled++;
      stalledInARow++;
    } else {
      stalledInARow = 0;
    }
    // Two full first pages in a row that never grew: Facebook throttles a session that scrolled a
    // lot (see classes/facebook/search.ts). Insisting only spends the account.
    return stalledInARow < 2;
  };

  try {
    browser = await (options.connect ?? connectFacebookBrowser)();
    let keepReading = await readList(FEED_URL, options.feed);
    for (const query of options.queries) {
      if (!keepReading) {
        result.note = "Facebook dejó de cargar más resultados en dos listas seguidas; se corta para no forzar la sesión";
        break;
      }
      if (Date.now() >= deadline) {
        result.note = "presupuesto agotado";
        break;
      }
      await sleep(options.itemGapMs);
      keepReading = await readList(searchUrl(query), options.query);
    }
    // Item pages do not scroll: the throttle above does not stop them.
    const ids = await options.itemIds([...cards.values()]);
    for (const id of ids) {
      if (Date.now() >= deadline) {
        result.note = result.note ?? "presupuesto agotado";
        break;
      }
      await sleep(options.itemGapMs);
      const readAt = new Date().toISOString();
      const texts = await readFacebookPageTexts(browser, itemUrl(id));
      result.pages++;
      const item = fbItemFromTexts(id, texts, readAt);
      if (item) items.push(item);
    }
  } catch (error) {
    if (error instanceof FacebookSessionError) {
      result.sessionLost = true;
      result.note = error.message;
    } else {
      // Only the error class and its first words: messages can name URLs.
      result.note = `falla del navegador: ${String((error as Error)?.name || "Error")}`;
    }
  } finally {
    if (browser) browser.disconnect();
    release();
  }
  result.cards = [...cards.values()];
  return result;
}
