import { describe, expect, it } from "vitest";
import {
  buildRentalZoneMarket,
  normalizeRentalZoneMarketObservation,
  type RentalZoneMarketObservation,
} from "../../classes/propertyzones/market";

const now = Date.parse("2026-09-08T12:00:00Z");
const stamp = new Date(now).toISOString();
const row = (
  id: number | string,
  changes: Partial<RentalZoneMarketObservation> = {},
): RentalZoneMarketObservation => ({
  propertyKey: `property-${id}`,
  advertId: `advert-${id}`,
  source: "infocasas",
  department: "Montevideo",
  neighborhood: "Cordón",
  propertyType: "apartamento",
  bedrooms: 2,
  price: 20000,
  currency: "UYU",
  commonExpenses: 2000,
  commonExpensesCurrency: "UYU",
  areaBuilt: 50,
  lastSeen: stamp,
  ...changes,
});
const market = (rows: RentalZoneMarketObservation[], usdUyu = 40) =>
  buildRentalZoneMarket(rows, { usdUyu, now });
const any = (rows: RentalZoneMarketObservation[], usdUyu = 40) =>
  market(rows, usdUyu).buckets.find((bucket) => bucket.bedrooms === "any")!
    .prices;

describe("rental zone market observation evidence", () => {
  it("rejects absent scopes, commercial types, stale/future/impossible dates and invalid native prices", () => {
    const patches = [
      { department: "" },
      { neighborhood: "" },
      { neighborhood: "<script>private</script>" },
      { propertyType: "oficina" },
      { price: "20000" },
      { price: NaN },
      { price: Infinity },
      { price: -1 },
      { currency: "UI" },
      { lastSeen: "2026-08-28T23:59:59Z" },
      { lastSeen: "2026-09-08T12:00:01Z" },
      { lastSeen: "2026-02-31" },
      { lastSeen: "2026-09-08-private" },
      { propertyKey: "" },
      { advertId: "" },
    ];
    for (const patch of patches)
      expect(
        normalizeRentalZoneMarketObservation(row(1, patch as any), now),
        JSON.stringify(patch),
      ).toBeNull();
    expect(
      normalizeRentalZoneMarketObservation(
        row(1, { lastSeen: "2026-08-29T00:00:00Z" }),
        now,
      ),
    ).not.toBeNull();
    expect(
      normalizeRentalZoneMarketObservation(
        row(1, { lastSeen: "2026-09-08" }),
        now,
      ),
    ).not.toBeNull();
  });

  it("keeps unknown expenses, bedroom counts and built areas unknown instead of imputing zero", () => {
    expect(
      normalizeRentalZoneMarketObservation(
        row(1, { bedrooms: 1.5, commonExpenses: null, areaBuilt: NaN }),
        now,
      ),
    ).toMatchObject({
      bedrooms: null,
      commonExpenses: null,
      commonExpensesCurrency: null,
      areaBuilt: null,
    });
    expect(
      normalizeRentalZoneMarketObservation(
        row(1, { commonExpenses: 0, commonExpensesCurrency: null }),
        now,
      )!.commonExpenses,
    ).toBeNull();
    expect(
      normalizeRentalZoneMarketObservation(row(1, { commonExpenses: 0 }), now)!
        .commonExpenses,
    ).toBe(0);
  });

  it("requires a finite positive current exchange rate even for UYU-only snapshots", () => {
    for (const rate of [0, -1, NaN, Infinity])
      expect(() => market([row(1)], rate)).toThrow(
        "Invalid rental zone market context",
      );
  });
});

