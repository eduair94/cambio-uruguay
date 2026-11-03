import { describe, expect, it } from "vitest";
import type { EquiparListingRow } from "../../classes/equipar/listings";
import { MovilidadListingModel } from "../../classes/models/MovilidadListing";
import { enrichMovilidadRow, type StoredFicha } from "../../classes/movilidad/specs/enrich";
import { specsFromRows } from "../../classes/movilidad/specs/parse";

const row = (over: Partial<EquiparListingRow> = {}): EquiparListingRow => ({
  listingId: "ml:MLU1",
  category: "monopatin-electrico",
  categoryLabel: "Monopatín eléctrico",
  variant: "urbano",
  variantLabel: "Urbano o estándar",
  tier: "B",
  room: "movilidad",
  rank: 0,
  variantRank: 2,
  regime: "modelo",
  condition: "new",
  source: "mercadolibre",
  sellerKey: "ml:1",
  sellerName: "DIMM",
  channel: "marketplace",
  officialStore: false,
  brand: "",
  brandKey: "",
  title: "Monopatín Eléctrico Luxor E9pro 25 Km/h Plegable 350w Dimm",
  url: "https://www.mercadolibre.com.uy/x/up/MLUU1",
  image: null,
  price: 24_000,
  currency: "UYU",
  priceUyu: 24_000,
  listPrice: null,
  location: null,
  freeShipping: null,
  suspect: false,
  observedAt: "2026-11-03T10:00:00Z",
  lastSeen: "2026-11-03",
  ...over,
});

const ficha = (rows: Record<string, string>, over: Partial<StoredFicha> = {}): StoredFicha => ({
  listingId: "ml:MLU1",
  specs: specsFromRows(rows),
  brand: null,
  model: null,
  ...over,
});

describe("enrichMovilidadRow", () => {
  it("no toca una fila de bicicleta", () => {
    const bike = row({ category: "bicicleta-electrica", title: "Bicicleta Eléctrica 350w 25 km/h" });
    expect(enrichMovilidadRow(bike, undefined)).toEqual(bike);
  });

  it("sin ficha, usa sólo el título y no calcula precio por km", () => {
    const enriched = enrichMovilidadRow(row(), undefined);
    expect(enriched.specs).toMatchObject({ maxSpeedKmh: 25, motorW: 350, foldable: true });
    expect(enriched.specs?.from.motorW).toBe("titulo");
    expect(enriched.uyuPerKm).toBeNull();
    expect(enriched.brand).toBe("Luxor");
    expect(enriched.brandKey).toBe("luxor");
  });

  it("con ficha, la ficha gana y calcula el precio por km de autonomía declarada", () => {
    const enriched = enrichMovilidadRow(row(), ficha({ Autonomía: "30 km", "Potencia del motor": "500 W" }));
    expect(enriched.specs?.motorW).toBe(500);
    expect(enriched.specs?.from.motorW).toBe("ficha");
    expect(enriched.specs?.maxSpeedKmh).toBe(25);
    expect(enriched.uyuPerKm).toBe(800);
  });

  it("una autonomía que sólo dice el título no da precio por km", () => {
    const enriched = enrichMovilidadRow(
      row({ title: "Monopatín Eléctrico 40km" }),
      ficha({ "Potencia del motor": "500 W" })
    );
    expect(enriched.specs?.rangeKm).toBe(40);
    expect(enriched.uyuPerKm).toBeNull();
  });

  it("la marca de la ficha llena una marca vacía, salvo que sea un genérico", () => {
    expect(enrichMovilidadRow(row(), ficha({}, { brand: "XIAOMI" })).brand).toBe("Xiaomi");
    const generic = enrichMovilidadRow(
      row({ title: "Monopatín Eléctrico Segway E2" }),
      ficha({}, { brand: "Monopatin" })
    );
    expect(generic.brand).toBe("Segway");
    expect(generic.brandKey).toBe("segway");
  });

  it("nunca pisa una marca que la fila ya tenía", () => {
    const enriched = enrichMovilidadRow(row({ brand: "Atom", brandKey: "atom" }), ficha({}, { brand: "Xiaomi" }));
    expect(enriched.brand).toBe("Atom");
  });

  it("sin ningún dato deja la ficha en null", () => {
    const enriched = enrichMovilidadRow(row({ title: "Monopatin Electrico Urbano" }), undefined);
    expect(enriched.specs).toBeNull();
    expect(enriched.uyuPerKm).toBeNull();
  });
});

describe("esquema de movilidadlistings", () => {
  it("declara la ficha y el precio por km (si no, mongoose los descarta al escribir)", () => {
    expect(Object.keys(MovilidadListingModel.schema.obj)).toEqual(expect.arrayContaining(["specs", "uyuPerKm"]));
  });
});
