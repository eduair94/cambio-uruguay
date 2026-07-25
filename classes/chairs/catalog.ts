// Assembles the directory: many listings from many platforms -> one row per chair.
//
// The whole point of the page is that the SAME chair is comparable across platforms, so the merge
// key never mentions the source. A Herman Miller Aeron listed by Bertoni, by four MercadoLibre
// sellers and by somebody on Marketplace is one product with six offers — not six products.
import { fetchJson } from "./net";
import { groupListings, identityForListing, chairCategory } from "./normalize";
import { combineChairRating, globalSignal, mercadoLibreSignal, redditSignal } from "./ratings";
import type { GlobalChairOpinion } from "./sources/reddit_global";
import type {
  ChairCatalogProduct,
  ChairListing,
  ChairMedia,
  ChairOffer,
  ChairPricePoint,
  ChairPriceStats,
  ChairSpec,
  ChairTierItem,
  ChairTierSnapshot,
} from "./types";

/** Sanity band in UYU. Outside it the "price" is a typo, a deposit or a spare part. */
const MIN_UYU = 900;
const MAX_UYU = 900_000;
const MAX_OFFERS = 14;

const API_BASE = process.env.CHAIR_RATE_API || "https://api.cambio-uruguay.com";

const SPEC_LABELS: Record<string, string> = {
  UPHOLSTERY_MATERIAL: "Tapizado",
  LUMBAR_SUPPORT_TYPE: "Soporte lumbar",
  MAX_WEIGHT_SUPPORTED: "Peso máximo soportado",
  WEIGHT_CAPACITY: "Peso máximo soportado",
  OFFICE_CHAIR_WEIGHT: "Peso de la silla",
  IS_RECLINABLE: "Reclinable",
  WITH_HEADREST: "Apoyacabezas",
  HAS_HEADREST: "Apoyacabezas",
  WITH_ARMS: "Apoyabrazos",
  ARMREST_TYPE: "Tipo de apoyabrazos",
  IS_HEIGHT_ADJUSTABLE: "Altura regulable",
  MAIN_COLOR: "Color",
  STRUCTURE_MATERIAL: "Material de la estructura",
  STRUCTURE_FINISH: "Terminación de la estructura",
  SEAT_MATERIAL: "Material del asiento",
  BACKREST_TYPE: "Tipo de respaldo",
  BACKREST_HEIGHT: "Altura del respaldo",
  SEAT_HEIGHT: "Altura del asiento",
  WARRANTY_TIME: "Garantía",
};

interface RateRow {
  code?: string;
  origin?: string;
  type?: string;
  sell?: number;
}

/**
 * Reference USD rate, used ONLY to compare and sort prices published in different currencies.
 * Every offer keeps the currency it was published in; `priceUyu` is a derived, disclosed figure.
 */
export async function fetchUsdUyuRate(): Promise<number> {
  const configured = Number(process.env.CHAIR_USD_UYU);
  if (Number.isFinite(configured) && configured > 0) return configured;

  const rows = await fetchJson<RateRow[]>(`${API_BASE}/`, { timeoutMs: 25_000, retries: 1, unthrottled: true });
  const sells = (rows || [])
    .filter(
      (row) =>
        row.code === "USD" &&
        row.origin !== "bcu" &&
        !["INTERBANCARIO", "PROMED.FONDO", "CABLE"].includes(row.type || "") &&
        Number(row.sell) > 0
    )
    .map((row) => Number(row.sell))
    .sort((a, b) => a - b);
  if (!sells.length) return 0;
  const middle = Math.floor(sells.length / 2);
  return sells.length % 2 ? sells[middle]! : (sells[middle - 1]! + sells[middle]!) / 2;
}

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
};

const toUyu = (listing: ChairListing, usdUyu: number): number =>
  listing.currency === "USD" ? Math.round(listing.price * usdUyu) : Math.round(listing.price);

