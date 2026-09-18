import { describe, expect, it } from "vitest";
import { bedroomBucket, carCohorts, cohortLabel, housingCohorts, marketSlug, MARKET_SERIES_KEY_PATTERN } from "../../classes/marketseries/cohorts";
import { car, observation } from "./fixtures";

describe("marketSlug", () => {
  it("folds accents, case and spacing and nothing else", () => {
    expect(marketSlug("Paysandú")).toBe("paysandu");
    expect(marketSlug("  Punta del  Este ")).toBe("punta-del-este");
    expect(marketSlug("Cordón Sur")).toBe("cordon-sur");
    expect(marketSlug("¡!")).toBe("");
  });
});

describe("bedroomBucket", () => {
  it("keeps 0-3, groups 4 or more, and refuses what is not a count", () => {
    expect([0, 1, 2, 3, 4, 7].map(bedroomBucket)).toEqual(["0", "1", "2", "3", "4plus", "4plus"]);
    expect([null, -1, 1.5, 21].map(bedroomBucket)).toEqual([null, null, null, null]);
  });
});

describe("housingCohorts", () => {
  it("puts a 2-bedroom flat in 12 cohorts: 3 scopes x 2 types x 2 bedroom buckets", () => {
    const keys = housingCohorts(observation()).map(cohort => cohort.key);
    expect(keys).toHaveLength(12);
    expect(keys).toContain("alquiler|UYU|apartamento|2|b:montevideo:pocitos");
    expect(keys).toContain("alquiler|UYU|todas|any|uy");
    expect(keys).toContain("alquiler|UYU|todas|any|d:montevideo");
    for (const key of keys) expect(key).toMatch(MARKET_SERIES_KEY_PATTERN);
  });

  it("an unknown bedroom count only reaches the 'any' bucket", () => {
    const keys = housingCohorts(observation({ bedrooms: null })).map(cohort => cohort.key);
    expect(keys).toHaveLength(6);
    expect(keys.every(key => key.split("|")[3] === "any")).toBe(true);
  });

  it("without a neighborhood there is no neighborhood scope", () => {
    const keys = housingCohorts(observation({ neighborhood: null })).map(cohort => cohort.key);
    expect(keys).toHaveLength(8);
    expect(keys.some(key => key.includes("|b:"))).toBe(false);
  });

  it("currency is part of the key: a dollar rent is its own cohort", () => {
    expect(housingCohorts(observation({ currency: "USD" }))[0]!.key.startsWith("alquiler|USD|")).toBe(true);
  });

  it("a sale uses the same dimensions under its own market", () => {
    expect(housingCohorts(observation({ vertical: "venta", currency: "USD" }))[0]!.key).toBe("venta|USD|apartamento|any|uy");
  });
});

describe("carCohorts", () => {
  it("all cars, the model, and the model-year", () => {
    expect(carCohorts(car()).map(cohort => cohort.key)).toEqual([
      "autos|USD|all",
      "autos|USD|m:toyota-hilux",
      "autos|USD|m:toyota-hilux|y:2018",
    ]);
    for (const cohort of carCohorts(car())) expect(cohort.key).toMatch(MARKET_SERIES_KEY_PATTERN);
  });
  it("a car priced in pesos or without a model forms no cohort", () => {
    expect(carCohorts(car({ currency: "UYU" }))).toEqual([]);
    expect(carCohorts(car({ marketSlug: null }))).toEqual([]);
  });
});

describe("cohortLabel", () => {
  const none = { department: null, neighborhood: null, brand: null, model: null };
  it("reads like a place or a car", () => {
    const cohorts = housingCohorts(observation());
    const uy = cohorts.find(cohort => cohort.dims.scope === "uy")!;
    const dep = cohorts.find(cohort => cohort.dims.scope === "department")!;
    const bar = cohorts.find(cohort => cohort.dims.scope === "neighborhood")!;
    expect(cohortLabel(uy.dims, none)).toBe("Uruguay");
    expect(cohortLabel(dep.dims, { ...none, department: "Montevideo" })).toBe("Montevideo");
    expect(cohortLabel(bar.dims, { ...none, department: "Montevideo", neighborhood: "Pocitos" })).toBe("Pocitos, Montevideo");
    const [all, model, year] = carCohorts(car());
    expect(cohortLabel(all!.dims, none)).toBe("Todos los autos");
    expect(cohortLabel(model!.dims, { ...none, brand: "Toyota", model: "Hilux" })).toBe("Toyota Hilux");
    expect(cohortLabel(year!.dims, { ...none, brand: "Toyota", model: "Hilux" })).toBe("Toyota Hilux 2018");
  });
});
