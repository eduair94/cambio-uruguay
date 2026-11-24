import { describe, expect, it } from "vitest";
import { buildComputerCatalog, readListings } from "../../classes/computadoras/catalog";
import { readNotebookLine } from "../../classes/computadoras/notebook";
import { OPPORTUNITY_POLICY, capBySeller, opportunityOf, type OpportunityInput } from "../../classes/computadoras/opportunity";
import { buildNotebookReport, REPORT_POLICY } from "../../classes/computadoras/report";
import { readComputerSpecs } from "../../classes/computadoras/specs";
import { norm } from "../../classes/computadoras/text";
import type { FacebookComputerDetail, RawComputerListing, Valuation } from "../../classes/computadoras/types";

// Títulos reales de Mercado Libre y Facebook Marketplace (corrida del 24/11/2026).
const line = (title: string) => readNotebookLine(norm(title));

describe("la línea de una notebook", () => {
  it("MacBook Air y Pro, con el año del título", () => {
    expect(line("Apple Macbook Air 13 Pulgadas 2017, 8gb Ram, 128gb")).toMatchObject({ line: "macbook-air", lineLabel: "MacBook Air", modelYear: 2017, brand: "Apple" });
    expect(line("Macbook Pro (retina, 13-inch, Late 2012) 8gb Ram")).toMatchObject({ line: "macbook-pro", modelYear: 2012 });
    expect(line("Mackbook Pro 14 Chip M4 Pro Negra, 24 Ram 512gb")).toMatchObject({ line: "macbook-pro", modelYear: null });
    // La resolución y el número de modelo no son un año.
    expect(line("Apple Macbook Air A2179 Plata 13.3  2560 X 1600 Px Intel 8gb")?.modelYear).toBeNull();
  });

  it("líneas con su modelo, también sin la palabra de la línea", () => {
    expect(line("Lenovo Thinkpad T490 - Core I5 / 16gb Ram / 256gb Ssd")).toMatchObject({ line: "thinkpad", model: "T490" });
    expect(line("Notebook Lenovo T480 Core i5 8va 16GB DDR4 M.2 SSD 512GB Win 11")).toMatchObject({ line: "thinkpad", model: "T480" });
    expect(line("Lenovo Ideapad 3 N4020 4gb 32gb Ssd Gris Platino")).toMatchObject({ line: "ideapad", model: "3" });
    expect(line("Laptop Lenovo ideapad S145 - con cargador")).toMatchObject({ line: "ideapad", model: "S145" });
    expect(line("Notebook Dell Latitude  E5530 Core I5  Ssd 250gb Win 10 Pro")).toMatchObject({ line: "latitude", model: "E5530" });
    expect(line("Notebook Gamer Acer Nitro I5/ 32gb Ram/ 1.5 Tb Ssd Gtx 1650")).toMatchObject({ line: "nitro", brand: "Acer" });
    expect(line("Asus Rog Strix G16 Core I9")).toMatchObject({ line: "rog", model: "Strix" });
  });

  it("sin línea reconocible, null", () => {
    expect(line("Notebook Portátil 15.6  Negro Con Windows 11")).toBeNull();
    expect(line("Laptop gamer")).toBeNull();
  });

  it("el accesorio que nombra la notebook a la que va no es una notebook", () => {
    expect(readComputerSpecs({ title: "Combo PC / Gamer: Auriculares Redragon + Mouse Lenovo + Funda Notebook 15.6", mlCategory: "MLU1652" })).toMatchObject({ kind: null, rejectReason: "accesorio" });
    expect(readComputerSpecs({ title: "Repuestos Notebook Olidata X300c", mlCategory: "MLU1652" }).kind).toBeNull();
    // Con procesador o memoria declarados es la máquina con su accesorio.
    expect(readComputerSpecs({ title: "Notebook Hp Envy 15 + Batería Extra + Cargador Original", mlCategory: "MLU1652" }).kind).toBe("notebook");
  });
});

const base: OpportunityInput = {
  kind: "notebook",
  source: "mercadolibre",
  priceUsd: 700,
  currencyInferred: false,
  faults: [],
  detailRead: false,
  ageDays: 0,
  valuation: null,
  comparables: { label: "MacBook Air con Apple M2", medianUsd: 1000, n: 8, basis: "line", strict: true },
};

