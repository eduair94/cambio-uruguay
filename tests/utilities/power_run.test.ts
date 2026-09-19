import { describe, expect, it } from "vitest";
import { decodeEcseBody, runPowerSample } from "../../classes/utilities/power/run";
import { ECSE_DEPARTMENT_URL, ECSE_URBAN_URL } from "../../classes/utilities/power/ecse";
import type { PowerDayIncrement, PowerState } from "../../classes/utilities/power/ledger";
import type { PowerStore } from "../../classes/utilities/power/store";

function payload(fecha: string, affected = 0) {
  const row = (zone: string, type: string) => ({
    ID_ZONA: zone, NOMBRE_ZONA: zone, TIPO_ZONA: type, TOTAL_CLIENTES_DE_ZONA: 100, AFECTADOS_INTEMPESTIVOS: affected,
    AFECTADOS_PROGRAMADOS: 0, INCIDENCIAS_EN_ZONA: 0, LATITUD: -34.9, LONGITUD: -56.1, FECHA: fecha,
  });
  return {
    [ECSE_URBAN_URL]: [...Array.from({ length: 63 }, (_, i) => row(`B${i}`, "Barrio")), ...Array.from({ length: 70 }, (_, i) => row(String(4000 + i), "Localidad"))],
    [ECSE_DEPARTMENT_URL]: Array.from({ length: 19 }, (_, i) => row(String(i + 1), "Departamento")),
  };
}
function memory() {
  const calls: string[] = [];
  let state: PowerState | null = null;
  const increments: PowerDayIncrement[] = [];
  const store: PowerStore = {
    async readState() { return state; },
    async writeState(value) { calls.push("state"); state = value; },
    async addIncrements(items) { calls.push("increments"); increments.push(...items); },
    async prune() { calls.push("prune"); return 0; },
  };
  return { store, calls, increments, get state() { return state; } };
}
const fetcher = (data: Record<string, unknown>) => async (url: string) => {
  if (!(url in data)) throw new Error("unexpected url");
  return data[url];
};
const now = new Date("2026-09-19T15:00:00Z");

describe("decodeEcseBody", () => {
  it("unwraps the doubly encoded array ECSE sends to JSON clients", () => {
    expect(decodeEcseBody(JSON.stringify(JSON.stringify([{ a: 1 }])))).toEqual([{ a: 1 }]);
    expect(decodeEcseBody("﻿[1]")).toEqual([1]);
  });
});

describe("runPowerSample", () => {
  it("starts the ledger, then books intervals, state first", async () => {
    const db = memory();
    const first = await runPowerSample({ store: db.store, fetchJson: fetcher(payload("19/09/2026 11:00:00")), now });
    expect(first).toMatchObject({ written: 0, skipped: false });
    const second = await runPowerSample({ store: db.store, fetchJson: fetcher(payload("19/09/2026 11:10:00", 10)), now });
    expect(second.written).toBe(63 + 70 + 19);
    expect(db.increments.find(item => item.zone === "b:B0")?.unplannedCustomerMinutes).toBe(50);
    expect(db.calls.slice(-2)).toEqual(["state", "increments"]);
  });

  it("skips a snapshot UTE has not refreshed", async () => {
    const db = memory();
    await runPowerSample({ store: db.store, fetchJson: fetcher(payload("19/09/2026 11:00:00")), now });
    const again = await runPowerSample({ store: db.store, fetchJson: fetcher(payload("19/09/2026 11:00:00", 50)), now });
    expect(again.skipped).toBe(true);
    expect(db.increments).toEqual([]);
  });

  it("writes nothing when the service fails or changes shape", async () => {
    const db = memory();
    await expect(runPowerSample({ store: db.store, fetchJson: async () => { throw new Error("down"); }, now })).rejects.toThrow("down");
    const broken = payload("19/09/2026 11:00:00");
    (broken[ECSE_URBAN_URL] as unknown[]).pop();
    (broken[ECSE_URBAN_URL] as unknown[]).splice(0, 1);
    await expect(runPowerSample({ store: db.store, fetchJson: fetcher(broken), now })).rejects.toThrow();
    expect(db.calls).toEqual([]);
  });

  it("refuses timestamps from the future", async () => {
    const db = memory();
    await expect(runPowerSample({ store: db.store, fetchJson: fetcher(payload("20/09/2026 11:00:00")), now })).rejects.toThrow("future");
  });
});
