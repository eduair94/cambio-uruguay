import { describe, expect, it } from "vitest";
import {
  buildModels,
  mergeHistory,
  modelsRunIsThin,
  MODEL_HISTORY_MAX,
  type ModelRow,
} from "../../classes/movilidad/models/build";
import { EMPTY_SPECS } from "../../classes/movilidad/specs/parse";
import type { MonopatinSpecs } from "../../classes/movilidad/specs/types";

const TODAY = "2026-11-04";
const NOW = "2026-11-04T06:01:00.000Z";

let seq = 0;
const specs = (values: Partial<MonopatinSpecs>, source: "ficha" | "descripcion" | "titulo" = "ficha"): MonopatinSpecs => {
  const from: MonopatinSpecs["from"] = {};
  for (const key of Object.keys(values)) (from as Record<string, string>)[key] = source;
  return { ...EMPTY_SPECS, ...values, from };
};
const row = (over: Partial<ModelRow> = {}): ModelRow => ({
  listingId: `ml:MLU${++seq}`,
  title: "Monopatin Scooter Electrico Xiaomi 6 Pro Negro",
  url: `https://www.mercadolibre.com.uy/x/up/MLUU${seq}`,
  image: `https://http2.mlstatic.com/${seq}.webp`,
  price: 35000,
  currency: "UYU",
  priceUyu: 35000,
  condition: "new",
  source: "mercadolibre",
  sellerName: "TIENDA A",
  sellerKey: "ml:n:tienda-a",
  brand: "Xiaomi",
  brandKey: "xiaomi",
  variant: "urbano",
  suspect: false,
  specs: null,
  firstSeen: "2026-10-01",
  observedAt: NOW,
  freeShipping: true,
  officialStore: false,
  fichaModel: null,
  ...over,
});