describe("whole-catalogue zone distributions", () => {
  it("never introduces nonfinite values through conversion or decimal rounding", () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(i, { price: 1e308 }));
    expect(Number.isFinite(any(rows).rent.mean)).toBe(true);
    expect(Number.isFinite(any(rows).rent.median)).toBe(true);
    expect(
      market(rows.map((row) => ({ ...row, currency: "USD" }))),
    ).toMatchObject({ observations: 0, buckets: [] });
  });
  it("computes exact mean, interpolated quartiles and true metric denominators with independent minimum eight", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row(i, {
        price: (i + 1) * 10000,
        commonExpenses: i === 0 ? null : 1000,
        areaBuilt: i === 0 ? null : 50,
      }),
    );
    expect(any(rows)).toMatchObject({
      rent: { count: 8, mean: 45000, median: 45000, p25: 27500, p75: 62500 },
      commonExpenses: {
        count: 7,
        mean: null,
        median: null,
        p25: null,
        p75: null,
      },
      monthlyTotal: {
        count: 7,
        mean: null,
        median: null,
        p25: null,
        p75: null,
      },
      builtSquareMeter: {
        count: 7,
        mean: null,
        median: null,
        p25: null,
        p75: null,
      },
      sources: 1,
      lastSeenFrom: stamp,
      lastSeenTo: stamp,
    });
    expect(any(rows.slice(0, 7)).rent).toEqual({
      count: 7,
      mean: null,
      median: null,
      p25: null,
      p75: null,
    });
    expect(
      any(Array.from({ length: 8 }, (_, i) => row(i, { commonExpenses: 0 })))
        .monthlyTotal.mean,
    ).toBe(20000);
  });

  it("converts rent and own expenses independently at current FX; no stored conversion or currency mixing", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row(i, {
        price: 500,
        currency: "USD",
        commonExpenses: 100,
        commonExpensesCurrency: "USD",
      }),
    );
    expect(any(rows)).toMatchObject({
      rent: { mean: 20000 },
      commonExpenses: { mean: 4000 },
      monthlyTotal: { mean: 24000 },
      builtSquareMeter: { mean: 400 },
    });
    expect(any(rows, 50)).toMatchObject({
      rent: { mean: 25000 },
      commonExpenses: { mean: 5000 },
      monthlyTotal: { mean: 30000 },
      builtSquareMeter: { mean: 500 },
    });
    expect(
      any(
        rows.map((row) => ({
          ...row,
          commonExpenses: 2000,
          commonExpensesCurrency: "UYU",
        })),
      ),
    ).toMatchObject({ rent: { mean: 20000 }, monthlyTotal: { mean: 22000 } });
  });

  it("separates departments, exact neighborhood names, residential types and bedroom buckets", () => {
    const rows = [
      row(1),
      row(2, { neighborhood: " CORDON " }),
      row(3, { neighborhood: "Cordón Sur" }),
      row(4, { department: "Maldonado" }),
      row(5, { propertyType: "casa" }),
      row(6, { bedrooms: 0 }),
      row(7, { bedrooms: null }),
      row(8, { bedrooms: 4 }),
      row(9, { bedrooms: 7 }),
    ];
    const buckets = market(rows).buckets;
    const cordon = buckets.filter(
      (bucket) =>
        bucket.department === "Montevideo" &&
        bucket.neighborhood === "Cordón" &&
        bucket.propertyType === "apartamento",
    );
    expect(
      cordon.map((bucket) => [bucket.bedrooms, bucket.prices.rent.count]),
    ).toEqual([
      ["0", 1],
      ["2", 2],
      ["4plus", 2],
      ["any", 6],
    ]);
    expect(
      buckets.find(
        (bucket) =>
          bucket.neighborhood === "Cordón Sur" && bucket.bedrooms === "any",
      )!.prices.rent.count,
    ).toBe(1);
    expect(
      buckets.find(
        (bucket) =>
          bucket.department === "Maldonado" && bucket.bedrooms === "any",
      )!.prices.rent.count,
    ).toBe(1);
    expect(
      buckets.find(
        (bucket) => bucket.propertyType === "casa" && bucket.bedrooms === "any",
      )!.prices.rent.count,
    ).toBe(1);
  });

  it("selects the latest own advert before all cohorting without selecting the cheapest price or borrowing expenses", () => {
    const rows = [
      row(1, {
        advertId: "older",
        lastSeen: "2026-09-07T00:00:00Z",
        price: 1000,
      }),
      row(1, {
        advertId: "newer",
        neighborhood: "Centro",
        bedrooms: 1,
        price: 30000,
        commonExpenses: null,
      }),
    ];
    const result = market(rows);
    expect(result.observations).toBe(1);
    expect(
      result.buckets.map((bucket) => [bucket.neighborhood, bucket.bedrooms]),
    ).toEqual([
      ["Centro", "1"],
      ["Centro", "any"],
    ]);
    expect(result.buckets[0].prices.commonExpenses.count).toBe(0);
  });

  it("deduplicates exact native advert identities across property aliases and transitive duplicates", () => {
    const rows = [
      row("a", { advertId: "1" }),
      row("a", { advertId: "2" }),
      row("b", { advertId: "2" }),
      row("b", { advertId: "3" }),
      row("c", { advertId: "3" }),
      row("distinct", { advertId: "1", source: "casasweb" }),
    ];
    expect(market(rows).observations).toBe(2);
    expect(any(rows).rent.count).toBe(2);
    expect(any(rows).sources).toBe(2);
    expect(market([...rows].reverse())).toEqual(market(rows));
  });

  it("does not merge similar separate properties and aggregates all values rather than medians of cohorts", () => {
    const rows = Array.from({ length: 40 }, (_, i) =>
      row(i, { bedrooms: i < 8 ? 1 : 2, price: i < 8 ? 10000 : 30000 }),
    );
    const result = market(rows);
    expect(result.observations).toBe(40);
    expect(any(rows).rent).toMatchObject({
      count: 40,
      median: 30000,
      mean: 26000,
    });
    expect(
      result.buckets.find((bucket) => bucket.bedrooms === "1")!.prices.rent
        .median,
    ).toBe(10000);
  });

  it("retains the full universe beyond map limits and is deterministic without mutating input", () => {
    const rows = Array.from({ length: 3500 }, (_, i) =>
      row(i, { price: i + 1 }),
    );
    const before = JSON.stringify(rows);
    expect(any(rows).rent).toMatchObject({
      count: 3500,
      mean: 1750.5,
      median: 1750.5,
    });
    expect(market([...rows].reverse())).toEqual(market(rows));
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("does not propagate source evidence or private extra fields into observations or aggregates", () => {
    const raw = {
      ...row(1),
      identity: "PRIVATE",
      contact: "PRIVATE",
      description: "PRIVATE",
      priceUyu: 1,
    };
    expect(
      JSON.stringify(normalizeRentalZoneMarketObservation(raw, now)),
    ).not.toContain("PRIVATE");
    expect(JSON.stringify(market([raw]))).not.toContain("PRIVATE");
    expect(normalizeRentalZoneMarketObservation(raw, now)).not.toHaveProperty(
      "priceUyu",
    );
  });
});
