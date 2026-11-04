import { describe, expect, it } from "vitest";
import { buildModels, type ModelRow } from "../../classes/movilidad/models/build";
import { modelsRetireWrite, modelsWrites } from "../../classes/movilidad/models/write";

const NOW = "2026-11-04T06:01:00.000Z";
let seq = 0;
const row = (over: Partial<ModelRow> = {}): ModelRow => ({
  listingId: `ml:MLU${++seq}`,
  title: "Monopatin Scooter Electrico Xiaomi 6 Pro Negro",
  url: `https://www.mercadolibre.com.uy/x/up/MLUU${seq}`,
  image: null,
  price: 35000,
  currency: "UYU",
  priceUyu: 35000,
  condition: "new",
  source: "mercadolibre",
  sellerName: "A",
  sellerKey: "a",
  brand: "Xiaomi",
  brandKey: "xiaomi",
  variant: "urbano",
  suspect: false,
  specs: null,
  observedAt: NOW,
  fichaModel: null,
  ...over,
});

describe("modelsWrites", () => {
  it("un upsert por slug, con la serie guardada más el punto de hoy", () => {
    const { models } = buildModels([row({ priceUyu: 30000 }), row({ priceUyu: 32000 })], "2026-11-04", NOW);
    const prev = new Map([["xiaomi-6-pro", [{ day: "2026-11-03", newMin: 29000, newMedian: 31000, n: 2 }]]]);
    const writes = modelsWrites(models, prev);
    expect(writes).toHaveLength(1);
    const op = writes[0]!.updateOne;
    expect(op.filter).toEqual({ slug: "xiaomi-6-pro" });
    expect(op.upsert).toBe(true);
    expect(op.update.$set.history.map((p: { day: string }) => p.day)).toEqual(["2026-11-03", "2026-11-04"]);
    expect(op.update.$set.offers).toHaveLength(2);
  });

  it("un modelo nuevo arranca su serie hoy", () => {
    const { models } = buildModels([row(), row()], "2026-11-04", NOW);
    const writes = modelsWrites(models, new Map());
    expect(writes[0]!.updateOne.update.$set.history).toHaveLength(1);
  });
});

describe("modelos que la corrida ya no arma", () => {
  it("se retiran: dejan de ser indexables y de listarse, pero la página sigue existiendo", () => {
    const op = modelsRetireWrite(["xiaomi-6-pro"], "2026-10-28");
    expect(op.updateMany.filter).toEqual({
      slug: { $nin: ["xiaomi-6-pro"] },
      retired: { $ne: true },
      lastSeen: { $gte: "2026-10-28" },
    });
    expect(op.updateMany.update).toEqual({ $set: { retired: true, indexable: false } });
  });

  it("un modelo que vuelve a armarse deja de estar retirado", () => {
    const { models } = buildModels([row(), row()], "2026-11-04", NOW);
    expect(modelsWrites(models, new Map())[0]!.updateOne.update.$set.retired).toBe(false);
  });
});

describe("la guarda de slug", () => {
  it("un modelo cuya clave no sería una URL válida no se publica", () => {
    const long = (over: Partial<ModelRow>) =>
      row({ brand: "Uno Dos Tres Cuatro Cinco", brandKey: "uno-dos-tres-cuatro-cinco", title: "Uno Dos Tres Cuatro Cinco X1 Pro Max", ...over });
    expect(buildModels([long({}), long({})], "2026-11-04", NOW).models).toEqual([]);
  });
});
