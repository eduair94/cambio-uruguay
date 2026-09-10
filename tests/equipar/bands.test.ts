import { describe, expect, it } from "vitest";
import { bandOf, MIN_USED_BAND_SAMPLE, savingPct, screen } from "../../classes/equipar/bands";
import type { EquiparOffer } from "../../classes/equipar/types";

const offer = (priceUyu: number, condition: "new" | "used" = "new"): EquiparOffer => ({
  seller: "tienda",
  title: "heladera",
  url: "https://example.uy/1",
  price: priceUyu,
  currency: "UYU",
  priceUyu,
  condition,
  source: "store",
  observedAt: "2026-09-10T00:00:00.000Z",
});

describe("banda de precios", () => {
  it("no publica una banda con menos observaciones que el piso", () => {
    expect(bandOf([100, 110, 120, 130, 140, 150, 160])).toBeNull();
    expect(bandOf([100, 110, 120, 130, 140, 150, 160, 170])).not.toBeNull();
  });

  it("el mercado de usados tiene piso propio, porque es genuinamente más flaco", () => {
    const thin = [1000, 1100, 1200, 1300, 1400];
    expect(bandOf(thin)).toBeNull();
    expect(bandOf(thin, MIN_USED_BAND_SAMPLE)?.n).toBe(5);
  });
});

describe("cribado por la distribución del propio ítem", () => {
  it("borra lo imposible y marca lo dudoso, que son dos cosas distintas", () => {
    // 24 heladeras alrededor de $30.000. La de $900 no es una heladera —cae debajo de p10/3— y se
    // va. La de $12.000 podría serlo: queda visible, dice por qué está marcada, y no encabeza.
    // Borrarla sería afirmar que no puede ser un precio real, y eso no lo sabemos.
    const normales = Array.from({ length: 24 }, (_, index) => offer(28_000 + index * 200));
    const { kept, suspect } = screen([...normales, offer(900), offer(12_000)]);
    expect(suspect.map((row) => row.priceUyu)).toEqual([12_000]);
    expect(kept.map((row) => row.priceUyu)).not.toContain(900);
    expect(kept.every((row) => row.priceUyu >= 28_000)).toBe(true);
  });

  it("no marca nada cuando no hay muestra suficiente para una banda", () => {
    const { kept, suspect } = screen([offer(100), offer(50_000)]);
    expect(suspect).toHaveLength(0);
    expect(kept).toHaveLength(2);
  });
});

describe("ahorro del usado", () => {
  const newBand = bandOf(Array.from({ length: 20 }, (_, index) => 30_000 + index * 500))!;

  it("no se publica si a alguna de las dos patas le falta muestra", () => {
    const thinUsed = bandOf([12_000, 13_000, 14_000], MIN_USED_BAND_SAMPLE);
    expect(thinUsed).toBeNull();
    // Sin banda de usados no hay porcentaje: un 60% calculado sobre tres avisos sería un invento,
    // y sería el titular.
    expect(savingPct(newBand, thinUsed)).toBeNull();
    expect(savingPct(null, newBand)).toBeNull();
  });

  it("se publica contra la mediana de lo nuevo cuando las dos patas existen", () => {
    const usedBand = bandOf([14_000, 15_000, 16_000, 17_000, 18_000], MIN_USED_BAND_SAMPLE)!;
    const pct = savingPct(newBand, usedBand)!;
    expect(pct).toBeGreaterThan(40);
    expect(pct).toBeLessThan(60);
  });

  it("no inventa un ahorro cuando el usado sale igual o más caro", () => {
    const usedBand = bandOf([40_000, 41_000, 42_000, 43_000, 44_000], MIN_USED_BAND_SAMPLE)!;
    expect(savingPct(newBand, usedBand)).toBeNull();
  });
});
