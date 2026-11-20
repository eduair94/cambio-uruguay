// The two optional limits of `harvestMercadoLibre` (a page cap and a clock) can only LOWER what the
// harvester does, and with no third argument it behaves exactly as before for chairs, equipar, phones
// and movilidad. The bridge is mocked: 50 results on every call, so a search never ends early by
// itself and the only thing that stops it is the page count or the clock.
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchJsonMock = vi.hoisted(() => vi.fn());
vi.mock("../../classes/retail/net", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

import { harvestMercadoLibre } from "../../classes/retail/sources/mercadolibre";
import type { CategorySpec } from "../../classes/retail/types";

const spec = (key: string, queries: string[]): CategorySpec => ({ key, accept: () => true, mlQueries: queries });
const ENV_DEFAULT = Number(process.env.RETAIL_ML_MAX_PAGES || process.env.CHAIR_ML_MAX_PAGES || 4);

let serial = 0;
const page = () => ({
  results: Array.from({ length: 50 }, () => {
    serial += 1;
    return {
      id: `MLU${serial}`,
      title: `Producto ${serial}`,
      permalink: `https://articulo.mercadolibre.com.uy/MLU-${serial}-_JM`,
      condition: "new",
      price: { amount: 1000 + serial, currency: "UYU" },
    };
  }),
});

beforeEach(() => {
  fetchJsonMock.mockReset();
  fetchJsonMock.mockImplementation(async () => page());
});

describe("harvestMercadoLibre: tope de páginas y reloj opcionales", () => {
  it("sin límites, una búsqueda lee las páginas del default de siempre", async () => {
    const result = await harvestMercadoLibre([spec("a", ["uno"])]);
    expect(fetchJsonMock).toHaveBeenCalledTimes(ENV_DEFAULT);
    expect(result.ok).toBe(true);
    expect(result.note).not.toContain("corte por reloj");
  });

  it("{ maxPagesPerQuery: 2 } lee 2", async () => {
    await harvestMercadoLibre([spec("a", ["uno"])], undefined, { maxPagesPerQuery: 2 });
    expect(fetchJsonMock).toHaveBeenCalledTimes(Math.min(2, ENV_DEFAULT));
  });

  it("{ maxPagesPerQuery: 99 } no puede subir el default", async () => {
    await harvestMercadoLibre([spec("a", ["uno"])], undefined, { maxPagesPerQuery: 99 });
    expect(fetchJsonMock).toHaveBeenCalledTimes(ENV_DEFAULT);
  });

  it("un reloj ya vencido no pide nada, falla como puente sin respuesta y lo dice en la nota", async () => {
    const result = await harvestMercadoLibre([spec("a", ["uno", "dos"]), spec("b", ["tres"])], undefined, {
      deadlineAt: Date.now() - 1,
    });
    expect(fetchJsonMock).toHaveBeenCalledTimes(0);
    expect(result.ok).toBe(false);
    expect(result.note).toContain("sin respuesta de");
    expect(result.note).toContain("corte por reloj: 3 búsquedas sin leer");
  });

  it("el reloj corta entre páginas y cuenta las búsquedas que nunca empezaron", async () => {
    let now = 1_000;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    // Every page takes 10 "seconds" of the fake clock; the deadline lands after the third page.
    fetchJsonMock.mockImplementation(async () => {
      now += 10_000;
      return page();
    });
    const result = await harvestMercadoLibre([spec("a", ["uno"]), spec("b", ["dos"]), spec("c", ["tres"])], undefined, {
      maxPagesPerQuery: 2,
      deadlineAt: 1_000 + 25_000,
    });
    clock.mockRestore();
    // Plan: a/uno, b/dos, c/tres, 2 pages each. Pages at t=1s, 11s, 21s start; the fourth (t=31s) does not.
    expect(fetchJsonMock).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
    expect(result.note).toMatch(/^3 páginas, 0 descartadas por título, corte por reloj: 1 búsquedas sin leer$/);
  });
});
