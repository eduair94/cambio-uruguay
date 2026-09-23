// La guarda de corrida flaca del comparador, con el modelo de Mongo de mentira.
//
// Lo que decide esta guarda: si una corrida técnicamente exitosa y sustancialmente vacía puede
// pisar una comparación correcta de ayer. La parte fina —y la que este archivo cuida— es que las DOS
// MITADES se miden por separado: la matriz de rutas viene de un ruteador y los viajes en ómnibus de
// los datos abiertos de la Intendencia, y se caen por separado. Que una esté floja no dice nada de
// la otra, así que una corrida con rutas nuevas y ómnibus viejo es una corrida buena.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransportSnapshot, TransportTransitPair } from "../../classes/transporte/types";

const db = vi.hoisted(() => ({
  previous: null as unknown,
  updates: [] as { filter: unknown; update: any; options: unknown }[],
  findThrows: false,
}));

vi.mock("../../classes/models/TransportSnapshot", () => ({
  TransportSnapshotModel: {
    findOne: (_filter: unknown) => ({
      lean: async () => {
        if (db.findThrows) throw new Error("Mongo caída");
        return db.previous;
      },
    }),
    updateOne: async (filter: unknown, update: unknown, options: unknown) => {
      db.updates.push({ filter, update, options });
      return { acknowledged: true };
    },
  },
}));

import { THIN_RUN_FLOOR, TRANSPORT_SNAPSHOT_SLUG, saveTransportSnapshot } from "../../classes/transporte/store";

const route = (index: number): number[] => [0, index, 0, 1000 + index, 60 + index];
const transit = (index: number): TransportTransitPair => ({
  from: 0,
  to: index,
  walkMinutes: 6,
  waitMinutes: 5,
  inVehicleMinutes: 20,
  transfers: 0,
  lines: ["100"],
  meters: 0,
});

function snapshot(routes: number, transits: number, over: Partial<TransportSnapshot> = {}): TransportSnapshot {
  return {
    slug: TRANSPORT_SNAPSHOT_SLUG,
    builtAt: new Date("2026-09-22T12:00:00.000Z"),
    prices: {} as TransportSnapshot["prices"],
    zones: [],
    routes: Array.from({ length: routes }, (_value, index) => route(index)),
    transit: Array.from({ length: transits }, (_value, index) => transit(index)),
    coverage: {
      zones: 68,
      routedPairs: routes,
      transitPairs: transits,
      matrixBuiltAt: "2026-09-22T12:00:00.000Z",
      router: "osrm-fossgis",
      transitAgeDays: 0,
      notes: [],
    },
    ...over,
  };
}

/** Lo que había guardado ayer: 1.000 rutas y 1.000 viajes en ómnibus. */
function previousSnapshot(): TransportSnapshot {
  const saved = snapshot(1000, 1000);
  saved.coverage.matrixBuiltAt = "2026-09-15T04:00:00.000Z";
  saved.coverage.router = "valhalla-local";
  return saved;
}

beforeEach(() => {
  db.previous = null;
  db.updates = [];
  db.findThrows = false;
});

