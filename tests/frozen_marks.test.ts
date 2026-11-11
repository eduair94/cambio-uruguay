import fs from "fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentFrozenMarks, markFrozen, MAX_REPORT_AGE_MS, type FrozenMark } from "../classes/frozen_marks";

// La marca `frozen` en las filas de hoy de la API (classes/frozen_marks.ts): lo que la regla de
// coronar lee para no nombrar "la mejor" a una pizarra que lleva días sin moverse.

const mark = (over: Partial<FrozenMark> = {}): FrozenMark => ({
  origin: "cambio_principal",
  code: "EUR",
  type: "",
  buy: 45,
  sell: 51,
  daysFrozen: 100,
  ...over,
});

describe("markFrozen", () => {
  const rows = [
    { origin: "cambio_principal", code: "EUR", type: "", buy: 45, sell: 51 },
    { origin: "cambio_principal", code: "USD", type: "", buy: 40.2, sell: 41.4 },
    { origin: "brou", code: "EUR", type: "EBROU", buy: 44.1, sell: 48.9 },
  ];

  it("marca sólo la pizarra del informe, con sus días", () => {
    const out = markFrozen(rows, [mark()]);
    expect(out[0]).toMatchObject({ frozen: true, frozenDays: 100 });
    expect(out[1]).not.toHaveProperty("frozen");
    expect(out[2]).not.toHaveProperty("frozen");
    // No muta lo que recibió (las filas pueden venir de un caché).
    expect(rows[0]).not.toHaveProperty("frozen");
  });

  it("el tipo es parte de la identidad: el mostrador quieto no marca al eBROU", () => {
    const out = markFrozen(rows, [mark({ origin: "brou", type: "" , buy: 44.1, sell: 48.9 })]);
    expect(out[2]).not.toHaveProperty("frozen");
  });

  it("una pizarra que se movió después del informe ya no está quieta", () => {
    expect(markFrozen(rows, [mark({ buy: 44.9 })])[0]).not.toHaveProperty("frozen");
    expect(markFrozen(rows, [mark({ sell: 50.5 })])[0]).not.toHaveProperty("frozen");
  });

  it("sin marcas devuelve las mismas filas", () => {
    expect(markFrozen(rows, [])).toBe(rows);
  });
});

describe("currentFrozenMarks", () => {
  afterEach(() => vi.restoreAllMocks());

  const serve = (generatedAt: string | null, quotes: FrozenMark[], mtimeMs: number) => {
    vi.spyOn(fs, "statSync").mockReturnValue({ mtimeMs } as fs.Stats);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ generatedAt, quotes }));
  };

  it("lee el informe reciente", () => {
    const now = Date.parse("2026-11-11T18:30:00Z");
    serve("2026-11-11T18:27:45.837Z", [mark()], 1);
    expect(currentFrozenMarks(now)).toHaveLength(1);
  });

  it("un informe viejo no marca nada: el sync dejó de correr y ya no describe hoy", () => {
    const generated = Date.parse("2026-11-11T10:00:00Z");
    serve(new Date(generated).toISOString(), [mark()], 2);
    expect(currentFrozenMarks(generated + MAX_REPORT_AGE_MS + 1)).toEqual([]);
    expect(currentFrozenMarks(generated + MAX_REPORT_AGE_MS - 1)).toHaveLength(1);
  });

  it("sin archivo, o sin fecha, no marca nada y no lanza", () => {
    vi.spyOn(fs, "statSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(currentFrozenMarks()).toEqual([]);
    vi.restoreAllMocks();
    serve(null, [mark()], 3);
    expect(currentFrozenMarks()).toEqual([]);
  });
});