function toOffer(listing: ChairListing, usdUyu: number): ChairOffer {
  return {
    id: listing.listingId,
    source: listing.source,
    sellerKey: listing.sellerKey,
    seller: listing.sellerName,
    channel: listing.channel,
    title: listing.title,
    url: listing.url,
    price: listing.price,
    currency: listing.currency,
    priceUyu: toUyu(listing, usdUyu),
    condition: listing.condition,
    available: listing.available,
    freeShipping: listing.freeShipping,
    location: listing.location,
    image: listing.image,
    observedAt: listing.observedAt,
  };
}

/**
 * One row per seller per condition, cheapest first.
 *
 * A seller who lists the same chair four times (different colours, different ad slots) must not
 * fill the comparison table with itself — but a used Marketplace Aeron next to a new retail one is
 * exactly the comparison the page exists to make, so condition is part of the key.
 */
export function dedupeOffers(offers: readonly ChairOffer[]): ChairOffer[] {
  const best = new Map<string, ChairOffer>();
  for (const offer of offers) {
    const key = `${offer.sellerKey}|${offer.condition}`;
    const current = best.get(key);
    if (!current || offer.priceUyu < current.priceUyu) best.set(key, offer);
  }
  return [...best.values()]
    .sort((a, b) => Number(b.available) - Number(a.available) || a.priceUyu - b.priceUyu)
    .slice(0, MAX_OFFERS);
}

function priceStats(offers: readonly ChairOffer[]): ChairPriceStats | null {
  const usable = offers.filter((offer) => offer.available && offer.priceUyu >= MIN_UYU && offer.priceUyu <= MAX_UYU);
  if (!usable.length) return null;
  const values = usable.map((offer) => offer.priceUyu);
  const newOnes = usable.filter((offer) => offer.condition === "new").map((offer) => offer.priceUyu);
  const usedOnes = usable
    .filter((offer) => offer.condition === "used" || offer.condition === "refurbished")
    .map((offer) => offer.priceUyu);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    median: median(values),
    currency: "UYU",
    samples: usable.length,
    bestNew: newOnes.length ? Math.min(...newOnes) : null,
    bestUsed: usedOnes.length ? Math.min(...usedOnes) : null,
  };
}

