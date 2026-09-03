import { beforeEach, describe, expect, it, vi } from "vitest";

// La fila vieja de una unión que se parte tiene que limpiarse el MISMO día.
//
// Cuando el agrupamiento deja de unir dos avisos —desde el 2026-09-03 pasa con casa contra
// apartamento, y con cualquier par que sólo compartía departamento— uno se queda con la clave vieja
// y el otro estrena la suya. El que se fue seguía guardado en la fila vieja hasta vencer por días:
// durante esa ventana el mismo aviso salía en DOS propiedades y la vieja seguía publicando un merge
// que el propio agrupamiento ya había desarmado.
const find = vi.fn();
const bulkWrite = vi.fn();
vi.mock("../../classes/models/RentalListing", () => ({
  RentalListingModel: {
    find: (...a: unknown[]) => find(...a),
    bulkWrite: (...a: unknown[]) => bulkWrite(...a),
  },
}));

import { saveRentalProperties } from "../../classes/rentals/store";
import type { RentalOffer, RentalProperty, RentalSource } from "../../classes/rentals/types";

const offer = (listingId: string, priceUyu = 30_000): RentalOffer => ({
  source: "infocasas" as RentalSource,
  listingId,
  url: "https://example.com",
  title: "Apartamento",
  price: priceUyu,
  currency: "UYU",
  priceUyu,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: "x",
  sellerType: "desconocido",
  image: null,
  publishedAt: null,
  firstSeen: "2026-08-01",
  lastSeen: "2026-09-03",
});

const property = (key: string, offers: RentalOffer[]): RentalProperty =>
  ({
    key,
    title: "Apartamento",
    propertyType: "apartamento",
    department: "Montevideo",
    neighborhood: "Pocitos",
    address: "",
    street: "",
    streetNumber: "",
    latitude: null,
    longitude: null,
    bedrooms: 2,
    bathrooms: 1,
    area: null,
    price: offers[0].price,
    currency: "UYU",
    priceUyu: offers[0].priceUyu,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: "x",
    sellerType: "desconocido",
    image: null,
    sources: ["infocasas"],
    offers,
    firstSeen: "2026-08-01",
    lastSeen: "2026-09-03",
    freshAt: "2026-09-03",
  }) as unknown as RentalProperty;

const context = {
  today: "2026-09-03",
  okSources: new Set<RentalSource>(["infocasas"]),
  staleOfferDays: 4,
};

const written = () =>
  bulkWrite.mock.calls.flatMap((call) => call[0] as Array<{ updateOne: { update: { $set: RentalProperty } } }>);

beforeEach(() => {
  find.mockReset();
  bulkWrite.mockReset();
  bulkWrite.mockResolvedValue({});
});

describe("saveRentalProperties cuando una union se parte", () => {
  it("saca de la fila vieja el aviso que hoy pertenece a otra propiedad", () => {
    // Ayer: una sola fila con los dos avisos. Hoy el agrupamiento los separó.
    find.mockReturnValue({
      select: () => ({
        lean: async () => [
          { key: "vieja", offers: [offer("infocasas:casa"), offer("infocasas:apto")], firstSeen: "2026-08-01" },
        ],
      }),
    });

    return saveRentalProperties(
      [property("vieja", [offer("infocasas:casa")]), property("nueva", [offer("infocasas:apto")])],
      context
    ).then(() => {
      const rows = written();
      const vieja = rows.find((row) => row.updateOne.update.$set.key === "vieja");
      const nueva = rows.find((row) => row.updateOne.update.$set.key === "nueva");
      expect(vieja?.updateOne.update.$set.offers.map((o) => o.listingId)).toEqual(["infocasas:casa"]);
      expect(nueva?.updateOne.update.$set.offers.map((o) => o.listingId)).toEqual(["infocasas:apto"]);
    });
  });

  it("no toca un aviso guardado que esta corrida no vio", async () => {
    // Es lo que hace que esto sea seguro en la corrida rápida, que sólo mira lo recién publicado:
    // "no está en el mapa" significa "no sé nada de él", no "ya no pertenece acá".
    find.mockReturnValue({
      select: () => ({
        lean: async () => [
          { key: "vieja", offers: [offer("infocasas:1"), offer("infocasas:ausente")], firstSeen: "2026-08-01" },
        ],
      }),
    });

    await saveRentalProperties([property("vieja", [offer("infocasas:1")])], context);
    const rows = written();
    expect(rows[0].updateOne.update.$set.offers.map((o) => o.listingId).sort()).toEqual([
      "infocasas:1",
      "infocasas:ausente",
    ]);
  });
});
