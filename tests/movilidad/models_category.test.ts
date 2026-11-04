import { describe, expect, it } from "vitest";
import { claimedElsewhere, modelCategoryFilter, storedModelCategory } from "../../classes/movilidad/models/category";

describe("categoría de un modelo guardado", () => {
  it("un documento sin categoría es de monopatín (anterior a las bicis)", () => {
    expect(storedModelCategory({})).toBe("monopatin-electrico");
    expect(storedModelCategory({ category: null })).toBe("monopatin-electrico");
    expect(storedModelCategory({ category: "bicicleta-electrica" })).toBe("bicicleta-electrica");
  });

  it("el filtro de monopatín incluye los documentos sin categoría; el de bici no", () => {
    expect(modelCategoryFilter("monopatin-electrico")).toEqual({ category: { $in: ["monopatin-electrico", null] } });
    expect(modelCategoryFilter("bicicleta-electrica")).toEqual({ category: "bicicleta-electrica" });
  });
});

describe("claimedElsewhere", () => {
  it("no pisa un slug guardado de la otra categoría, ni uno sin categoría (monopatín)", () => {
    const taken = claimedElsewhere(
      "bicicleta-electrica",
      [{ slug: "xiaomi-4-pro" }, { slug: "gyroor-c3" }, { slug: "loop-slim" }],
      [{ slug: "xiaomi-4-pro" }, { slug: "loop-slim", category: "bicicleta-electrica" }],
      new Map()
    );
    expect([...taken]).toEqual(["xiaomi-4-pro"]);
  });

  it("tampoco uno que la otra categoría armó antes en esta misma corrida", () => {
    const taken = claimedElsewhere(
      "bicicleta-electrica",
      [{ slug: "atom-kaizen" }],
      [],
      new Map([["atom-kaizen", "monopatin-electrico" as const]])
    );
    expect(taken.has("atom-kaizen")).toBe(true);
  });

  it("el propio slug de la categoría se reescribe", () => {
    expect(
      claimedElsewhere("monopatin-electrico", [{ slug: "xiaomi-4-pro" }], [{ slug: "xiaomi-4-pro" }], new Map()).size
    ).toBe(0);
  });
});

describe("modelsRetireWrite acotado por categoría", () => {
  it("la vuelta de bicis sólo retira bicis, y la de monopatín sólo monopatines (con los viejos sin categoría)", async () => {
    const { modelsRetireWrite } = await import("../../classes/movilidad/models/write");
    const bici = modelsRetireWrite(["gyroor-c3"], "2026-10-28", modelCategoryFilter("bicicleta-electrica"));
    expect(bici.updateMany.filter).toMatchObject({ category: "bicicleta-electrica", slug: { $nin: ["gyroor-c3"] } });
    const mono = modelsRetireWrite(["xiaomi-6-pro"], "2026-10-28", modelCategoryFilter("monopatin-electrico"));
    expect(mono.updateMany.filter).toMatchObject({ category: { $in: ["monopatin-electrico", null] } });
  });
});
