import { beforeEach, describe, expect, it, vi } from "vitest";
const updateOne = vi.hoisted(() => vi.fn());
vi.mock("../../classes/models/RentalMeta", () => ({ RentalMetaModel: { updateOne } }));
import { saveRentalMeta } from "../../classes/rentals/store";
import { RENTAL_FULL_META_KEY, RENTAL_META_KEY, type RentalMeta } from "../../classes/rentals/types";

const meta: RentalMeta = {
  key: RENTAL_META_KEY, mode: "full", generatedAt: "2026-09-07T05:30:00.000Z",
  durationMs: 1000, usdUyu: 41.5, properties: 100, offers: 100, merged: 0,
  sources: [{ key: "infocasas", ok: true, complete: false, listings: 100, note: "partial" }],
};
beforeEach(() => updateOne.mockReset());
describe("daily coverage evidence", () => {
  it("retains the partial status of a full sweep under a separate key", async () => {
    await saveRentalMeta(meta);
    expect(updateOne).toHaveBeenCalledWith({ key: RENTAL_FULL_META_KEY },
      { $set: { ...meta, key: RENTAL_FULL_META_KEY } }, { upsert: true });
    expect(updateOne).toHaveBeenCalledWith({ key: RENTAL_META_KEY }, { $set: meta }, { upsert: true });
  });
  it("an hourly slice updates the public status without replacing the daily evidence", async () => {
    const hourly = { ...meta, mode: "fast" as const, offers: 4 };
    await saveRentalMeta(hourly);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith({ key: RENTAL_META_KEY }, { $set: hourly }, { upsert: true });
  });
});
