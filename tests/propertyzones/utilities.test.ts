import { describe, expect, it } from "vitest";
import { buildClaimsLayer, buildLevels, buildPowerLayer, buildWaterLayer, customersByZone, levelValues, quantile } from "../../classes/propertyzones/utilities";
import type { PowerDayDoc } from "../../classes/utilities/power/store";
import type { WaterNoticeDoc } from "../../classes/utilities/water/store";

const day = (offset: number) => new Date(Date.UTC(2026, 8, 1) + offset * 86_400_000).toISOString().slice(0, 10);
function ledger(days: number, covered = 1440, extra: (zone: string, i: number) => Partial<PowerDayDoc> = () => ({})): PowerDayDoc[] {
  const docs: PowerDayDoc[] = [];
  for (let i = 0; i < days; i++)
    for (const [zone, customers] of [["d:1", 600_000], ["b:PO", 47_000], ["b:CJ", 9_000], ["b:PU", 1_000], ["l:3210", 20_000]] as const)
      docs.push({ _id: `${zone}|${day(i)}`, zone, day: day(i), name: zone, type: zone.startsWith("d") ? "departamento" : zone.startsWith("b") ? "barrio" : "localidad",
        customers, coveredMinutes: covered, unplannedCustomerMinutes: 0, plannedCustomerMinutes: 0, newIncidents: 0, samples: covered / 10, ...extra(zone, i) });
  return docs;
}

describe("buildPowerLayer", () => {
  it("keeps collecting until two weeks were observed", () => {
    const layer = buildPowerLayer(ledger(10));
    expect(layer).toMatchObject({ status: "collecting", observedFrom: "2026-09-01", observedTo: "2026-09-10", observedDays: 10 });
    expect(layer.zones).toEqual({});
  });

  it("does not publish a ledger with too many gaps", () => {
    expect(buildPowerLayer(ledger(30, 1000)).status).toBe("collecting");
  });

  it("turns customer-minutes into minutes per customer per 30 days, summing Puerto into Ciudad Vieja", () => {
    const docs = ledger(30, 1440, (zone, i) => zone === "b:PO" ? { unplannedCustomerMinutes: 47_000, newIncidents: i % 3 === 0 ? 1 : 0 }
      : zone === "b:PU" ? { unplannedCustomerMinutes: 10_000 } : {});
    const layer = buildPowerLayer(docs);
    expect(layer.status).toBe("ready");
    expect(layer.zones["mvd:8"]).toMatchObject({ name: "Pocitos", department: "Montevideo", customers: 47_000, unplannedMinutes: 30, cutsPerMonth: 10 });
    expect(layer.zones["mvd:8"].cutsPerThousand).toBeCloseTo(10 / 47, 3);
    expect(layer.zones["mvd:1"]).toMatchObject({ customers: 10_000, unplannedMinutes: 30 });
    expect(layer.zones["ute:3210"]).toMatchObject({ name: "Punta Del Este", department: "Maldonado", unplannedMinutes: 0 });
    expect(layer.departments.Montevideo.customers).toBe(600_000);
  });

  it("uses only the last 90 days", () => {
    const old = ledger(120, 1440, (zone, i) => zone === "b:PO" && i < 30 ? { unplannedCustomerMinutes: 47_000_000 } : {});
    expect(buildPowerLayer(old).zones["mvd:8"].unplannedMinutes).toBe(0);
  });
});

describe("buildWaterLayer", () => {
  const notice = (from: string, zoneText: string, department = "Montevideo", hours = 4): WaterNoticeDoc => ({
    id: `${from}-${zoneText}`, department, locality: department.toUpperCase(), publishedAt: from, zoneText, from,
    to: new Date(Date.parse(from) + hours * 3_600_000).toISOString(), startEstimated: false, reason: "", firstSeenAt: from, lastSeenAt: "2026-09-19T08:29:00.000Z",
  });
  it("counts named barrios over 24 months and caps long windows", () => {
    const layer = buildWaterLayer([
      notice("2026-01-10T11:00:00.000Z", "Pocitos"), notice("2025-06-10T11:00:00.000Z", "Pocitos y Buceo", "Montevideo", 200),
      notice("2023-01-10T11:00:00.000Z", "Pocitos"), notice("2026-02-10T11:00:00.000Z", "Ramos, Solano López"),
      notice("2026-02-10T11:00:00.000Z", "Centro", "Paysandú"),
    ], new Date("2026-09-19T12:00:00Z"));
    expect(layer.zones["mvd:8"]).toEqual({ notices: 2, hours: 76 });
    expect(layer.zones["mvd:9"]).toEqual({ notices: 1, hours: 72 });
    expect(layer.zones["mvd:2"]).toEqual({ notices: 0, hours: 0 });
    expect(layer).toMatchObject({ notices: 4, montevideoNotices: 3, montevideoMatched: 2, periodFrom: "2024-09-19", fetchedAt: "2026-09-19T08:29:00.000Z" });
    expect(layer.departments["Paysandú"]).toEqual({ notices: 1, hours: 4 });
  });
});

describe("claims, levels", () => {
  it("rates complaints per 1,000 customers and leaves the rate out without a denominator", () => {
    const layer = buildClaimsLayer({ periodFrom: "2025-09-01", periodTo: "2026-08-31", unassigned: 0, rows: 1,
      countsByOfficialCode: { "8": { alumbrado: 470, saneamiento: 47, limpieza: 0, calles: 4.7 } },
      source: { url: "u", resourceUrl: "r", resourceModified: "m", fetchedAt: "f" } }, { "mvd:8": 47_000 });
    expect(layer.zones["mvd:8"].perThousand).toEqual({ alumbrado: 10, saneamiento: 1, limpieza: 0, calles: 0.1 });
    expect(layer.zones["mvd:2"]).toEqual({ counts: { alumbrado: 0, saneamiento: 0, limpieza: 0, calles: 0 }, customers: null, perThousand: null });
  });

  it("splits zones into terciles, the low third being the fewest problems", () => {
    const values = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`mvd:${i + 1}`, i]));
    const levels = buildLevels({ luz: values, agua: { "mvd:1": 1 } });
    expect(levels.thresholds.luz).toEqual({ low: 3.667, high: 7.333, zones: 12 });
    expect(levels.byZone.luz!["mvd:1"]).toBe("low");
    expect(levels.byZone.luz!["mvd:6"]).toBe("mid");
    expect(levels.byZone.luz!["mvd:12"]).toBe("high");
    expect(levels.byZone.agua).toBeUndefined();
    expect(quantile([0, 10], 0.5)).toBe(5);
  });

  it("ranks power only once it is ready", () => {
    expect(levelValues({ status: "collecting", zones: { "mvd:1": {} } } as any, null, null).luz).toBeUndefined();
  });

  it("averages customers per public zone", () => {
    expect(customersByZone(ledger(2))).toMatchObject({ "mvd:8": 47_000, "mvd:1": 10_000, "ute:3210": 20_000 });
  });
});
