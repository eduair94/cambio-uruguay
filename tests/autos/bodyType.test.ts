import { describe, expect, it } from "vitest";
import { attachBodyType, carBodyFamily, carColorFamily, statedBodyType } from "../../classes/autos/bodyType";
import type { CarDetail, CarListing } from "../../classes/autos/types";

const detail = (overrides: Partial<CarDetail> = {}): CarDetail => ({
  readAt: "2026-09-20T00:00:00.000Z", price: 12_000, currency: "USD", active: true, brand: null, model: null,
  year: null, km: null, version: null, engineText: null, sellerName: null, bodyType: null, color: null, doors: null,
  flags: [], description: "", ...overrides,
});

const car = (overrides: Partial<CarListing> = {}): CarListing =>
  ({
    key: "ml-MLU1", id: "MLU1", source: "mercadolibre", sourceName: "Mercado Libre",
    brandId: "1", brand: "Nissan", modelId: "2", model: "Kicks", brandSlug: "nissan", modelSlug: "kicks",
    marketSlug: "nissan-kicks", title: "Nissan Kicks 1.6 Sense", year: 2019, km: 50_000, price: 20_000,
    currency: "USD", priceUsd: 20_000, priceConverted: false, transmission: "manual", fuel: "nafta",
    neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: null, picture: null,
    pictureCount: null, permalink: "https://auto.mercadolibre.com.uy/MLU-1", observedAt: "2026-09-20T00:00:00.000Z",
    engine: "1.6", trim: null, trimLabel: null, kmQuality: "ok", flags: [], firstSeen: "2026-09-01T00:00:00.000Z",
    lastSeen: "2026-09-20T00:00:00.000Z", priceDrop: null, detail: null, reference: null,
    ...overrides,
  }) as CarListing;

describe("carBodyFamily", () => {
  it("groups Mercado Libre's own vocabulary into the families the filter offers", () => {
    expect(carBodyFamily("Sedán")).toBe("sedan");
    expect(carBodyFamily("sedan")).toBe("sedan");
    expect(carBodyFamily("Hatchback")).toBe("hatchback");
    expect(carBodyFamily("SUV")).toBe("suv");
    expect(carBodyFamily("Crossover")).toBe("suv");
    expect(carBodyFamily("Off-Road")).toBe("suv");
    expect(carBodyFamily("Pick-Up")).toBe("pickup");
    expect(carBodyFamily("Light Truck")).toBe("pickup");
    expect(carBodyFamily("Rural")).toBe("rural");
    expect(carBodyFamily("Furgón")).toBe("furgon");
    expect(carBodyFamily("Van")).toBe("furgon");
    expect(carBodyFamily("Minivan")).toBe("monovolumen");
    expect(carBodyFamily("Minibus")).toBe("monovolumen");
    expect(carBodyFamily("Coupé")).toBe("coupe");
    expect(carBodyFamily("Roadster")).toBe("coupe");
    expect(carBodyFamily("Cabriolet")).toBe("cabriolet");
  });

  it("abstains rather than guessing an unknown word", () => {
    expect(carBodyFamily("Chasis con cabina")).toBeNull();
    expect(carBodyFamily("")).toBeNull();
    expect(carBodyFamily(null)).toBeNull();
  });
});

describe("statedBodyType", () => {
  it("reads the word the seller wrote in the title", () => {
    expect(statedBodyType("Chevrolet Corsa Sedán 1.6 full")).toBe("sedan");
    expect(statedBodyType("Volkswagen Saveiro Cabina Doble")).toBe("pickup");
    expect(statedBodyType("Fiat Fiorino Furgon 1.4")).toBe("furgon");
    expect(statedBodyType("Peugeot 308 SW Familiar")).toBe("rural");
  });

  it("only reads the word, never the model's reputation", () => {
    // "Ranger" is a pick-up and "Kicks" an SUV, but the title says neither: that is the dictionary's job.
    expect(statedBodyType("Ford Ranger 3.2 Limited")).toBeNull();
    expect(statedBodyType("Nissan Kicks 1.6 Sense")).toBeNull();
  });
});

