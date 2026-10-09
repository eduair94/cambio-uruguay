// The listing cards of a Marketplace search, read from Facebook's own GraphQL payloads. Shared by
// the rentals and retail readers (autos keeps its own parser: it also needs creation time and the
// seller's opaque id, see classes/autos/sources/facebook.ts).
//
// A search node carries no condition (nuevo/usado): measured 2026-10-09 on "silla de escritorio",
// 0 of 24 cards had one. It does carry the seller's real name, which this parser returns only for
// the rentals reader's own private use; retail never copies it.
import { fbBlobs, fbId, fbWalk, type FbNode } from "./graphql";

export interface MarketplaceCard {
  id: string;
  title: string;
  url: string;
  price: { amount?: number; currency: "UYU" | "USD" };
  image: string | null;
  location: string | null;
  seller: string | null;
  categoryId: string | null;
}

/** "UYU20,000" / "USD 650" / "US$650": the card's own currency, UYU when it names none. */
function currencyOf(price: FbNode | undefined): "UYU" | "USD" {
  const text = String(price?.formatted_amount || price?.currency || "");
  // No trailing \b: Facebook glues the amount to the code ("USD650").
  return /\bUSD|US\$|U\$S/i.test(text) ? "USD" : "UYU";
}

/** The listing cards in one GraphQL body or embedded script, in Facebook's order. */
export function marketplaceCardsFromText(text: string): MarketplaceCard[] {
  const nodes: FbNode[] = [];
  for (const blob of fbBlobs(text)) {
    fbWalk(blob, node => !!node.listing_price && !!(node.marketplace_listing_title || node.custom_title) && !!fbId(node.id), nodes);
  }
  const cards = new Map<string, MarketplaceCard>();
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
