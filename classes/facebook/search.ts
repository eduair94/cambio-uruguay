// Marketplace text searches read straight from the logged-in profile Chrome (CDP `:9224`): each
// search scrolled to the bottom (or to its cap) and its cards read from Facebook's own GraphQL
// stream. Shared by the rentals directory and the retail directories (chairs, equipar, movilidad).
//
// Why not the :9657 bridge: it scrolls a few screens and then parses the visible grid, but the
// grid is virtualized (the DOM never holds more than ~45 item links), so the cards that scrolled
// past are gone by the time it reads. Measured 2026-10-05 on rentals: 20–26 cards per search
// through the bridge, 288 for the same search scrolled to the end here. The bridge stays as each
// caller's fallback when the browser cannot be reached.
import type { Browser } from "puppeteer-core";
import { FacebookSessionError, connectFacebookBrowser, scrollFacebookList, sleep } from "./browser";
import { marketplaceCardsFromText, type MarketplaceCard } from "./cards";
import { acquireFacebookProfile, type ReleaseFacebookProfile } from "./lock";

export const marketplaceSearchUrl = (location: string, query: string, sort?: "newest"): string =>
  `https://www.facebook.com/marketplace/${encodeURIComponent(location)}/search?query=${encodeURIComponent(query)}`
  + (sort === "newest" ? "&sortBy=creation_time_descend" : "");

export interface MarketplaceSearchRead {
  cards: MarketplaceCard[];
  /** The ids each search delivered, aligned with `searches` (empty for one that was not read). */
  perSearch: string[][];
  /** Cards before de-duplication, summed over every list. */
  reads: number;
  lists: number;
  /** Lists that ran out of listings (as opposed to hitting the scroll cap or the clock). */
  exhausted: number;
  failed: number;
  /** Lists that never loaded past their first page. */
  stalled: number;
  sessionLost: boolean;
  /** The browser could not be reached at all: the caller falls back to the bridge. */
  unreachable: boolean;
  /** Another job held the profile for the whole wait: the caller skips Facebook, no fallback. */
  busy: boolean;
  note: string | null;
}

export const FACEBOOK_BUSY_NOTE = "el navegador de Facebook estaba ocupado por otra lectura";

export async function readMarketplaceSearches(options: {
  /** Who holds the profile lock while this runs (shows in the lock file). */
  owner: string;
  /** Each search is a Marketplace city anchor plus a wording, read in this order. */
  searches: ReadonlyArray<{ location: string; query: string }>;
  /** "newest" reads the most recent adverts first; default is relevance. */
  sort?: "newest";
  maxScrolls: number;
  stagnantRounds: number;
  maxDurationMs: number;
  gapMs?: number;
  /** How long to wait for another job to release the profile. */
  lockWaitMs?: number;
  /**
   * A list counts as stalled (throttled) only if its first page held at least this many cards. A
   * narrow wording with 12 results never loads a second page and that is not a throttle; rentals,
   * whose wordings are all broad, keeps 0.
   */
  stallFloor?: number;
  connect?: () => Promise<Browser>;
  lock?: (owner: string, waitMs: number) => Promise<ReleaseFacebookProfile | null>;
}): Promise<MarketplaceSearchRead> {
  const cards = new Map<string, MarketplaceCard>();
  const result: MarketplaceSearchRead = {
    cards: [], perSearch: options.searches.map(() => []), reads: 0, lists: 0, exhausted: 0, failed: 0, stalled: 0,
    sessionLost: false, unreachable: false, busy: false, note: null,
  };
  const release = await (options.lock ?? acquireFacebookProfile)(options.owner, options.lockWaitMs ?? 10 * 60_000);
  if (!release) {
    result.busy = true;
    result.note = FACEBOOK_BUSY_NOTE;
    return result;
  }
  // The clock starts once the profile is ours: waiting for it is not reading time.
  const deadline = Date.now() + options.maxDurationMs;
  let browser: Browser | null = null;
  let stalledInARow = 0;
  try {
    try {
      browser = await (options.connect ?? connectFacebookBrowser)();
    } catch {
      result.unreachable = true;
      result.note = "navegador del perfil inaccesible";
      return result;
    }
    try {
      for (const [index, { location, query }] of options.searches.entries()) {
        if (Date.now() >= deadline) {
          result.note = "presupuesto de tiempo agotado";
          break;
        }
        if (result.lists) await sleep(options.gapMs ?? 15_000);
        // Stagnation is per list: counting the run's union, a second search that keeps delivering
        // cards an earlier one already had would look exhausted and stop early.
        const seenHere = new Set<string>();
        try {
          const run = await scrollFacebookList(browser, marketplaceSearchUrl(location, query, options.sort), {
            onText: text => {
              for (const card of marketplaceCardsFromText(text)) {
                result.reads++;
                seenHere.add(card.id);
                if (!cards.has(card.id)) cards.set(card.id, card);
              }
            },
            count: () => seenHere.size,
            maxScrolls: options.maxScrolls,
            stagnantRounds: options.stagnantRounds,
            deadline,
          });
          result.lists++;
          result.perSearch[index] = [...seenHere];
          if (run.exhausted) result.exhausted++;
          if (seenHere.size <= run.initial && run.initial >= (options.stallFloor ?? 0)) {
            result.stalled++;
            stalledInARow++;
          } else {
            stalledInARow = 0;
          }
          // Facebook throttles the infinite scroll of a session that has scrolled a lot: measured
          // 2026-10-05, after an hour of probing, the same search that had delivered 864 cards
          // stopped at its first 24, with any script. One short search happens (a narrow
          // wording); two in a row is the throttle, and insisting only spends the account.
          if (stalledInARow >= 2) {
            result.note = "Facebook dejó de cargar más resultados en dos búsquedas seguidas; se corta para no forzar la sesión";
            break;
          }
        } catch (error) {
          if (error instanceof FacebookSessionError) throw error;
          result.failed++;
          // Only the error class: messages can carry URLs.
          result.note = `falla del navegador: ${String((error as Error)?.name || "Error")}`;
        }
      }
    } catch (error) {
      if (!(error instanceof FacebookSessionError)) throw error;
      result.sessionLost = true;
      result.note = error.message;
    } finally {
      browser.disconnect();
    }
  } finally {
    release();
  }
  result.cards = [...cards.values()];
  return result;
}