describe("buildModels", () => {
  it("junta los avisos del mismo modelo de vendedores distintos, el más barato primero", () => {
    const { models, slugByListing } = buildModels(
      [
        row({ priceUyu: 38000 }),
        row({ priceUyu: 33000, sellerName: "TIENDA B", sellerKey: "ml:n:b" }),
        row({ priceUyu: 36000, firstSeen: "2026-09-25" }),
      ],
      TODAY,
      NOW
    );
    expect(models).toHaveLength(1);
    const model = models[0]!;
    expect(model.slug).toBe("xiaomi-6-pro");
    expect(model.name).toBe("Xiaomi Electric Scooter 6 Pro");
    expect(model.listings).toBe(3);
    expect(model.sellers).toBe(2);
    expect(model.offers.map((offer) => offer.priceUyu)).toEqual([33000, 36000, 38000]);
    expect(model.newBand).toEqual({ min: 33000, median: 36000, max: 38000, n: 3, sellers: 2 });
    expect(model.usedBand).toBeNull();
    expect(model.firstSeen).toBe("2026-09-25");
    expect(model.lastSeen).toBe(TODAY);
    expect(slugByListing.size).toBe(3);
  });

  it("un modelo con un solo aviso no se publica, y su aviso no queda enlazado a nada", () => {
    const lone = row({ title: "Monopatin Xiaomi Electric Scooter 6 Ultra" });
    const { models, slugByListing } = buildModels([row(), row(), lone], TODAY, NOW);
    expect(models.map((model) => model.slug)).toEqual(["xiaomi-6-pro"]);
    expect(slugByListing.has(lone.listingId)).toBe(false);
  });

  it("nuevo y usado nunca se mezclan en una banda", () => {
    const { models } = buildModels(
      [row({ priceUyu: 30000 }), row({ priceUyu: 34000 }), row({ priceUyu: 20000, condition: "used" })],
      TODAY,
      NOW
    );
    expect(models[0]!.newBand!.min).toBe(30000);
    expect(models[0]!.usedBand).toEqual({ min: 20000, median: 20000, max: 20000, n: 1, sellers: 1 });
  });

  it("la ficha de consenso sale de lo que dicen las fichas, nunca de lo que dice el título", () => {
    const { models } = buildModels(
      [
        row({ specs: specs({ rangeKm: 60, foldable: true, maxSpeedKmh: 25 }) }),
        row({ specs: specs({ rangeKm: 70, foldable: true, maxSpeedKmh: 25 }) }),
        row({ specs: specs({ rangeKm: 80, foldable: false }, "titulo") }),
        row({ specs: specs({ foldable: false, brakes: "Disco" }, "descripcion") }),
      ],
      TODAY,
      NOW
    );
    const consensus = models[0]!.specs;
    // Nunca un promedio: 60 y 70 publican 60 (lo que dijo una ficha), y se avisa que no coinciden.
    expect(consensus.values.rangeKm).toBe(60);
    expect(consensus.agree.rangeKm).toEqual({ n: 1, of: 2 });
    expect(consensus.spread.rangeKm).toEqual({ min: 60, max: 70 });
    expect(consensus.values.maxSpeedKmh).toBe(25);
    expect(consensus.agree.maxSpeedKmh).toEqual({ n: 2, of: 2 });
    expect(consensus.spread.maxSpeedKmh).toBeUndefined();
    expect(consensus.values.foldable).toBe(true);
    expect(consensus.agree.foldable).toEqual({ n: 2, of: 3 });
    expect(consensus.values.brakes).toBe("Disco");
    expect(models[0]!.fichas).toBe(3);
  });

  it("con un valor repetido publica la moda; sin repetidos, un valor que alguna ficha dijo", () => {
    const volts = (v: number) => row({ specs: specs({ batteryV: v }) });
    const mode = buildModels([volts(12), volts(48), volts(48), volts(36)], TODAY, NOW).models[0]!;
    expect(mode.specs.values.batteryV).toBe(48);
    expect(mode.specs.agree.batteryV).toEqual({ n: 2, of: 4 });
    const none = buildModels([volts(12), volts(48), volts(36), volts(42)], TODAY, NOW).models[0]!;
    expect([12, 36, 42, 48]).toContain(none.specs.values.batteryV);
    expect(none.specs.values.batteryV).toBe(36);
  });

  it("indexable sólo con dos vendedores y tres datos de ficha", () => {
    const full = specs({ rangeKm: 60, maxSpeedKmh: 25, motorW: 1000 });
    const oneSeller = buildModels([row({ specs: full }), row({ specs: full })], TODAY, NOW).models[0]!;
    expect(oneSeller.indexable).toBe(false);
    const thin = buildModels(
      [row({ specs: specs({ rangeKm: 60 }) }), row({ sellerName: "B", sellerKey: "b" })],
      TODAY,
      NOW
    ).models[0]!;
    expect(thin.indexable).toBe(false);
    const good = buildModels([row({ specs: full }), row({ sellerName: "B", sellerKey: "b" })], TODAY, NOW).models[0]!;
    expect(good.indexable).toBe(true);
  });

  it("la foto nunca es de Facebook, y los avisos sospechosos o de Facebook no entran", () => {
    const { models } = buildModels(
      [
        row({ priceUyu: 30000, image: null }),
        row({ priceUyu: 31000 }),
        row({ priceUyu: 1000, suspect: true }),
        row({ priceUyu: 25000, source: "facebook", image: "https://scontent.fb/x.jpg" }),
      ],
      TODAY,
      NOW
    );
    expect(models[0]!.listings).toBe(2);
    expect(models[0]!.image).toMatch(/mlstatic/);
  });

  it("los avisos del mismo producto de catálogo de ML son el mismo modelo aunque el título no lo diga", () => {
    const { models } = buildModels(
      [
        row({ url: "https://www.mercadolibre.com.uy/a/p/MLU66796377" }),
        row({ url: "https://www.mercadolibre.com.uy/b/p/MLU66796377", title: "Monopatín Eléctrico Plegable Negro" }),
      ],
      TODAY,
      NOW
    );
    expect(models[0]!.listings).toBe(2);
  });
});

describe("mergeHistory", () => {
  const point = (day: string) => ({ day, newMin: 1, newMedian: 2, n: 3 });
  it("reemplaza el punto de hoy y guarda el resto", () => {
    const { models } = buildModels([row({ priceUyu: 30000 }), row({ priceUyu: 32000 })], TODAY, NOW);
    const history = mergeHistory([point("2026-11-03"), point(TODAY)], models[0]!);
    expect(history).toEqual([point("2026-11-03"), { day: TODAY, newMin: 30000, newMedian: 31000, n: 2 }]);
  });
  it(`topea en ${MODEL_HISTORY_MAX} días`, () => {
    const prev = Array.from({ length: MODEL_HISTORY_MAX + 5 }, (_, i) => point(`2025-${String(i).padStart(4, "0")}`));
    const { models } = buildModels([row(), row()], TODAY, NOW);
    const history = mergeHistory(prev, models[0]!);
    expect(history).toHaveLength(MODEL_HISTORY_MAX);
    expect(history.at(-1)!.day).toBe(TODAY);
  });
  it("sin precio nuevo no agrega punto", () => {
    const { models } = buildModels([row({ condition: "used" }), row({ condition: "used" })], TODAY, NOW);
    expect(mergeHistory([point("2026-11-03")], models[0]!)).toEqual([point("2026-11-03")]);
  });
});

describe("modelsRunIsThin", () => {
  it("una corrida con menos del 40 % de los modelos guardados es flaca", () => {
    expect(modelsRunIsThin(3, 20)).toBe(true);
    expect(modelsRunIsThin(10, 20)).toBe(false);
    expect(modelsRunIsThin(0, 2)).toBe(false);
  });
});
