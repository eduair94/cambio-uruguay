import { describe, expect, it } from "vitest";
import { readCurrency, textSaysUsd } from "../../classes/computadoras/currency";
import { buildPartTable, PART_MIN, partIdentityOf, partsOf, psuFor } from "../../classes/computadoras/parts";
import { buildPresets } from "../../classes/computadoras/presets";
import { facebookDetailFromTexts, facebookDetailTargets } from "../../classes/computadoras/sources/facebook";
import { readComputerSpecs } from "../../classes/computadoras/specs";
import type { FacebookComputerDetail, PartObservation, PartRow, RawComputerListing } from "../../classes/computadoras/types";
import { valueListing, verdictOf } from "../../classes/computadoras/valuation";

const desktop = (title: string, description?: string) => readComputerSpecs({ title, description });

const obs = (slug: string, role: PartObservation["role"], priceUsd: number, sellerId: string, condition: "new" | "used" = "new"): PartObservation => ({
  slug, role, label: slug, facts: {}, condition, priceUsd, sellerId, title: `${slug} ${sellerId} ${priceUsd}`, url: "https://example.invalid/p", image: null,
});

/** Una tabla con lo justo para una PC de escritorio: precio nuevo y usado por identidad. */
function tableOf(prices: Record<string, { new?: number; used?: number; p25?: number }>): Map<string, PartRow> {
  const rows = new Map<string, PartRow>();
  for (const [slug, price] of Object.entries(prices)) {
    rows.set(slug, {
      slug,
      role: slug.split(":")[0] as PartRow["role"],
      label: slug,
      facts: {},
      new: price.new ? { medianUsd: price.new, p25Usd: price.p25 ?? price.new, minUsd: price.new, n: 5, sellers: 3, cheapest: null } : null,
      used: price.used ? { medianUsd: price.used, p25Usd: price.used, minUsd: price.used, n: 4 } : null,
      inCatalog: 1,
      history: [],
      updatedAt: "2026-11-23T00:00:00.000Z",
    });
  }
  return rows;
}

describe("las piezas de una PC", () => {
  it("declaradas y supuestas, con mother por socket, fuente por placa y gabinete", () => {
    const needs = partsOf(desktop("Pc Gamer I5 9400f, 16gb Ram Ddr4, Gtx 1050ti 4gb, Ssd 480gb."));
    expect(needs.map((need) => [need.role, need.slug, need.estimated])).toEqual([
      ["cpu", "cpu:i5-9400f", false],
      ["gpu", "gpu:gtx-1050-ti", false],
      ["ram", "ram:ddr4:16", false],
      ["storage", "storage:ssd:512", false],
      ["motherboard", "motherboard:socket-lga1151", true],
      ["psu", "psu:550", true],
      ["case", "case:basico", true],
    ]);
  });

  it("«i7» sin modelo y la placa que un procesador F necesita quedan sin identidad", () => {
    const needs = partsOf(desktop("Pc Gamer I7 2070rtx 32gb 1tb Ssd"));
    expect(needs.find((need) => need.role === "cpu")).toMatchObject({ slug: null, label: "Intel Core i7" });
    const noGpu = partsOf(desktop("Pc Gamer I5 12400f"));
    expect(noGpu.find((need) => need.role === "gpu")).toMatchObject({ slug: null, label: "Placa de video (no declarada)" });
  });

  it("una PC «sin disco» no inventa el disco", () => {
    expect(partsOf(desktop("Pc Gamer I7, Gtx 1050, Sin Disco")).some((need) => need.role === "storage")).toBe(false);
  });

  it("la fuente supuesta sube con la placa", () => {
    expect(psuFor(null)).toBe(500);
    expect(psuFor(desktop("pc rtx 3060 12gb").gpu)).toBe(650);
    expect(psuFor(desktop("pc rtx 4070 ti").gpu)).toBe(750);
    expect(psuFor(desktop("pc rtx 3090").gpu)).toBe(850);
  });

  it("una pieza suelta tiene una identidad exacta (y la base sin VRAM)", () => {
    const specs = readComputerSpecs({ title: "Tarjeta Gráfica / GPU - MSI VENTUS 2X RTX 3060 12GB" });
    expect(partIdentityOf(specs, "Tarjeta Gráfica / GPU - MSI VENTUS 2X RTX 3060 12GB").map((entry) => entry.slug)).toEqual(["gpu:rtx-3060-12gb", "gpu:rtx-3060"]);
    const notebookRam = readComputerSpecs({ title: "Memoria Notebook Sodimm Adata Premier 16gb Ddr4 3200 Mhz Cta", mlCategory: "MLU1694" });
    expect(partIdentityOf(notebookRam, "Memoria Notebook Sodimm Adata Premier 16gb Ddr4 3200 Mhz Cta")[0]?.slug).toBe("ram:ddr4-sodimm:16");
  });
});

