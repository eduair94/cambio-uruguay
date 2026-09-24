import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CAR_PARTS, type CarPartsRecord } from "../../classes/autos/repuestos";
import { harvestParts, partsSearchUrl, planPartsTargets, type MlPartsPage } from "../../classes/autos/repuestosHarvest";

const ROOT = path.join(__dirname, "..", "..");
const now = new Date("2026-09-24T02:11:00.000Z");
const model = (marketSlug: string, adverts: number) => ({ marketSlug, brand: "Chevrolet", model: "Onix", adverts });
const readAgo = (marketSlug: string, days: number): CarPartsRecord => ({
  marketSlug, brand: "Chevrolet", model: "Onix", readAt: new Date(now.getTime() - days * 86_400_000).toISOString(), parts: [],
});

describe("partsSearchUrl", () => {
  it("busca la pieza con marca y modelo dentro de su categoría", () => {
    const url = partsSearchUrl(CAR_PARTS[0]!, "Volkswagen", "Up!", "http://bridge/mercadolibre");
    expect(url).toContain("http://bridge/mercadolibre/search?");
    expect(url).toContain("category=MLU62414");
    expect(decodeURIComponent(url)).toContain("q=pastillas+freno+Volkswagen+Up");
  });
});

describe("planPartsTargets", () => {
  it("primero lo nunca leído, después lo más viejo, y lo fresco no se relee", () => {
    const previous = new Map([
      ["viejo", readAgo("viejo", 20)],
      ["menos-viejo", readAgo("menos-viejo", 16)],
      ["fresco", readAgo("fresco", 10)],
    ]);
    const plan = planPartsTargets([model("fresco", 900), model("menos-viejo", 800), model("viejo", 50), model("nuevo", 20)], previous, now);
    expect(plan.map(target => target.marketSlug)).toEqual(["nuevo", "viejo", "menos-viejo"]);
  });
});

const page = (results: Array<[string, number, string, string?]>): MlPartsPage => ({
  paging: { total: results.length },
  results: results.map(([title, amount, currency, condition], index) => ({
    id: `MLU${index}`, title, condition: condition ?? "Nuevo", price: { amount, currency }, seller: { id: index % 2 },
  })),
});

describe("harvestParts", () => {
  const onixPads = page([
    ["Pastillas Freno Chevrolet Onix 1.0 Delantera", 800, "UYU"],
    ["Kit Pastillas Freno Delantero Chevrolet Onix / Prisma", 1000, "UYU"],
    ["Pastillas Freno Chevrolet Onix Del.", 30, "USD"],
    ["Pastillas Freno Chevrolet Onix Trasera", 5000, "UYU"],
    ["Pastillas Freno Chevrolet Prisma", 9000, "UYU"],
  ]);

  it("guarda la mediana en pesos, convierte dólares y descarta lo que no es la pieza del modelo", async () => {
    const result = await harvestParts([model("chevrolet-onix", 600)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now,
      fetchPage: async url => (url.includes("MLU62414") ? onixPads : page([])),
    });
    expect(result.requests).toBe(6);
    expect(result.records).toHaveLength(1);
    const pads = result.records[0]!.parts.find(part => part.key === "pastillas")!;
    expect(pads).toMatchObject({ median: 1000, offers: 3 });
    expect(result.records[0]!.parts).toHaveLength(1);
  });

  it("tres pedidos sin respuesta cortan la corrida y no guardan un modelo a medias", async () => {
    let calls = 0;
    const result = await harvestParts([model("chevrolet-onix", 600), model("otro", 10)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now,
      fetchPage: async () => (++calls <= 2 ? onixPads : null),
    });
    expect(result.records).toEqual([]);
    expect(result.note).toBe("puente sin respuesta");
    expect(calls).toBe(5);
  });

  it("sin presupuesto de tiempo no empieza el modelo siguiente", async () => {
    const result = await harvestParts([model("a", 10), model("b", 10)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 0, now, fetchPage: async () => onixPads,
    });
    expect(result.records).toEqual([]);
    expect(result.note).toBe("presupuesto agotado");
  });
});

describe("currency-autos-parts wiring", () => {
  it("corre a diario a las 02:11 UTC y arranca con el deploy", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require(path.join(ROOT, "ecosystem.config.js")).apps.find((entry: { name: string }) => entry.name === "currency-autos-parts");
    expect(app).toMatchObject({ script: "dist/sync_autos_parts.js", autorestart: false, exec_mode: "fork", cron_restart: "11 2 * * *" });
    expect(fs.readFileSync(path.join(ROOT, "scripts/deploy-backend.sh"), "utf8")).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos-parts\b[^)]*\)/);
  });
});
