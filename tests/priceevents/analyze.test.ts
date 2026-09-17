import { describe, expect, it } from "vitest";
import { analyzeOffer, analyzeOfferOutcome } from "../../classes/priceevents/analyze";
import type { PricewatchOfferLike } from "../../classes/priceevents/types";
import type { PricewatchPoint } from "../../classes/pricewatch/types";

const TODAY = "2026-01-30";
const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` that is `offsetDays` calendar days BEFORE `base` (UTC). `offsetDays: 0` is `base`. */
function iso(offsetDays: number, base: string = TODAY): string {
  const ms = Date.parse(`${base}T00:00:00Z`) - offsetDays * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** `count` flat prior points at `price`, one per day, ending the day before `today` (offset 1). */
function flatPriorHistory(count: number, price: number, today: string = TODAY): PricewatchPoint[] {
  const points: PricewatchPoint[] = [];
  for (let offset = 1; offset <= count; offset++) {
    points.push({ d: iso(offset, today), p: price, lp: null });
  }
  return points;
}

/** Same as {@link flatPriorHistory}, but every point carries an explicit currency `c`. */
function flatPriorHistoryWithCurrency(
  count: number,
  price: number,
  currency: "UYU" | "USD",
  today: string = TODAY
): PricewatchPoint[] {
  return flatPriorHistory(count, price, today).map((point) => ({ ...point, c: currency }));
}

function makeOffer(overrides: Partial<PricewatchOfferLike>): PricewatchOfferLike {
  return {
    listingId: "ml:123",
    vertical: "equipar",
    category: "heladeras",
    productKey: "ml:123",
    sellerKey: "seller-1",
    sellerName: "Tienda Uno",
    title: "Heladera Whirlpool 300L",
    url: "https://example.com/x",
    currency: "UYU",
    firstSeen: iso(40),
    history: [],
    ...overrides,
  };
}

describe("analyzeOffer", () => {
  it("returns null when there is no point for today", () => {
    const offer = makeOffer({
      firstSeen: iso(40),
      history: flatPriorHistory(15, 10000),
    });
    expect(analyzeOffer(offer, TODAY)).toBeNull();
  });

  it("returns null when firstSeen is only 20 days ago — below the 21-day minimum age", () => {
    const offer = makeOffer({
      firstSeen: iso(20),
      history: [...flatPriorHistory(15, 10000), { d: TODAY, p: 9000, lp: null }],
    });
    expect(analyzeOffer(offer, TODAY)).toBeNull();
  });

  it("qualifies once firstSeen is exactly 21 days ago (the minimum age is inclusive)", () => {
    const offer = makeOffer({
      firstSeen: iso(21),
      history: [...flatPriorHistory(15, 10000), { d: TODAY, p: 9000, lp: null }],
    });
    expect(analyzeOffer(offer, TODAY)).not.toBeNull();
  });

  it("returns null with only 9 prior points inside the 60-day window — below the 10-point minimum", () => {
    const offer = makeOffer({
      firstSeen: iso(70),
      history: [...flatPriorHistory(9, 10000), { d: TODAY, p: 9000, lp: null }],
    });
    expect(analyzeOffer(offer, TODAY)).toBeNull();
  });

  it("classifies a real drop: 30 days flat at 10000, today 8900 -> baja-real, dropPct 11", () => {
    const offer = makeOffer({
      firstSeen: iso(29),
      history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 8900, lp: null }],
    });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.classes).toEqual(["baja-real"]);
    expect(result!.dropPct).toBe(11);
    expect(result!.priorMin).toBe(10000);
    expect(result!.priorMax).toBe(10000);
    expect(result!.priorMedian).toBe(10000);
    expect(result!.priorPoints).toBe(29);
    expect(result!.price).toBe(8900);
  });

  it("classifies a mild dip as precio-de-siempre: same history, today 9100 (ratio 0.91 > 0.9)", () => {
    const offer = makeOffer({
      firstSeen: iso(29),
      history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 9100, lp: null }],
    });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.classes).toEqual(["precio-de-siempre"]);
    expect(result!.dropPct).toBeNull();
  });

  it("classifies a crossed-out price above the historical max as tachado-por-encima (13500 >= 13200)", () => {
    // 28 days at 10000 plus one spike to 12000 -> priorMin 10000, priorMax 12000.
    // Today's price (10000) equals priorMin, so the drop ratio is 1.0 -> no baja-real here.
    const history: PricewatchPoint[] = [
      ...flatPriorHistory(28, 10000),
      { d: iso(29), p: 12000, lp: null },
      { d: TODAY, p: 10000, lp: 13500 },
    ];
    const offer = makeOffer({ firstSeen: iso(29), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.priorMax).toBe(12000);
    expect(result!.classes).toEqual(["tachado-por-encima"]);
    expect(result!.dropPct).toBeNull();
  });

  it("does not flag a crossed-out price just under the 110% threshold (13100 < 13200)", () => {
    const history: PricewatchPoint[] = [
      ...flatPriorHistory(28, 10000),
      { d: iso(29), p: 12000, lp: null },
      { d: TODAY, p: 10000, lp: 13100 },
    ];
    const offer = makeOffer({ firstSeen: iso(29), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.classes).toEqual(["precio-de-siempre"]);
  });

  it("can be both a real drop and an inflated crossed-out price at once", () => {
    const offer = makeOffer({
      firstSeen: iso(29),
      history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 8500, lp: 14000 }],
    });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.classes.sort()).toEqual(["baja-real", "tachado-por-encima"].sort());
    expect(result!.dropPct).toBe(15);
  });

  it("ignores points older than the 60-day lookback window", () => {
    // One point 65 days back at an absurdly low price must not pull priorMin down, and must not
    // count towards priorPoints.
    const history: PricewatchPoint[] = [
      { d: iso(65), p: 100, lp: null },
      ...flatPriorHistory(15, 10000),
      { d: TODAY, p: 9500, lp: null },
    ];
    const offer = makeOffer({ firstSeen: iso(70), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.priorMin).toBe(10000);
    expect(result!.priorPoints).toBe(15);
  });

  it("includes a point exactly 60 days before today (inclusive lower boundary)", () => {
    const history: PricewatchPoint[] = [
      { d: iso(60), p: 7000, lp: null },
      ...flatPriorHistory(15, 10000),
      { d: TODAY, p: 9500, lp: null },
    ];
    const offer = makeOffer({ firstSeen: iso(70), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.priorMin).toBe(7000);
    expect(result!.priorPoints).toBe(16);
  });

  it("excludes a point exactly 61 days before today", () => {
    const history: PricewatchPoint[] = [
      { d: iso(61), p: 7000, lp: null },
      ...flatPriorHistory(15, 10000),
      { d: TODAY, p: 9500, lp: null },
    ];
    const offer = makeOffer({ firstSeen: iso(70), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.priorMin).toBe(10000);
    expect(result!.priorPoints).toBe(15);
  });

  it("picks the LAST occurrence of today's own point when it repeats, matching the writer's resync semantics", () => {
    // Two entries dated TODAY: an earlier one at 10000 (as if a stale duplicate survived) and a
    // later one at 8900 that must win, exactly like `dedupeByDay` already does for prior days.
    const history: PricewatchPoint[] = [
      ...flatPriorHistory(29, 10000),
      { d: TODAY, p: 10000, lp: null },
      { d: TODAY, p: 8900, lp: null },
    ];
    const offer = makeOffer({ firstSeen: iso(29), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.price).toBe(8900);
    expect(result!.classes).toEqual(["baja-real"]);
    expect(result!.dropPct).toBe(11);
  });

  it("never counts today's own point as a prior point", () => {
    // 10 prior points plus today's = 11 history entries; priorPoints must read 10, not 11, and
    // today's different price must not leak into priorMin/priorMax. 5000 (half the prior flat price,
    // ratio 0.5) stays inside the [1/5, 5] plausibility band added by I2a — an even more extreme price
    // (e.g. 1) would now be correctly rejected as `suspect` before this assertion, which is a
    // different behavior covered separately (see the "plausibility guard" describe block below).
    const history: PricewatchPoint[] = [...flatPriorHistory(10, 10000), { d: TODAY, p: 5000, lp: null }];
    const offer = makeOffer({ firstSeen: iso(29), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.priorPoints).toBe(10);
    expect(result!.priorMin).toBe(10000);
    expect(result!.priorMax).toBe(10000);
  });

  it("computes priorMedian over the actual spread of prior prices, not just min/max", () => {
    const prices = [9000, 9500, 10000, 10000, 10000, 10000, 10500, 10500, 11000, 12000];
    const history: PricewatchPoint[] = [
      ...prices.map((p, i) => ({ d: iso(i + 1), p, lp: null })),
      { d: TODAY, p: 9800, lp: null },
    ];
    const offer = makeOffer({ firstSeen: iso(29), history });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.priorMin).toBe(9000);
    expect(result!.priorMax).toBe(12000);
    // sorted: 9000 9500 10000 10000 10000 10000 10500 10500 11000 12000 (10 values, even count)
    expect(result!.priorMedian).toBe(10000);
  });

  it("returns null for a currency other than UYU or USD", () => {
    const offer = makeOffer({
      currency: "ARS",
      firstSeen: iso(29),
      history: [...flatPriorHistory(15, 10000), { d: TODAY, p: 8900, lp: null }],
    });
    expect(analyzeOffer(offer, TODAY)).toBeNull();
  });

  it("accepts USD offers the same way it accepts UYU ones", () => {
    const offer = makeOffer({
      currency: "USD",
      firstSeen: iso(29),
      history: [...flatPriorHistory(29, 300), { d: TODAY, p: 260, lp: null }],
    });
    const result = analyzeOffer(offer, TODAY);
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("USD");
    expect(result!.classes).toEqual(["baja-real"]);
  });

  it("carries the offer identity fields straight through into the analysis", () => {
    const offer = makeOffer({
      listingId: "ml:999",
      vertical: "sillas",
      category: null,
      productKey: null,
      sellerKey: "seller-2",
      sellerName: "Tienda Dos",
      title: "Silla gamer X",
      url: "https://example.com/silla",
      firstSeen: iso(29),
      history: [...flatPriorHistory(15, 10000), { d: TODAY, p: 9500, lp: null }],
    });
    const result = analyzeOffer(offer, TODAY);
    expect(result).toMatchObject({
      listingId: "ml:999",
      vertical: "sillas",
      category: null,
      productKey: null,
      sellerKey: "seller-2",
      sellerName: "Tienda Dos",
      title: "Silla gamer X",
      url: "https://example.com/silla",
      listPrice: null,
    });
  });

  describe("exact threshold boundaries (integer-cent comparison, not float ratios)", () => {
    it("classifies tachado-por-encima exactly at 110% (priorMax 7000, lp 7700)", () => {
      // priorMin 6500 keeps today's price (6500) from also tripping baja-real, isolating the
      // tachado boundary. `7000 * 1.1` is 7700.000000000001 as a raw float — if the comparison
      // used that float directly, `lp === 7700` would fail `>=` and this would wrongly miss.
      const history: PricewatchPoint[] = [
        ...flatPriorHistory(28, 6500),
        { d: iso(29), p: 7000, lp: null },
        { d: TODAY, p: 6500, lp: 7700 },
      ];
      const offer = makeOffer({ firstSeen: iso(29), history });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.priorMax).toBe(7000);
      expect(result!.classes).toEqual(["tachado-por-encima"]);
    });

    it("does not classify tachado-por-encima one unit below the 110% threshold (lp 7699)", () => {
      const history: PricewatchPoint[] = [
        ...flatPriorHistory(28, 6500),
        { d: iso(29), p: 7000, lp: null },
        { d: TODAY, p: 6500, lp: 7699 },
      ];
      const offer = makeOffer({ firstSeen: iso(29), history });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.classes).toEqual(["precio-de-siempre"]);
    });

    it("classifies baja-real exactly at 90% (priorMin 10000, price 9000) with dropPct exactly 10", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 9000, lp: null }],
      });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.classes).toEqual(["baja-real"]);
      expect(result!.dropPct).toBe(10);
    });

    it("does not classify baja-real one unit above the 90% threshold (price 9001)", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 9001, lp: null }],
      });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.classes).toEqual(["precio-de-siempre"]);
    });

    it("classifies baja-real at exactly 90% with cent prices (priorMin 3.3, price 2.97 in USD)", () => {
      // 3.3 * 100 is 329.99999999999994 as a raw float, and 2.97 <= 0.9 * 3.3 fails under naive
      // float comparison even though 2.97 / 3.3 is exactly 0.9. Rounding each price to integer
      // cents before comparing sidesteps that.
      const offer = makeOffer({
        currency: "USD",
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 3.3), { d: TODAY, p: 2.97, lp: null }],
      });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.classes).toEqual(["baja-real"]);
    });
  });

  describe("one point per calendar day", () => {
    it("dedupes prior points by day before counting: 5 real days duplicated twice -> null", () => {
      // 10 history entries, but only 5 distinct calendar days -> below PRICE_EVENT_MIN_POINTS (10)
      // once deduped. Without dedupe, counting raw array entries would wrongly qualify this offer.
      const history: PricewatchPoint[] = [];
      for (let offset = 1; offset <= 5; offset++) {
        const d = iso(offset);
        history.push({ d, p: 10000, lp: null });
        history.push({ d, p: 9990, lp: null });
      }
      history.push({ d: TODAY, p: 9000, lp: null });
      const offer = makeOffer({ firstSeen: iso(29), history });
      expect(analyzeOffer(offer, TODAY)).toBeNull();
    });

    it("qualifies with exactly 10 distinct prior days (the PRICE_EVENT_MIN_POINTS boundary)", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(10, 10000), { d: TODAY, p: 9500, lp: null }],
      });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.priorPoints).toBe(10);
    });

    it("keeps the LAST occurrence when the same day repeats, matching the writer's resync semantics", () => {
      const history: PricewatchPoint[] = [
        ...flatPriorHistory(10, 10000),
        // A later entry for the same day (offset 5) as an earlier one already in the array above —
        // this one must win.
        { d: iso(5), p: 7000, lp: null },
        { d: TODAY, p: 9500, lp: null },
      ];
      const offer = makeOffer({ firstSeen: iso(29), history });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.priorPoints).toBe(10);
      expect(result!.priorMin).toBe(7000);
    });
  });

  // -------------------------------------------------------------------------------------------
  // I2a: plausibility guard — final review finding. Neither `history` points (until this change)
  // nor most retail adapters guarantee a single currency per offer over time (Fenicio mixes
  // currencies per item, Shopify reads the first variant's price). Without a sanity check, a
  // currency mix-up reads as an enormous "real" discount instead of the data problem it is.
  // -------------------------------------------------------------------------------------------
  describe("I2a: plausibility guard (today's price/lp vs priorMedian, outside [1/5, 5] -> suspect)", () => {
    it("the reviewer's exact scenario: 30 days UYU 20000, then USD 500 today -> not a real drop", () => {
      // None of these points carry `c` (pre-existing history, written before that field existed), so
      // I2b's currency filter does not apply here at all — this is exactly the case that guard (a) is
      // the backstop for: without a per-point currency to filter on, only the plausibility ratio
      // catches a peso price masquerading as a "97.5% drop" against a dollar-denominated median.
      const offer = makeOffer({
        currency: "USD",
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 20000), { d: TODAY, p: 500, lp: null }],
      });
      expect(analyzeOffer(offer, TODAY)).toBeNull();
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.analysis).toBeNull();
      expect(outcome.suspect).toBe(true);
    });

    it("flags today's price as suspect just below the 1/5 floor (median 10000, price 1999)", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 1999, lp: null }],
      });
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.analysis).toBeNull();
      expect(outcome.suspect).toBe(true);
    });

    it("does not flag today's price exactly at the 1/5 floor (median 10000, price 2000)", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 2000, lp: null }],
      });
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.suspect).toBe(false);
      expect(outcome.analysis).not.toBeNull();
      expect(outcome.analysis!.classes).toEqual(["baja-real"]);
    });

    it("flags today's list price as suspect above the 5x ceiling, even when today's own price is plausible", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 9500, lp: 50001 }],
      });
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.analysis).toBeNull();
      expect(outcome.suspect).toBe(true);
    });

    it("does not flag a list price exactly at the 5x ceiling (median 10000, lp 50000)", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 9500, lp: 50000 }],
      });
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.suspect).toBe(false);
      expect(outcome.analysis).not.toBeNull();
    });

    it("never marks a normally-classified offer as suspect", () => {
      const offer = makeOffer({
        firstSeen: iso(29),
        history: [...flatPriorHistory(29, 10000), { d: TODAY, p: 8900, lp: null }],
      });
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.suspect).toBe(false);
    });

    it("never marks an offer discarded for a mundane reason (too young) as suspect", () => {
      const offer = makeOffer({
        firstSeen: iso(20),
        history: [...flatPriorHistory(15, 10000), { d: TODAY, p: 9000, lp: null }],
      });
      const outcome = analyzeOfferOutcome(offer, TODAY);
      expect(outcome.analysis).toBeNull();
      expect(outcome.suspect).toBe(false);
    });
  });

  // -------------------------------------------------------------------------------------------
  // I2b: per-point currency (`PricewatchPoint.c`). Additive and optional: points written before
  // this field existed simply omit it and are never filtered by this rule (they still go through
  // the I2a plausibility guard above).
  // -------------------------------------------------------------------------------------------
  describe("I2b: prior points whose own currency differs from today's are ignored", () => {
    it("drops a prior point recorded in a different currency from priorMin/Max/Median and the point count", () => {
      const history: PricewatchPoint[] = [
        // One stray USD point sitting among 10 UYU ones. If it were not filtered, its extreme value
        // would corrupt priorMin (or would be caught by the I2a guard some other way) — pin the
        // currency filter down directly by keeping the stray value inside the plausible band, so a
        // regression here fails on priorMin/priorPoints rather than accidentally passing via I2a.
        { d: iso(11), p: 8000, lp: null, c: "USD" },
        ...flatPriorHistoryWithCurrency(10, 10000, "UYU"),
        { d: TODAY, p: 9500, lp: null, c: "UYU" },
      ];
      const offer = makeOffer({ firstSeen: iso(29), history });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.priorPoints).toBe(10);
      expect(result!.priorMin).toBe(10000);
    });

    it("never filters a prior point missing `c` (pre-existing history written before this field existed)", () => {
      const history: PricewatchPoint[] = [
        ...flatPriorHistory(10, 10000), // no `c` on any of these
        { d: TODAY, p: 9500, lp: null, c: "UYU" },
      ];
      const offer = makeOffer({ firstSeen: iso(29), history });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.priorPoints).toBe(10);
      expect(result!.priorMin).toBe(10000);
    });

    it("never filters priors when today's own point is missing `c` (nothing to compare against)", () => {
      const history: PricewatchPoint[] = [
        ...flatPriorHistoryWithCurrency(10, 10000, "USD"),
        { d: TODAY, p: 9500, lp: null }, // today has no `c`
      ];
      const offer = makeOffer({ firstSeen: iso(29), history, currency: "USD" });
      const result = analyzeOffer(offer, TODAY);
      expect(result).not.toBeNull();
      expect(result!.priorPoints).toBe(10);
      expect(result!.priorMin).toBe(10000);
    });

    it("does not qualify when the currency filter drops the count below the 10-point minimum", () => {
      // 9 UYU points plus 1 USD point = 10 raw entries, but only 9 count once the USD one is
      // dropped -> below PRICE_EVENT_MIN_POINTS (10), so this must be null.
      const history: PricewatchPoint[] = [
        { d: iso(10), p: 9000, lp: null, c: "USD" },
        ...flatPriorHistoryWithCurrency(9, 10000, "UYU"),
        { d: TODAY, p: 9200, lp: null, c: "UYU" },
      ];
      const offer = makeOffer({ firstSeen: iso(29), history });
      expect(analyzeOffer(offer, TODAY)).toBeNull();
    });
  });
});
