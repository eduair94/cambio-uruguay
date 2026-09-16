// Signal for /tiendas-online-uruguay: whether a curated store also shows up in the site's OWN price
// catalogues — household equipment (`classes/equipar/`, APP DB `equiparitems`) and desk chairs
// (`classes/chairs/`, APP DB `chaircatalogproducts`) — with how many live offers and a link into
// that catalogue. Read once a week by the sync job (Task 6).
//
// Unlike Trustpilot/Reddit/Google, this signal never leaves the process: both catalogues already
// live in the APP database the store job also writes to, so there is no network call here, only two
// `.find().select().lean()` reads.
//
// Every offer is resolved through `storeKeyForSeller` (Task 1), the SAME resolver the store page's
// other signals use — so "Mercado Libre" as a literal seller label (the platform's own fulfillment
// label on Full/managed listings, not a real company) never counts here either, for the same reason
// documented in classes/stores/match.ts.
//
// The equipar link is deliberately the SAME url for every category today (`/equipar-casa-uruguay`).
// Task 10 is expected to point it at a per-category page once one exists, so verticals are already
// keyed by `equipar:<category>` — that future split only touches EQUIPAR_CATALOG_URL below, not a
// rewrite of this module.
import { EquiparItemModel } from "../../models/EquiparItem";
import { ChairCatalogProductModel } from "../../models/ChairCatalogProduct";
import { storeKeyForSeller } from "../match";

export interface CatalogSignal {
  offers: number;
  verticals: Array<{ key: string; label: string; url: string; offers: number }>;
  checkedAt: string;
}

/** Only the fields this module reads off an EquiparOffer / ChairOffer (classes/equipar/types.ts,
 * classes/chairs/types.ts) — never the full shape, so a field this doesn't use can change freely. */
interface OfferLike {
  seller: string;
  /** Chair offers carry it (classes/chairs/types.ts `ChairOffer.sellerKey`); equipar offers don't. */
  sellerKey?: string;
  url: string;
}

export interface EquiparLikeProduct {
  offers: OfferLike[];
}

/** Narrowed classes/models/EquiparItem.ts document: category/categoryLabel/offers/products/lastSeen. */
export interface EquiparLikeItem {
  category: string;
  categoryLabel: string;
  offers: OfferLike[];
  /** `modelo`-regime categories only; a `commodity` item has none. */
  products?: EquiparLikeProduct[];
  /** YYYY-MM-DD, as classes/equipar/store.ts writes it. */
  lastSeen: string;
}

/** Narrowed classes/models/ChairCatalogProduct.ts document: offers/lastSeen. */
export interface ChairLikeProduct {
  offers: OfferLike[];
  /** YYYY-MM-DD, as classes/chairs/catalog.ts writes it. */
  lastSeen: string;
}

const EQUIPAR_CATALOG_URL = "/equipar-casa-uruguay";
const CHAIRS_VERTICAL = { key: "sillas", label: "Sillas de escritorio", url: "/sillas-escritorio-uruguay" } as const;

const STALE_AFTER_DAYS = 7;

/** YYYY-MM-DD, `STALE_AFTER_DAYS` before `checkedAt`. Falls back to "now" if `checkedAt` doesn't
 * parse, so a malformed caller input degrades to "today's cutoff" rather than including everything. */
function cutoffDate(checkedAt: string): string {
  const parsed = new Date(checkedAt);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  base.setUTCDate(base.getUTCDate() - STALE_AFTER_DAYS);
  return base.toISOString().slice(0, 10);
}

/** String comparison is safe here: both sides are YYYY-MM-DD, which sorts lexicographically the
 * same as chronologically. */
function isFresh(lastSeen: string, cutoff: string): boolean {
  return typeof lastSeen === "string" && lastSeen.length >= 10 && lastSeen.slice(0, 10) >= cutoff;
}

interface VerticalAccumulator {
  key: string;
  label: string;
  url: string;
  offerUrls: Set<string>;
}

interface StoreAccumulator {
  offerUrls: Set<string>;
  verticals: Map<string, VerticalAccumulator>;
}

