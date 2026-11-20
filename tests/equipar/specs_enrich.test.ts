import { describe, expect, it } from "vitest";
import { enrichEquiparRow, withoutEmptyBrand } from "../../classes/equipar/specs/enrich";
import { buildEquiparFichaSnapshot } from "../../classes/equipar/specs/snapshot";
import { equiparFichaUpdate } from "../../classes/equipar/specs/store";
import type { EquiparListingRow } from "../../classes/equipar/listings";

const row = (over: Partial<EquiparListingRow> = {}): EquiparListingRow => ({
  listingId: "ml:MLU1",
  category: "heladera",
  categoryLabel: "Heladera",
  variant: "media",
  variantLabel: "Mediana",
  tier: "S",
  room: "cocina",
  rank: 1,
  variantRank: 2,
  regime: "modelo",
  condition: "new",
  source: "mercadolibre",
  sellerKey: "ml:1",
  sellerName: "Tienda",
  channel: "",
  officialStore: false,
  brand: "",
  brandKey: "",
  title: "Refrigerador Enxuta No Frost Inverter 245 L",
  url: "https://www.mercadolibre.com.uy/x/up/MLUU1",
  image: null,
  price: 25_000,
  currency: "UYU",
  priceUyu: 25_000,
  listPrice: null,
  location: null,
  freeShipping: null,
  suspect: false,
  observedAt: "2026-11-04T10:00:00Z",
  lastSeen: "2026-11-04",
  ...over,
});

describe("enrichEquiparRow", () => {
  it("la ficha gana al título y llena la marca vacía", () => {
    const enriched = enrichEquiparRow(row(), {
      listingId: "ml:MLU1",
      rows: { "Capacidad total": "245 L", "Tipo de deshielo": "No frost", "Eficiencia energética Uruguay": "A" },
      brand: "Enxuta",
      model: "RENX22275W",
    });
    expect(enriched.ficha?.values).toMatchObject({ capacidadL: 245, noFrost: true, inverter: true, eficiencia: "A" });
    expect(enriched.ficha?.from).toMatchObject({ capacidadL: "ficha", inverter: "titulo" });
    expect(enriched.brand).toBe("Enxuta");
    expect(enriched.brandKey).toBe("enxuta");
  });

  it("sin ficha usa el título; una marca genérica no pisa nada", () => {
    const enriched = enrichEquiparRow(row(), { listingId: "ml:MLU1", rows: null, brand: "Genérica", model: null });
    expect(enriched.ficha?.values.capacidadL).toBe(245);
    expect(enriched.brandKey).toBe("");
  });

  it("la clave de una marca de ficha es la de las tiendas (norm), no un slug", () => {
    const enriched = enrichEquiparRow(row(), { listingId: "ml:MLU1", rows: null, brand: "Black Decker", model: null });
    expect(enriched.brandKey).toBe("black decker");
  });

  it("sin fichas, una fila de ML sin marca no manda la marca vacía", () => {
    const stripped = withoutEmptyBrand(row());
    expect("brand" in stripped).toBe(false);
    expect("brandKey" in stripped).toBe(false);
    const branded = row({ brand: "LG", brandKey: "lg" });
    expect(withoutEmptyBrand(branded)).toBe(branded);
    const other = row({ category: "olla" });
    expect(withoutEmptyBrand(other)).toBe(other);
  });

  it("no toca categorías sin ficha", () => {
    const other = row({ category: "olla", title: "Olla 5 L" });
    expect(enrichEquiparRow(other, undefined)).toEqual(other);
  });
});

describe("equiparFichaUpdate", () => {
  const target = { listingId: "ml:MLU1", url: "u", category: "heladera" };
  const base = { gone: false, description: "", brand: null, model: null };

  it("una lectura con tabla guarda las filas crudas", () => {
    const update = equiparFichaUpdate(target, { ok: true, rows: { A: "1" }, ...base }, "t");
    expect(update.$set).toMatchObject({ ok: true, failures: 0, rows: { A: "1" }, readAt: "t" });
  });

  it("una lectura sin tabla nunca borra las filas buenas", () => {
    const update = equiparFichaUpdate(target, { ok: true, rows: {}, ...base }, "t");
    expect(update.$set).not.toHaveProperty("rows");
    expect(update.$setOnInsert).toMatchObject({ rows: null });
  });

  it("una falla suma; un aviso borrado no", () => {
    expect(equiparFichaUpdate(target, { ok: false, rows: {}, ...base }, "t").$inc).toEqual({ failures: 1 });
    expect(equiparFichaUpdate(target, { ok: false, rows: {}, ...base, gone: true }, "t").$inc).toBeUndefined();
  });
});

describe("buildEquiparFichaSnapshot", () => {
  it("sólo avisos con ficha del vendedor, ni sospechosos ni de Facebook, del más barato al más caro", () => {
    const withFicha = (id: string, price: number, over: Partial<EquiparListingRow> = {}) =>
      enrichEquiparRow(row({ listingId: id, priceUyu: price, ...over }), {
        listingId: id,
        rows: { "Capacidad total": "245 L" },
        brand: null,
        model: null,
      });
    const snapshot = buildEquiparFichaSnapshot(
      "heladera",
      [
        withFicha("b", 30_000),
        withFicha("a", 20_000),
        withFicha("sospechosa", 1_000, { suspect: true }),
        withFicha("fb", 5_000, { source: "facebook" }),
        enrichEquiparRow(row({ listingId: "titulo" }), undefined),
      ],
      "2026-11-04T10:00:00Z"
    );
    expect(snapshot.candidates.map((c) => c.id)).toEqual(["a", "b"]);
    expect(snapshot).toMatchObject({ key: "heladera", total: 4, withFicha: 2 });
    expect(snapshot.candidates[0]!.values.capacidadL).toBe(245);
  });
});
