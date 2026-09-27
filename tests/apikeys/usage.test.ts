import { describe, expect, it } from "vitest";
import { rankAnonymous, rowsFromHash, splitField, summarize } from "../../classes/apikeys/usage";

describe("filas del medidor", () => {
  it("parte el campo por el último separador", () => {
    expect(splitField("ua:Panel v1|/exchange/brou")).toEqual({ client: "ua:Panel v1", route: "/exchange/brou" });
    expect(splitField("sin-separador")).toBeNull();
    expect(splitField("|/x")).toBeNull();
  });

  it("convierte el hash del día en filas y descarta basura", () => {
    expect(rowsFromHash("2026-09-27", { "site|/": 5, roto: 3, "key:abc|/usage": 0 })).toEqual([
      { day: "2026-09-27", client: "site", route: "/", count: 5 },
    ]);
  });
});

describe("resúmenes", () => {
  const rows = [
    { day: "2026-09-27", client: "key:k1", route: "/", count: 10 },
    { day: "2026-09-27", client: "key:k1", route: "/regional", count: 3 },
    { day: "2026-09-10", client: "key:k1", route: "/", count: 100 },
    { day: "2026-09-27", client: "ua:ArboitePanel/1.0", route: "/exchange/la_favorita", count: 280 },
    { day: "2026-09-26", client: "ua:ArboitePanel/1.0", route: "/exchange/la_favorita", count: 290 },
    { day: "2026-09-27", client: "ua:curl/8.0", route: "/", count: 4 },
    { day: "2026-09-27", client: "site", route: "/", count: 900 },
  ];

  it("suma total, últimos 7 días, rutas y serie diaria por cliente", () => {
    const s = summarize(rows, "2026-09-27");
    expect(s["key:k1"]).toMatchObject({ total: 113, last7: 13 });
    expect(s["key:k1"].routes[0]).toEqual({ route: "/", count: 110 });
    expect(s["key:k1"].daily).toEqual([
      { day: "2026-09-10", count: 100 },
      { day: "2026-09-27", count: 13 },
    ]);
  });

  it("ordena a los anónimos por volumen, sin los lectores del sitio ni las claves", () => {
    const leads = rankAnonymous(summarize(rows, "2026-09-27"));
    expect(leads.map((l) => l.userAgent)).toEqual(["ArboitePanel/1.0", "curl/8.0"]);
    expect(leads[0]).toMatchObject({ total: 570, last7: 570 });
  });
});
