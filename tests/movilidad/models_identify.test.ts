import { describe, expect, it } from "vitest";
import {
  identifyModel,
  mlCatalogId,
  unifyByCatalog,
  type IdentifyInput,
  type ModelIdentity,
} from "../../classes/movilidad/models/identify";
import { brandFromTitle } from "../../classes/movilidad/specs/brands";

const ml = (title: string, brand: string | null, fichaModel: string | null = null): IdentifyInput => ({
  title,
  brand,
  brandKey: brand ? brand.toLowerCase().replace(/[^a-z0-9]+/g, "-") : null,
  fichaModel,
  source: "mercadolibre",
});
const key = (input: IdentifyInput) => identifyModel(input)?.key ?? null;

// Títulos reales de movilidadlistings, medidos el 2026-11-04 sobre los 774 avisos vivos.
describe("identifyModel", () => {
  it("lee el modelo que sigue a la marca y corta en la primera medida", () => {
    expect(key(ml("Monopatin Scooter Electrico Xiaomi 6 Pro 25 Km/h 1000w 70 Km Autonomía Negro", "Xiaomi"))).toBe(
      "xiaomi-6-pro"
    );
    expect(key(ml("Scooter Eléctrico Xiaomi 6 Lite 25km/h 300W", "Xiaomi"))).toBe("xiaomi-6-lite");
    expect(key(ml("Monopatín Eléctrico Xiaomi Electric Scooter 6 Lite 25 Kmh -", "Xiaomi"))).toBe("xiaomi-6-lite");
  });

  it("saltea la marca repetida y las palabras genéricas antes del modelo", () => {
    expect(key(ml("Xiaomi Monopatin Xiaomi Electric Scooter 6", "Xiaomi"))).toBe("xiaomi-6");
    expect(key(ml("Xiaomi Monopatín Eléctrico Modelo 5 Color Negro", "Xiaomi"))).toBe("xiaomi-5");
    expect(key(ml("Monopatín Eléctrico Electric Xiaomi Scooter 5 Pro 25km/h", "Xiaomi"))).toBe("xiaomi-5-pro");
  });

  it("nunca une dos modelos que comparten prefijo", () => {
    const keys = [
      key(ml("Monopatin Xiaomi Electric Scooter 6", "Xiaomi")),
      key(ml("Monopatin Electrico Xiaomi Electric Scooter 6 Lite Negro", "Xiaomi")),
      key(ml("Monopatin Scooter Electrico Xiaomi 6 Pro Negro", "Xiaomi")),
      key(ml("Monopatín Eléctrico Atom Tenacity Plegable 100kg 30km/h", "Atom")),
      key(ml("Monopatín Eléctrico Atom Tenacity Pro Plegable 40kmh", "Atom")),
      key(ml("Scooter Monopatín Eléctrico MISTYLE T1 350W Autonomía 25Km", "Mistyle")),
      key(ml("Monopatín Eléctrico Mistyle T1 Max 500w 25 Km/h", "Mistyle")),
    ];
    expect(keys).toEqual([
      "xiaomi-6",
      "xiaomi-6-lite",
      "xiaomi-6-pro",
      "atom-tenacity",
      "atom-tenacity-pro",
      "mistyle-t1",
      "mistyle-t1-max",
    ]);
  });

  it("parte el sufijo de gama pegado y el guion, así 'E9pro' y 'E9 Pro' son el mismo", () => {
    expect(key(ml("Monopatin Electrico Luxor E9pro 350w 25 Km/h Negro", "Luxor"))).toBe("luxor-e9-pro");
    expect(key(ml("Luxor Plegable E9pro 25", "Luxor"))).toBe("luxor-e9-pro");
    expect(key(ml("Monopatín Eléctrico Atom Habit-pro 500w Max. 25 Km/h 25 Km", "Atom"))).toBe("atom-habit-pro");
    expect(key(ml("Monopatín Eléctrico Atom Kaizen Pro Plegable 120kg 50km/h", "Atom"))).toBe("atom-kaizen-pro");
  });

  it("la versión de región no es otro modelo", () => {
    expect(key(ml("Xiaomi Electric Scooter 5 Pro Us Color Negro", "Xiaomi"))).toBe("xiaomi-5-pro");
  });

  it("un número pelado después de un código es ruido del título, no parte del modelo", () => {
    expect(key(ml("Monopatin Electrico Like Sgx3 10 Plegable", "Like", null))).toBe("like-sgx3");
  });

  it("una marca desconocida que el título no nombra es el vendedor, no la marca: sin modelo", () => {
    expect(key(ml("Monopatin Electrico Sgx3 10 Plegable 500w 48v 45kmh Dimm", "Like Latam", "sgx3"))).toBe(null);
  });

  it("usa el modelo de la ficha cuando el título no trae ninguno", () => {
    expect(key(ml("Monopatín Eléctrico Enxuta 350w 30 Km/h Autonomia 20km", "Enxuta", "MEENX551N"))).toBe(
      "enxuta-meenx551n"
    );
    expect(key(ml("Monopatín Patinete Eléctrico 150w Iluminación Colorida", "Gyroor", "H31"))).toBe("gyroor-h31");
    expect(key(ml("Monopatín Eléctrico Xiaomimi Electric Scooter 5 Plegable", "Xiaomi", "Electric Scooter 5"))).toBe(
      "xiaomi-5"
    );
  });

  it("la ficha limpia el ruido del título, pero nunca le saca la gama", () => {
    expect(key(ml("Monopatin Electrico Enxuta 45 Meenx552n Negro Mate Plegable", "Enxuta", "MEENX552N"))).toBe(
      "enxuta-meenx552n"
    );
    expect(key(ml("Monopatin Electrico Plegable Proove Urban Circuit 35km/h Dimm", "Proove", "Urban"))).toBe(
      "proove-urban"
    );
    expect(key(ml("Monopatin Scooter Electrico Xiaomi 6 Pro Negro", "Xiaomi", "Electric Scooter 6"))).toBe(
      "xiaomi-6-pro"
    );
  });

  it("sin marca, con marca que no está en el título y no es conocida, o desde Facebook: sin modelo", () => {
    expect(key(ml("Monopatín Eléctrico 250w Con 3 Modos Y Velocidad 25 Km/h", null, "universal"))).toBe(null);
    expect(key(ml("Monopatín Eléctrico para Adulto Premium Metal Reforzado 30km", "Link Sport", "eléctrico"))).toBe(
      null
    );
    expect(key({ ...ml("Monopatin Xiaomi 6 Pro", "Xiaomi"), source: "facebook" })).toBe(null);
  });

  it("la generación se escribe de cuatro formas y es un solo modelo (medido 4/11)", () => {
    const gen = [
      "Monopatín Xiaomi Mi Electric Scooter 4 Lite Gen2 25km/h",
      "Monopatín Eléctrico Xiaomi 4 Lite 2nd Plegable Carga 100kg",
      "Monopatín Eléctrico Xiaomi Electric Scooter 4 Lite 2da Gen",
      "Xiaomi Electric Scooter 4 Lite Gen 2 Negro",
    ].map((title) => key(ml(title, "Xiaomi")));
    expect(new Set(gen)).toEqual(new Set(["xiaomi-4-lite-gen2"]));
    expect(key(ml("Monopatín Eléctrico Xiaomi Electric Scooter 4 Lite Plegable", "Xiaomi"))).toBe("xiaomi-4-lite");
  });

  it("'2.0' es la versión del modelo, '8.5' es la rueda", () => {
    expect(key(ml("Monopatin Eléctrico S-pro Move 2.0 Rodado 10 600w 37km", "S-Pro"))).toBe("s-pro-move-2");
    expect(key(ml("Monopatin Eléctrico S-pro Move Rodado 10 600w 30km", "S-Pro"))).toBe("s-pro-move");
    expect(key(ml("Monopatin Electrico Scooter Gogreen Chill 8.5 30km/h", "Gogreen"))).toBe("gogreen-chill");
  });

  it("'rodado' y los accesorios no son parte del modelo", () => {
    expect(key(ml("Monopatin Electrico Enxuta Meenx552n Rodado 10", "Enxuta"))).toBe("enxuta-meenx552n");
    expect(key(ml("Monopatin Xiaomi Timbre Original", "Xiaomi"))).toBe(null);
  });

  it("nombra el modelo como lo vende la marca", () => {
    const six = identifyModel(ml("Monopatin Scooter Electrico Xiaomi 6 Pro Negro", "Xiaomi"))!;
    expect(six.label).toBe("Electric Scooter 6 Pro");
    expect(identifyModel(ml("Mistyle ME1000 1300W", "Mistyle"))!.label).toBe("ME1000");
    expect(identifyModel(ml("Atom Kaizen Pro Plegable", "Atom"))!.label).toBe("Kaizen Pro");
    expect(identifyModel(ml("Xiaomi 4 Lite Gen2", "Xiaomi"))!.label).toBe("Electric Scooter 4 Lite Gen 2");
  });
});