describe("la tabla de precios", () => {
  it("publica la mediana nueva con 3 ofertas de 2 vendedores, y descarta lo que está fuera de ×3", () => {
    const newObservations = [obs("gpu:rtx-3060", "gpu", 400, "a"), obs("gpu:rtx-3060", "gpu", 420, "b"), obs("gpu:rtx-3060", "gpu", 440, "a"), obs("gpu:rtx-3060", "gpu", 40, "c")];
    const [row] = buildPartTable({ newObservations, usedObservations: [], previous: [], newOk: true, day: "2026-11-23" });
    expect(row).toMatchObject({ slug: "gpu:rtx-3060", new: { medianUsd: 420, n: 3, sellers: 2 } });
    expect(PART_MIN.newSellers).toBe(2);
  });

  it("un solo vendedor no alcanza, y una lectura caída conserva el precio nuevo anterior", () => {
    const one = buildPartTable({ newObservations: [obs("cpu:i5-12400f", "cpu", 230, "a"), obs("cpu:i5-12400f", "cpu", 240, "a"), obs("cpu:i5-12400f", "cpu", 250, "a")], usedObservations: [], previous: [], newOk: true, day: "2026-11-23" });
    expect(one).toEqual([]);
    const previous = [...tableOf({ "cpu:i5-12400f": { new: 240 } }).values()];
    const kept = buildPartTable({ newObservations: [], usedObservations: [], previous, newOk: false, day: "2026-11-24", usage: new Map([["cpu:i5-12400f", 3]]) });
    expect(kept[0]?.new?.medianUsd).toBe(240);
    expect(kept[0]?.history.at(-1)).toEqual({ day: "2026-11-24", newUsd: 240, usedUsd: null });
  });
});