describe("saveTransportSnapshot", () => {
  it("la primera corrida siempre guarda, aunque traiga poco: no hay nada que proteger", async () => {
    const result = await saveTransportSnapshot(snapshot(4, 2));
    expect(result.saved).toBe(true);
    expect(result.previousRoutes).toBe(0);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]!.filter).toEqual({ slug: "current" });
    expect(db.updates[0]!.options).toEqual({ upsert: true });
    expect(db.updates[0]!.update.$set.slug).toBe("current");
    expect(db.updates[0]!.update.$set.routes).toHaveLength(4);
  });

  it("NO guarda cuando las DOS mitades vienen flacas", async () => {
    db.previous = previousSnapshot();
    const result = await saveTransportSnapshot(snapshot(100, 100));

    expect(result.saved).toBe(false);
    expect(result.reason).toMatch(/corrida flaca/);
    expect(result.reason).toContain("100 rutas contra 1000");
    expect(result.previousRoutes).toBe(1000);
    expect(result.previousTransit).toBe(1000);
    // Lo que importa: no se escribió NADA. La foto de ayer sigue en pie.
    expect(db.updates).toHaveLength(0);
  });

  it("una sola mitad flaca SÍ guarda, y conserva la mitad vieja con su fecha y su nota", async () => {
    db.previous = previousSnapshot();
    const hoy = snapshot(100, 1000); // el ruteador devolvió casi nada; el STM vino entero
    const result = await saveTransportSnapshot(hoy);

    expect(result.saved).toBe(true);
    expect(hoy.routes).toHaveLength(1000); // las rutas son las de la corrida anterior
    expect(hoy.transit).toHaveLength(1000); // los viajes en ómnibus son los de hoy
    // Y la fecha viaja con ellas: publicar rutas de hace una semana con la fecha de hoy sería
    // mentir sobre la antigüedad del dato.
    expect(hoy.coverage.matrixBuiltAt).toBe("2026-09-15T04:00:00.000Z");
    expect(hoy.coverage.router).toBe("valhalla-local");
    expect(hoy.coverage.notes.join(" ")).toMatch(/rutas son de la corrida anterior/i);
    expect(hoy.coverage.notes.join(" ")).toContain("2026-09-15T04:00:00.000Z");
    expect(db.updates).toHaveLength(1);
  });

  it("si la mitad flaca es la del ómnibus, se conservan los viajes viejos y se declara", async () => {
    db.previous = previousSnapshot();
    const hoy = snapshot(1000, 50);
    const result = await saveTransportSnapshot(hoy);

    expect(result.saved).toBe(true);
    expect(hoy.transit).toHaveLength(1000);
    expect(hoy.routes).toHaveLength(1000);
    expect(hoy.coverage.notes.join(" ")).toMatch(/ómnibus son de la corrida anterior/i);
    // La matriz es de hoy, así que su fecha NO se pisa con la vieja.
    expect(hoy.coverage.matrixBuiltAt).toBe("2026-09-22T12:00:00.000Z");
    expect(hoy.coverage.router).toBe("osrm-fossgis");
  });

  it("el piso es 60 % y no cuenta como flaca una corrida que lo toca exacto", async () => {
    db.previous = previousSnapshot();
    expect(THIN_RUN_FLOOR).toBe(0.6);

    const justo = snapshot(600, 600);
    const result = await saveTransportSnapshot(justo);
    expect(result.saved).toBe(true);
    expect(justo.coverage.notes).toEqual([]); // ninguna mitad se reemplazó
    expect(justo.routes).toHaveLength(600);
  });

  it("un pelo por debajo del piso en las dos mitades sí es flaca", async () => {
    db.previous = previousSnapshot();
    expect((await saveTransportSnapshot(snapshot(599, 599))).saved).toBe(false);
    expect(db.updates).toHaveLength(0);
  });

  it("`force` publica igual: es la salida manual para cuando la baja es real", async () => {
    db.previous = previousSnapshot();
    const result = await saveTransportSnapshot(snapshot(10, 10), { force: true });
    expect(result.saved).toBe(true);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]!.update.$set.routes).toHaveLength(10);
  });

  it("un snapshot anterior vacío no bloquea nada: la comparación es contra lo que había, no contra cero", async () => {
    db.previous = { ...previousSnapshot(), routes: [], transit: [] };
    const result = await saveTransportSnapshot(snapshot(3, 3));
    expect(result.saved).toBe(true);
    expect(result.previousRoutes).toBe(0);
    expect(db.updates).toHaveLength(1);
  });

  it("si la lectura del anterior falla, la corrida se publica en vez de perderse", async () => {
    // Una Mongo que no contesta la lectura no es evidencia de que la corrida de hoy esté mal; y el
    // `updateOne` que viene después fallaría solo si la base sigue caída.
    db.findThrows = true;
    const result = await saveTransportSnapshot(snapshot(500, 500));
    expect(result.saved).toBe(true);
    expect(result.previousRoutes).toBe(0);
    expect(db.updates).toHaveLength(1);
  });

  it("el documento guardado tiene siempre el slug `current`: es UNA foto, no un historial", async () => {
    await saveTransportSnapshot(snapshot(5, 5, { slug: "otro" }));
    expect(TRANSPORT_SNAPSHOT_SLUG).toBe("current");
    expect(db.updates[0]!.filter).toEqual({ slug: "current" });
    expect(db.updates[0]!.update.$set.slug).toBe("current");
  });
});
