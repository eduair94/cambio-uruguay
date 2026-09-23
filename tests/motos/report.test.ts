// El informe del mercado, y sobre todo lo que se NIEGA a decir.
import { describe, expect, it } from "vitest";
import { enrichMotoListing } from "../../classes/motos/enrich";
import { buildMotoReport, MOTO_REPORT_POLICY } from "../../classes/motos/report";
import type { MotoListing, RawMotoListing } from "../../classes/motos/types";

const SEEN = "2026-09-22T11:00:00.000Z";

const listing = (over: Partial<RawMotoListing> & { id: string }): MotoListing =>
  enrichMotoListing(
    {
      source: "mercadolibre",
      brandId: "60559",
      brand: "Honda",
      modelId: "9001",
      model: "XR 150",
      title: "Honda Xr 150 Cc",
      year: 2024,
      km: 10_000,
      price: 3_000,
      currency: "USD",
      fuel: "nafta",
      neighborhood: null,
      department: "Montevideo",
      sellerType: "private",
      sellerId: "1",
      picture: null,
      pictureCount: 1,
      permalink: `https://moto.mercadolibre.com.uy/MLU-${over.id}-honda-xr-150-_JM`,
      observedAt: SEEN,
      ...over,
    },
    { usdUyu: 42, firstSeen: SEEN, lastSeen: SEEN, priceHistory: [] }
  );

/**
 * Una curva de seis años con tres avisos por año y una caída real del 10 % anual: es el mínimo que
 * `annualDropOf` acepta (seis puntos y cinco años de tramo), así que también prueba que el informe
 * no aflojó por su cuenta la guarda de la función compartida.
 */
function curva(): MotoListing[] {
  const prices: Record<number, number> = { 2025: 3_000, 2024: 2_700, 2023: 2_430, 2022: 2_187, 2021: 1_968, 2020: 1_771 };
  const rows: MotoListing[] = [];
  for (const [year, price] of Object.entries(prices)) {
    for (let index = 0; index < 3; index++) {
      rows.push(listing({ id: `${year}${index}0001`, year: Number(year), price, sellerId: `${year}-${index}` }));
    }
  }
  return rows;
}

describe("depreciación", () => {
  it("la mide con la misma recta que el informe de autos", () => {
    const report = buildMotoReport(curva(), { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 0, withoutDisplacementBand: 0 });
    expect(report.depreciation).toHaveLength(1);
    expect(report.depreciation[0]!.slug).toBe("honda-xr-150");
    expect(report.depreciation[0]!.annualDrop).toBeCloseTo(0.1, 2);
    expect(report.depreciation[0]!.points).toHaveLength(6);
  });

  it("un modelo con pocos avisos no publica depreciación en vez de publicar una inventada", () => {
    const pocos = curva().slice(0, MOTO_REPORT_POLICY.minimumAdverts - 1);
    const report = buildMotoReport(pocos, { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 0, withoutDisplacementBand: 0 });
    expect(report.depreciation).toEqual([]);
  });

  it("sin tramo suficiente tampoco publica una caída", () => {
    // Doce avisos, pero todos de dos años: `annualDropOf` exige cinco años de tramo.
    const planos = [
      ...Array.from({ length: 6 }, (_value, index) => listing({ id: `6000${index}`, year: 2024, sellerId: `a${index}` })),
      ...Array.from({ length: 6 }, (_value, index) => listing({ id: `6100${index}`, year: 2023, sellerId: `b${index}` })),
    ];
    expect(buildMotoReport(planos, { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 0, withoutDisplacementBand: 0 }).depreciation).toEqual([]);
  });
});

describe("composición", () => {
  it("usa los tres tramos de cilindrada del propio Mercado Libre", () => {
    const rows = [
      listing({ id: "700001", title: "Honda Wave 110 Cc", price: 900 }),
      listing({ id: "700002", title: "Honda Xr 150 Cc", price: 2_000 }),
      listing({ id: "700003", title: "Honda Cb 500 Cc", price: 6_000 }),
      listing({ id: "700004", title: "Honda sin cilindrada declarada", price: 2_500 }),
    ];
    const report = buildMotoReport(rows, { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 1, withoutDisplacementBand: 1 });
    expect(report.displacements.map(band => [band.band, band.adverts])).toEqual([
      ["hasta-125", 1],
      ["126-250", 1],
      ["mas-250", 1],
      // El que no declara nada NO desaparece: aparece declarado como lo que es.
      ["sin-dato", 1],
    ]);
  });

  it("las eléctricas quedan fuera de las medianas del informe", () => {
    const rows = [
      ...Array.from({ length: 4 }, (_value, index) => listing({ id: `8000${index}`, price: 3_000, sellerId: `n${index}` })),
      listing({ id: "810001", price: 700, fuel: "electrica", title: "Honda Xr Eléctrica" }),
    ];
    const report = buildMotoReport(rows, { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 0, withoutDisplacementBand: 0 });
    expect(report.adverts).toBe(4);
    expect(report.brands[0]!.medianUsd).toBe(3_000);
    // Pero el reparto de combustibles SÍ las cuenta: el informe dice que existen, no las esconde.
    expect(report.fuels.find(row => row.fuel === "electrica")!.adverts).toBe(1);
  });

  it("separa automotora de dueño directo, y dice cuántos no lo declaran", () => {
    const rows = [
      listing({ id: "900001", sellerType: "dealer", price: 3_500 }),
      listing({ id: "900002", sellerType: "private", price: 3_000 }),
      listing({ id: "900003", sellerType: null, price: 3_200 }),
    ];
    const report = buildMotoReport(rows, { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 0, withoutDisplacementBand: 0 });
    expect(report.sellers.map(row => row.sellerType).sort()).toEqual(["dealer", "private", "sin-dato"]);
  });

  it("cada presupuesto dice qué compra", () => {
    const rows = [listing({ id: "910001", price: 900 }), listing({ id: "910002", price: 5_000 })];
    const report = buildMotoReport(rows, { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 0, withoutDisplacementBand: 0 });
    expect(report.budgets.find(budget => budget.maxUsd === 1_000)!.adverts).toBe(1);
    expect(report.budgets.find(budget => budget.maxUsd === 6_000)!.adverts).toBe(2);
  });
});

describe("lo que el informe NO dice", () => {
  it("declara que mide oferta y no ventas, y cuántos avisos no dicen su cilindrada", () => {
    const report = buildMotoReport(curva(), { generatedAt: SEEN, usdUyu: 42, withoutDisplacement: 37, withoutDisplacementBand: 4 });
    expect(report.caveats.some(text => /OFERTA, no ventas/.test(text))).toBe(true);
    expect(report.caveats.some(text => text.includes("37 avisos no la declaran"))).toBe(true);
    expect(report.caveats.some(text => text.includes("falta en 4"))).toBe(true);
    expect(report.caveats.some(text => /No se publican oportunidades/.test(text))).toBe(true);
    expect(report.caveats.some(text => /no se publica cuánto tarda en venderse/i.test(text))).toBe(true);
  });
});
