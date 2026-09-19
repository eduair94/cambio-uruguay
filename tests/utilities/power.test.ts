import { describe, expect, it } from "vitest";
import { parseEcseRows, ecseTime, type EcseSample } from "../../classes/utilities/power/ecse";
import { foldSample, montevideoDay } from "../../classes/utilities/power/ledger";

const barrioCodes = Array.from({ length: 63 }, (_, i) => `B${i}`);
function row(zone: string, type: string, extra: Record<string, unknown> = {}) {
  return {
    ID_ZONA: zone, NOMBRE_ZONA: `Zona ${zone} `, TIPO_ZONA: type, TOTAL_CLIENTES_DE_ZONA: 1000,
    AFECTADOS_INTEMPESTIVOS: 0, AFECTADOS_PROGRAMADOS: 0, INCIDENCIAS_EN_ZONA: 0,
    CLIENTES_INTERRUMPIDOS: 0, LATITUD: -34.9, LONGITUD: -56.1, FECHA: "19/09/2026 11:20:41", ...extra,
  };
}
function urban(extra: (zone: string) => Record<string, unknown> = () => ({}), fecha = "19/09/2026 11:20:41") {
  return [
    ...barrioCodes.map(zone => row(zone, "Barrio", { FECHA: fecha, ...extra(zone) })),
    ...Array.from({ length: 81 }, (_, i) => row(String(3000 + i), "Localidad", { FECHA: fecha, ...extra(String(3000 + i)) })),
  ];
}
const sample = (fecha: string, extra: (zone: string) => Record<string, unknown> = () => ({})): EcseSample =>
  parseEcseRows(urban(extra, fecha), "urban");

describe("ECSE parser", () => {
  it("reads UTE local time as Montevideo (UTC-3)", () => {
    expect(ecseTime("19/09/2026 11:20:41")).toBe("2026-09-19T14:20:41.000Z");
    expect(ecseTime("31/02/2026 11:20:41")).toBeNull();
    expect(ecseTime("2026-09-19")).toBeNull();
  });

  it("keeps barrios, localities and their counts with stable zone ids", () => {
    const parsed = sample("19/09/2026 11:20:41", zone => zone === "B1" ? { AFECTADOS_INTEMPESTIVOS: 12, INCIDENCIAS_EN_ZONA: 5 } : {});
    expect(parsed.observedAt).toBe("2026-09-19T14:20:41.000Z");
    expect(parsed.zones).toHaveLength(144);
    expect(parsed.zones.find(zone => zone.zone === "b:B1")).toMatchObject({
      type: "barrio", name: "Zona B1", customers: 1000, unplanned: 12, planned: 0, incidents: 5,
    });
    expect(parsed.zones.find(zone => zone.zone === "l:3000")?.type).toBe("localidad");
  });

  it("caps affected customers at the zone total instead of inventing more", () => {
    const parsed = sample("19/09/2026 11:20:41", zone => zone === "B2" ? { AFECTADOS_INTEMPESTIVOS: 5000 } : {});
    expect(parsed.zones.find(zone => zone.zone === "b:B2")?.unplanned).toBe(1000);
  });

  it("rejects a changed payload instead of writing partial zones", () => {
    expect(() => parseEcseRows(urban().slice(1), "urban")).toThrow();
    expect(() => parseEcseRows(urban(zone => zone === "B3" ? { TOTAL_CLIENTES_DE_ZONA: -1 } : {}), "urban")).toThrow();
    expect(() => parseEcseRows(urban(zone => zone === "B4" ? { FECHA: "ayer" } : {}), "urban")).toThrow();
    expect(() => parseEcseRows({ rows: [] }, "urban")).toThrow();
    const duplicated = urban(); duplicated[1] = { ...duplicated[0] };
    expect(() => parseEcseRows(duplicated, "urban")).toThrow();
  });

  it("reads the 19 departments", () => {
    const rows = Array.from({ length: 19 }, (_, i) => row(String(i + 1), "Departamento"));
    expect(parseEcseRows(rows, "department").zones.map(zone => zone.zone)).toContain("d:19");
    expect(() => parseEcseRows(rows.slice(1), "department")).toThrow();
  });
});

describe("power ledger", () => {
  it("integrates affected customers with the trapezoid rule", () => {
    const first = foldSample(null, sample("19/09/2026 11:20:00"));
    expect(first.increments).toEqual([]);
    const second = foldSample(first.state, sample("19/09/2026 11:30:00", zone => zone === "B1" ? { AFECTADOS_INTEMPESTIVOS: 12 } : {}));
    const b1 = second.increments.find(item => item.zone === "b:B1")!;
    expect(b1).toMatchObject({ day: "2026-09-19", coveredMinutes: 10, unplannedCustomerMinutes: 60, plannedCustomerMinutes: 0, samples: 1 });
    expect(second.increments).toHaveLength(144);
  });

  it("counts only increases of active incidents as new cuts", () => {
    let state = foldSample(null, sample("19/09/2026 11:00:00", () => ({ INCIDENCIAS_EN_ZONA: 1 }))).state;
    const up = foldSample(state, sample("19/09/2026 11:10:00", () => ({ INCIDENCIAS_EN_ZONA: 3 })));
    state = up.state;
    const down = foldSample(state, sample("19/09/2026 11:20:00", () => ({ INCIDENCIAS_EN_ZONA: 2 })));
    expect(up.increments[0].newIncidents).toBe(2);
    expect(down.increments[0].newIncidents).toBe(0);
  });

  it("never counts the same UTE timestamp twice", () => {
    const first = foldSample(null, sample("19/09/2026 11:00:00"));
    const again = foldSample(first.state, sample("19/09/2026 11:00:00", () => ({ AFECTADOS_INTEMPESTIVOS: 50 })));
    expect(again.increments).toEqual([]);
    expect(again.state).toEqual(first.state);
  });

  it("credits only one nominal interval across a gap instead of inventing the hidden time", () => {
    const first = foldSample(null, sample("19/09/2026 11:00:00", () => ({ AFECTADOS_INTEMPESTIVOS: 100 })));
    const later = foldSample(first.state, sample("19/09/2026 11:45:00", () => ({ AFECTADOS_INTEMPESTIVOS: 10 })));
    expect(later.increments[0]).toMatchObject({ coveredMinutes: 10, unplannedCustomerMinutes: 100 });
  });

  it("books each interval on the Montevideo calendar day", () => {
    expect(montevideoDay("2026-09-20T02:30:00.000Z")).toBe("2026-09-19");
    const first = foldSample(null, sample("19/09/2026 23:55:00"));
    const next = foldSample(first.state, sample("20/09/2026 00:05:00"));
    expect(next.increments[0].day).toBe("2026-09-20");
  });

  it("starts a zone that appears for the first time without crediting it", () => {
    const first = foldSample(null, sample("19/09/2026 11:00:00"));
    const state = { ...first.state, zones: { ...first.state.zones } };
    delete state.zones["b:B5"];
    const next = foldSample(state, sample("19/09/2026 11:10:00"));
    expect(next.increments.some(item => item.zone === "b:B5")).toBe(false);
    expect(next.state.zones["b:B5"]).toBeDefined();
  });
});
