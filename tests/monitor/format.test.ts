import { describe, expect, it } from "vitest";
import { escapeHtml, formatAccessEnded, formatEvents, money } from "../../classes/monitor/format";
import type { MonitorEvent } from "../../classes/monitor/events";

const NOW = new Date("2026-09-29T14:05:00Z");
const names: Record<string, string> = { gales: "Cambio Gales", varlix: "Varlix", la_favorita: "La Favorita" };
const name = (o: string) => names[o] ?? o;

describe("mensajes del monitor", () => {
  it("coma decimal con dos cifras", () => {
    expect(money(40.1)).toBe("40,10");
    expect(money(42.5)).toBe("42,50");
  });

  it("agrupa por moneda y habla en texto plano con nombres legibles", () => {
    const events: MonitorEvent[] = [
      { kind: "move", origin: "la_favorita", code: "USD", fromBuy: 40.1, toBuy: 40.2, fromSell: 42.6, toSell: 42.6, at: new Date("2026-09-29T14:02:00Z") },
      { kind: "position", code: "USD", side: "sell", from: 2, to: 4, of: 6, better: [{ origin: "gales", value: 42.55 }, { origin: "varlix", value: 42.6 }] },
      { kind: "quiet", code: "USD", lastOwnChangeAt: null, movers: ["gales", "varlix"] },
    ];
    const m = formatEvents(events, name, NOW)!;
    expect(m.text).toContain("USD");
    expect(m.text).toContain("La Favorita movió su pizarra (11:02): compra 40,10 → 40,20");
    expect(m.text).not.toContain("venta 42,60 → 42,60");
    expect(m.text).toContain("Tu venta bajó del 2.º al 4.º lugar entre 6 casas. Mejores ahora: Cambio Gales (42,55), Varlix (42,60).");
    expect(m.text).toContain("no se movió en todo el día y en las últimas 3 horas se movieron 2 competidores: Cambio Gales, Varlix.");
    expect(m.text).toContain("https://cambio-uruguay.com/cuenta?tab=api");
    expect(m.subject).toBe("Monitor de competencia: 3 novedades");
  });

  it("el resumen del día tiene su propio asunto", () => {
    const events: MonitorEvent[] = [
      {
        kind: "daily",
        day: "2026-09-29",
        lines: [
          {
            code: "USD",
            own: { buy: { position: 3, of: 3, better: [] }, sell: { position: 2, of: 3, better: [] } },
            bestBuy: { origin: "gales", value: 40.3 },
            bestSell: { origin: "gales", value: 42.5 },
            moves: [{ origin: "gales", count: 2 }, { origin: "varlix", count: 1 }],
          },
        ],
      },
    ];
    const m = formatEvents(events, name, NOW)!;
    expect(m.subject).toBe("Monitor de competencia: resumen del 29/9");
    expect(m.text).toContain("Tu compra: 3.º de 3 · tu venta: 2.º de 3");
    expect(m.text).toContain("Mejor compra: Cambio Gales 40,30 · mejor venta: Cambio Gales 42,50");
    expect(m.text).toContain("Se movieron hoy: Cambio Gales 2 veces, Varlix 1 vez");
  });

  it("sin eventos no hay mensaje", () => {
    expect(formatEvents([], name, NOW)).toBeNull();
  });

  it("el HTML va escapado", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;");
    const m = formatEvents(
      [{ kind: "move", origin: "<x>", code: "USD", fromBuy: 1, toBuy: 2, fromSell: 3, toSell: 3, at: NOW }],
      (o) => o,
      NOW
    )!;
    expect(m.html).toContain("&lt;x&gt;");
    expect(m.html).not.toContain("<x>");
  });

  it("aviso de fin de prueba", () => {
    const m = formatAccessEnded();
    expect(m.subject).toBe("Terminó la prueba del monitor de competencia");
    expect(m.text).toContain("plan Empresa");
    expect(m.text).toContain("admin@cambio-uruguay.com");
  });
});
