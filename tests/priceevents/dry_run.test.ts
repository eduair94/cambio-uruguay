import { afterEach, describe, expect, it, vi } from "vitest";

// Same shape as `tests/propertyzones/refresh.test.ts`: mock the store layer (the only thing in this
// feature that touches Mongo) so `runPriceEvents` — the orchestrator `sync_price_events.ts` calls —
// can be exercised end to end without a database, and "never writes" is provable by asserting the
// mocked write functions were never called.
const fake = vi.hoisted(() => ({
  loadVerticals: vi.fn(),
  loadTrackingSince: vi.fn(),
  loadCurrentEligible: vi.fn(),
  offersSeenTodayByVertical: vi.fn(),
  saveSnapshot: vi.fn(),
  pruneOldDaySnapshots: vi.fn(),
}));
vi.mock("../../classes/priceevents/store", () => fake);

import { runPriceEvents } from "../../classes/priceevents/refresh";
import type { PricewatchOfferLike } from "../../classes/priceevents/types";

const TODAY = "2026-11-27";
const MS_PER_DAY = 86_400_000;

function iso(offsetDays: number, base: string = TODAY): string {
  return new Date(Date.parse(`${base}T00:00:00Z`) - offsetDays * MS_PER_DAY).toISOString().slice(0, 10);
}

/** A well-formed offer that `analyzeOffer` classifies as `baja-real` today (30 days flat at 10000,
 * today 8900 — same fixture shape as `tests/priceevents/analyze.test.ts`). */
function qualifyingDrop(overrides: Partial<PricewatchOfferLike> = {}): PricewatchOfferLike {
  const history = [];
  for (let offset = 1; offset <= 29; offset++) history.push({ d: iso(offset), p: 10000, lp: null });
  history.push({ d: TODAY, p: 8900, lp: null });
  return {
    listingId: "ml:1",
    vertical: "equipar",
    category: "heladeras",
    productKey: "ml:1",
    sellerKey: "seller-1",
    sellerName: "Tienda Uno",
    title: "Heladera",
    url: "https://example.com/1",
    currency: "UYU",
    firstSeen: iso(29),
    history,
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("runPriceEvents — dry run never writes", () => {
  it("reads and aggregates real-looking data but never calls saveSnapshot or pruneOldDaySnapshots", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation(() => [qualifyingDrop()]);

    const result = await runPriceEvents({ today: TODAY, dryRun: true });

    expect(result.written).toBe(false);
    expect(result.snapshot.analyzed).toBe(1);
    expect(result.snapshot.eligible).toBe(1);
    expect(result.snapshot.drops).toHaveLength(1);
    expect(fake.saveSnapshot).not.toHaveBeenCalled();
    expect(fake.pruneOldDaySnapshots).not.toHaveBeenCalled();
  });

  it("still computes `thin` for reporting during a dry run, but never writes either way", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(100);
    fake.offersSeenTodayByVertical.mockImplementation(() => [qualifyingDrop()]); // eligible 1 << 40% of 100

    const result = await runPriceEvents({ today: TODAY, dryRun: true });

    expect(result.thin).toBe(true);
    expect(result.written).toBe(false);
    expect(fake.saveSnapshot).not.toHaveBeenCalled();
  });

  it("reports zero eligible offers honestly when nothing qualifies yet, without writing", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation(() => []);

    const result = await runPriceEvents({ today: TODAY, dryRun: true });

    expect(result.snapshot.analyzed).toBe(0);
    expect(result.snapshot.eligible).toBe(0);
    expect(fake.saveSnapshot).not.toHaveBeenCalled();
  });
});

describe("runPriceEvents — real run: writing and the thin-run guard", () => {
  it("publishes on the very first run (no current snapshot yet) even with zero eligible offers", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation(() => []);
    fake.saveSnapshot.mockResolvedValue(undefined);
    fake.pruneOldDaySnapshots.mockResolvedValue(0);

    const result = await runPriceEvents({ today: TODAY });

    expect(result.thin).toBe(false);
    expect(result.written).toBe(true);
    expect(fake.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(fake.pruneOldDaySnapshots).toHaveBeenCalledWith(TODAY, 400);
  });

  it("blocks the write when eligible falls below 40% of a substantial current snapshot", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(100);
    fake.offersSeenTodayByVertical.mockImplementation(() => [qualifyingDrop()]); // eligible 1

    const result = await runPriceEvents({ today: TODAY });

    expect(result.thin).toBe(true);
    expect(result.written).toBe(false);
    expect(fake.saveSnapshot).not.toHaveBeenCalled();
    expect(fake.pruneOldDaySnapshots).not.toHaveBeenCalled();
  });

  it("does not block when the stored current is itself still small (< 20) — history just starting", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(10); // below the 20-offer floor
    fake.offersSeenTodayByVertical.mockImplementation(() => [qualifyingDrop()]); // eligible 1, < 40% of 10

    const result = await runPriceEvents({ today: TODAY });

    expect(result.thin).toBe(false);
    expect(result.written).toBe(true);
    expect(fake.saveSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not block right at the 40% boundary (only strictly below trips the guard)", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(50);
    // Exactly 20 qualifying offers = 40% of 50 -> must NOT be thin.
    fake.offersSeenTodayByVertical.mockImplementation(() =>
      Array.from({ length: 20 }, (_, i) => qualifyingDrop({ listingId: `ml:${i}`, sellerKey: `seller-${i}` }))
    );

    const result = await runPriceEvents({ today: TODAY });

    expect(result.snapshot.eligible).toBe(20);
    expect(result.thin).toBe(false);
    expect(result.written).toBe(true);
  });

  it("reads each vertical from loadVerticals through its own offersSeenTodayByVertical(vertical, today) call", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar", "sillas"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation((vertical: string) =>
      vertical === "equipar"
        ? [qualifyingDrop({ listingId: "eq:1", vertical: "equipar" })]
        : [qualifyingDrop({ listingId: "si:1", vertical: "sillas", sellerKey: "seller-2", sellerName: "Tienda Dos" })]
    );

    const result = await runPriceEvents({ today: TODAY });

    expect(fake.offersSeenTodayByVertical).toHaveBeenCalledWith("equipar", TODAY);
    expect(fake.offersSeenTodayByVertical).toHaveBeenCalledWith("sillas", TODAY);
    expect(result.snapshot.eligible).toBe(2);
    expect(result.snapshot.byVertical).toEqual({
      equipar: { eligible: 1, drops: 1, inflated: 0 },
      sillas: { eligible: 1, drops: 1, inflated: 0 },
    });
  });

  it("counts a non-qualifying offer towards analyzed but not eligible, without throwing", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    const tooNew: PricewatchOfferLike = { ...qualifyingDrop(), firstSeen: iso(5) }; // only 5 days old
    fake.offersSeenTodayByVertical.mockImplementation(() => [tooNew]);

    const result = await runPriceEvents({ today: TODAY });

    expect(result.snapshot.analyzed).toBe(1);
    expect(result.snapshot.eligible).toBe(0);
    expect(fake.saveSnapshot).toHaveBeenCalledTimes(1);
  });
});
