// Facebook Marketplace rentals read straight from the logged-in profile Chrome (CDP `:9224`, the
// same contract as currency-rentals-detail and the autos reader), scrolling every search to the
// bottom and reading the cards from Facebook's own GraphQL stream.
//
// Why not only the :9657 bridge: it scrolls three screens and parses the visible grid, so each
// search returned 20–26 cards. Measured 2026-10-05 on the advert that prompted this ("Alquiler
// Monoambiente Tres Cruces", item 4537809589822735): absent from 2.615 stored Facebook rentals and
// from every bridge search, even "monoambiente tres cruces"; the plain "alquiler" search of
// Montevideo, scrolled to the end, delivered 288 rental cards and it was one of them. The bridge
// stays as the fallback when the browser cannot be reached.
import type { Browser } from "puppeteer-core";
import { FacebookSessionError, connectFacebookBrowser, scrollFacebookList, sleep } from "../../facebook/browser";
import { fbBlobs, fbId, fbWalk, type FbNode } from "../../facebook/graphql";
import type { FbListing } from "./facebook";

/** Marketplace's "Propiedades en alquiler" category: every card of an "alquiler" search carries it. */
export const FB_RENTALS_CATEGORY = "1468271819871448";

const searchUrl = (location: string, query: string, sort?: "newest"): string =>
  `https://www.facebook.com/marketplace/${encodeURIComponent(location)}/search?query=${encodeURIComponent(query)}`
  + (sort === "newest" ? "&sortBy=creation_time_descend" : "");

/** "UYU20,000" / "USD 650" / "US$650": the card's own currency, UYU when it names none. */
function currencyOf(price: FbNode | undefined): "UYU" | "USD" {
  const text = String(price?.formatted_amount || price?.currency || "");
  // No trailing \b: Facebook glues the amount to the code ("USD650").
  return /\bUSD|US\$|U\$S/i.test(text) ? "USD" : "UYU";
}

/** The listing cards in one GraphQL body or embedded script, in Facebook's order. */
export function rentalCardsFromText(text: string): FbListing[] {
  const nodes: FbNode[] = [];
  for (const blob of fbBlobs(text)) {
    fbWalk(blob, node => !!node.listing_price && !!(node.marketplace_listing_title || node.custom_title) && !!fbId(node.id), nodes);
  }
  const cards = new Map<string, FbListing>();
  for (const node of nodes) {
    const id = fbId(node.id)!;
    if (cards.has(id)) continue;
    // Sold, reserved or withdrawn cards still show up in searches; they are not on offer.
    if (node.is_sold === true || node.is_pending === true || node.is_live === false || node.is_hidden === true) continue;
    const amount = Number(node.listing_price?.amount);
    const picture = node.primary_listing_photo?.image?.uri ?? node.primary_listing_photo?.listing_image?.uri;
    const city = node.location?.reverse_geocode?.city_page?.display_name;
    const seller = node.marketplace_listing_seller?.name;
    cards.set(id, {
      id,
      title: String(node.marketplace_listing_title || node.custom_title || "").replace(/\s+/g, " ").trim().slice(0, 300),
      url: `https://www.facebook.com/marketplace/item/${id}/`,
      price: { amount: Number.isFinite(amount) ? amount : undefined, currency: currencyOf(node.listing_price) },
      image: typeof picture === "string" ? picture : null,
      location: typeof city === "string" ? city : null,
      seller: typeof seller === "string" ? seller : null,
      categoryId: fbId(node.marketplace_listing_category_id),
    });
  }
  return [...cards.values()];
}

export interface FacebookRentalRead {
  cards: FbListing[];
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
  note: string | null;
}

export async function readFacebookRentals(options: {
  /** Each search is a Marketplace city anchor plus a wording, read in this order. */
  searches: ReadonlyArray<{ location: string; query: string }>;
  /** "newest" reads the most recent adverts first (the hourly top-up); default is relevance. */
  sort?: "newest";
  maxScrolls: number;
  stagnantRounds: number;
  maxDurationMs: number;
  gapMs?: number;
  connect?: () => Promise<Browser>;
}): Promise<FacebookRentalRead> {
  const deadline = Date.now() + options.maxDurationMs;
  const cards = new Map<string, FbListing>();
  const result: FacebookRentalRead = { cards: [], reads: 0, lists: 0, exhausted: 0, failed: 0, stalled: 0, sessionLost: false, unreachable: false, note: null };
  let browser: Browser | null = null;
  let stalledInARow = 0;
  try {
    browser = await (options.connect ?? connectFacebookBrowser)();
  } catch {
    result.unreachable = true;
    result.note = "navegador del perfil inaccesible";
    return result;
  }
  try {
    for (const { location, query } of options.searches) {
      if (Date.now() >= deadline) {
        result.note = "presupuesto de tiempo agotado";
        break;
      }
      if (result.lists) await sleep(options.gapMs ?? 15_000);
      // Stagnation is per list: counting the run's union, a second search that keeps delivering
      // cards an earlier one already had would look exhausted and stop early.
      const seenHere = new Set<string>();
      try {
        const run = await scrollFacebookList(browser, searchUrl(location, query, options.sort), {
          onText: text => {
            for (const card of rentalCardsFromText(text)) {
              result.reads++;
              seenHere.add(card.id!);
              if (!cards.has(card.id!)) cards.set(card.id!, card);
            }
          },
          count: () => seenHere.size,
          maxScrolls: options.maxScrolls,
          stagnantRounds: options.stagnantRounds,
          deadline,
        });
        result.lists++;
        if (run.exhausted) result.exhausted++;
        if (seenHere.size <= run.initial) {
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
  result.cards = [...cards.values()];
  return result;
}