describe("qué es una oportunidad", () => {
  it("entre el 45 % y el 85 % de su referencia, con evidencia sólida o exploratoria", () => {
    expect(opportunityOf(base)).toMatchObject({ tier: "solida", reference: "comparables", referenceUsd: 1000, n: 8, savingsUsd: 300, savingsPct: 0.3 });
    expect(opportunityOf({ ...base, comparables: { ...base.comparables!, n: 5 } })?.tier).toBe("exploratoria");
    expect(opportunityOf({ ...base, comparables: { ...base.comparables!, strict: false } })?.tier).toBe("exploratoria");
  });

  it("un precio demasiado bajo no es una oportunidad, ni uno apenas por debajo", () => {
    expect(opportunityOf({ ...base, priceUsd: 400 })).toBeNull();
    expect(opportunityOf({ ...base, priceUsd: 900 })).toBeNull();
    expect(OPPORTUNITY_POLICY).toMatchObject({ minRatio: 0.45, maxRatio: 0.85 });
  });

  it("nunca con una falla declarada, moneda deducida, aviso viejo o Facebook sin ficha", () => {
    expect(opportunityOf({ ...base, faults: ["no-enciende"] })).toBeNull();
    expect(opportunityOf({ ...base, currencyInferred: true })).toBeNull();
    expect(opportunityOf({ ...base, ageDays: 2 })).toBeNull();
    expect(opportunityOf({ ...base, source: "facebook", detailRead: false })).toBeNull();
    expect(opportunityOf({ ...base, source: "facebook", detailRead: true })).not.toBeNull();
    expect(opportunityOf({ ...base, comparables: { ...base.comparables!, n: 3 } })).toBeNull();
  });

  it("una PC se compara contra sus piezas con precio usado REAL, sin las supuestas", () => {
    const part = (role: Valuation["parts"][number]["role"], usedUsd: number, extra: Partial<Valuation["parts"][number]> = {}): Valuation["parts"][number] => ({ role, label: role, slug: `${role}:x`, estimated: false, newUsd: usedUsd * 2, usedUsd, newN: 5, usedN: 4, usedFromNew: false, ...extra });
    const valuation: Valuation = {
      parts: [part("cpu", 80), part("gpu", 100), part("ram", 50), part("storage", 30), part("motherboard", 70, { estimated: true, usedFromNew: true }), part("psu", 50, { estimated: true, usedFromNew: true }), part("case", 40, { estimated: true, usedFromNew: true })],
      newTotalUsd: 840,
      usedTotalUsd: 420,
      newPartialUsd: 840,
      usedPartialUsd: 420,
      missingNew: [],
      missingUsed: [],
      ratio: 0.5,
      reference: "used",
      verdict: "muy-por-debajo",
      sameNew: null,
    };
    // Las cuatro declaradas suman 260: pedir 200 es pedir menos que ellas solas.
    const found = opportunityOf({ ...base, kind: "desktop", priceUsd: 200, comparables: null, valuation });
    expect(found).toMatchObject({ tier: "solida", reference: "used", referenceUsd: 260, savingsUsd: 60 });
    expect(found?.referenceLabel).toContain("sin contar mother, fuente ni gabinete");
    // Contra el total con las supuestas a precio nuevo (420) 300 parecería barato; contra las reales no.
    expect(opportunityOf({ ...base, kind: "desktop", priceUsd: 300, comparables: null, valuation })).toBeNull();
  });

  it("los particulares de ML sin id no son un solo vendedor; una tienda sí tiene tope", () => {
    const rows = [
      ...[0.5, 0.4, 0.3, 0.2].map((savingsPct, index) => ({ slug: `tienda-${index}`, sellerId: "ml:n:una-tienda", savingsPct })),
      ...[0.3, 0.2, 0.2, 0.2, 0.2].map((savingsPct, index) => ({ slug: `particular-${index}`, sellerId: "ml:unknown", savingsPct })),
    ];
    const kept = capBySeller(rows);
    expect([...kept].filter((slug) => slug.startsWith("tienda")).sort()).toEqual(["tienda-0", "tienda-1", "tienda-2"]);
    expect([...kept].filter((slug) => slug.startsWith("particular")).length).toBe(5);
  });
});

