import { describe, expect, it } from "vitest";
import { normalizeStore } from "../../classes/precios/catalog";
import { dailyStatsFor, scoreObservations } from "../../classes/precios/refresh";

const observation = (articleId: number, storeId: number, price: number, sourceDay = "2026-09-07") => ({
  articleId,
  storeId,
  declarationId: storeId,
  price,
  sourceDay,
  promo: false,
  storeName: `Local ${storeId}`,
  address: "x",
  lat: -34.8,
  lon: -56.1,
});

describe("scoreObservations", () => {
  it("etiqueta cada observacion con veredicto y frescura", () => {
    const rows = scoreObservations(
      Array.from({ length: 20 }, (_, i) => observation(1, i + 1, 100 + i)),
      "2026-09-07"
    );
    expect(rows).toHaveLength(20);
    rows.forEach((row) => {
      expect(row.verdict).toBe("ok");
      expect(row.freshness).toBe("fresh");
    });
  });

  it("marca stale la observacion vieja sin borrarla", () => {
    const rows = scoreObservations(
      [...Array.from({ length: 19 }, (_, i) => observation(1, i + 1, 100)), observation(1, 20, 100, "2026-08-12")],
      "2026-09-07"
    );
    expect(rows).toHaveLength(20);
    expect(rows.find((row) => row.storeId === 20)?.freshness).toBe("stale");
  });

  it("la banda se calcula por articulo, no sobre todo el barrido", () => {
    // Un articulo caro y uno barato en la misma corrida: mezclarlos borraria el
    // barato entero. Medido: en el catalogo conviven un aceite de $109 y un
    // shampoo de $395.
    const rows = scoreObservations(
      [
        ...Array.from({ length: 12 }, (_, i) => observation(1, i + 1, 50 + i)),
        ...Array.from({ length: 12 }, (_, i) => observation(2, i + 20, 5000 + i)),
      ],
      "2026-09-07"
    );
    expect(rows.filter((row) => row.verdict === "reject")).toHaveLength(0);
  });
});

describe("dailyStatsFor", () => {
  const stores = new Map([
    [
      1,
      normalizeStore({
        id: 1,
        name: "Ta - Ta - Suc. A",
        direccion: "a",
        x: -34.8,
        y: -56.1,
        localidad: "Montevideo, MONTEVIDEO ",
      }),
    ],
    [
      2,
      normalizeStore({ id: 2, name: "TA - TA - Suc. B", direccion: "b", x: -34.7, y: -56.2, localidad: "Salto, SALTO " }),
    ],
  ]);

  it("agrega por nacional, por departamento y por cadena", () => {
    const rows = scoreObservations([observation(1, 1, 100), observation(1, 2, 200)], "2026-09-07");
    const stats = dailyStatsFor("2026-09-07", rows, stores);
    const scopes = stats.map((stat) => stat.scope);
    expect(scopes).toContain("nacional");
    expect(scopes).toContain("dept:Montevideo");
    expect(scopes).toContain("dept:Salto");
    expect(stats.find((stat) => stat.scope === "nacional")?.n).toBe(2);
  });

  it("agrupa la cadena por su clave, no por como esta escrita", () => {
    // "Ta - Ta" y "TA - TA" son la misma cadena; medido en el catalogo real con
    // Farmashop (123) y FARMASHOP (29).
    const rows = scoreObservations([observation(1, 1, 100), observation(1, 2, 200)], "2026-09-07");
    const stats = dailyStatsFor("2026-09-07", rows, stores);
    const chainScopes = stats.filter((stat) => stat.scope.startsWith("chain:"));
    expect(chainScopes).toHaveLength(1);
    expect(chainScopes[0].n).toBe(2);
  });

  it("no agrega filas rechazadas", () => {
    const rows = scoreObservations([observation(1, 1, 100), observation(1, 2, 200)], "2026-09-07").map((row) => ({
      ...row,
      verdict: "reject" as const,
    }));
    expect(dailyStatsFor("2026-09-07", rows, stores)).toHaveLength(0);
  });
});
