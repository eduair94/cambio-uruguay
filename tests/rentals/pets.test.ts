// "Admite mascotas": de dónde sale, y por qué no existe el `false`.
//
// El pedido que lo originó fue "un alquiler de 2 habitaciones cerca de la médica uruguaya que
// admita animales". El título no sirve: de 16.089 propiedades vivas, 69 lo mencionan (medido
// 2026-09-04), y de las 808 que están a 2 km de esas mutualistas, 11. Un filtro sobre el título
// mostraría 11 y escondería el resto sin decirlo.
//
// El dato real es ESTRUCTURADO y sale de dos lados:
//   * InfoCasas: la facility 222, presente en el `__NEXT_DATA__` que el sweep ya baja.
//   * MercadoLibre: el filtro de búsqueda IS_SUITABLE_FOR_PETS (no viene por aviso).
// Ninguno de los dos publica la negativa, así que el tipo es `true | null`.
import { describe, expect, it, vi } from "vitest";
import { buildRentalProperties } from "../../classes/rentals/dedupe";
import { mergeOffers, recomputeFromOffers } from "../../classes/rentals/store";
import type { RawRental, RentalOffer, RentalProperty, RentalSource } from "../../classes/rentals/types";

vi.mock("../../classes/rentals/net", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../classes/rentals/net");
  return { ...actual, fetchText: vi.fn(), fetchJson: vi.fn() };
});

import { fetchText } from "../../classes/rentals/net";
import { harvestInfoCasas } from "../../classes/rentals/sources/infocasas";

/** Una fila de InfoCasas recortada, con las claves que el parser realmente lee. */
const icRow = (id: number, facilities: unknown, extra: Record<string, unknown> = {}) => ({
  id,
  title: `Alquiler apartamento ${id}`,
  address: "Rizal 3715",
  link: `/inmueble/${id}`,
  latitude: -34.9,
  longitude: -56.15,
  bedrooms: 2,
  bathrooms: 1,
  m2: 60,
  price: { amount: 30000, currency: { name: "$" } },
  locations: [{ name: "Montevideo" }, { name: "Pocitos" }],
  owner: { name: "Inmobiliaria X" },
  property_type: { name: "Apartamento" },
  operation_type: { name: "Alquiler" },
  facilities,
  ...extra,
});

const icPage = (rows: unknown[]) =>
  `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        fetchResult: {
          searchFast: { data: rows, paginatorInfo: { hasMorePages: false, total: rows.length } },
        },
      },
    },
  })}</script></body></html>`;

