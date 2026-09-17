import { describe, expect, it, vi } from "vitest";

// recordPricewatch talks to the APP DB through this model; the calls are recorded, not executed.
const modelCalls = vi.hoisted(() => [] as string[]);
vi.mock("../../classes/models/PricewatchOffer", () => ({
  PricewatchOfferModel: {
    createIndexes: async () => {
      modelCalls.push("createIndexes");
    },
    bulkWrite: async () => {
      modelCalls.push("bulkWrite");
    },
    deleteMany: async (filter: unknown) => {
      modelCalls.push(`deleteMany ${JSON.stringify(filter)}`);
      return { deletedCount: 3 };
    },
  },
}));

import {
  applyHistory,
  pricewatchEligible,
  pricewatchOperation,
  pricewatchPruneFilter,
  recordPricewatch,
} from "../../classes/pricewatch/record";
import type { PricewatchPoint } from "../../classes/pricewatch/types";
import type { RetailListing } from "../../classes/retail/types";

const listing = (over: Partial<RetailListing> = {}): RetailListing => ({
  listingId: "store:bertoni:sofa-1",
  source: "store",
  sellerKey: "bertoni",
  sellerName: "Bertoni",
  channel: "local-store",
  title: "Sofá 3 cuerpos",
  url: "https://bertoni.uy/sofa-1",
  price: 25000,
  currency: "UYU",
  condition: "new",
  available: true,
  image: null,
  brand: "",
  model: "",
  catalogId: null,
  attributes: { CATEGORY_SPEC: "sofa" },
  rating: null,
  ratingCount: 0,
  location: null,
  freeShipping: null,
  officialStore: true,
  observedAt: "2026-09-16T00:00:00.000Z",
  ...over,
});

describe("pricewatchEligible", () => {
  it("descarta Facebook Marketplace: no hay precio de lista estable en un aviso particular", () => {
    expect(pricewatchEligible(listing({ source: "facebook", condition: "used" }))).toBe(false);
  });

  it("descarta un usado de MercadoLibre: el descuento de un usado no es contra un precio de estante", () => {
    expect(pricewatchEligible(listing({ source: "mercadolibre", condition: "used" }))).toBe(false);
  });

  it("acepta una tienda con condition desconocida — la mayoría de los adaptadores no la declaran", () => {
    expect(pricewatchEligible(listing({ source: "store", condition: "unknown" }))).toBe(true);
  });

  it("descarta precio 0: no es una oferta real", () => {
    expect(pricewatchEligible(listing({ price: 0 }))).toBe(false);
  });

  it("descarta un aviso sin url: no hay adónde volver a mirar el precio", () => {
    expect(pricewatchEligible(listing({ url: "" }))).toBe(false);
  });
});

describe("pricewatchOperation", () => {
  const today = "2026-09-16";

  it("arma un updateOne con filter por listingId y upsert true", () => {
    const op = pricewatchOperation(listing(), "equipar", today);
    expect(op.updateOne.filter).toEqual({ listingId: "store:bertoni:sofa-1" });
    expect(op.updateOne.upsert).toBe(true);
  });

  it("el update es un pipeline (array), no un documento $set plano", () => {
    const op = pricewatchOperation(listing(), "equipar", today);
    expect(Array.isArray(op.updateOne.update)).toBe(true);
  });

  it("productKey es ml:<catalogId> cuando hay catalogId", () => {
    const op = pricewatchOperation(listing({ catalogId: "MLU123" }), "equipar", today) as {
      updateOne: { update: Array<{ $set: Record<string, unknown> }> };
    };
    expect(op.updateOne.update[0].$set.productKey).toEqual({ $literal: "ml:MLU123" });
  });

  it("productKey es null cuando no hay catalogId", () => {
    const op = pricewatchOperation(listing({ catalogId: null }), "equipar", today) as {
      updateOne: { update: Array<{ $set: Record<string, unknown> }> };
    };
    expect(op.updateOne.update[0].$set.productKey).toEqual({ $literal: null });
  });

  it("category sale de attributes.CATEGORY_SPEC, o null si no está", () => {
    const withCategory = pricewatchOperation(listing({ attributes: { CATEGORY_SPEC: "heladera" } }), "equipar", today) as {
      updateOne: { update: Array<{ $set: Record<string, unknown> }> };
    };
    expect(withCategory.updateOne.update[0].$set.category).toEqual({ $literal: "heladera" });

    const withoutCategory = pricewatchOperation(listing({ attributes: {} }), "equipar", today) as {
      updateOne: { update: Array<{ $set: Record<string, unknown> }> };
    };
    expect(withoutCategory.updateOne.update[0].$set.category).toEqual({ $literal: null });
  });

  it("trampa de literales: un título que empieza con $ viaja envuelto en $literal", () => {
    const op = pricewatchOperation(listing({ title: "$ 4.500 Colchón 2 plazas" }), "equipar", today);
    expect(JSON.stringify(op.updateOne.update)).toContain('"$literal":"$ 4.500 Colchón 2 plazas"');
  });

  it("lo mismo para sellerName y url que empiezan con $", () => {
    const op = pricewatchOperation(
      listing({ sellerName: "$eller Uruguay", url: "https://x/$oferta" }),
      "equipar",
      today
    );
    const serialized = JSON.stringify(op.updateOne.update);
    expect(serialized).toContain('"$literal":"$eller Uruguay"');
    expect(serialized).toContain('"$literal":"https://x/$oferta"');
  });

  it("la expresión de history filtra el punto de hoy, agrega el nuevo y recorta a maxPoints", () => {
    const op = pricewatchOperation(listing({ price: 25000, listPrice: 30000 }), "equipar", today) as {
      updateOne: {
        update: Array<{
          $set: {
            history: {
              $slice: [{ $concatArrays: [{ $filter: { input: unknown; cond: { $ne: [string, unknown] } } }, unknown[]] }, number];
            };
          };
        }>;
      };
    };
    const historyExpr = op.updateOne.update[0].$set.history;
    expect(historyExpr.$slice[1]).toBe(-120);
    const [filterStage, appended] = historyExpr.$slice[0].$concatArrays;
    expect(filterStage.$filter.cond).toEqual({ $ne: ["$$this.d", today] });
    expect(appended).toEqual([{ d: { $literal: today }, p: { $literal: 25000 }, lp: { $literal: 30000 } }]);
  });

  it("respeta un maxPoints distinto al default", () => {
    const op = pricewatchOperation(listing(), "equipar", today, 30) as {
      updateOne: { update: Array<{ $set: { history: { $slice: [unknown, number] } } }> };
    };
    expect(op.updateOne.update[0].$set.history.$slice[1]).toBe(-30);
  });
});

