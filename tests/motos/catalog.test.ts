// El catálogo público: la proyección campo por campo, las bandas y las cohortes.
import { describe, expect, it } from "vitest";
import {
  MOTO_BAND_MIN,
  bandEligible,
  buildMotoCatalog,
  buildMotoModels,
  motoModelSlug,
  motoSourceCoverage,
  propulsionOf,
  publicMotoListing,
} from "../../classes/motos/catalog";
import { dedupeMotos, enrichMotoListing } from "../../classes/motos/enrich";
import type { MotoListing, RawMotoListing } from "../../classes/motos/types";

const NOW = new Date("2026-09-22T12:00:00.000Z");
const SEEN = "2026-09-22T11:00:00.000Z";

const raw = (over: Partial<RawMotoListing> & { id: string }): RawMotoListing => ({
  source: "mercadolibre",
  brandId: "2102273",
  brand: "Yumbo",
  modelId: "8801",
  model: "GS 200",
  title: "Yumbo Gs 200 Cc 2020",
  year: 2020,
  km: 12_000,
  price: 1_500,
  currency: "USD",
  fuel: "nafta",
  neighborhood: "Cordón",
  department: "Montevideo",
  sellerType: "private",
  sellerId: "1",
  picture: "https://http2.mlstatic.com/D_1-O.webp",
  pictureCount: 5,
  permalink: `https://moto.mercadolibre.com.uy/MLU-${over.id}-yumbo-gs-200-_JM`,
  observedAt: SEEN,
  ...over,
});

const listing = (over: Partial<RawMotoListing> & { id: string }, usdUyu = 42): MotoListing =>
  enrichMotoListing(raw(over), { usdUyu, firstSeen: SEEN, lastSeen: SEEN, priceHistory: [] });

const many = (count: number, over: (index: number) => Partial<RawMotoListing> & { id: string }): MotoListing[] =>
  Array.from({ length: count }, (_value, index) => listing(over(index)));

describe("la fila pública", () => {
  it("se arma campo por campo: el id del vendedor no cruza", () => {
    const row = publicMotoListing(listing({ id: "100001" }));
    expect(row).not.toBeNull();
    expect(Object.keys(row!)).not.toContain("sellerId");
    expect(Object.keys(row!)).not.toContain("brandId");
    expect(Object.keys(row!)).not.toContain("modelId");
  });

  it("le saca el teléfono al título antes de publicarlo", () => {
    const row = publicMotoListing(listing({ id: "100002", title: "Yumbo Gs 200 Cc 2020 llamar al 099 123 456" }));
    expect(row!.title).not.toMatch(/099/);
  });

  it("un kilometraje que es un placeholder se publica como ausente, no como 1", () => {
    expect(publicMotoListing(listing({ id: "100003", km: 1 }))!.km).toBeNull();
    expect(publicMotoListing(listing({ id: "100004", km: 111_111 }))!.km).toBeNull();
    expect(publicMotoListing(listing({ id: "100005", km: 12_000 }))!.km).toBe(12_000);
  });

  it("vuelve a validar el permalink contra el host de la vertical de motos", () => {
    const otroHost = listing({ id: "100006" });
    expect(
      publicMotoListing({ ...otroHost, permalink: "https://auto.mercadolibre.com.uy/MLU-100006-un-auto-_JM" })
    ).toBeNull();
  });

  it("una foto de otro host no se publica", () => {
    const row = publicMotoListing(listing({ id: "100007", picture: "https://cdn.otro-sitio.com/foto.jpg" }));
    expect(row!.picture).toBeNull();
  });

  it("publica los cuatro campos del contrato del comparador de transporte", () => {
    // classes/transporte/prices.ts::readMotos los lee con estos nombres exactos.
    const row = publicMotoListing(listing({ id: "100008", price: 62_000, currency: "UYU" }))!;
    expect(row.price).toBe(62_000);
    expect(row.currency).toBe("UYU");
    expect(row.currencyInferred).toBe(false);
    expect(row.year).toBe(2020);
  });
});

describe("el catálogo", () => {
  it("deja afuera lo que no se ve hace más de cuatro días y cuenta lo que no declara cilindrada", () => {
    const fresco = listing({ id: "200001", title: "Yumbo Gs 200 Cc 2020" });
    const viejo = { ...listing({ id: "200002" }), lastSeen: "2026-09-10T00:00:00.000Z" };
    const sinCc = listing({ id: "200003", title: "Yumbo Gs 2020 impecable" });
    const catalog = buildMotoCatalog([fresco, viejo, sinCc], {
      now: NOW,
      generatedAt: NOW.toISOString(),
      usdUyu: 42,
      lastFullReadAt: SEEN,
      lastReadAt: SEEN,
      reportedTotal: 1_391,
      sources: [],
    });
    expect(catalog.listings.map(row => row.key).sort()).toEqual(["ml-200001", "ml-200003"]);
    expect(catalog.meta.withoutDisplacement).toBe(1);
    expect(catalog.meta.id).toBe("uy-motos");
    expect(catalog.meta.sourceCoverage).toBe("partial");
  });
});

