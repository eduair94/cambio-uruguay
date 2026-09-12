import { beforeEach, describe, expect, it, vi } from "vitest";
const updateOne = vi.hoisted(() => vi.fn());
vi.mock("../../classes/models/RentalMeta", () => ({ RentalMetaModel: { updateOne } }));
import { carrySourceHistory, saveRentalMeta } from "../../classes/rentals/store";
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

// The VPS flushes every pm2 log once an hour, so a run's console output is gone before anyone
// looks. On 2026-09-12 "since when is Facebook failing?" took an aggregation over 60k listings.
describe("since when each portal has been failing", () => {
  const run = (generatedAt: string, sources: RentalMeta["sources"]): RentalMeta => ({ ...meta, generatedAt, sources });
  const facebook = (ok: boolean) => ({ key: "facebook" as const, ok, listings: ok ? 47 : 0, note: "" });

  it("stamps the last good run and keeps the first failing run across consecutive failures", () => {
    const ok = carrySourceHistory(run("2026-09-10T23:48:00.000Z", [facebook(true)]), null);
    expect(ok.sources[0]).toMatchObject({ lastOkAt: "2026-09-10T23:48:00.000Z" });
    expect(ok.sources[0]).not.toHaveProperty("failingSince");

    const first = carrySourceHistory(run("2026-09-11T23:48:00.000Z", [facebook(false)]), ok);
    const second = carrySourceHistory(run("2026-09-12T15:48:00.000Z", [facebook(false)]), first);
    expect(second.sources[0]).toMatchObject({
      failingSince: "2026-09-11T23:48:00.000Z", lastOkAt: "2026-09-10T23:48:00.000Z",
    });

    const back = carrySourceHistory(run("2026-09-12T16:48:00.000Z", [facebook(true)]), second);
    expect(back.sources[0]).toMatchObject({ lastOkAt: "2026-09-12T16:48:00.000Z" });
    expect(back.sources[0]).not.toHaveProperty("failingSince");
  });

  it("does not invent a last good run for a portal it has only seen failing", () => {
    const failing = carrySourceHistory(run("2026-09-12T04:52:00.000Z", [
      { key: "infocasas", ok: false, listings: 0, note: "" },
    ]), null);
    expect(failing.sources[0]).toMatchObject({ failingSince: "2026-09-12T04:52:00.000Z" });
    expect(failing.sources[0]).not.toHaveProperty("lastOkAt");
  });

  it("tracks each portal on its own", () => {
    const previous = run("2026-09-12T04:52:00.000Z", [
      { key: "infocasas", ok: true, listings: 14_000, note: "" }, facebook(false),
    ]);
    const current = carrySourceHistory(run("2026-09-12T05:47:00.000Z", [
      { key: "infocasas", ok: false, listings: 0, note: "" }, facebook(false),
    ]), { ...previous, sources: previous.sources.map(source =>
      source.key === "facebook" ? { ...source, failingSince: "2026-09-11T23:48:00.000Z" } : source) });
    expect(current.sources).toEqual([
      expect.objectContaining({ key: "infocasas", failingSince: "2026-09-12T05:47:00.000Z", lastOkAt: "2026-09-12T04:52:00.000Z" }),
      expect.objectContaining({ key: "facebook", failingSince: "2026-09-11T23:48:00.000Z" }),
    ]);
  });
});
