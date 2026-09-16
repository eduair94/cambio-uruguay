// From a pile of listings to the rows the page publishes.
//
// The shape of a row depends on what the category can honestly claim. A fridge title carries a
// brand and a model, so six sellers become one product with six offers. A pot title carries neither
// — "juego de ollas 5 piezas" identifies nothing — so the row is the distribution, not a product.
// Pooling the second kind into a fake product would invent a thing that does not exist.
import { bandOf, MIN_USED_BAND_SAMPLE, savingPct, screen } from "./bands";
import { categoryFor, itemKey, norm, variantFor } from "./classify";
import { EQUIPAR_BY_KEY, EQUIPAR_CATEGORIES, TIER_ORDER } from "./registry";
import type { RetailListing } from "../retail/types";
import type { EquiparCategory, EquiparItem, EquiparOffer, EquiparProduct } from "./types";

/** Words that are never a brand, however confidently a catalogue prints them in that field. */
const NOT_A_BRAND = /^(generico|sin marca|otras marcas|varios|importado|nacional|oferta|n\/a|-)$/;

const toUyu = (price: number, currency: "UYU" | "USD", usdUyu: number): number =>
  currency === "USD" ? Math.round(price * usdUyu) : Math.round(price);

/**
 * Marketplace is used unless the seller says otherwise; a storefront is new unless it says
 * otherwise. Refurbished counts as used: it is priced like the used market, not like retail.
 */
const conditionOf = (listing: RetailListing): "new" | "used" =>
  listing.source === "facebook"
    ? listing.condition === "new"
      ? "new"
      : "used"
    : listing.condition === "used" || listing.condition === "refurbished"
      ? "used"
      : "new";

function toOffer(listing: RetailListing, usdUyu: number): EquiparOffer {
  return {
    seller: listing.sellerName,
    title: listing.title,
    url: listing.url,
    price: listing.price,
    currency: listing.currency,
    priceUyu: toUyu(listing.price, listing.currency, usdUyu),
    condition: conditionOf(listing),
    source: listing.source === "store" ? "store" : listing.source,
    observedAt: listing.observedAt,
  };
}

/**
 * Brand and model out of a listing, for `modelo` categories only.
 *
 * Facebook never gets here — see {@link buildProducts} — because a Marketplace title identifies
 * nothing and merging on it would put two different fridges in one row.
 */
