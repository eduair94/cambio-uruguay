import { describe, expect, it } from "vitest";
import { articleBand, priceVerdict, rankable } from "../../classes/precios/plausibility";
import { daysBetween, freshnessOf } from "../../classes/precios/staleness";

describe("articleBand", () => {
  it("no arma banda con muestra insuficiente", () => {
    expect(articleBand([100, 105])).toBeNull();
  });

  it("la banda sale de los percentiles del propio articulo", () => {
    const band = articleBand(Array.from({ length: 100 }, (_, i) => 90 + i))!;
    expect(band.p50).toBeGreaterThan(130);
    expect(band.low).toBeCloseTo(band.p10 / 3, 5);
    expect(band.high).toBeCloseTo(band.p90 * 3, 5);
  });
});

describe("priceVerdict", () => {
  // El spread real medido va de 1,58x (aceite de girasol) a 4,86x (cinta leuco).
  // Un factor fijo o borra la competencia real o deja pasar cualquier cosa: la
  // banda es por percentiles del propio articulo.
  const band = articleBand(Array.from({ length: 60 }, (_, i) => 50 + i))!; // 50..109

  it("acepta lo que esta dentro de la banda", () => {
    expect(priceVerdict(80, band)).toBe("ok");
  });

  it("rechaza lo absurdo", () => {
    expect(priceVerdict(2, band)).toBe("reject");
    expect(priceVerdict(9999, band)).toBe("reject");
  });

  it("marca suspect el barato que sobrevive a la banda", () => {
    // El caso "Cinta leuco Ready Plast": minimo $18,5 contra mediana $64.
    // Sobrevive a p10/3 y sin embargo encabezaria el ranking, asi que se
    // etiqueta sin borrarlo: podria ser un precio real.
    expect(priceVerdict(band.suspectBelow - 1, band)).toBe("suspect");
  });

  it("sin banda no se puede juzgar, y no se juzga", () => {
    expect(priceVerdict(80, null)).toBe("ok");
  });

  it("un precio que no es numero se rechaza siempre", () => {
    expect(priceVerdict(Number.NaN, band)).toBe("reject");
    expect(priceVerdict(0, null)).toBe("reject");
  });
});

describe("freshnessOf", () => {
  it("clasifica por la fecha que declara el origen", () => {
    expect(freshnessOf("2026-09-07", "2026-09-07")).toBe("fresh");
    expect(freshnessOf("2026-09-05", "2026-09-07")).toBe("fresh");
    expect(freshnessOf("2026-09-01", "2026-09-07")).toBe("aging");
    // Medido: 174 filas con fecha 27/08 en una corrida del 07/09.
    expect(freshnessOf("2026-08-27", "2026-09-07")).toBe("aging");
    expect(freshnessOf("2026-08-12", "2026-09-07")).toBe("stale");
  });

  it("cuenta dias calendario", () => {
    expect(daysBetween("2026-08-27", "2026-09-07")).toBe(11);
  });

  it("una fecha ilegible se trata como vieja, no como fresca", () => {
    expect(freshnessOf("no-es-fecha", "2026-09-07")).toBe("stale");
  });
});

describe("rankable", () => {
  it("una gondola vieja no gana un ranking de mas barato", () => {
    expect(rankable({ verdict: "ok", freshness: "stale" })).toBe(false);
  });

  it("una fila marcada suspect tampoco", () => {
    expect(rankable({ verdict: "suspect", freshness: "fresh" })).toBe(false);
  });

  it("una observacion fresca y plausible si", () => {
    expect(rankable({ verdict: "ok", freshness: "fresh" })).toBe(true);
    expect(rankable({ verdict: "ok", freshness: "aging" })).toBe(true);
  });
});