describe("marcas medidas el 4/11", () => {
  it("reconoce Proove, Maxwheel y Mirrend", () => {
    expect(brandFromTitle("Monopatín Eléctrico Proove City Pulse 350w")).toBe("Proove");
    expect(brandFromTitle("Monopatín Electrico Maxwheel D2pro 40/60 Km")).toBe("Maxwheel");
    expect(brandFromTitle("Scooter Electrico Barato Mirrend E01 150w")).toBe("Mirrend");
  });
});

describe("mlCatalogId y unifyByCatalog", () => {
  const id = (k: string): ModelIdentity => ({ brandKey: "xiaomi", brandLabel: "Xiaomi", tokens: [], key: k, label: k });

  it("lee el id de catálogo sólo de /p/", () => {
    expect(mlCatalogId("https://www.mercadolibre.com.uy/scooter/p/MLU35709336#x")).toBe("MLU35709336");
    expect(mlCatalogId("https://www.mercadolibre.com.uy/scooter/up/MLUU3740163485")).toBe(null);
  });

  it("los avisos del mismo producto de catálogo toman el modelo mayoritario", () => {
    const rows = unifyByCatalog([
      { url: "https://x/p/MLU1", identity: id("xiaomi-6-pro") },
      { url: "https://x/p/MLU1", identity: id("xiaomi-6-pro") },
      { url: "https://x/p/MLU1", identity: id("xiaomi-6") },
      { url: "https://x/p/MLU1", identity: null },
      { url: "https://x/up/MLUU2", identity: null },
    ]);
    expect(rows.map((row) => row.identity?.key ?? null)).toEqual([
      "xiaomi-6-pro",
      "xiaomi-6-pro",
      "xiaomi-6-pro",
      "xiaomi-6-pro",
      null,
    ]);
  });
});
