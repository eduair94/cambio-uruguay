// Los documentos con TODO en su tope entran con margen. Si un tope o la forma de una fila cambia, este
// test mide el documento nuevo (y la tabla de tamaños de docs/analytics/USAGE_INSIGHTS.md cambia en el
// mismo commit).
import { describe, expect, it } from "vitest";
import { bytesOf, enforceBudget, enforceDayBudget } from "../../classes/insights/budget";
import { DAY_MAX_BYTES, SNAPSHOT_MAX_BYTES } from "../../classes/insights/types";
import { cappedDay, cappedSnapshot, cappedState, P } from "./capped";

describe("presupuesto de tamaño", () => {
  it("las rutas de prueba son de 54 caracteres", () => {
    expect(P(1).length).toBe(54);
  });

  it("el snapshot con todo en su tope queda debajo de 900.000 bytes (10 % de margen)", () => {
    const size = bytesOf(cappedSnapshot());
    expect(size).toBeLessThan(900_000);
    const out = enforceBudget(cappedSnapshot());
    expect(out.run.trimmed).toEqual([]);
    expect(out.run.bytes).toBe(bytesOf(out));
  });

  it("uno inflado se recorta debajo del tope y deja anotado qué se cortó", () => {
    const s = cappedSnapshot();
    s.pages = [...s.pages, ...s.pages, ...s.pages];
    (s.sources.ga4Behavior.data as any).flows = Array.from({ length: 3000 }, (_, i) => ({
      from: `/a/${i}`.padEnd(60, "x"),
      to: "/b",
      views: i,
    }));
    expect(bytesOf(s)).toBeGreaterThan(SNAPSHOT_MAX_BYTES);
    const out = enforceBudget(s);
    expect(out.run.bytes).toBeLessThanOrEqual(SNAPSHOT_MAX_BYTES);
    expect(bytesOf(out)).toBeLessThanOrEqual(SNAPSHOT_MAX_BYTES);
    expect(out.run.trimmed.length).toBeGreaterThan(0);
    expect(out.run.trimmed.some((t) => /→/.test(t))).toBe(true);
  });

  it("el día con 400 inspecciones queda debajo de 720.000; con 1.000, debajo del tope", () => {
    expect(bytesOf(cappedDay(400))).toBeLessThan(720_000);
    expect(bytesOf(cappedDay(1000))).toBeLessThan(DAY_MAX_BYTES);
    const lines: string[] = [];
    const big = cappedDay(1000) as any;
    big.sources.cloudflareRum.data.elements = [...big.sources.cloudflareRum.data.elements, ...big.sources.cloudflareRum.data.elements];
    big.sources.cloudflareRum.data.pagesByDevice = [
      ...big.sources.cloudflareRum.data.pagesByDevice,
      ...big.sources.cloudflareRum.data.pagesByDevice,
    ];
    enforceDayBudget(big, (l) => lines.push(l));
    expect(bytesOf(big)).toBeLessThanOrEqual(DAY_MAX_BYTES);
    expect(lines[0]).toMatch(/cloudflareRum\./);
  });

  it("el estado con todo en su tope queda debajo de 8 MB", () => {
    expect(bytesOf(cappedState())).toBeLessThan(8_000_000);
  });
});
