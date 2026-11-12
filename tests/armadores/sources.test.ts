// Las cuatro fuentes del directorio de armadores, cada una contra la forma REAL de su respuesta
// (medida el 11/11/2026) y con lectores falsos: sin red, sin Mongo, sin Chrome.
import { describe, expect, it } from "vitest";
import { editorialEntry, type EditorialProvider } from "../../classes/armadores/editorial";
import { facebookDescription, facebookEntry } from "../../classes/armadores/sources/facebook";
import { googleEntry, placesFromTextSearch, readGooglePlaces, type GooglePlace } from "../../classes/armadores/sources/google";
import { mlEntry, readMlServices } from "../../classes/armadores/sources/mercadolibre";

const DAY = "2026-11-11";

const place = (over: Partial<GooglePlace> = {}): GooglePlace => ({
  placeId: "ChIJ3_In-kSBn5URWefZSs8yexo",
  name: "Armado FAST - Armadores de Muebles Montevideo",
  address: "Av. 18 de Julio 1334, 11200 Montevideo, Departamento de Montevideo",
  lat: -34.9055,
  lng: -56.1868,
  rating: 5,
  count: 459,
  status: "OPERATIONAL",
  ...over,
});

describe("Google Places", () => {
  it("lee la respuesta de textsearch del proxy", () => {
    const { places, status } = placesFromTextSearch({
      status: "OK",
      results: [{
        place_id: "abc", name: "Jc Armados", formatted_address: "Ap 2, Baltasar Montero Vidaurreta 980, 11200 Montevideo",
        geometry: { location: { lat: -34.9, lng: -56.17 } }, rating: 4.3, user_ratings_total: 6, business_status: "OPERATIONAL",
      }],
    });
    expect(status).toBe("OK");
    expect(places).toEqual([expect.objectContaining({ placeId: "abc", name: "Jc Armados", rating: 4.3, count: 6, lat: -34.9, lng: -56.17 })]);
  });

  it("ubica el negocio en el barrio de su coordenada y guarda la puntuación con su fecha", () => {
    const entry = googleEntry(place(), () => "Cordón", DAY);
    expect(entry).toMatchObject({
      id: "g:ChIJ3_In-kSBn5URWefZSs8yexo",
      source: "google",
      base: { barrio: "Cordón", zone: "centro", department: "Montevideo", basis: "coordinates" },
      rating: { value: 5, count: 459, observedAt: DAY },
      placeId: "ChIJ3_In-kSBn5URWefZSs8yexo",
    });
    expect(entry?.url).toBe("https://www.google.com/maps/place/?q=place_id:ChIJ3_In-kSBn5URWefZSs8yexo");
  });

  it("descarta lo que no se llama armado (una mueblería, un local) y lo cerrado", () => {
    expect(googleEntry(place({ name: "MUEBLERÍA LO DE JOSÉ LUIS" }), () => "Cerro", DAY)).toBeNull();
    expect(googleEntry(place({ name: "Compramas Showroom Av. Italia" }), () => "Malvín", DAY)).toBeNull();
    expect(googleEntry(place({ status: "CLOSED_PERMANENTLY" }), () => "Cordón", DAY)).toBeNull();
  });

  it("no inventa barrio para un negocio sin dirección (área de servicio) y saca lo de afuera", () => {
    const sab = googleEntry(place({ name: "EL ARMADOR - Armado de muebles", address: "13000 Montevideo, Departamento de Montevideo" }), () => "Cerro", DAY);
    expect(sab?.base).toMatchObject({ barrio: null, zone: null, department: "Montevideo", basis: null });
    const costa = googleEntry(place({ name: "D&V Armadores de muebles", address: "Calle Francia MB14 S7, 15800 Ciudad de la Costa, Departamento de Canelones" }), () => null, DAY);
    expect(costa?.base).toMatchObject({ barrio: "Ciudad de la Costa", zone: "metropolitana", department: "Canelones" });
    expect(googleEntry(place({ name: "Armador de muebles Maldonado", address: "Calle 1, 20000 Maldonado, Departamento de Maldonado" }), () => null, DAY)).toBeNull();
  });

  it("une las consultas sin repetir negocios y cuenta las llamadas", async () => {
    const calls: string[] = [];
    const result = await readGooglePlaces({
      base: "http://proxy:2221",
      searches: [{ query: "armado de muebles", lat: -34.9, lng: -56.19 }, { query: "armador de muebles", lat: -34.9, lng: -56.15 }],
      pageDelayMs: 0,
      fetcher: async url => {
        calls.push(url);
        return { status: "OK", results: [{ place_id: "p1", name: "Armados Ya 2022" }, { place_id: calls.length === 1 ? "p2" : "p1", name: "Sosa armados" }] };
      },
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("/textsearch?query=armado%20de%20muebles&location=-34.9%2C-56.19&radius=");
    expect(result.places.map(p => p.placeId)).toEqual(["p1", "p2"]);
    expect(result.failed).toBe(0);
  });
});

describe("Facebook Marketplace", () => {
  const card = { id: "1111349271821184", title: "Armador de muebles económico Voy a todo Montevideo en el día", url: "https://www.facebook.com/marketplace/item/1111349271821184/", price: { amount: 990, currency: "UYU" as const }, image: "https://scontent.example/x.jpg", location: "Montevideo, Uruguay" };

  it("publica el precio de la tarjeta como precio del aviso, sin atribuirlo a un mueble", () => {
    const entry = facebookEntry(card, null, DAY);
    expect(entry).toMatchObject({ id: "fb:1111349271821184", source: "facebook", kind: "aviso", symbolicPrice: false, image: null });
    expect(entry?.coverage.allMontevideo).toBe(true);
    expect(entry?.prices).toEqual([expect.objectContaining({ item: null, amount: 990, kind: "ad", origin: "ad-card" })]);
  });

  it("marca un monto simbólico y no lo publica como precio", () => {
    const entry = facebookEntry({ ...card, price: { amount: 100, currency: "UYU" } }, null, DAY);
    expect(entry?.symbolicPrice).toBe(true);
    expect(entry?.prices).toEqual([]);
  });

  it("suma la lista de precios y los barrios de la descripción", () => {
    const entry = facebookEntry(card, "Trabajo en Pocitos y Buceo.\nRopero 3 puertas $1.200\nCama $600", DAY);
    expect(entry?.coverage.barrios).toEqual(["Pocitos", "Buceo"]);
    expect(entry?.coverage.zones).toEqual(["costa-este"]);
    expect(entry?.prices.map(p => [p.item, p.amount, p.origin])).toEqual([[null, 990, "ad-card"], ["ropero", 1200, "ad-text"], ["cama", 600, "ad-text"]]);
  });

  it("descarta productos y avisos fuera de Montevideo y el área metropolitana", () => {
    expect(facebookEntry({ ...card, title: "Mueble de cocina" }, null, DAY)).toBeNull();
    expect(facebookEntry({ ...card, location: "Florida, Uruguay" }, null, DAY)).toBeNull();
    expect(facebookEntry({ ...card, location: "Las Piedras, Uruguay" }, null, DAY)?.base).toMatchObject({ barrio: "Las Piedras", zone: "metropolitana" });
  });

  it("saca la descripción de la ficha del propio aviso", () => {
    const texts = [JSON.stringify({ data: { node: { id: "1111349271821184", listing_price: { amount: "990" }, redacted_description: { text: "Ropero $1.200" } } } })];
    expect(facebookDescription("1111349271821184", texts)).toBe("Ropero $1.200");
    expect(facebookDescription("999", texts)).toBeNull();
  });
});

describe("MercadoLibre Servicios", () => {
  it("toma el barrio del filtro de ciudad de ML y descarta lo que no es armado de muebles", async () => {
    const result = await readMlServices({
      base: "http://bridge/mercadolibre",
      queries: ["armador"],
      states: { Montevideo: "MVD" },
      gapMs: 0,
      fetcher: async url => {
        const city = new URL(url).searchParams.get("city");
        if (!city) {
          return {
            results: [
              { id: "MLU1", title: "Armador De Muebles A Domicilio", permalink: "https://servicio.mercadolibre.com.uy/MLU-1-_JM", image: "https://http2.mlstatic.com/a.webp" },
              { id: "MLU2", title: "Armador De Casetas, Armador De Galpones.", permalink: "https://servicio.mercadolibre.com.uy/MLU-2-_JM" },
            ],
            available_filters: [{ id: "city", values: [{ id: "C1", name: "Centro", results: 1 }] }],
          };
        }
        return { results: [{ id: "MLU1", title: "Armador De Muebles A Domicilio", permalink: "https://servicio.mercadolibre.com.uy/MLU-1-_JM" }] };
      },
    });
    expect(result.items).toEqual([expect.objectContaining({ id: "MLU1", state: "Montevideo", city: "Centro" })]);
    const entry = mlEntry(result.items[0]!, DAY);
    expect(entry).toMatchObject({ id: "ml:MLU1", source: "mercadolibre", base: { barrio: "Centro", zone: "centro", basis: "ml-city" }, image: "https://http2.mlstatic.com/a.webp" });
  });
});

describe("relevamiento editorial", () => {
  const provider: EditorialProvider = {
    id: "furniture-home",
    name: "Furniture Home",
    kind: "empresa",
    summary: "Armado y carpintería a domicilio.",
    website: "https://furniturehome.uy",
    googleName: null,
    base: { address: "Bv. Gral. Artigas 2698", barrio: "Parque Batlle", department: "Montevideo" },
    coverage: { allMontevideo: true, barrios: [], outside: ["Canelones"], sourceUrl: "https://furniturehome.uy" },
    services: ["armado", "desarmado"],
    storeOnly: false,
    prices: [{ item: "ropero", label: "Roperos", amount: 1200, amountMax: null, currency: "UYU", kind: "from", conditions: null, sourceUrl: "https://furniturehome.uy/precios", publishedAt: null }],
    contacts: [{ type: "whatsapp", value: "+598 99 000 000", sourceUrl: "https://furniturehome.uy" }],
    sources: [{ url: "https://furniturehome.uy/precios", consultedAt: "2026-11-10", note: "tabla" }],
  };

  it("fecha cada precio con la consulta de su fuente y ubica la base", () => {
    const entry = editorialEntry(provider, "2026-11-11");
    expect(entry).toMatchObject({ id: "ed:furniture-home", source: "editorial", base: { barrio: "Parque Batlle", zone: "costa-este", basis: "editorial" } });
    expect(entry.prices[0]).toMatchObject({ item: "ropero", origin: "table", observedAt: "2026-11-10", kind: "from" });
    expect(entry.coverage).toMatchObject({ allMontevideo: true, outside: ["Canelones"] });
  });
});