describe("la valuación", () => {
  const specs = desktop("Pc Gamer I5 9400f, 16gb Ram Ddr4, Gtx 1050ti 4gb, Ssd 480gb.");
  const full = tableOf({
    "cpu:i5-9400f": { new: 150, used: 80 },
    "gpu:gtx-1050-ti": { new: 200, used: 100 },
    "ram:ddr4:16": { new: 120, used: 50 },
    "storage:ssd:512": { new: 60, used: 30 },
    "motherboard:socket-lga1151": { new: 90, p25: 70 },
    "psu:550": { new: 60, p25: 50 },
    "case:basico": { new: 50, p25: 40 },
  });

  it("los dos totales cuando todas las piezas tienen precio; las supuestas al cuartil bajo", () => {
    const valuation = valueListing({ specs, priceUsd: 300, table: full, comparables: null, sameNew: null, currencyInferred: false })!;
    expect(valuation.newTotalUsd).toBe(150 + 200 + 120 + 60 + 70 + 50 + 40);
    // Usadas: las declaradas a su usado; mother, fuente y gabinete al nuevo más barato.
    expect(valuation.usedTotalUsd).toBe(80 + 100 + 50 + 30 + 70 + 50 + 40);
    expect(valuation.parts.filter((part) => part.usedFromNew).map((part) => part.role)).toEqual(["motherboard", "psu", "case"]);
    expect(valuation).toMatchObject({ reference: "used", verdict: "por-debajo" });
  });

  it("sin total si una pieza declarada no tiene precio: el parcial no se presenta como total", () => {
    const partial = new Map(full);
    partial.delete("gpu:gtx-1050-ti");
    const valuation = valueListing({ specs, priceUsd: 300, table: partial, comparables: null, sameNew: null, currencyInferred: false })!;
    expect(valuation.newTotalUsd).toBeNull();
    expect(valuation.usedTotalUsd).toBeNull();
    expect(valuation.missingNew).toEqual([expect.stringContaining("GTX 1050 Ti")]);
    expect(valuation.verdict).toBeNull();
  });

  it("sin veredicto con moneda deducida o con una falla declarada", () => {
    expect(valueListing({ specs, priceUsd: 300, table: full, comparables: null, sameNew: null, currencyInferred: true })!.verdict).toBeNull();
    const broken = desktop("Pc Gamer I5 9400f, 16gb Ram Ddr4, Gtx 1050ti 4gb, Ssd 480gb. No enciende");
    expect(valueListing({ specs: broken, priceUsd: 300, table: full, comparables: null, sameNew: null, currencyInferred: false })!.verdict).toBeNull();
  });

  it("sin total de piezas, una PC se compara contra las iguales del directorio", () => {
    const sparse = desktop("Pc Gamer I5 9400f Gtx 1050ti");
    const valuation = valueListing({ specs: sparse, priceUsd: 270, table: full, comparables: { label: "PCs con i5-9400F y GTX 1050 Ti", medianUsd: 300, n: 5, basis: "cpu+gpu" }, sameNew: null, currencyInferred: false })!;
    expect(valuation.newTotalUsd).toBeNull();
    expect(valuation).toMatchObject({ reference: "comparables", ratio: 0.9, verdict: "parejo" });
    // Con menos de 4 iguales no hay contra qué comparar.
    expect(valueListing({ specs: sparse, priceUsd: 270, table: full, comparables: { label: "x", medianUsd: 300, n: 3, basis: "cpu" }, sameNew: null, currencyInferred: false })!.verdict).toBeNull();
  });

  it("tramos del veredicto: 60 %, 90 %, 110 %", () => {
    expect([0.5, 0.75, 1, 1.3].map(verdictOf)).toEqual(["muy-por-debajo", "por-debajo", "parejo", "por-encima"]);
  });

  it("una notebook se compara contra sus iguales, no se arma", () => {
    const notebook = readComputerSpecs({ title: "Lenovo Thinkpad T490 - Core I5 / 16gb Ram / 256gb Ssd", mlCategory: "MLU1652" });
    const valuation = valueListing({ specs: notebook, priceUsd: 320, table: full, comparables: { label: "x", medianUsd: 400, n: 6, basis: "model" }, sameNew: null, currencyInferred: false })!;
    expect(valuation).toMatchObject({ parts: [], reference: "comparables", verdict: "por-debajo", ratio: 0.8 });
  });
});

describe("las PCs tipo", () => {
  it("total sólo completo, y la mother sale del socket del procesador elegido", () => {
    const table = tableOf({
      "cpu:i5-12400f": { new: 240 },
      "gpu:rtx-5050": { new: 650 },
      "ram:ddr4:16": { new: 200 },
      "storage:nvme:1000": { new: 240 },
      "motherboard:h610": { new: 110, p25: 95 },
      "motherboard:b550": { new: 150, p25: 130 },
      "psu:600": { new: 70 },
      "case:basico": { new: 60, p25: 45 },
    });
    table.get("cpu:i5-12400f")!.facts = { socket: "LGA1700" };
    const entrada = buildPresets(table).find((preset) => preset.id === "gamer-entrada")!;
    expect(entrada.parts.find((part) => part.role === "motherboard")?.slug).toBe("motherboard:h610");
    expect(entrada.totalUsd).toBe(240 + 650 + 200 + 240 + 95 + 70 + 45);
    expect(buildPresets(table).find((preset) => preset.id === "gamer-media")!.totalUsd).toBeNull();
  });
});

