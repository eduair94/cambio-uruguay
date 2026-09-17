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
    expect(result.snapshot.topDrops).toHaveLength(1);
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

describe("runPriceEvents — bySource/suspect flow from the raw cursor into the snapshot", () => {
  it("tallies bySource only for offers analyzeOfferOutcome actually classified", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    const tooNew = { ...qualifyingDrop({ listingId: "ml:2" }), firstSeen: iso(5), source: "mercadolibre" };
    fake.offersSeenTodayByVertical.mockImplementation(() => [
      { ...qualifyingDrop({ listingId: "ml:1" }), source: "mercadolibre" },
      { ...qualifyingDrop({ listingId: "store:1" }), source: "fenicio" },
      tooNew, // discarded for age -> must NOT count towards bySource
    ]);

    const result = await runPriceEvents({ today: TODAY, dryRun: true });

    expect(result.snapshot.bySource).toEqual({ mercadolibre: 1, fenicio: 1 });
  });

  it("counts a plausibility-guard rejection as suspect, separate from analyzed - eligible", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    const implausible = qualifyingDrop({
      listingId: "ml:suspect",
      history: [
        ...Array.from({ length: 29 }, (_, i) => ({ d: iso(i + 1), p: 10000, lp: null })),
        { d: TODAY, p: 1, lp: null }, // ratio 0.0001, far outside [1/5, 5]
      ],
    });
    fake.offersSeenTodayByVertical.mockImplementation(() => [implausible]);

    const result = await runPriceEvents({ today: TODAY, dryRun: true });

    expect(result.snapshot.analyzed).toBe(1);
    expect(result.snapshot.eligible).toBe(0);
    expect(result.snapshot.suspect).toBe(1);
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

  it("skips pruneOldDaySnapshots when prune:false (the --event-only hourly job) but still writes", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation(() => []);
    fake.saveSnapshot.mockResolvedValue(undefined);

    const result = await runPriceEvents({ today: TODAY, prune: false });

    expect(result.written).toBe(true);
    expect(result.pruned).toBe(0);
    expect(fake.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(fake.pruneOldDaySnapshots).not.toHaveBeenCalled();
  });

  it("defaults to pruning when the option is omitted (the plain daily job)", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation(() => []);
    fake.saveSnapshot.mockResolvedValue(undefined);
    fake.pruneOldDaySnapshots.mockResolvedValue(3);

    const result = await runPriceEvents({ today: TODAY });

    expect(result.pruned).toBe(3);
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

// M1 (final review): the hourly --event-only cron can land before equipar/sillas have written a
// single point for the new UTC day (e.g. 00:19 UTC, well before their ~12:xx UTC daily runs). That
// read zero offers, not a thin one — it must never trip the thin-run guard, which used to fire a
// pm2-visible "failure" every hour, every active event day, until noon.
describe("runPriceEvents — --event-only reading zero offers is a clean no-op (M1)", () => {
  it("skips writing without tripping `thin`, even against a substantial current snapshot", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(100); // would normally guarantee `thin` at eligible 0
    fake.offersSeenTodayByVertical.mockImplementation(() => []);

    const result = await runPriceEvents({ today: TODAY, eventOnly: true });

    expect(result.snapshot.analyzed).toBe(0);
    expect(result.noDataYet).toBe(true);
    expect(result.thin).toBe(false);
    expect(result.written).toBe(false);
    expect(fake.saveSnapshot).not.toHaveBeenCalled();
    expect(fake.pruneOldDaySnapshots).not.toHaveBeenCalled();
  });

  it("does not fire on the very first run either (no current snapshot yet)", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue(null);
    fake.loadCurrentEligible.mockResolvedValue(null);
    fake.offersSeenTodayByVertical.mockImplementation(() => []);

    const result = await runPriceEvents({ today: TODAY, eventOnly: true });

    expect(result.noDataYet).toBe(true);
    expect(result.written).toBe(false);
  });

  it("does not fire once at least one offer was actually read (real thin-run guard still applies)", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(100);
    fake.offersSeenTodayByVertical.mockImplementation(() => [qualifyingDrop()]); // analyzed 1, eligible 1 << 40

    const result = await runPriceEvents({ today: TODAY, eventOnly: true });

    expect(result.noDataYet).toBe(false);
    expect(result.thin).toBe(true);
    expect(result.written).toBe(false);
  });

  it("never fires on the plain daily job (eventOnly not set) — zero offers still uses the thin guard as before", async () => {
    fake.loadVerticals.mockResolvedValue(["equipar"]);
    fake.loadTrackingSince.mockResolvedValue("2026-09-16");
    fake.loadCurrentEligible.mockResolvedValue(100);
    fake.offersSeenTodayByVertical.mockImplementation(() => []);

    const result = await runPriceEvents({ today: TODAY });

    expect(result.noDataYet).toBe(false);
    expect(result.thin).toBe(true);
    expect(result.written).toBe(false);
  });
});
