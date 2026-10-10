import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  stored: null as Record<string, unknown> | null,
  updates: [] as Array<{ filter: unknown; update: Record<string, Record<string, unknown>>; options: { arrayFilters: Array<Record<string, unknown>> } }>,
}));

vi.mock("../../classes/appdb", () => ({
  appConnection: () => ({
    collection: () => ({
      findOne: async () => db.stored,
      updateOne: async (filter: unknown, update: Record<string, Record<string, unknown>>, options: { arrayFilters: Array<Record<string, unknown>> }) => {
        db.updates.push({ filter, update, options });
        return { modifiedCount: 1 };
      },
    }),
  }),
}));

import { writeOfferGallery } from "../../classes/rentals/detailImages";
import { mlPhotoKey } from "../../classes/rentals/mlDetail";

const full = (n: number) => `https://http2.mlstatic.com/D_NQ_NP_${n}00000-MLU11904990366${n}_102026-F.webp`;
const COVER = "https://http2.mlstatic.com/D_NQ_NP_2X_100000-MLU119049903661_102026-C.webp";
const PAGE = [1, 2, 3, 4, 5].map(full);
const target = { key: "propiedad", listingId: "mercadolibre:MLU702098507" };
const stored = (offer: Record<string, unknown>) => ({ offers: [{ listingId: "mercadolibre:MLU1" }, { listingId: target.listingId, image: COVER, ...offer }] });

describe("writing a page's gallery on the stored advert", () => {
  beforeEach(() => {
    db.stored = null;
    db.updates = [];
  });

  it("gives an advert without details a whole explicit set, without its cover", async () => {
    db.stored = stored({});
    expect(await writeOfferGallery(target, PAGE, mlPhotoKey)).toBe(true);
    const [write] = db.updates;
    expect(write!.update.$set!["offers.$[o].details"]).toEqual({
      description: "", images: PAGE.slice(1), builtArea: null, totalArea: null, landArea: null,
      terraceArea: null, amenities: [], guaranteeText: "",
    });
    // Only while the advert still has no details: a harvest in between is not overwritten.
    expect(write!.options.arrayFilters).toEqual([{ "o.listingId": target.listingId, "o.details": { $exists: false } }]);
  });

  it("only lengthens a gallery, and only if it is still shorter when written", async () => {
    db.stored = stored({ details: { images: PAGE.slice(1, 3) } });
    expect(await writeOfferGallery(target, PAGE, mlPhotoKey)).toBe(true);
    const [write] = db.updates;
    expect(write!.update.$set).toEqual({ "offers.$[o].details.images": PAGE.slice(1) });
    expect(write!.options.arrayFilters).toEqual([
      { "o.listingId": target.listingId, "o.details": { $type: "object" }, "o.details.images.3": { $exists: false } },
    ]);
  });

  it("writes nothing when the advert already shows as many photos, or is not there", async () => {
    db.stored = stored({ details: { images: PAGE.slice(1) } });
    expect(await writeOfferGallery(target, PAGE, mlPhotoKey)).toBe(false);
    db.stored = stored({});
    expect(await writeOfferGallery(target, [PAGE[0]!], mlPhotoKey)).toBe(false); // only the cover
    db.stored = { offers: [{ listingId: "mercadolibre:MLU1" }] };
    expect(await writeOfferGallery(target, PAGE, mlPhotoKey)).toBe(false);
    expect(db.updates).toEqual([]);
  });
});