describe("el catálogo con línea, cohortes y oportunidades", () => {
  let serial = 200000001;
  const ml = (title: string, price: number, category = "MLU1652"): RawComputerListing => {
    const id = `MLU${serial++}`;
    return { slug: `ml-${id}`, source: "mercadolibre", sourceId: id, url: `https://articulo.mercadolibre.com.uy/${id}`, title, price, currency: "USD", image: null, location: null, category, condition: "Usado", officialStore: false, sellerId: "ml:unknown", firstSeen: "2026-11-24", lastSeen: "2026-11-24" };
  };
  const listings = [
    ...[1000, 1050, 1100, 1049, 990, 1080].map((price) => ml("Macbook Air M2 2022 13,6 8gb Ram 256gb Ssd", price)),
    ml("Macbook Air M2 2022 256gb Space Gray Batería 96%", 700),
    ...[900, 880, 920, 950, 910, 905].map((price) => ml("Macbook Pro M2 2022 13 8gb 256gb", price)),
    ...[1000, 1100, 1050, 980].map((price) => ml("Apple iMac 24 M1 8gb Ram 256gb Ssd", price, "MLU443594")),
    ...[500, 520, 480, 510].map((price) => ml("Mac Mini Apple M1 8gb 256gb", price, "MLU407379")),
    ...[250, 240, 260, 255].map((price) => ml("Apple Macbook Air 2015 13 Core I5", price)),
  ];
  const rows = buildComputerCatalog({ read: readListings(listings, new Map<string, FacebookComputerDetail>()), table: new Map(), notebookRefs: new Map(), usdUyu: 40, day: "2026-11-24" });
  const byTitle = (title: string, price: number) => rows.find((row) => row.title === title && row.price === price)!;

  it("un Mac se compara dentro de su línea: la Air M2 no se mide contra la Pro M2", () => {
    const air = byTitle("Macbook Air M2 2022 256gb Space Gray Batería 96%", 700);
    expect(air).toMatchObject({ line: "macbook-air", lineLabel: "MacBook Air", modelYear: 2022 });
    expect(air.comparables).toMatchObject({ label: "MacBook Air con Apple M2", basis: "line", n: 7 });
    expect(air.opportunity).toMatchObject({ tier: "solida", reference: "comparables" });
    expect(air.comparables).not.toHaveProperty("strict");
  });

  it("un Mac mini y un iMac con el mismo chip no son iguales", () => {
    const mini = byTitle("Mac Mini Apple M1 8gb 256gb", 500);
    expect(mini.comparables).toMatchObject({ n: 4 });
    expect(mini.comparables!.medianUsd).toBeLessThan(600);
    expect(mini.opportunity).toBeNull();
  });

  it("Mac sin chip: la línea y el año del título, y esa comparación es exploratoria", () => {
    const old = byTitle("Apple Macbook Air 2015 13 Core I5", 250);
    expect(old.comparables).toMatchObject({ label: "MacBook Air de 2015", basis: "line" });
  });

  it("el informe: muestra mínima, escalera de MacBook y franjas", () => {
    const report = buildNotebookReport(rows, new Map([["notebook:macbook-air|cpu:apple-m2", { label: "MacBook Air nueva con Apple M2", medianUsd: 1500, n: 6 }]]), "2026-11-24T00:00:00.000Z")!;
    expect(report.total).toBe(rows.filter((row) => row.kind === "notebook").length);
    expect(report.minSample).toBe(REPORT_POLICY.minSample);
    expect(report.macLadder.map((step) => [step.label, step.n, step.kind])).toEqual([
      ["MacBook Air M2", 7, "chip"],
      ["MacBook Pro M2", 6, "chip"],
    ]);
    // Cuatro MacBook Air 2015 no llegan a la muestra de la escalera (5).
    expect(report.macLadder.some((step) => step.label === "MacBook Air 2015")).toBe(false);
    expect(report.brands).toEqual([expect.objectContaining({ label: "Apple", n: 17 })]);
    expect(report.priceBands.reduce((total, band) => total + band.n, 0)).toBe(report.total);
    expect(report.usedVsNew).toEqual([expect.objectContaining({ label: "MacBook Air con Apple M2", newUsd: 1500, usedN: 7 })]);
    expect(report.headline.appleShare).toBe(1);
  });

  it("sin muestra no hay informe", () => {
    expect(buildNotebookReport(rows.slice(0, 3), new Map(), "2026-11-24T00:00:00.000Z")).toBeNull();
  });
});
