import { describe, expect, it } from "vitest";
import { buildTrimIndex, matchTrim, mineTrims, trimLabelFor, type TrimCorpusRow } from "../../classes/autos/catalog/trims";

const row = (model: string, title: string, modelId = "m1"): TrimCorpusRow => ({
  brandId: "b1", modelId, brand: "Renault", model, title,
});
const trimsOf = (vocabularies: ReturnType<typeof mineTrims>, modelId = "m1"): string[] =>
  vocabularies.find(entry => entry.modelId === modelId)!.trims;

describe("mineTrims", () => {
  it("learns a version the facet never listed", () => {
    const rows = [
      row("Sandero Stepway", "Renault Sandero Stepway 1.6 Privilege 105cv"),
      row("Sandero Stepway", "Renault Sandero Stepway Privilege 2019 Impecable"),
      row("Sandero Stepway", "Sandero Stepway 1.6 Privilege"),
      row("Sandero Stepway", "Renault Sandero Stepway 1.6 Zen 2021"),
      row("Sandero Stepway", "Renault Sandero Stepway Zen"),
    ];
    expect(trimsOf(mineTrims(rows))).toContain("privilege");
  });
  it("throws out the dealer's name, which is what a first mining run published as a version", () => {
    // "Fullcars" signs adverts of two different models; a real version belongs to its own.
    const rows = [
      row("Saveiro", "Volkswagen Saveiro 1.6 2022 Fullcars", "m1"),
      row("Saveiro", "Volkswagen Saveiro 1.6 2021 Fullcars", "m1"),
      row("Saveiro", "Volkswagen Saveiro 1.6 2020 Fullcars", "m1"),
      row("Partner", "Peugeot Partner 1.6 2012 Fullcars", "m2"),
      row("Partner", "Peugeot Partner 1.6 2013 Fullcars", "m2"),
      row("Partner", "Peugeot Partner 1.6 2014 Fullcars", "m2"),
      row("Gol", "Volkswagen Gol 1.6 2015 Fullcars", "m3"),
      row("Gol", "Volkswagen Gol 1.6 2016 Fullcars", "m3"),
      row("Gol", "Volkswagen Gol 1.6 2017 Fullcars", "m3"),
    ];
    expect(trimsOf(mineTrims(rows))).not.toContain("fullcars");
  });
  it("ignores the dealer signature after a spaced dash", () => {
    const rows = [
      row("Frontier", "Nissan Frontier 4x4 2.4 2013 Excelente Estado! - Barriola"),
      row("Frontier", "Nissan Frontier 4x4 2.4 2014 - Barriola"),
      row("Frontier", "Nissan Frontier 4x4 2.4 2015 - Barriola"),
    ];
    expect(trimsOf(mineTrims(rows))).not.toContain("barriola");
  });
  it("leaves out a word every advert of the model repeats: it separates nothing", () => {
    const rows = Array.from({ length: 6 }, (_, index) => row("Kangoo", `Renault Kangoo Furgon 1.6 20${10 + index}`));
    expect(trimsOf(mineTrims(rows))).not.toContain("furgon");
  });
  it("keeps what the facet already said", () => {
    const base = [{ brandId: "b1", modelId: "m1", trims: ["Zen", "Intens"] }];
    const rows = [row("Sandero", "Renault Sandero 1.6 Zen")];
    expect(trimsOf(mineTrims(rows, base))).toEqual(expect.arrayContaining(["Zen", "Intens"]));
  });
});

describe("matchTrim", () => {
  it("reads the same trim through both spellings", () => {
    const index = buildTrimIndex(["Confort", "Comfort", "Zen"]);
    expect(matchTrim("Renault Symbol 1.6 Confort", index)).toBe("comfort");
    expect(matchTrim("Renault Symbol 1.6 Comfort", index)).toBe("comfort");
    expect(matchTrim("Volkswagen T-Cross Trend At 1.0", buildTrimIndex(["Trendline"]))).toBeNull();
    expect(matchTrim("Volkswagen T-Cross Trendline At 1.0", buildTrimIndex(["Trend", "Trendline"]))).toBe("trend");
  });
  it("tells a longer version from the one inside it", () => {
    const index = buildTrimIndex(["Premier", "Premier Plus"]);
    expect(matchTrim("Chevrolet Cruze Premier Plus 1.4t", index)).toBe("premier plus");
    expect(matchTrim("Chevrolet Cruze Premier 1.4t", index)).toBe("premier");
  });
  it("abstains when two unrelated versions match", () => {
    expect(matchTrim("Peugeot 207 Compact Xs Line 1.6", buildTrimIndex(["Compact", "Xs"]))).toBeNull();
  });
  it("lets Mercado Libre's own name win against a mined one", () => {
    const index = buildTrimIndex(["Privilege", "car plus"], ["Privilege"]);
    expect(matchTrim("Toyota Hilux Privilege 2.8 Car Plus", index)).toBe("privilege");
  });
  it("labels a canonical trim the way the vocabulary spells it", () => {
    expect(trimLabelFor("comfort", ["Comfort", "Zen"])).toBe("Comfort");
    expect(trimLabelFor("premier plus", [])).toBe("Premier Plus");
    expect(trimLabelFor(null, [])).toBeNull();
  });
});
