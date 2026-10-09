// Facebook Marketplace rentals read straight from the logged-in profile Chrome (CDP `:9224`, the
// same contract as currency-rentals-detail and the autos reader), scrolling every search to the
// bottom and reading the cards from Facebook's own GraphQL stream. The reader itself is shared
// with the retail directories: see classes/facebook/search.ts.
//
// Why not only the :9657 bridge: it scrolls three screens and parses the visible grid, so each
// search returned 20–26 cards. Measured 2026-10-05 on the advert that prompted this ("Alquiler
// Monoambiente Tres Cruces", item 4537809589822735): absent from 2.615 stored Facebook rentals and
// from every bridge search, even "monoambiente tres cruces"; the plain "alquiler" search of
// Montevideo, scrolled to the end, delivered 288 rental cards and it was one of them. The bridge
// stays as the fallback when the browser cannot be reached.
import { marketplaceCardsFromText } from "../../facebook/cards";
import { readMarketplaceSearches, type MarketplaceSearchRead } from "../../facebook/search";

/** Marketplace's "Propiedades en alquiler" category: every card of an "alquiler" search carries it. */
export const FB_RENTALS_CATEGORY = "1468271819871448";

/** The listing cards in one GraphQL body or embedded script, in Facebook's order. */
export const rentalCardsFromText = marketplaceCardsFromText;

export type FacebookRentalRead = MarketplaceSearchRead;

type RentalSearchOptions = Omit<Parameters<typeof readMarketplaceSearches>[0], "owner">;

export const readFacebookRentals = (options: RentalSearchOptions): Promise<FacebookRentalRead> =>
  readMarketplaceSearches({ owner: "alquileres", ...options });
