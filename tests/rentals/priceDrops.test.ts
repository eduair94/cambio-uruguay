import { describe, expect, it } from "vitest";
import { RENTAL_PRICE_DROP_DAYS, rentalPriceDrop } from "../../classes/rentals/priceDrops";

// `marketpricelogs` already holds a price series per advert (written by every harvest). Measured on
// 2026-10-08: 2.469 rental adverts whose last change in the past 14 days was a drop, 415 a rise. The
// directory could sort by newest but not show what got cheaper; autos already filters "bajó de precio".
const TODAY = "2026-10-08";
const log = (advertId: string, points: Array<[string, number, string?]>) => ({
  key: `alquiler:${advertId}`,
  vertical: "alquiler",
  advertId,
  firstSeen: points[0]![0],
  lastSeen: points[points.length - 1]![0],
  points: points.map(([d, p, c]) => ({ d, p, c: c ?? "UYU" })),
});
const offer = (listingId: string, price: number, currency: "UYU" | "USD" = "UYU", source = "infocasas") => ({ source, listingId, price, currency });

describe("which rental adverts dropped their price", () => {
  it("keeps the drop of an advert that still asks the lowered price", () => {
    const logs = new Map([["infocasas:1", log("infocasas:1", [["2026-09-20", 30_000], ["2026-10-03", 27_000]])]]);
    expect(rentalPriceDrop([offer("infocasas:1", 27_000)], logs, TODAY)).toEqual({
      listingId: "infocasas:1", from: 30_000, to: 27_000, currency: "UYU", at: "2026-10-03", pct: 10,
    });
  });

  it("ignores rises, old drops and a price that has moved again since", () => {
    const rise = log("infocasas:1", [["2026-09-20", 27_000], ["2026-10-03", 30_000]]);
    const old = log("infocasas:2", [["2026-07-01", 30_000], ["2026-08-01", 27_000]]);
    const moved = log("infocasas:3", [["2026-09-20", 30_000], ["2026-10-03", 27_000]]);
    const logs = new Map([["infocasas:1", rise], ["infocasas:2", old], ["infocasas:3", moved]]);
    expect(rentalPriceDrop([offer("infocasas:1", 30_000)], logs, TODAY)).toBeNull();
    expect(rentalPriceDrop([offer("infocasas:2", 27_000)], logs, TODAY)).toBeNull();
    // The harvest saw 28.000 but the series says 27.000: not the price the card will show.
    expect(rentalPriceDrop([offer("infocasas:3", 28_000)], logs, TODAY)).toBeNull();
    expect(RENTAL_PRICE_DROP_DAYS).toBe(30);
  });

  it("does not call a rounding retouch a drop", () => {
    const logs = new Map([["infocasas:1", log("infocasas:1", [["2026-09-20", 30_000], ["2026-10-03", 29_900]])]]);
    // 0,3 %: the card would read "Bajó 0 %".
    expect(rentalPriceDrop([offer("infocasas:1", 29_900)], logs, TODAY)).toBeNull();
  });

  it("does not publish a halving as a drop: on the live directory those were loading errors", () => {
    // Dry run on 62.283 properties (2026-10-08): 2.701 drops, median 5 %, p90 12,5 %; three above
    // 50 %, e.g. a Carrasco rental "from $ 16.080 to $ 3.800".
    const logs = new Map([["mercadolibre:MLU1", log("mercadolibre:MLU1", [["2026-09-20", 16_080], ["2026-10-03", 3_800]])]]);
    expect(rentalPriceDrop([offer("MLU1", 3_800, "UYU", "mercadolibre")], logs, TODAY)).toBeNull();
  });

  it("never reads a change of currency or a loading error as a drop", () => {
    const currency = log("mercadolibre:MLU1", [["2026-09-20", 1_000, "USD"], ["2026-10-03", 40_000, "UYU"], ["2026-10-05", 38_000, "UYU"]]);
    const typo = log("infocasas:9", [["2026-09-20", 300_000], ["2026-10-03", 30_000]]);
    const logs = new Map([["mercadolibre:MLU1", currency], ["infocasas:9", typo]]);
    // Only the UYU tail counts: 40.000 → 38.000, never USD 1.000 → $ 40.000.
    expect(rentalPriceDrop([offer("MLU1", 38_000, "UYU", "mercadolibre")], logs, TODAY)).toMatchObject({ from: 40_000, to: 38_000, pct: 5 });
    // Two points ten times apart cannot say which one was the real price.
    expect(rentalPriceDrop([offer("infocasas:9", 30_000)], logs, TODAY)).toBeNull();
  });

  it("names the largest drop among the property's adverts", () => {
    const logs = new Map([
      ["infocasas:1", log("infocasas:1", [["2026-09-20", 30_000], ["2026-10-03", 29_000]])],
      ["casasweb:CW5", log("casasweb:CW5", [["2026-09-20", 32_000], ["2026-10-06", 28_000]])],
    ]);
    expect(rentalPriceDrop([offer("infocasas:1", 29_000), offer("casasweb:CW5", 28_000, "UYU", "casasweb")], logs, TODAY))
      .toMatchObject({ listingId: "casasweb:CW5", pct: 12.5 });
    expect(rentalPriceDrop([offer("infocasas:7", 29_000)], logs, TODAY)).toBeNull();
  });
});
