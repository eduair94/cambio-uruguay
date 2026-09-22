import { describe, expect, it } from "vitest";
import { buildEquiparListings } from "../../classes/equipar/listings";
import { toOffer } from "../../classes/equipar/catalog";
import { MOVILIDAD_CATEGORIES } from "../../classes/movilidad/registry";
import { MovilidadListingModel } from "../../classes/models/MovilidadListing";
import type { RetailListing } from "../../classes/retail/types";

// `.schema` / `.collection.name` are answered statically by the appModel proxy (classes/appdb.ts)
// without ever opening a connection — no APP_MONGO_URI needed for any test in this file.

let counter = 0;

function listing(overrides: Partial<RetailListing> & { title: string }): RetailListing {
  counter += 1;
  return {
    listingId: `x:${counter}`,
    source: "store",
    sellerKey: "delcar",
    sellerName: "Delcar",
    channel: "local-store",
    url: `https://delcar.com.uy/p/${counter}`,
    price: 30_000,
    currency: "UYU",
    condition: "new",
    available: true,
    image: "https://delcar.com.uy/img.jpg",
    brand: "Xiaomi",
    model: "",
    catalogId: null,
    attributes: { CATEGORY_SPEC: "monopatin-electrico" },
    rating: null,
    ratingCount: 0,
    location: null,
    freeShipping: null,
    officialStore: true,
    observedAt: "2026-09-21T14:05:00.000Z",
    ...overrides,
  };
}

const newScooters = (): RetailListing[] =>
  Array.from({ length: 10 }, (_, index) =>
    listing({ title: `Monopatin Electrico Xiaomi Pro ${2 + index}`, price: 29_000 + index * 400 })
  );

describe("el directorio de avisos de movilidad", () => {
  it("clasifica contra el registro de movilidad, no contra el de equipar", () => {
    const { rows } = buildEquiparListings({
      listings: newScooters(),
      usdUyu: 40,
      registry: MOVILIDAD_CATEGORIES,
    });

    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row.category).toBe("monopatin-electrico");
      expect(row.room).toBe("movilidad");
      expect(row.condition).toBe("new");
      expect(row.image).toBe("https://delcar.com.uy/img.jpg");
    }
  });

  it("sin registro inyectado un monopatín no cae en ninguna categoría de equipar", () => {
    // La prueba de que las dos colecciones no se pueden mezclar: el mismo aviso contra el registro
    // por defecto (equipar) no produce fila alguna.
    const { rows } = buildEquiparListings({ listings: newScooters(), usdUyu: 40 });
    expect(rows).toHaveLength(0);
  });

  it("escribe en movilidadlistings, nunca en equiparlistings", () => {
    expect(MovilidadListingModel.collection.name).toBe("movilidadlistings");
  });
});

describe("la foto de una oferta", () => {
  it("viaja con la oferta cuando la publica una tienda o Mercado Libre", () => {
    const offer = toOffer(listing({ title: "Monopatin Electrico Xiaomi Pro 2" }), 40);
    expect(offer.image).toBe("https://delcar.com.uy/img.jpg");
  });

  it("nunca viaja desde Facebook: esas URLs son del vendedor y vencen", () => {
    const offer = toOffer(
      listing({
        title: "Monopatin electrico poco uso",
        source: "facebook",
        sellerKey: "facebook",
        sellerName: "Facebook Marketplace",
        channel: "classifieds",
        condition: "unknown",
        image: "https://scontent.xx.fbcdn.net/expira.jpg",
      }),
      40
    );
    expect(offer.image).toBeNull();
  });
});
