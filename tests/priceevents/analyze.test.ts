import { describe, expect, it } from "vitest";
import { analyzeOffer } from "../../classes/priceevents/analyze";
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

  it("never counts today's own point as a prior point", () => {
    // 10 prior points plus today's = 11 history entries; priorPoints must read 10, not 11, and
    // today's extreme price must not leak into priorMin/priorMax.
    const history: PricewatchPoint[] = [...flatPriorHistory(10, 10000), { d: TODAY, p: 1, lp: null }];
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
});