function ensureStore(byStore: Map<string, StoreAccumulator>, storeKey: string): StoreAccumulator {
  let entry = byStore.get(storeKey);
  if (!entry) {
    entry = { offerUrls: new Set(), verticals: new Map() };
    byStore.set(storeKey, entry);
  }
  return entry;
}

function ensureVertical(
  store: StoreAccumulator,
  vertical: { key: string; label: string; url: string }
): VerticalAccumulator {
  let entry = store.verticals.get(vertical.key);
  if (!entry) {
    entry = { ...vertical, offerUrls: new Set() };
    store.verticals.set(vertical.key, entry);
  }
  return entry;
}

/** Resolves `offer.seller`/`offer.sellerKey` to a curated store and, when one matches, records the
 * offer's `url` under both the store's overall count and its vertical count. A `url` already seen
 * for that store — whether from `offers[]` or `products[].offers[]` — is a Set member already, so
 * it never inflates the count a second time. */
function record(
  byStore: Map<string, StoreAccumulator>,
  offer: OfferLike,
  vertical: { key: string; label: string; url: string }
): void {
  const storeKey = storeKeyForSeller(offer.seller, offer.sellerKey);
  if (!storeKey || !offer.url) return;
  const store = ensureStore(byStore, storeKey);
  store.offerUrls.add(offer.url);
  ensureVertical(store, vertical).offerUrls.add(offer.url);
}

/**
 * Pure fold over the two catalogues: which curated store keys appear, how many DISTINCT live offer
 * urls each has, and a per-vertical breakdown for the store page. Deterministic and DB-free — see
 * {@link loadCatalogPresence} for the loader that feeds it from Mongo.
 */
export function catalogPresence(
  input: { equipar: EquiparLikeItem[]; chairs: ChairLikeProduct[] },
  checkedAt: string
): Map<string, CatalogSignal> {
  const cutoff = cutoffDate(checkedAt);
  const byStore = new Map<string, StoreAccumulator>();

  for (const item of input.equipar) {
    if (!isFresh(item.lastSeen, cutoff)) continue;
    const vertical = { key: `equipar:${item.category}`, label: item.categoryLabel, url: EQUIPAR_CATALOG_URL };
    for (const offer of item.offers ?? []) record(byStore, offer, vertical);
    for (const product of item.products ?? []) {
      for (const offer of product.offers ?? []) record(byStore, offer, vertical);
    }
  }

  for (const product of input.chairs) {
    if (!isFresh(product.lastSeen, cutoff)) continue;
    for (const offer of product.offers ?? []) record(byStore, offer, CHAIRS_VERTICAL);
  }

  const result = new Map<string, CatalogSignal>();
  for (const [storeKey, store] of byStore) {
    const verticals = [...store.verticals.values()]
      .map((v) => ({ key: v.key, label: v.label, url: v.url, offers: v.offerUrls.size }))
      .sort((a, b) => a.key.localeCompare(b.key));
    result.set(storeKey, { offers: store.offerUrls.size, verticals, checkedAt });
  }
  return result;
}

/**
 * Reads both catalogues from the APP database and folds them with {@link catalogPresence}. Read-only
 * (`.find().select().lean()`), and resolved lazily through the models' own connection proxy
 * (classes/appdb.ts `appModel`) — importing this module never opens a connection or requires
 * `APP_MONGO_URI`; only calling this function does. The `lastSeen` filter is pushed into the Mongo
 * query itself so a catalogue that has accumulated months of stale rows never has to be pulled into
 * memory just to be discarded.
 */
export async function loadCatalogPresence(checkedAt: string): Promise<Map<string, CatalogSignal>> {
  const cutoff = cutoffDate(checkedAt);

  const [equiparRows, chairRows] = await Promise.all([
    EquiparItemModel.find({ lastSeen: { $gte: cutoff } })
      .select({ _id: 0, category: 1, categoryLabel: 1, offers: 1, products: 1, lastSeen: 1 })
      .lean(),
    ChairCatalogProductModel.find({ lastSeen: { $gte: cutoff } })
      .select({ _id: 0, offers: 1, lastSeen: 1 })
      .lean(),
  ]);

  return catalogPresence(
    {
      equipar: equiparRows as unknown as EquiparLikeItem[],
      chairs: chairRows as unknown as ChairLikeProduct[],
    },
    checkedAt
  );
}
