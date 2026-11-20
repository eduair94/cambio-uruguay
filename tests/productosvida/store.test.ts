import { describe, expect, it, vi } from "vitest";

// The item model is mocked only for `countDocuments`, to read the exact query the thin-run guard
// sends; `.schema`/`.collection` of the other two come from the real lazy `appModel` proxy, which
// answers them without a connection.
const countDocumentsMock = vi.fn(async (_query: unknown) => 7);
vi.mock("../../classes/models/ProductosVidaItem", async (orig) => {
  const real = await orig<typeof import("../../classes/models/ProductosVidaItem")>();
  return {
    ProductosVidaItemModel: {
      schema: real.ProductosVidaItemModel.schema,
      collection: real.ProductosVidaItemModel.collection,
      countDocuments: (query: unknown) => countDocumentsMock(query),
    },
  };
});

import { ProductosVidaItemModel } from "../../classes/models/ProductosVidaItem";
import { ProductosVidaListingModel } from "../../classes/models/ProductosVidaListing";
import { ProductosVidaMetaModel } from "../../classes/models/ProductosVidaMeta";
import type { EquiparItem } from "../../classes/equipar/types";
import {
  countPricedRecentItems,
  dayMinus,
  PRODUCTOS_VIDA_META_KEY,
  withHistory,
  type PreviousItem,
} from "../../classes/productosvida/store";

const item = (over: Partial<EquiparItem> = {}): EquiparItem => ({
  key: "calientacama:una-plaza",
  category: "calientacama",
  categoryLabel: "Calientacama",
  variant: "una-plaza",
  variantLabel: "Bajo la sábana, 1 plaza",
  room: "productos-vida",
  tier: "B",
  rank: 0,
  variantRank: 1,
  image: null,
  regime: "modelo",
  reason: "x",
  usedOk: false,
  usedNote: "",
  quantity: 1,
  newBand: { p25: 1090, median: 1340, p75: 2990, min: 739, n: 25 },
  usedBand: null,
  usedSavingPct: null,
  products: [],
  offers: [],
  suspectDropped: 0,
  observedAt: "2026-11-20T04:13:30.000Z",
  ...over,
});

describe("classes/productosvida/store", () => {
  it("colecciones y clave propias, nunca las de equipar ni movilidad", () => {
    expect(PRODUCTOS_VIDA_META_KEY).toBe("productos-que-te-cambian-la-vida-uruguay");
    expect(PRODUCTOS_VIDA_META_KEY).not.toMatch(/\d/);
    expect(ProductosVidaItemModel.collection.name).toBe("productosvidaitems");
    expect(ProductosVidaMetaModel.collection.name).toBe("productosvidameta");
    expect(ProductosVidaListingModel.collection.name).toBe("productosvidalistings");
    expect(Object.keys(ProductosVidaMetaModel.schema.obj)).not.toContain("baskets");
    expect(Object.keys(ProductosVidaListingModel.schema.obj)).not.toContain("specs");
  });

  it("la guarda de corrida flaca cuenta sólo ítems de los últimos 3 días CON banda nueva", async () => {
    countDocumentsMock.mockClear();
    await expect(countPricedRecentItems("2026-11-20")).resolves.toBe(7);
    expect(countDocumentsMock).toHaveBeenCalledTimes(1);
    // Exactly this: no usedBand, no $or. The page publishes new bands only.
    expect(countDocumentsMock.mock.calls[0]![0]).toEqual({
      lastSeen: { $gte: "2026-11-17" },
      newBand: { $ne: null },
    });
  });

  it("dayMinus cruza meses sin correrse de día", () => {
    expect(dayMinus("2026-12-02", 3)).toBe("2026-11-29");
    expect(dayMinus("2026-11-20", 0)).toBe("2026-11-20");
  });

  it("withHistory: una segunda corrida del mismo día reemplaza el punto de hoy, no agrega otro", () => {
    const previous = new Map<string, PreviousItem>([
      [
        "calientacama:una-plaza",
        {
          firstSeen: "2026-11-19",
          history: [
            { date: "2026-11-19", newMedian: 1300, usedMedian: null },
            { date: "2026-11-20", newMedian: 1500, usedMedian: null },
          ],
        },
      ],
    ]);
    const [stored] = withHistory([item()], previous, "2026-11-20");
    expect(stored!.firstSeen).toBe("2026-11-19");
    expect(stored!.lastSeen).toBe("2026-11-20");
    expect(stored!.history).toEqual([
      { date: "2026-11-19", newMedian: 1300, usedMedian: null },
      { date: "2026-11-20", newMedian: 1340, usedMedian: null },
    ]);
  });
});
