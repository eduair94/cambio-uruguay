import { describe, expect, it } from "vitest";
import { buildPriceEventSnapshot } from "../../classes/priceevents/aggregate";
import type { PriceEventAnalysis, PriceEventClass } from "../../classes/priceevents/types";
import type { PriceEvent } from "../../classes/priceevents/calendar";

const TODAY = "2026-11-27";

function analysis(overrides: Partial<PriceEventAnalysis> & { classes: PriceEventClass[] }): PriceEventAnalysis {
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
    price: 9000,
    listPrice: null,
    priorMin: 10000,
    priorMax: 10000,
    priorMedian: 10000,
    priorPoints: 15,
    dropPct: null,
    ...overrides,
  };
}

const EVENT: PriceEvent = {
  key: "black-friday-2026",
  label: "Black Friday 2026",
  start: "2026-11-27",
  end: "2026-11-30",
  confirmed: true,
  source: null,
  note: "",
};

describe("buildPriceEventSnapshot", () => {
  it("counts analyzed (including nulls) separately from eligible (non-null only)", () => {
    const snapshot = buildPriceEventSnapshot([null, null, analysis({ classes: ["precio-de-siempre"] })], TODAY, null, null);
    expect(snapshot.analyzed).toBe(3);
    expect(snapshot.eligible).toBe(1);
  });

  it("carries the day, key, event and trackingSince straight through", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, EVENT, "2026-09-16");
    expect(snapshot.day).toBe(TODAY);
    expect(snapshot.key).toBe(`day:${TODAY}`);
    expect(snapshot.event).toEqual(EVENT);
    expect(snapshot.trackingSince).toBe("2026-09-16");
  });

  it("reports null event and null trackingSince as-is (no event active / history not started)", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, null, null);
    expect(snapshot.event).toBeNull();
    expect(snapshot.trackingSince).toBeNull();
  });

  it("aggregates byVertical: eligible/drops/inflated counted independently per vertical", () => {
    const analyses = [
      analysis({ vertical: "equipar", classes: ["baja-real"], dropPct: 12 }),
      analysis({ vertical: "equipar", classes: ["precio-de-siempre"] }),
      analysis({ vertical: "sillas", classes: ["tachado-por-encima"], listPrice: 15000 }),
      analysis({ vertical: "sillas", classes: ["baja-real", "tachado-por-encima"], dropPct: 20, listPrice: 15000 }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.byVertical).toEqual({
      equipar: { eligible: 2, drops: 1, inflated: 0 },
      sillas: { eligible: 2, drops: 1, inflated: 2 },
    });
  });

  it("sorts drops by dropPct descending", () => {
    const analyses = [
      analysis({ sellerKey: "s1", classes: ["baja-real"], dropPct: 11 }),
      analysis({ sellerKey: "s2", classes: ["baja-real"], dropPct: 40 }),
      analysis({ sellerKey: "s3", classes: ["baja-real"], dropPct: 25 }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.drops.map((d) => d.dropPct)).toEqual([40, 25, 11]);
  });

  it("never lists more than 3 drops from the same seller", () => {
    const analyses = [10, 20, 30, 40, 50].map((dropPct, i) =>
      analysis({ listingId: `ml:${i}`, sellerKey: "same-seller", classes: ["baja-real"], dropPct })
    );
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.drops).toHaveLength(3);
    // Keeps this seller's BEST three (highest dropPct), not the first three encountered.
    expect(snapshot.drops.map((d) => d.dropPct)).toEqual([50, 40, 30]);
  });

  it("keeps a seller's cap independent of another seller's own drops", () => {
    const analyses = [
      ...[10, 20, 30, 40].map((dropPct, i) => analysis({ listingId: `a:${i}`, sellerKey: "seller-a", classes: ["baja-real"], dropPct })),
      analysis({ listingId: "b:0", sellerKey: "seller-b", classes: ["baja-real"], dropPct: 15 }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    // seller-a contributes at most 3 (its top three: 40, 30, 20), seller-b contributes its own 1.
    expect(snapshot.drops.filter((d) => d.sellerKey === "seller-a")).toHaveLength(3);
    expect(snapshot.drops.filter((d) => d.sellerKey === "seller-b")).toHaveLength(1);
  });

  it("caps the drops list at 200 overall", () => {
    const analyses = Array.from({ length: 250 }, (_, i) =>
      analysis({ listingId: `ml:${i}`, sellerKey: `seller-${i}`, classes: ["baja-real"], dropPct: i })
    );
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.drops).toHaveLength(200);
    // The 200 kept are the biggest drops (249 down to 50), the smallest 50 are cut.
    expect(snapshot.drops[0]!.dropPct).toBe(249);
    expect(snapshot.drops[snapshot.drops.length - 1]!.dropPct).toBe(50);
  });

  it("excludes sellers with fewer than 5 offers carrying a visible list price", () => {
    const analyses = [
      ...[1, 2, 3, 4].map((i) => analysis({ listingId: `ml:${i}`, sellerKey: "few", listPrice: 10000, classes: ["precio-de-siempre"] })),
      ...[1, 2, 3, 4, 5].map((i) => analysis({ listingId: `ml:many-${i}`, sellerKey: "many", listPrice: 10000, classes: ["precio-de-siempre"] })),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.sellers.map((s) => s.sellerKey)).toEqual(["many"]);
  });

  it("does not count offers without a visible list price towards withListPrice", () => {
    const analyses = [
      ...Array.from({ length: 5 }, (_, i) => analysis({ listingId: `ml:${i}`, sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] })),
      ...Array.from({ length: 10 }, (_, i) => analysis({ listingId: `ml:no-lp-${i}`, sellerKey: "s1", listPrice: null, classes: ["precio-de-siempre"] })),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.sellers).toHaveLength(1);
    expect(snapshot.sellers[0]!.withListPrice).toBe(5);
  });

  it("computes share as inflated/withListPrice, a percentage rounded to 1 decimal", () => {
    const analyses = [
      analysis({ listingId: "1", sellerKey: "s1", listPrice: 10000, classes: ["tachado-por-encima"] }),
      analysis({ listingId: "2", sellerKey: "s1", listPrice: 10000, classes: ["tachado-por-encima"] }),
      analysis({ listingId: "3", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
      analysis({ listingId: "4", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
      analysis({ listingId: "5", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
      analysis({ listingId: "6", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    // 2 inflated out of 6 with a list price = 33.333...% -> 33.3
    expect(snapshot.sellers[0]!.inflated).toBe(2);
    expect(snapshot.sellers[0]!.withListPrice).toBe(6);
    expect(snapshot.sellers[0]!.share).toBe(33.3);
  });

  it("sorts sellers alphabetically by name, regardless of input order", () => {
    const seller = (key: string, name: string) =>
      Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `${key}:${i}`, sellerKey: key, sellerName: name, listPrice: 10000, classes: ["precio-de-siempre"] })
      );
    const analyses = [...seller("z", "Zeta"), ...seller("a", "Alfa"), ...seller("m", "Medio")];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.sellers.map((s) => s.sellerName)).toEqual(["Alfa", "Medio", "Zeta"]);
  });

  it("returns empty drops/sellers/byVertical for an empty day, without throwing", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, null, null);
    expect(snapshot.drops).toEqual([]);
    expect(snapshot.sellers).toEqual([]);
    expect(snapshot.byVertical).toEqual({});
    expect(snapshot.analyzed).toBe(0);
    expect(snapshot.eligible).toBe(0);
  });
});
