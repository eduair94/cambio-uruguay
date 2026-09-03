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

import { dropReassignedOffers, saveRentalProperties } from "../../classes/rentals/store";
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

// Limpiar solo las filas que la corrida escribe no alcanza: cuando el agrupamiento deja de unir dos
// avisos, la fila vieja puede no producirse NUNCA MAS, asi que nadie la toca y se queda con su
// copia hasta vencer por dias. Medido el 2026-09-03 despues de la primera corrida arreglada:
// 2.707 avisos vivian en mas de una fila.
describe("dropReassignedOffers", () => {
  const rowsInDb = (rows: unknown[]) => {
    find.mockReturnValue({
      lean: () => ({
        cursor: () => (async function* () {
          for (const row of rows) yield row;
        })(),
      }),
    });
  };

  it("saca el aviso de la fila que ya no es su dueña", async () => {
    rowsInDb([
      { key: "vieja", offers: [offer("infocasas:1"), offer("infocasas:2")] },
      { key: "nueva", offers: [offer("infocasas:2")] },
    ]);
    const out = await dropReassignedOffers([
      property("vieja", [offer("infocasas:1")]),
      property("nueva", [offer("infocasas:2")]),
    ]);
    expect(out.removed).toBe(1);
    expect(out.cleaned).toBe(1);
    const op = bulkWrite.mock.calls[0][0][0] as { updateOne: { update: { $set: { offers: Array<{ listingId: string }> } } } };
    expect(op.updateOne.update.$set.offers.map(o => o.listingId)).toEqual(["infocasas:1"]);
  });

  it("borra la fila que se queda sin un solo aviso", async () => {
    rowsInDb([{ key: "vieja", offers: [offer("infocasas:2")] }]);
    const out = await dropReassignedOffers([property("nueva", [offer("infocasas:2")])]);
    expect(out.deleted).toBe(1);
    const op = bulkWrite.mock.calls[0][0][0] as { deleteOne: { filter: { key: string } } };
    expect(op.deleteOne.filter.key).toBe("vieja");
  });

  it("no toca un aviso que la corrida no vio", async () => {
    rowsInDb([{ key: "vieja", offers: [offer("infocasas:ausente")] }]);
    const out = await dropReassignedOffers([property("nueva", [offer("infocasas:otro")])]);
    expect(out).toEqual({ cleaned: 0, removed: 0, deleted: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });
});
