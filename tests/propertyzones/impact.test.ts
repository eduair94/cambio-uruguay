import { describe, expect, it } from "vitest";
import { buildPriceImpact } from "../../classes/propertyzones/impact";
import type { RentalZoneMarketObservation } from "../../classes/propertyzones/market";

const now = new Date("2026-09-19T12:00:00Z");
function market(zones: number, perZone: number, rentM2: (zone: number) => number) {
  const observations: RentalZoneMarketObservation[] = [];
  const zoneOf: Record<string, string> = {};
  for (let z = 0; z < zones; z++) for (let i = 0; i < perZone; i++) {
    const key = `p-${z}-${i}`;
    zoneOf[key] = `mvd:${z + 1}`;
    observations.push({ propertyKey: key, advertId: key, source: "infocasas", department: "Montevideo", neighborhood: `B${z}`,
      propertyType: "apartamento", bedrooms: 2, price: rentM2(z) * (50 + i), currency: "UYU", commonExpenses: null,
      commonExpensesCurrency: null, areaBuilt: 50 + i, lastSeen: "2026-09-18T00:00:00.000Z" });
  }
  return { observations, zoneOf: (key: string) => zoneOf[key] ?? null };
}
const names = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`mvd:${i + 1}`, `Barrio ${i + 1}`]));
const values = (f: (z: number) => number) => Object.fromEntries(Array.from({ length: 40 }, (_, z) => [`mvd:${z + 1}`, f(z)]));

describe("buildPriceImpact", () => {
  it("finds a clear negative association and reports it with its interval", () => {
    const { observations, zoneOf } = market(30, 16, z => 900 - z * 15);
    const impact = buildPriceImpact({ observations, zoneOf, names, usdUyu: 40, now, rentalDataAsOf: "2026-09-19",
      attributes: { saneamiento: values(z => 10 + z * 2 + (z % 3)) } });
    expect(impact.zones).toHaveLength(30);
    expect(impact.zones[0]).toMatchObject({ zone: "mvd:1", name: "Barrio 1", n: 16, rentM2: 900 });
    const [result] = impact.attributes;
    expect(result).toMatchObject({ attribute: "saneamiento", zones: 30, verdict: "lower" });
    expect(result.rho).toBeLessThan(-0.9);
    expect(result.rhoHigh).toBeLessThan(0);
    expect(result.pct).toBeLessThan(0);
    expect(result.points).toHaveLength(30);
  });

  it("calls a pattern-free attribute inconclusive", () => {
    const { observations, zoneOf } = market(30, 16, z => 700 + ((z * 37) % 11) * 10);
    const impact = buildPriceImpact({ observations, zoneOf, names, usdUyu: 40, now, rentalDataAsOf: "2026-09-19",
      attributes: { alumbrado: values(z => (z * 13) % 7) } });
    expect(impact.attributes[0].verdict).toBe("inconclusive");
  });

  it("is deterministic and skips thin zones and attributes", () => {
    const { observations, zoneOf } = market(25, 16, z => 900 - z * 10);
    const thin = market(1, 10, () => 5000);
    const args = { observations: [...observations, ...thin.observations.map(o => ({ ...o, propertyKey: `t-${o.propertyKey}`, advertId: `t-${o.advertId}` }))],
      zoneOf: (key: string) => (key.startsWith("t-") ? "mvd:40" : zoneOf(key)), names, usdUyu: 40, now, rentalDataAsOf: "2026-09-19",
      attributes: { luz: values(z => z), agua: { "mvd:1": 1 } } };
    const first = buildPriceImpact(args), second = buildPriceImpact(args);
    expect(first).toEqual(second);
    expect(first.zones.some(zone => zone.zone === "mvd:40")).toBe(false);
    expect(first.attributes.map(result => result.attribute)).toEqual(["luz"]);
    expect(first.joint).toBeNull();
  });

  it("fits the joint model when several attributes cover enough zones", () => {
    const { observations, zoneOf } = market(35, 16, z => 1000 - z * 12);
    const impact = buildPriceImpact({ observations, zoneOf, names, usdUyu: 40, now, rentalDataAsOf: "2026-09-19",
      attributes: { saneamiento: values(z => z + (z % 4)), alumbrado: values(z => (z * 7) % 10) } });
    expect(impact.joint?.zones).toBe(35);
    expect(impact.joint!.coefficients.map(item => item.attribute)).toEqual(["alumbrado", "saneamiento"]);
    expect(impact.joint!.coefficients.find(item => item.attribute === "saneamiento")!.high).toBeLessThan(0);
    expect(impact.joint!.r2).toBeGreaterThan(0.8);
  });
});
