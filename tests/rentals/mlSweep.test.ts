// La guarda que impide marcar toda la categoría cuando un filtro de MercadoLibre no se aplica.
//
// No es paranoia: medido el 2026-09-04 contra el puente, los dos filtros que usamos fallan de
// maneras OPUESTAS ante un valor inválido.
//   * `IS_SUITABLE_FOR_PETS=999999`  -> total 0    (el filtro se aplica y no matchea nada)
//   * `seller_type=inventado`        -> total 15.416 = EL TOTAL SIN FILTRAR (se ignora en silencio)
// El segundo es el peligroso: sin comparar totales, una pasada de "vendedor particular" marcaría
// los 15.416 avisos de la categoría como alquilados por su dueño. La comparación
// `filtrado >= sin filtrar -> no marcar nada` cubre los dos casos.
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchJson = vi.fn();
vi.mock("../../classes/rentals/net", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../classes/rentals/net");
  return { ...actual, fetchJson: (...args: unknown[]) => fetchJson(...args) };
});

import { harvestMercadoLibre } from "../../classes/rentals/sources/mercadolibre";

/**
 * Una tarjeta con la forma mínima que `toRawRental` acepta.
 *
 * Load-bearing y fácil de romper: hace falta `metadata.id` (sin eso devuelve null antes de mirar
 * nada), `permalink` y `title` dentro de `url_params`, un precio positivo y una moneda que sea UYU
 * o USD. Y el título tiene que parecer un aviso de alquiler o `looksLikeRentalAdvert` lo descarta.
 */
const card = (id: string) => ({
  metadata: {
    id,
    url_params: new URLSearchParams({
      permalink: `https://articulo.mercadolibre.com.uy/MLU-${id}`,
      title: `Alquiler apartamento 2 dormitorios ${id}`,
      price: "30000",
      currency_id: "UYU",
      location: "Pocitos, Montevideo",
    }).toString(),
    domain_id: "MLU-APARTMENTS_FOR_RENT",
  },
  components: [
    { title: { text: `Alquiler apartamento 2 dormitorios ${id}` } },
    { price: { current_price: { value: 30000, currency: "UYU" } } },
    { attributes_list: { texts: ["2 dormitorios", "1 baño", "60 m² cubiertos"] } },
    { location: { text: "Pocitos, Montevideo" } },
  ],
});

// `collectPolycards` recorre el arbol buscando la clave `polycard`. Sin ese envoltorio no
// encuentra nada, y la cosecha devuelve cero avisos sin decir por que.
const page = (ids: string[], total: number) => ({
  paging: { total },
  components: ids.map((id) => ({ polycard: card(id) })),
});

afterEach(() => {
  fetchJson.mockReset();
});

/**
 * Contesta segun si la URL lleva el filtro. `filteredTotal` es lo que ML dice para la busqueda
 * filtrada — que es exactamente la señal que decide si se marca o no.
 */
function serve(filterKey: string, filteredTotal: number, unfilteredTotal = 100) {
  fetchJson.mockImplementation(async (url: string) => {
    const filtrada = url.includes(filterKey);
    return page(["1", "2"], filtrada ? filteredTotal : unfilteredTotal);
  });
}

describe("las pasadas filtradas de MercadoLibre", () => {
  it("marca cuando el filtro achica el total, que es la prueba de que se aplico", async () => {
    serve("seller_type", 20, 100);
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.length).toBeGreaterThan(0);
    expect(out.listings.every((l) => l.sellerType === "particular")).toBe(true);
  });

  // EL CASO QUE JUSTIFICA LA GUARDA. `seller_type` con un valor invalido devuelve el total
  // COMPLETO: el filtro se ignora y ML contesta la categoria entera.
  it("NO marca nada cuando el filtro se ignora y devuelve el total completo", async () => {
    serve("seller_type", 100, 100);
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.length).toBeGreaterThan(0);
    expect(out.listings.some((l) => l.sellerType === "particular")).toBe(false);
    expect(out.listings.every((l) => l.petsAllowed === null)).toBe(true);
  });

  it("tampoco marca si el filtro devuelve MAS que la busqueda sin filtrar", async () => {
    serve("seller_type", 200, 100);
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.some((l) => l.sellerType === "particular")).toBe(false);
  });

  // La corrida rapida mira lo recien publicado; estas pasadas son consultas aparte que no comparten
  // ese recorte, asi que no le corresponden.
  it("no corre en la corrida rapida", async () => {
    serve("seller_type", 20, 100);
    const out = await harvestMercadoLibre("fast", 41.45);
    expect(out.listings.some((l) => l.sellerType === "particular")).toBe(false);
  });
});