describe("las bandas del modelo", () => {
  it("necesita el mínimo de avisos para publicar una banda", () => {
    const pocos = many(MOTO_BAND_MIN - 1, index => ({ id: `30000${index}` }));
    expect(buildMotoModels(pocos, { now: NOW, generatedAt: NOW.toISOString() })[0]!.band).toBeNull();

    const suficientes = many(MOTO_BAND_MIN, index => ({ id: `31000${index}`, sellerId: String(index) }));
    const banda = buildMotoModels(suficientes, { now: NOW, generatedAt: NOW.toISOString() })[0]!.band;
    expect(banda).not.toBeNull();
    expect(banda!.n).toBe(MOTO_BAND_MIN);
    expect(banda!.sellers).toBe(MOTO_BAND_MIN);
    expect(banda!.median).toBe(1_500);
  });

  it("un precio en pesos SÍ cuenta: si no, la banda se queda sin su tramo barato", () => {
    // Medido el 2026-09-22: los avisos en pesos son justo las Yumbo/Baccio/Zanella baratas.
    const dolares = many(4, index => ({ id: `32000${index}`, price: 3_000, sellerId: String(index) }));
    const pesos = many(4, index => ({ id: `33000${index}`, price: 42_000, currency: "UYU" as const, sellerId: `p${index}` }));
    const banda = buildMotoModels([...dolares, ...pesos], { now: NOW, generatedAt: NOW.toISOString() })[0]!.band!;
    expect(banda.n).toBe(8);
    // 42.000 pesos a 42 = US$ 1.000, así que el p25 tiene que estar en el tramo barato.
    expect(banda.p25).toBe(1_000);
    expect(banda.p75).toBe(3_000);
  });

  it("una moto eléctrica nunca entra a la misma banda que una de combustión", () => {
    const nafta = many(MOTO_BAND_MIN, index => ({ id: `34000${index}`, price: 3_000, sellerId: String(index) }));
    const electricas = many(MOTO_BAND_MIN, index => ({
      id: `35000${index}`,
      price: 800,
      fuel: "electrica" as const,
      title: "Yumbo Gs Eléctrica 2020",
      sellerId: `e${index}`,
    }));
    const models = buildMotoModels([...nafta, ...electricas], { now: NOW, generatedAt: NOW.toISOString() });
    expect(models).toHaveLength(2);
    const combustion = models.find(model => model.propulsion === "combustion")!;
    const electrica = models.find(model => model.propulsion === "electrica")!;
    expect(combustion.band!.median).toBe(3_000);
    expect(electrica.band!.median).toBe(800);
    expect(electrica.slug).toBe(motoModelSlug("yumbo-gs-200", "electrica"));
    expect(combustion.slug).not.toBe(electrica.slug);
  });

  it("una fila sin cilindrada declarada no entra a ninguna cohorte de cilindrada", () => {
    const conCc = many(MOTO_BAND_MIN, index => ({ id: `36000${index}`, title: "Yumbo Gs 200 Cc 2020", sellerId: String(index) }));
    const sinCc = many(MOTO_BAND_MIN, index => ({ id: `37000${index}`, title: "Yumbo Gs 2020", sellerId: `s${index}` }));
    const model = buildMotoModels([...conCc, ...sinCc], { now: NOW, generatedAt: NOW.toISOString() })[0]!;
    expect(model.displacements.map(band => band.displacement)).toEqual([200]);
    expect(model.displacements[0]!.n).toBe(MOTO_BAND_MIN);
    // Pero la banda del modelo sí los cuenta a todos: no declarar la cilindrada no borra el aviso.
    expect(model.band!.n).toBe(MOTO_BAND_MIN * 2);
  });

  it("la cohorte por año exige su propio mínimo", () => {
    const dosMil = many(MOTO_BAND_MIN, index => ({ id: `38000${index}`, year: 2020, sellerId: String(index) }));
    const unSolo = many(1, () => ({ id: "390001", year: 2015 }));
    const model = buildMotoModels([...dosMil, ...unSolo], { now: NOW, generatedAt: NOW.toISOString() })[0]!;
    expect(model.years.map(band => band.year)).toEqual([2020]);
  });

  it("la mediana de kilómetros no se publica con menos de tres declarados de verdad", () => {
    const sinKm = many(MOTO_BAND_MIN, index => ({ id: `40000${index}`, km: 1, sellerId: String(index) }));
    expect(buildMotoModels(sinKm, { now: NOW, generatedAt: NOW.toISOString() })[0]!.band!.kmMedian).toBeNull();
  });

  it("un aviso que el vendedor declara chocado no entra a la banda", () => {
    const limpias = many(MOTO_BAND_MIN, index => ({ id: `41000${index}`, sellerId: String(index) }));
    const chocada = listing({ id: "420001", title: "Yumbo Gs 200 Cc 2020 chocada, a reparar", price: 300 });
    expect(bandEligible(chocada)).toBe(false);
    const model = buildMotoModels([...limpias, chocada], { now: NOW, generatedAt: NOW.toISOString() })[0]!;
    expect(model.band!.n).toBe(MOTO_BAND_MIN);
    expect(model.listings).toBe(MOTO_BAND_MIN + 1);
  });

  it("clasifica la propulsión por lo declarado, y lo no declarado no es eléctrico", () => {
    expect(propulsionOf({ fuel: "electrica" })).toBe("electrica");
    expect(propulsionOf({ fuel: null })).toBe("combustion");
    expect(propulsionOf({ fuel: "nafta" })).toBe("combustion");
  });
});

describe("cobertura y duplicados", () => {
  it("publica qué fuente se leyó, cuándo y cuántos duplicados descartó", () => {
    const rows = [publicMotoListing(listing({ id: "500001" }))!];
    const coverage = motoSourceCoverage(rows, { mercadolibre: 2 }, new Map([["mercadolibre", { lastOkAt: SEEN, ok: true }]]));
    expect(coverage).toEqual([
      { source: "mercadolibre", name: "Mercado Libre", listings: 1, duplicates: 2, lastReadAt: SEEN, ok: true },
    ]);
  });

  it("con una sola fuente, nada se descarta como copia", () => {
    const iguales = many(3, index => ({ id: `51000${index}` }));
    const result = dedupeMotos(iguales);
    expect(result.kept).toHaveLength(3);
    expect(result.duplicates).toEqual({});
  });
});