describe("applyHistory", () => {
  it("arranca vacío y agrega el primer punto", () => {
    const point: PricewatchPoint = { d: "2026-09-16", p: 100, lp: null };
    expect(applyHistory(undefined, point)).toEqual([point]);
  });

  it("reemplaza el punto del mismo día en vez de duplicarlo", () => {
    const history: PricewatchPoint[] = [
      { d: "2026-09-14", p: 90, lp: null },
      { d: "2026-09-16", p: 95, lp: null },
    ];
    const point: PricewatchPoint = { d: "2026-09-16", p: 100, lp: 120 };
    const result = applyHistory(history, point);
    expect(result).toEqual([
      { d: "2026-09-14", p: 90, lp: null },
      { d: "2026-09-16", p: 100, lp: 120 },
    ]);
  });

  it("agrega un punto de un día nuevo al final", () => {
    const history: PricewatchPoint[] = [{ d: "2026-09-14", p: 90, lp: null }];
    const point: PricewatchPoint = { d: "2026-09-16", p: 100, lp: null };
    expect(applyHistory(history, point)).toEqual([
      { d: "2026-09-14", p: 90, lp: null },
      { d: "2026-09-16", p: 100, lp: null },
    ]);
  });

  it("recorta a maxPoints, conservando los más recientes", () => {
    const history: PricewatchPoint[] = Array.from({ length: 120 }, (_, i) => ({
      d: `2026-01-${String((i % 28) + 1).padStart(2, "0")}-${i}`,
      p: i,
      lp: null,
    }));
    const point: PricewatchPoint = { d: "new-day", p: 999, lp: null };
    const result = applyHistory(history, point, 120);
    expect(result).toHaveLength(120);
    expect(result[result.length - 1]).toEqual(point);
    expect(result[0]).toEqual(history[1]);
  });
});

// Una oferta que nadie ve hace medio año no aporta a ninguna comparación de 60 días, y sin poda la
// colección crece para siempre con cada aviso que alguna vez pasó por un buscador.
describe("pricewatchPruneFilter", () => {
  it("borra lo que no se vio en los últimos 180 días, sólo de esa vertical", () => {
    expect(pricewatchPruneFilter("equipar", "2026-09-16")).toEqual({
      vertical: "equipar",
      lastSeen: { $lt: "2026-03-20" },
    });
  });

  it("acepta otra ventana y cruza el cambio de año", () => {
    expect(pricewatchPruneFilter("sillas", "2027-01-10", 30)).toEqual({
      vertical: "sillas",
      lastSeen: { $lt: "2026-12-11" },
    });
  });
});

describe("recordPricewatch", () => {
  it("poda una vez por llamada, después de escribir, con el filtro de su vertical", async () => {
    modelCalls.length = 0;
    const result = await recordPricewatch([listing()], "equipar", "2026-09-16");
    expect(modelCalls).toEqual([
      "createIndexes",
      "bulkWrite",
      'deleteMany {"vertical":"equipar","lastSeen":{"$lt":"2026-03-20"}}',
    ]);
    expect(result).toEqual({ written: 1, skipped: 0, pruned: 3 });
  });
});
