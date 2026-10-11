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

/** One list to scroll: a text search, or a whole Marketplace category seen from a city anchor. */
export interface MarketplaceSearch {
  location: string;
  /** The words searched. A category list has none; the text only labels it. */
  query: string;
  /**
   * A Marketplace category slug ("propertyrentals"): its own list instead of a text search. A
   * search is Facebook's ranking of what MATCHES the words; the category lists what was filed in
   * it, and shows a different slice (rentals, 2026-10-10: 46 % of the Montevideo category was
   * already stored after every search, 9 % from Maldonado, 4 % from Salto).
   */
  category?: string;
  /**
   * Marketplace's own filters on the list (`minPrice`, `maxPrice`, `minYear`…). A list is a ranking
   * Facebook cuts at a few hundred cards, so splitting it by price lets every band reach as deep as
   * the whole list did: the Montevideo rentals category from $ 15.000 to $ 22.000 alone had 144
   * adverts no search had found (2026-10-11).
   */
  params?: Readonly<Record<string, string | number>>;
  /** This list's own order, over the run's `sort` ("relevance" = Facebook's default ranking). */
  sort?: "newest" | "relevance";
  /** This list's own scroll cap, over the run's `maxScrolls`. */
  maxScrolls?: number;
  /**
   * A list that can honestly end on its first page (a small town's rentals within its radius, the
   * category sorted by newest). It never counts as a stalled list: two of those in a row are not
   * the throttle, and must not end the run as if they were.
   */
  narrow?: boolean;
}

export function marketplaceListUrl(search: MarketplaceSearch, sort?: "newest"): string {
  const params = new URLSearchParams();
  if (!search.category) params.set("query", search.query);
  for (const [name, value] of Object.entries(search.params ?? {})) params.set(name, String(value));
  if ((search.sort ?? sort) === "newest") params.set("sortBy", "creation_time_descend");
  const path = search.category ? encodeURIComponent(search.category) : "search";
  const query = params.toString();
  return `https://www.facebook.com/marketplace/${encodeURIComponent(search.location)}/${path}${query ? `?${query}` : ""}`;
}

export interface MarketplaceSearchRead {
  cards: MarketplaceCard[];
  /** The ids each search delivered, aligned with `searches` (empty for one that was not read). */
  perSearch: string[][];
  /** How many of those no earlier search of the run had delivered, aligned with `searches`. */
  fresh: number[];
  /** Lists stopped because they had stopped adding anything new to the run (`runNovelty`). */
  spent: number;
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
  /** Each search is a Marketplace city anchor plus a wording (or a category), read in this order. */
  searches: ReadonlyArray<MarketplaceSearch>;
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
  /**
   * Whether two stalled lists in a row end the run. Rentals scrolls deep and stops to spare the
   * session. Retail reads a few pages a search and needs every search's first page more than its
   * tail: with 3 rounds a slow search looks stalled, and cutting at the third of thirteen
   * searches left equipar with 105 offers instead of 244 (2026-10-09 03:03).
   */
  stopOnStalls?: boolean;
  /**
   * Stop scrolling a list once its last `rounds` scrolls added fewer than `minNew` cards that the
   * whole run had not seen. Deep lists overlap: scrolled to the end, an "alquiler casa" after
   * "alquiler" and the price bands mostly re-delivers them, while the clock (150 minutes for rentals,
   * which on 2026-10-11 ran out at list 35 of 60) is better spent on the next list.
   */
  runNovelty?: { rounds: number; minNew: number };
  connect?: () => Promise<Browser>;
  /** Attempts to reach the profile browser before falling back (one blip should not cost the run). */
  connectAttempts?: number;
  lock?: (owner: string, waitMs: number) => Promise<ReleaseFacebookProfile | null>;
}): Promise<MarketplaceSearchRead> {
  const cards = new Map<string, MarketplaceCard>();
  const result: MarketplaceSearchRead = {
    cards: [], perSearch: options.searches.map(() => []), fresh: options.searches.map(() => 0), spent: 0,
    reads: 0, lists: 0, exhausted: 0, failed: 0, stalled: 0,
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
    // 2026-10-09 02:47: the first hourly run after the deploy could not connect once while the
    // same Chrome answered the bridge and every check after it. A blip, not an outage.
    const attempts = Math.max(1, options.connectAttempts ?? 3);
    for (let attempt = 1; !browser; attempt++) {
      try {
        browser = await (options.connect ?? connectFacebookBrowser)();
      } catch (error) {
        if (attempt < attempts) {
          await sleep(5_000);
          continue;
        }
        result.unreachable = true;
        // Only the error class: messages can carry URLs.
        result.note = `navegador del perfil inaccesible (${String((error as Error)?.name || "Error")}, ${attempts} intentos)`;
        return result;
      }
    }
    try {
      for (const [index, search] of options.searches.entries()) {
        if (Date.now() >= deadline) {
          result.note = "presupuesto de tiempo agotado";
          break;
        }
        if (result.lists) await sleep(options.gapMs ?? 15_000);
        // Stagnation is per list: counting the run's union, a second search that keeps delivering
        // cards an earlier one already had would look exhausted and stop early.
        const seenHere = new Set<string>();
        const runBefore = cards.size;
        // The run's size after each scroll of this list: whether the list still adds anything new.
        const runSizes: number[] = [];
        const novelty = options.runNovelty;
        try {
          const run = await scrollFacebookList(browser, marketplaceListUrl(search, options.sort), {
            onText: text => {
              for (const card of marketplaceCardsFromText(text)) {
                result.reads++;
                seenHere.add(card.id);
                if (!cards.has(card.id)) cards.set(card.id, card);
              }
            },
            count: () => seenHere.size,
            enough: novelty
              ? () => {
                runSizes.push(cards.size);
                const back = runSizes.length - 1 - novelty.rounds;
                return back >= 0 && cards.size - runSizes[back]! < novelty.minNew;
              }
              : undefined,
            maxScrolls: search.maxScrolls ?? options.maxScrolls,
            stagnantRounds: options.stagnantRounds,
            deadline,
          });
          result.lists++;
          result.perSearch[index] = [...seenHere];
          result.fresh[index] = cards.size - runBefore;
          if (run.satisfied) result.spent++;
          if (run.exhausted) result.exhausted++;
          if (search.narrow) {
            // Ending on its first page is what a narrow list does: it says nothing about the session.
          } else if (seenHere.size <= run.initial && run.initial >= (options.stallFloor ?? 0)) {
            result.stalled++;
            stalledInARow++;
          } else {
            stalledInARow = 0;
          }
          // Facebook throttles the infinite scroll of a session that has scrolled a lot: measured
          // 2026-10-05, after an hour of probing, the same search that had delivered 864 cards
          // stopped at its first 24, with any script. One short search happens (a narrow
          // wording); two in a row is the throttle, and insisting only spends the account.
          if (stalledInARow >= 2 && options.stopOnStalls !== false) {
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
