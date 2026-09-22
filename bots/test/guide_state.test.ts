// The daily guide has its own rotation ledger. The whole point of the file is
// that it is NOT the X promoter's ledger: if both jobs wrote to one collection,
// each would push the other's freshest page to the back of its queue.
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { DAILY_GUIDES } from "../src/format/guides.js";
import { CONTENT_PROMOS } from "../src/format/promos.js";
import { GUIDE_POSTS_COLLECTION, GuidePostModel, markGuidePosted, pickNextGuide } from "../src/store/guide_state.js";
import { dayIndex, pickNextPromo } from "../src/store/promo_state.js";

describe("the daily-guide rotation ledger", () => {
  it("lives in its own model and collection, apart from the X promoter's", () => {
    const promoModel = mongoose.models.BotPromoPost;
    expect(promoModel).toBeDefined();
    expect(GuidePostModel.modelName).toBe("BotDailyGuidePost");
    expect(GuidePostModel.modelName).not.toBe(promoModel.modelName);
    expect(GuidePostModel.collection.name).toBe(GUIDE_POSTS_COLLECTION);
    expect(GuidePostModel.collection.name).not.toBe(promoModel.collection.name);
  });

  it("keeps the promoter's unique slug index untouched (no channel discriminator was added)", () => {
    const promoPaths = Object.keys(mongoose.models.BotPromoPost.schema.paths);
    expect(promoPaths).not.toContain("channel");
    expect(mongoose.models.BotPromoPost.schema.path("slug").options.unique).toBe(true);
  });
});

describe("the storage-free daily-guide rotation", () => {
  // These tests run without a Mongo connection, which IS the degraded path.
  it("advances by day and wraps around the catalogue", async () => {
    expect(mongoose.connection.readyState).not.toBe(1);
    const at = (iso: string) => pickNextGuide(DAILY_GUIDES, new Date(iso));
    const monday = await at("2026-09-21T12:00:00Z");
    const tuesday = await at("2026-09-22T12:00:00Z");
    expect(monday).toBeDefined();
    expect(monday!.slug).not.toBe(tuesday!.slug);
    // Same day, different hour: same pick, so a retry does not skip an entry.
    expect((await at("2026-09-21T01:00:00Z"))!.slug).toBe(monday!.slug);
    expect(monday!.slug).toBe(DAILY_GUIDES[dayIndex(new Date("2026-09-21T12:00:00Z")) % DAILY_GUIDES.length]!.slug);
  });

  it("returns undefined for an empty catalogue instead of throwing", async () => {
    expect(await pickNextGuide([])).toBeUndefined();
  });

  it("marks nothing without Mongo and does not throw", async () => {
    await expect(markGuidePosted(DAILY_GUIDES[0]!.slug)).resolves.toBeUndefined();
  });

  it("does not share its day cursor semantics with the promoter's catalogue size", async () => {
    // Same day, two catalogues of different length: independent picks. This is
    // the storage-free shadow of the "separate collection" rule above.
    const now = new Date("2026-09-22T12:00:00Z");
    const guide = await pickNextGuide(DAILY_GUIDES, now);
    const promo = await pickNextPromo(CONTENT_PROMOS, now);
    expect(guide!.slug.startsWith("/guias/")).toBe(true);
    expect(promo!.slug.startsWith("/guias/")).toBe(false);
  });
});
