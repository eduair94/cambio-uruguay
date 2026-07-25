import { ChairCatalogMetaModel } from "../models/ChairCatalogMeta";
import { ChairCatalogProductModel } from "../models/ChairCatalogProduct";
import { ChairTierSnapshotModel } from "../models/ChairTierSnapshot";
import type { PreviousProduct } from "./catalog";
import { identifyChair, looksLikeChairAccessory } from "./normalize";
import {
  CHAIR_QUERIES,
  type ChairCatalogMeta,
  type ChairCatalogProduct,
  type ChairReviewPoint,
  type ChairTierSnapshot,
} from "./types";

export async function loadChairTierSnapshot(): Promise<ChairTierSnapshot | null> {
  return ChairTierSnapshotModel.findOne({ key: "charruadevs-desktop-chairs" }).lean();
}

export async function saveChairTierSnapshot(snapshot: ChairTierSnapshot): Promise<void> {
  await ChairTierSnapshotModel.updateOne(
    { key: snapshot.key },
    {
      $set: {
        ...snapshot,
        queries: [...CHAIR_QUERIES],
      },
    },
    { upsert: true }
  );
}

export interface PreviousReview {
  fingerprint: string;
  verdict: string;
  pros: ChairReviewPoint[];
  cons: ChairReviewPoint[];
}

/**
 * What the previous run knew: when each chair was first seen, its price history, and the review we
 * already paid a model to write. Losing this would reset every "en el mercado desde" date and make
 * the job regenerate identical prose every day.
 */
export async function loadPreviousChairCatalog(): Promise<{
  previous: Map<string, PreviousProduct>;
  reviews: Map<string, PreviousReview>;
}> {
  const rows = await ChairCatalogProductModel.find({})
    .select({ slug: 1, firstSeen: 1, history: 1, reviewFingerprint: 1, verdict: 1, pros: 1, cons: 1 })
    .lean();
  const previous = new Map<string, PreviousProduct>();
  const reviews = new Map<string, PreviousReview>();
  for (const row of rows as any[]) {
    previous.set(row.slug, { firstSeen: row.firstSeen, history: row.history ?? [] });
    reviews.set(row.slug, {
      fingerprint: row.reviewFingerprint ?? "",
      verdict: row.verdict ?? "",
      pros: row.pros ?? [],
      cons: row.cons ?? [],
    });
  }
  return { previous, reviews };
}

/**
 * Upserts every product and records the run.
 *
 * Chairs that disappeared from the market are NOT deleted: their price history is the only record
 * of what that model used to cost here. They keep an old `lastSeen`, and the API decides how long a
 * chair stays listed.
 */
export async function saveChairCatalog(
  products: readonly ChairCatalogProduct[],
  meta: ChairCatalogMeta
): Promise<void> {
  if (products.length) {
    await ChairCatalogProductModel.bulkWrite(
      products.map((product) => ({
        updateOne: {
          filter: { slug: product.slug },
          // Cast: mongoose types `$set` as a dotted-path map, which a whole typed document does
          // not structurally satisfy even though replacing every field is exactly the intent.
          update: { $set: product as unknown as Record<string, unknown> },
          upsert: true,
        },
      })) as any,
      { ordered: false }
    );
  }
  await ChairCatalogMetaModel.updateOne({ key: meta.key }, { $set: meta }, { upsert: true });
}

/**
 * Deletes stored chairs that today's rules would never have admitted.
 *
 * Products are normally kept forever (their price history is the point). The exception is a row
 * that only exists because an earlier, looser filter let it in — a set of casters, a stack of
 * auditorium chairs. Those must not sit in the directory for the week it takes `lastSeen` to age
 * out, so any product missing from a healthy run is re-checked against the current rules and
 * dropped if it fails them. A chair that is merely out of stock still passes, and stays.
 */
export async function pruneRejectedChairs(activeSlugs: ReadonlySet<string>): Promise<string[]> {
  const stored = (await ChairCatalogProductModel.find({})
    .select({ slug: 1, name: 1, brand: 1, model: 1 })
    .lean()) as unknown as Array<{ slug: string; name: string; brand: string; model: string }>;

  const rejected = stored
    .filter((row) => !activeSlugs.has(row.slug))
    .filter((row) => {
      // `name` is "Brand Model", not a listing title, so the positive desk-chair test (which needs
      // the word "silla") would reject every healthy chair. Only the two checks that a bare name
      // can actually answer apply here.
      const identity = identifyChair({ title: row.name, brand: row.brand, model: row.model });
      return looksLikeChairAccessory(row.name) || !identity.identified;
    })
    .map((row) => row.slug);

  if (rejected.length) {
    await ChairCatalogProductModel.deleteMany({ slug: { $in: rejected } });
  }
  return rejected;
}