function specsFor(listings: readonly ChairListing[]): ChairSpec[] {
  const votes = new Map<string, Map<string, number>>();
  for (const listing of listings) {
    for (const [id, value] of Object.entries(listing.attributes)) {
      if (!SPEC_LABELS[id]) continue;
      const bucket = votes.get(id) ?? new Map<string, number>();
      bucket.set(value, (bucket.get(value) ?? 0) + 1);
      votes.set(id, bucket);
    }
  }
  const specs: ChairSpec[] = [];
  for (const [id, bucket] of votes) {
    const [value] = [...bucket.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
    specs.push({ id, label: SPEC_LABELS[id]!, value: value.slice(0, 80) });
  }
  return specs.sort((a, b) => a.label.localeCompare(b.label)).slice(0, 12);
}

function imagesFor(listings: readonly ChairListing[], name: string): ChairMedia[] {
  const seen = new Set<string>();
  const media: ChairMedia[] = [];
  // A retailer's own photo beats a marketplace thumbnail, which beats a Marketplace snapshot.
  const ranked = [...listings].sort(
    (a, b) => sourceRank(a.source) - sourceRank(b.source) || a.title.localeCompare(b.title)
  );
  for (const listing of ranked) {
    if (!listing.image || seen.has(listing.image)) continue;
    seen.add(listing.image);
    media.push({
      url: listing.image,
      alt: `${name} — foto publicada por ${listing.sellerName}`,
      sourceName: listing.sellerName,
      sourceUrl: listing.url,
    });
    if (media.length >= 6) break;
  }
  return media;
}

const sourceRank = (source: ChairListing["source"]): number =>
  source === "store" ? 0 : source === "mercadolibre" ? 1 : 2;

/** Matches a catalogue chair to its r/CharruaDevs tier entry. */
export function matchTierItem(
  name: string,
  brand: string,
  model: string,
  tiers: readonly ChairTierItem[]
): ChairTierItem | null {
  const normalize = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const wanted = normalize(`${brand} ${model}`);
  const modelKey = normalize(model);
  if (!modelKey) return null;

  for (const item of tiers) {
    const candidate = normalize(`${item.brand} ${item.model} ${item.name}`);
    if (candidate.includes(wanted) || wanted.includes(normalize(item.name))) return item;
    // Model alone is enough only when it is distinctive (Aeron, Embody, Mirra).
    if (modelKey.length >= 5 && candidate.includes(modelKey)) return item;
  }
  return null;
}

export interface PreviousProduct {
  firstSeen: string;
  history: ChairPricePoint[];
}

export interface BuildCatalogInput {
  listings: readonly ChairListing[];
  snapshot: ChairTierSnapshot | null;
  global: Map<string, GlobalChairOpinion>;
  usdUyu: number;
  previous: Map<string, PreviousProduct>;
  now?: Date;
}

export function buildChairCatalog(input: BuildCatalogInput): ChairCatalogProduct[] {
  const now = input.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  const tiers = [...(input.snapshot?.tiers ?? []), ...(input.snapshot?.watchlist ?? [])];
  const groups = groupListings(input.listings);
  const products: ChairCatalogProduct[] = [];
  const usedSlugs = new Set<string>();

  for (const [key, rows] of groups) {
    // Name the chair from the listing that identified it most confidently: a real brand beats a
    // store standing in for one, and a longer model beats a truncated one.
    const identities = rows.map((row) => ({ row, identity: identityForListing(row) }));
    const named = identities
      .filter((entry) => entry.identity.identified)
      .sort(
        (a, b) =>
          Number(b.row.source === "mercadolibre") - Number(a.row.source === "mercadolibre") ||
          b.identity.model.length - a.identity.model.length
      )[0];
    if (!named) continue;

    const { brand, model, name } = named.identity;
    let slug = named.identity.slug;
    if (!slug) continue;
    if (usedSlugs.has(slug)) slug = `${slug}-${key.split("|")[1]?.replace(/\s+/g, "-") || products.length}`;
    usedSlugs.add(slug);

    const offers = dedupeOffers(rows.map((row) => toOffer(row, input.usdUyu)));
    const price = priceStats(offers);
    const tierItem = matchTierItem(name, brand, model, tiers);
    const opinion = input.global.get(slug) ?? null;

    const rating = combineChairRating([
      mercadoLibreSignal(rows),
      redditSignal(tierItem),
      globalSignal(opinion),
    ]);

    const previous = input.previous.get(slug);
    const history = [...(previous?.history ?? [])].filter((point) => point.date !== today);
    if (price) {
      history.push({ date: today, median: price.median, min: price.min, offers: price.samples });
    }

    products.push({
      slug,
      key,
      name,
      brand,
      model,
      category: chairCategory(
        rows.map((row) => row.title).join(" "),
        Object.assign({}, ...rows.map((row) => row.attributes))
      ),
      stars: rating.stars,
      ratingCount: rating.ratingCount,
      ratingSignals: rating.signals,
      confidence: rating.confidence,
      redditSlug: tierItem?.slug ?? null,
      tier: tierItem?.tier ?? null,
      price,
      offers,
      sellers: new Set(offers.map((offer) => offer.sellerKey)).size,
      specs: specsFor(rows),
      verdict: "",
      pros: [],
      cons: [],
      evidence: tierItem?.evidence ?? [],
      reviews: opinion?.quotes ?? [],
      images: imagesFor(rows, name),
      history: history.slice(-180),
      // Filled by synthesizeChairReviews once the verdict for this evidence set is known.
      reviewFingerprint: "",
      firstSeen: previous?.firstSeen ?? today,
      lastSeen: today,
    });
  }

  return products.sort(
    (a, b) =>
      b.sellers - a.sellers ||
      (b.stars ?? 0) - (a.stars ?? 0) ||
      b.ratingCount - a.ratingCount ||
      a.name.localeCompare(b.name)
  );
}