function identify(listing: RetailListing, category: EquiparCategory): { brand: string; model: string } | null {
  const brand = norm(listing.brand);
  if (!brand || NOT_A_BRAND.test(brand)) return null;

  const explicit = norm(listing.model);
  if (explicit && explicit.length >= 2) return { brand, model: explicit };

  // Otherwise take what follows the brand in the title, minus the category words: "Heladera
  // Samsung RT38K5932" -> model "rt38k5932". A title that leaves nothing behind identifies only a
  // category, and a category is not a product.
  const title = norm(listing.title);
  const index = title.indexOf(brand);
  if (index < 0) return null;
  const tail = title
    .slice(index + brand.length)
    .replace(category.include, " ")
    .replace(/\b(nuevo|nueva|oferta|envio gratis|garantia|cuotas|sin interes|pesos|dolares|uyu|usd)\b/g, " ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const model = tail.split(" ").slice(0, 3).join(" ").trim();
  return model.length >= 2 ? { brand, model } : null;
}

const slugify = (value: string): string =>
  norm(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

interface ProductGroup {
  brand: string;
  model: string;
  listings: RetailListing[];
}

/**
 * Groups the new offers of a `modelo` category into products.
 *
 * MercadoLibre stamps every seller's copy of the same catalogue page with the same
 * `catalog_product_id` (`RetailListing.catalogId`) — ground truth this site never used before this
 * function. Measured in production on 2026-09-16: 109 products, zero with two sellers, because
 * `identify()` reading each seller's own title almost never agrees across sellers ("BC-450 338L" vs
 * "Bc450 338 Litros" vs "BC-450 heladera frio seco" are the same product, three different strings).
 * A `catalogId` is trusted first and unconditionally groups its listings. A storefront never has one
 * (it isn't MercadoLibre), so it still has to earn its way in the old way — brand and model matching
 * EXACTLY against the group's identity — which is now checked against catalogue groups too, not only
 * against other catalogId-less listings. Facebook and used listings never take part; see the filter
 * below, unchanged from before this task.
 */
function buildProducts(
  listings: readonly RetailListing[],
  category: EquiparCategory,
  usdUyu: number
): EquiparProduct[] {
  if (category.regime !== "modelo") return [];

  // A Marketplace title cannot identify a product, and a used listing prices a different market —
  // both belong only in the band, never in a product row.
  const eligible = listings.filter(
    (listing) => listing.source !== "facebook" && conditionOf(listing) === "new"
  );

  const catalogGroups = new Map<string, ProductGroup>();
  const withoutCatalog: RetailListing[] = [];

  // Pass 1: every listing that carries a `catalogId` joins the SAME group, whatever its own title
  // says. Two different catalogue ids never merge even when their titles are identical — a seller
  // typo or a genuinely split catalogue entry on MercadoLibre's side is not this code's call to undo.
  for (const listing of eligible) {
    if (!listing.catalogId) {
      withoutCatalog.push(listing);
      continue;
    }
    const key = `cat:${listing.catalogId}`;
    const group = catalogGroups.get(key) ?? { brand: "", model: "", listings: [] };
    group.listings.push(listing);
    catalogGroups.set(key, group);
  }

  // Name each catalogue group off the identity its OWN sellers agree on most — a plurality vote, so
  // one seller's oddly worded title cannot outvote two who agree. `catalogIndex` remembers only the
  // WINNING brand+model, so a storefront can find its way into pass 2 below. A group whose sellers
  // never named a brand at all is still a real product (the catalogue id says so) — it is named off
  // whichever listing happened to arrive first, and simply cannot be joined by brand+model since it
  // never had one to index.
  const catalogIndex = new Map<string, string>();
  for (const [key, group] of catalogGroups) {
    const votes = new Map<string, { brand: string; model: string; count: number }>();
    for (const listing of group.listings) {
      const identity = identify(listing, category);
      if (!identity) continue;
      const voteKey = `${identity.brand}|${identity.model}`;
      const vote = votes.get(voteKey);
      if (vote) vote.count += 1;
      else votes.set(voteKey, { ...identity, count: 1 });
    }
    let winner: { brand: string; model: string } | null = null;
    let winnerVotes = 0;
    for (const vote of votes.values()) {
      if (vote.count > winnerVotes) {
        winner = { brand: vote.brand, model: vote.model };
        winnerVotes = vote.count;
      }
    }
    if (winner) {
      group.brand = winner.brand;
      group.model = winner.model;
      const voteKey = `${winner.brand}|${winner.model}`;
      // First-wins: if a LATER catalogue group happens to vote the same identity (two catalogue ids
      // MercadoLibre split for what is arguably one product), it must not steal a storefront listing
      // away from the group that claimed this identity first.
      if (!catalogIndex.has(voteKey)) catalogIndex.set(voteKey, key);
    } else {
      // No seller in this catalogue group named a recognisable brand at all. `identify()` runs every
      // brand it reads through NOT_A_BRAND before trusting it (a `catalog_product_id` does not turn
      // "Sin marca" into a real brand), so this fallback applies the same filter — otherwise a
      // placeholder leaks straight into the published name and slug.
      const first = group.listings[0]!;
      const fallbackBrand = norm(first.brand);
      group.brand = fallbackBrand && !NOT_A_BRAND.test(fallbackBrand) ? fallbackBrand : "";
      group.model = norm(first.title)
        .replace(category.include, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 4)
        .join(" ");
    }
  }

  // Pass 2: unchanged from before this task, except the index it checks against now also holds
  // catalogue identities. A listing with no `catalogId` (a storefront, or an ML listing the harvester
  // never tagged) only merges when ITS OWN brand+model matches exactly; otherwise it starts its own
  // single-listing group, same as it always has.
  const identityGroups = new Map<string, ProductGroup>();
  for (const listing of withoutCatalog) {
    const identity = identify(listing, category);
    if (!identity) continue;
    const voteKey = `${identity.brand}|${identity.model}`;
    const catalogKey = catalogIndex.get(voteKey);
    if (catalogKey) {
      catalogGroups.get(catalogKey)!.listings.push(listing);
      continue;
    }
    const key = `id:${voteKey}`;
    const group = identityGroups.get(key) ?? { ...identity, listings: [] };
    group.listings.push(listing);
    identityGroups.set(key, group);
  }

  const usedSlugs = new Set<string>();
  const products: EquiparProduct[] = [];

  const publish = (group: ProductGroup, name: string, catalogId?: string): void => {
    // One seller alone does not corroborate a product; it corroborates a listing. It is still
    // published — as it always has been — because dropping it would lose the price, not just the row.
    const offers = group.listings
      .map((listing) => toOffer(listing, usdUyu))
      .sort((a, b) => a.priceUyu - b.priceUyu);
    // Two ML listings from the same seller under one catalogId (rare, but possible) must not count
    // twice, so sellers are counted by normalised name, exactly like the rest of this module.
    const sellers = new Set(offers.map((offer) => norm(offer.seller))).size;

    // Two different catalogue ids can vote the same brand+model on purpose (MercadoLibre split what
    // is arguably one product across two catalogue pages), and they stay separate products —
    // catalogId is authoritative — but a later consumer keys rows and JSON-LD by slug, so a collision
    // here would silently point two different products at one identifier. A short catalogue suffix on
    // the later one is enough to break the tie without renaming the group MercadoLibre named first.
    const base = slugify(`${category.key}-${name}`);
    const slug = usedSlugs.has(base)
      ? `${base}-${(catalogId ?? String(usedSlugs.size)).slice(-6).toLowerCase()}`
      : base;
    usedSlugs.add(slug);

    products.push({
      slug,
      name,
      brand: group.brand,
      model: group.model,
      image: group.listings.find((listing) => listing.image)?.image ?? null,
      offers: offers.slice(0, 6),
      bestPriceUyu: offers[0]!.priceUyu,
      sellers,
    });
  };

  for (const [key, group] of catalogGroups) {
    const name = `${group.brand} ${group.model}`.replace(/\s+/g, " ").trim();
    // A catalogue group whose brand was a placeholder ("sin marca") and whose title left nothing
    // behind after the category word is not a name — it is blank. The catalogId still groups its
    // listings correctly for the price band (see buildEquiparCatalog); publishing an empty-named
    // "product" card would only be worse than not publishing one at all.
    if (name.length < 2) continue;
    publish(group, name, key.slice("cat:".length));
  }
  for (const group of identityGroups.values()) {
    const name = `${group.brand} ${group.model}`.replace(/\s+/g, " ").trim();
    publish(group, name);
  }

  // A product corroborated by more sellers is a stronger claim than a cheaper one from a single
  // seller, so it leads — products the catalogue id pulled together now surface first on purpose.
  return products
    .sort((a, b) => b.sellers - a.sellers || a.bestPriceUyu - b.bestPriceUyu)
    .slice(0, 12);
}

/**
 * A photo to put on the card, so the page can be read by eye instead of parsed.
 *
 * Storefronts and MercadoLibre only. A Marketplace photo is the seller's own — their kitchen, at
 * night, with the fridge half open — and its URL expires, so a card built on one rots into a broken
 * image. The median-priced listing is preferred over the cheapest: the cheapest row in any category
 * is disproportionately the accessory, the miniature or the mis-titled one, and its photo would
 * misrepresent the whole category.
 */
function representativeImage(listings: readonly RetailListing[]): string | null {
  const usable = listings
    .filter((listing) => listing.source !== "facebook" && listing.image && listing.available !== false)
    .sort((a, b) => a.price - b.price);
  if (!usable.length) return null;
  return usable[Math.floor(usable.length / 2)]!.image;
}

export interface BuildCatalogInput {
  listings: readonly RetailListing[];
  usdUyu: number;
}

export function buildEquiparCatalog(input: BuildCatalogInput): EquiparItem[] {
  const { usdUyu } = input;
  const categoryOrder = new Map(EQUIPAR_CATEGORIES.map((category, index) => [category.key, index]));

  // The harvester already tagged each listing with the spec that claimed it; re-deriving the
  // category here would let the two disagree, so the tag is trusted and only the variant is new.
  const byItem = new Map<
    string,
    {
      category: EquiparCategory;
      variant: string;
      variantLabel: string;
      variantRank: number;
      listings: RetailListing[];
    }
  >();

  for (const listing of input.listings) {
    const tagged = listing.attributes?.CATEGORY_SPEC;
    const category = (tagged && EQUIPAR_BY_KEY.get(tagged)) || categoryFor(listing.title);
    if (!category) continue;
    const variant = variantFor(category, listing.title);
    const key = itemKey(category.key, variant.key);
    const bucket = byItem.get(key) ?? {
      category,
      variant: variant.key,
      variantLabel: variant.label,
      variantRank: variant.rank,
      listings: [],
    };
    bucket.listings.push(listing);
    byItem.set(key, bucket);
  }

  const items: EquiparItem[] = [];

  for (const [key, bucket] of byItem) {
    const { category } = bucket;
    const offers = bucket.listings.map((listing) => toOffer(listing, usdUyu));

    // Screening runs per condition: a used market that is a third of retail would otherwise put
    // every Marketplace row under the new band's suspect line and flag a whole honest market.
    const newScreen = screen(offers.filter((offer) => offer.condition === "new"));
    const usedScreen = screen(offers.filter((offer) => offer.condition === "used"));

    const newBand = bandOf(newScreen.kept.map((offer) => offer.priceUyu));
    const usedBand = bandOf(usedScreen.kept.map((offer) => offer.priceUyu), MIN_USED_BAND_SAMPLE);

    const cheapest = [...newScreen.kept, ...usedScreen.kept]
      .sort((a, b) => Number(a.condition === "used") - Number(b.condition === "used") || a.priceUyu - b.priceUyu)
      .slice(0, 8);

    const observedAt = bucket.listings
      .map((listing) => listing.observedAt)
      .sort()
      .pop() ?? null;

    items.push({
      key,
      category: category.key,
      categoryLabel: category.label,
      variant: bucket.variant,
      variantLabel: bucket.variantLabel,
      room: category.room,
      tier: category.tier,
      rank: categoryOrder.get(category.key) ?? 999,
      variantRank: bucket.variantRank,
      image: representativeImage(bucket.listings),
      regime: category.regime,
      reason: category.reason,
      usedOk: category.usedOk,
      usedNote: category.usedNote,
      quantity: category.quantity ?? 1,
      newBand,
      usedBand,
      usedSavingPct: category.usedOk ? savingPct(newBand, usedBand) : null,
      products: buildProducts(bucket.listings, category, usdUyu),
      offers: cheapest,
      suspectDropped: newScreen.suspect.length + usedScreen.suspect.length,
      observedAt,
    });
  }

  // Within a category, a row that can say nothing never leads. Measured on the first production
  // run: sorting variants alphabetically put an empty "Heladera / Frigobar" at the very top of
  // "sin esto la casa no funciona", and listed the calefón as 100 L, 50 L, 80 L. The variant rank
  // is the size order the registry already declares; using it was always the intent.
  const hasPrice = (item: EquiparItem): number => (item.newBand || item.usedBand ? 0 : 1);
  return items.sort(
    (a, b) =>
      TIER_ORDER[a.tier]! - TIER_ORDER[b.tier]! ||
      categoryOrder.get(a.category)! - categoryOrder.get(b.category)! ||
      hasPrice(a) - hasPrice(b) ||
      a.variantRank - b.variantRank ||
      a.variant.localeCompare(b.variant)
  );
}

/** Categories that produced no usable row this run, so the page can say so instead of hiding them. */
export function uncoveredCategories(items: readonly EquiparItem[]): string[] {
  const covered = new Set(items.filter((item) => item.newBand || item.usedBand).map((item) => item.category));
  return EQUIPAR_CATEGORIES.filter((category) => !covered.has(category.key)).map((category) => category.key);
}