describe("attachBodyType", () => {
  it("prefers the advert's own page over anything inferred", () => {
    const [row] = attachBodyType([car({ detail: detail({ bodyType: "SUV", doors: 5, color: "Blanco" }) })]);
    expect(row!.body).toEqual({ type: "suv", basis: "advert" });
    expect(row!.doors).toBe(5);
    expect(row!.color).toBe("blanco");
  });

  it("falls back to the body its model shows in OUR advert pages", () => {
    const read = Array.from({ length: 8 }, (_, index) =>
      car({ key: `ml-MLU${index}`, id: `MLU${index}`, detail: detail({ bodyType: "SUV" }) })
    );
    const unread = car({ key: "fb-9", id: "9", source: "facebook", title: "Nissan Kicks impecable" });
    const rows = attachBodyType([...read, unread]);
    expect(rows.at(-1)!.body).toEqual({ type: "suv", basis: "model" });
  });

  it("trusts the model's advert pages over a loose word in one title", () => {
    // Medido: "Chevrolet Tracker Ltz Rural 5 Puertas" usa "rural" por "cinco puertas", y las fichas
    // del Tracker dicen SUV sin ambigüedad. La palabra suelta es la evidencia más floja de las tres.
    const read = Array.from({ length: 8 }, (_, index) =>
      car({ key: `ml-t${index}`, id: `t${index}`, marketSlug: "chevrolet-tracker", title: "Chevrolet Tracker", detail: detail({ bodyType: "SUV" }) })
    );
    const loose = car({ key: "fb-7", id: "7", source: "facebook", marketSlug: "chevrolet-tracker", title: "Chevrolet Tracker Ltz Rural 5 Puertas" });
    expect(attachBodyType([...read, loose]).at(-1)!.body).toEqual({ type: "suv", basis: "model" });
  });

  it("lets the title decide exactly where the model cannot: a Corsa sedan among Corsa wagons", () => {
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) => car({ key: `ml-a${i}`, id: `a${i}`, marketSlug: "chevrolet-corsa", title: "Chevrolet Corsa", detail: detail({ bodyType: "Sedán" }) })),
      ...Array.from({ length: 4 }, (_, i) => car({ key: `ml-b${i}`, id: `b${i}`, marketSlug: "chevrolet-corsa", title: "Chevrolet Corsa", detail: detail({ bodyType: "Rural" }) })),
    ];
    const titled = car({ key: "fb-2", id: "2", source: "facebook", marketSlug: "chevrolet-corsa", title: "Chevrolet Corsa Wagon 1.6" });
    expect(attachBodyType([...mixed, titled]).at(-1)!.body).toEqual({ type: "rural", basis: "advert" });
  });

  it("abstains when the model is genuinely split: a Corsa is a sedan, a hatchback AND a wagon", () => {
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) => car({ key: `ml-a${i}`, id: `a${i}`, marketSlug: "chevrolet-corsa", title: "Chevrolet Corsa", detail: detail({ bodyType: "Sedán" }) })),
      ...Array.from({ length: 4 }, (_, i) => car({ key: `ml-b${i}`, id: `b${i}`, marketSlug: "chevrolet-corsa", title: "Chevrolet Corsa", detail: detail({ bodyType: "Rural" }) })),
    ];
    const unread = car({ key: "fb-1", id: "1", source: "facebook", marketSlug: "chevrolet-corsa", title: "Chevrolet Corsa impecable" });
    expect(attachBodyType([...mixed, unread]).at(-1)!.body).toBeNull();
  });

  it("does not infer a model from too few advert pages", () => {
    const read = Array.from({ length: 7 }, (_, index) => car({ key: `ml-MLU${index}`, id: `MLU${index}`, detail: detail({ bodyType: "SUV" }) }));
    const unread = car({ key: "fb-9", id: "9", source: "facebook", title: "Nissan Kicks impecable" });
    expect(attachBodyType([...read, unread]).at(-1)!.body).toBeNull();
  });

  it("does not let a guessed body teach the dictionary", () => {
    // Eight titles that say "sedán" must not become eight votes for the model: only advert pages vote.
    const guessed = Array.from({ length: 8 }, (_, index) =>
      car({ key: `fb-${index}`, id: `${index}`, source: "facebook", title: "Nissan Kicks Sedan" })
    );
    const unread = car({ key: "fb-99", id: "99", source: "facebook", title: "Nissan Kicks impecable" });
    expect(attachBodyType([...guessed, unread]).at(-1)!.body).toBeNull();
  });

  it("normalises the colour the advert page states", () => {
    expect(carColorFamily("Gris oscuro")).toBe("gris");
    expect(carColorFamily("Plateado")).toBe("plata");
    expect(carColorFamily("Negro Pearl")).toBe("negro");
    expect(carColorFamily("Bordeaux")).toBe("bordo");
    expect(carColorFamily("Azul marino")).toBe("azul");
    expect(carColorFamily("Verde militar")).toBe("verde");
    expect(carColorFamily("Tornasolado")).toBeNull();
  });
});