describe("moneda de Facebook", () => {
  it("el texto lo dice", () => {
    expect(textSaysUsd("(USD) NOTEBOOK GAMER GIGABYTE AORUS XE15 / I7 12700H", 1290)).toBe(true);
    expect(textSaysUsd("MacBook Air M5 13” NUEVA A ESTRENAR 💰 US$ 1.350 — NO REBAJO", 1350)).toBe(true);
    expect(textSaysUsd("Notebook Lenovo $ 13.500", 13500)).toBe(false);
  });

  it("sólo cierra en dólares: se marca deducida", () => {
    expect(readCurrency({ amount: 950, currency: "UYU", text: "PC Gamer Ryzen 5 5600 | RTX 4060 8GB", referenceUsd: 900, usdUyu: 40 })).toEqual({ currency: "USD", inferred: true });
    expect(readCurrency({ amount: 4500, currency: "UYU", text: "Notebook DELL Inspiron 5559 i5 256 SSD", referenceUsd: 150, usdUyu: 40 })).toEqual({ currency: "UYU", inferred: false });
    expect(readCurrency({ amount: 950, currency: "UYU", text: "PC Gamer", referenceUsd: null, usdUyu: 40 })).toEqual({ currency: "UYU", inferred: false });
  });
});

describe("ficha de Facebook", () => {
  const text = JSON.stringify({
    data: {
      viewer: {
        marketplace_product_details_page: {
          target: {
            id: "1415127808355672",
            marketplace_listing_title: "PC GAMER I5 8400",
            redacted_description: { text: "Fuente Antec 650w\nMother z390" },
            creation_time: 1795468684,
            is_sold: false,
            attribute_data: [{ attribute_name: "Condition", value: "used_like_new", label: "Used - like new" }],
          },
        },
      },
    },
  });

  it("descripción, estado y fecha de publicación", () => {
    const detail = facebookDetailFromTexts("1415127808355672", [text], "2026-11-23T22:00:00.000Z");
    expect(detail).toMatchObject({ found: true, gone: false, description: "Fuente Antec 650w\nMother z390", attributes: { Condition: "used_like_new" } });
    expect(detail.createdAt).toBe(new Date(1795468684 * 1000).toISOString());
  });

  it("una página que no trajo el aviso no es un aviso borrado", () => {
    expect(facebookDetailFromTexts("999999999", [text], "2026-11-23T22:00:00.000Z")).toMatchObject({ found: false, gone: false });
  });

  it("primero las nunca leídas, después las viejas", () => {
    const raw = (id: string, firstSeen: string): RawComputerListing => ({ slug: `fb-${id}`, source: "facebook", sourceId: id, url: "", title: "pc", price: 1000, currency: "UYU", image: null, location: null, category: null, condition: null, officialStore: false, sellerId: null, firstSeen, lastSeen: firstSeen });
    const details = new Map<string, FacebookComputerDetail>([
      ["300000001", { id: "300000001", readAt: "2026-10-01T00:00:00.000Z", found: true, description: null, attributes: {}, createdAt: null, gone: false }],
      ["300000002", { id: "300000002", readAt: "2026-11-22T00:00:00.000Z", found: true, description: null, attributes: {}, createdAt: null, gone: false }],
    ]);
    const targets = facebookDetailTargets([raw("300000001", "2026-11-01"), raw("300000002", "2026-11-01"), raw("300000003", "2026-11-20"), raw("300000004", "2026-11-22")], details, new Date("2026-11-23T00:00:00Z"), 10);
    expect(targets.map((target) => target.sourceId)).toEqual(["300000004", "300000003", "300000001"]);
  });
});
