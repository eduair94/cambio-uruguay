import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CAR_PARTS, type CarPartsRecord } from "../../classes/autos/repuestos";
import {
  harvestParts, partsSearchUrl, planPartsTargets, shouldReplacePartsRecord, type MlPartsPage,
} from "../../classes/autos/repuestosHarvest";

const ROOT = path.join(__dirname, "..", "..");
const now = new Date("2026-09-24T02:11:00.000Z");
const model = (marketSlug: string, adverts: number) => ({ marketSlug, brand: "Chevrolet", model: "Onix", adverts });
const readAgo = (marketSlug: string, days: number): CarPartsRecord => ({
  marketSlug, brand: "Chevrolet", model: "Onix", readAt: new Date(now.getTime() - days * 86_400_000).toISOString(), parts: [],
});
const categoryOf = (url: string): string => new URL(url).searchParams.get("category") ?? "";

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

type Row = [title: string, amount: number, currency: string, seller?: number | null];
const page = (category: string, results: Row[]): MlPartsPage => ({
  paging: { total: results.length },
  filters: [{ id: "category", values: [{ id: category }] }],
  results: results.map(([title, amount, currency, seller], index) => ({
    id: `MLU${category}${index}`, title, condition: "Nuevo", price: { amount, currency },
    ...(seller === null ? {} : { seller: { id: seller ?? index % 2 } }),
  })),
});

const PADS: Row[] = [
  ["Pastillas Freno Chevrolet Onix 1.0 Delantera", 800, "UYU"],
  ["Kit Pastillas Freno Delantero Chevrolet Onix / Prisma", 1000, "UYU"],
  ["Pastillas Freno Chevrolet Onix Del.", 30, "USD"],
  ["Pastillas Freno Chevrolet Onix Trasera", 5000, "UYU"],
  ["Pastillas Freno Chevrolet Prisma", 9000, "UYU"],
];
const onlyPads = async (url: string) => page(categoryOf(url), categoryOf(url) === "MLU62414" ? PADS : []);

describe("harvestParts", () => {
  it("guarda la mediana en pesos, convierte dólares y descarta lo que no es la pieza del modelo", async () => {
    const result = await harvestParts([model("chevrolet-onix", 600)], { usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now, fetchPage: onlyPads });
    expect(result.requests).toBe(6);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.parts).toHaveLength(1);
    expect(result.records[0]!.parts[0]).toMatchObject({ key: "pastillas", median: 1000, offers: 3 });
  });

  it("tres pedidos sin respuesta cortan la corrida y no guardan un modelo a medias", async () => {
    let calls = 0;
    const result = await harvestParts([model("chevrolet-onix", 600), model("otro", 10)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now,
      fetchPage: async url => (++calls <= 2 ? onlyPads(url) : null),
    });
    expect(result.records).toEqual([]);
    expect(result.note).toBe("puente sin respuesta");
    expect(calls).toBe(5);
  });

  it("una respuesta sin lista de resultados es una falla, no cero ofertas", async () => {
    const result = await harvestParts([model("chevrolet-onix", 600)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now, fetchPage: async () => ({ error: "degraded" } as MlPartsPage),
    });
    expect(result.records).toEqual([]);
    expect(result.note).toBe("puente sin respuesta");
  });

  it("una página que no aplicó la categoría pedida no cuenta", async () => {
    const result = await harvestParts([model("chevrolet-onix", 600)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now, fetchPage: async () => page("MLU1747", PADS),
    });
    expect(result.records).toEqual([]);
  });

  it("sin vendedor identificado, todas las ofertas cuentan como un solo vendedor", async () => {
    const anonymous = PADS.map(([title, amount, currency]): Row => [title, amount, currency, null]);
    const result = await harvestParts([model("chevrolet-onix", 600)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 60_000, now,
      fetchPage: async url => page(categoryOf(url), categoryOf(url) === "MLU62414" ? anonymous : []),
    });
    expect(result.records[0]!.parts).toEqual([]);
  });

  it("sin presupuesto de tiempo no empieza el modelo siguiente", async () => {
    const result = await harvestParts([model("a", 10), model("b", 10)], { usdUyu: 40, gapMs: 0, maxDurationMs: 0, now, fetchPage: onlyPads });
    expect(result.records).toEqual([]);
    expect(result.note).toBe("presupuesto agotado");
  });

  it("el tope de reloj se mira en cada pedido, no sólo entre modelos", async () => {
    let calls = 0;
    const result = await harvestParts([model("a", 10)], {
      usdUyu: 40, gapMs: 0, maxDurationMs: 40, now,
      fetchPage: async url => {
        calls++;
        await new Promise(resolve => setTimeout(resolve, 25));
        return onlyPads(url);
      },
    });
    expect(calls).toBeLessThan(6);
    expect(result.records).toEqual([]);
    expect(result.note).toBe("presupuesto agotado");
  });
});

describe("shouldReplacePartsRecord", () => {
  const priced = (count: number): CarPartsRecord => ({
    ...readAgo("x", 20),
    parts: CAR_PARTS.slice(0, count).map(part => ({ key: part.key, median: 1000, p25: 900, p75: 1100, offers: 5, sellers: 3 })),
  });
  it("una lectura flaca no pisa una buena", () => {
    expect(shouldReplacePartsRecord(priced(5), priced(1))).toBe(false);
    expect(shouldReplacePartsRecord(priced(5), priced(3))).toBe(true);
    expect(shouldReplacePartsRecord(priced(2), priced(0))).toBe(true);
    expect(shouldReplacePartsRecord(undefined, priced(0))).toBe(true);
  });
});

describe("currency-autos-parts wiring", () => {
  it("corre tres veces por día en los huecos del puente y arranca con el deploy", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require(path.join(ROOT, "ecosystem.config.js")).apps.find((entry: { name: string }) => entry.name === "currency-autos-parts");
    expect(app).toMatchObject({ script: "dist/sync_autos_parts.js", autorestart: false, exec_mode: "fork", cron_restart: "11 2,18,22 * * *" });
    expect(fs.readFileSync(path.join(ROOT, "scripts/deploy-backend.sh"), "utf8")).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos-parts\b[^)]*\)/);
  });
});