const harvest = async (rows: unknown[]) => {
  (fetchText as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(icPage(rows));
  process.env.RENTALS_IC_MAX_PAGES = "1";
  return harvestInfoCasas("full", 41.45);
};

describe("InfoCasas publica el dato de mascotas y el parser lo lee", () => {
  it("marca true por el id 222", async () => {
    const out = await harvest([icRow(1, [{ id: 222, name: "Se aceptan mascotas", group: "Confort de la casa" }])]);
    expect(out.listings[0]?.petsAllowed).toBe(true);
  });

  // Dos señales redundantes a propósito: si renumeran, queda el nombre; si cambian el texto, el id.
  it("marca true por el nombre aunque el id cambie", async () => {
    const out = await harvest([icRow(2, [{ id: 999, name: "Se aceptan mascotas" }])]);
    expect(out.listings[0]?.petsAllowed).toBe(true);
  });

  it("deja null cuando el aviso no lo dice, y NUNCA false", async () => {
    const out = await harvest([icRow(3, [{ id: 9, name: "Garaje" }]), icRow(4, null)]);
    expect(out.listings.map((l) => l.petsAllowed)).toEqual([null, null]);
  });

  // `facilitiesNotApply` NO es la negación: es un booleano del aviso, y sobre 210 avisos medidos
  // hay 12 que lo traen en `true` Y traen la facility 222. Leerlo como negativa borraría esos 12.
  it("facilitiesNotApply no convierte un true en false", async () => {
    const out = await harvest([
      icRow(5, [{ id: 222, name: "Se aceptan mascotas" }], { facilitiesNotApply: true }),
    ]);
    expect(out.listings[0]?.petsAllowed).toBe(true);
  });
});

describe("al unificar la propiedad", () => {
  const base: RawRental = {
    source: "infocasas",
    listingId: "infocasas:1",
    url: "https://www.infocasas.com.uy/x/1",
    title: "Apartamento 2 dormitorios en Pocitos",
    price: 32_000,
    currency: "UYU",
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: "Inmobiliaria X",
    sellerType: "inmobiliaria",
    image: null,
    publishedAt: null,
    petsAllowed: null,
    propertyType: "apartamento",
    department: "Montevideo",
    neighborhood: "Pocitos",
    address: "Rizal 3715",
    street: "rizal",
    streetNumber: "3715",
    latitude: -34.9,
    longitude: -56.15,
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
  };

  const context = {
    usdUyu: 41.45,
    today: "2026-09-04",
    offerFirstSeen: new Map<string, string>(),
    propertyFirstSeen: new Map<string, string>(),
    offerToProperty: new Map<string, string>(),
  };

  // Basta con que UN portal lo diga: la ausencia no es una negativa, así que un `null` no
  // contradice a un `true` — sólo dice que ese aviso no lo menciona.
  it("un portal que lo dice alcanza para la propiedad entera", () => {
    const conDato = { ...base, listingId: "infocasas:1", petsAllowed: true as const };
    const sinDato = { ...base, source: "mercadolibre" as const, listingId: "mercadolibre:1" };
    const [property] = buildRentalProperties([conDato, sinDato], context);
    expect(property?.petsAllowed).toBe(true);
    expect(property?.offers).toHaveLength(2);
  });

  it("si ningún portal lo dice, la propiedad queda en null", () => {
    const [property] = buildRentalProperties([base], context);
    expect(property?.petsAllowed).toBeNull();
  });

  // La bandera viaja también por oferta, para poder decir CUÁL portal lo publica.
  it("conserva por oferta qué portal lo publicó", () => {
    const conDato = { ...base, petsAllowed: true as const };
    const [property] = buildRentalProperties([conDato], context);
    expect(property?.offers[0]?.petsAllowed).toBe(true);
  });
});

// La corrida RAPIDA de cada hora no hace la pasada de mascotas de MercadoLibre (es una consulta
// aparte y sólo corre en la completa). Si esa corrida vuelve a ver un aviso que la completa había
// marcado, lo trae con `petsAllowed: null` — y `mergeOffers` pisa lo guardado con lo fresco por
// listingId. Sin una regla, cada hora se borraban las 1.318 marcas que vienen de ML.
//
// `null` NO es una negativa: es "esta corrida no preguntó". Por eso nunca puede pisar un `true`.
describe("la corrida rapida no puede borrar lo que la completa averiguo", () => {
  const offer = (over: Partial<RentalOffer> & { listingId: string }): RentalOffer => ({
    source: "mercadolibre",
    url: "https://x",
    title: "Apartamento",
    price: 30_000,
    currency: "UYU",
    priceUyu: 30_000,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: "x",
    sellerType: "desconocido",
    image: null,
    publishedAt: null,
    petsAllowed: null,
    firstSeen: "2026-09-01",
    lastSeen: "2026-09-04",
    ...over,
  });
  const context = {
    today: "2026-09-04",
    okSources: new Set<RentalSource>(["mercadolibre"]),
    staleOfferDays: 4,
  };

  it("conserva el true de la oferta guardada cuando la fresca no lo dice", () => {
    const merged = mergeOffers(
      [offer({ listingId: "mercadolibre:1", petsAllowed: true })],
      [offer({ listingId: "mercadolibre:1" })],
      context
    );
    expect(merged[0]?.petsAllowed).toBe(true);
  });

  it("la propiedad recalculada sigue marcada si alguna oferta lo dice", () => {
    const property = {
      key: "k",
      firstSeen: "2026-09-01",
      petsAllowed: null,
    } as unknown as RentalProperty;
    const out = recomputeFromOffers(property, [
      offer({ listingId: "mercadolibre:1", petsAllowed: true }),
      offer({ listingId: "infocasas:1", source: "infocasas" }),
    ]);
    expect(out.petsAllowed).toBe(true);
  });

  it("y queda en null cuando ninguna oferta lo dice", () => {
    const property = { key: "k", firstSeen: "2026-09-01", petsAllowed: true } as unknown as RentalProperty;
    const out = recomputeFromOffers(property, [offer({ listingId: "mercadolibre:1" })]);
    expect(out.petsAllowed).toBeNull();
  });
});
