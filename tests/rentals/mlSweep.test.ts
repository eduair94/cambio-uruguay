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

import { harvestMercadoLibre, toRawRental } from "../../classes/rentals/sources/mercadolibre";

import { ML_RENTAL_CATEGORIES, mlCount, mlPartitions, mlPartitionRemainder, mlPageMatches } from "../../classes/rentals/sources/mercadolibreSearch";

/**
 * Una tarjeta con la forma mínima que `toRawRental` acepta.
 *
 * Load-bearing y fácil de romper: hace falta `metadata.id` (sin eso devuelve null antes de mirar
 * nada), `permalink` y `title` dentro de `url_params`, un precio positivo y una moneda que sea UYU
 * o USD. Y el título tiene que parecer un aviso de alquiler o `looksLikeRentalAdvert` lo descarta.
 */
const card = (id: string, category = "MLU1473") => ({
  metadata: {
    id: `MLU${id}`,
    category_id: category,
    url_params: new URLSearchParams({
      permalink: `https://articulo.mercadolibre.com.uy/MLU-${id}`,
      title: `Alquiler apartamento 2 dormitorios ${id}`,
      price: "30000",
      currency_id: "UYU",
      location: "Pocitos, Montevideo",
    }).toString(),
    domain_id: ML_RENTAL_CATEGORIES.find(row => row.id === category)?.domain,
  },
  components: [
    { type: "title", title: { text: `Alquiler apartamento 2 dormitorios ${id}` } },
    { type: "price", price: { current_price: { value: 30000, currency: "UYU" } } },
    { type: "attributes_list", attributes_list: { texts: ["2 dormitorios", "1 baño", "60 m² cubiertos"] } },
    { type: "location", location: { text: "Pocitos, Montevideo" } },
  ],
});

// `collectPolycards` recorre el arbol buscando la clave `polycard`. Sin ese envoltorio no
// encuentra nada, y la cosecha devuelve cero avisos sin decir por que.
const page = (ids: string[], total: number, params = new URLSearchParams({ category: "MLU1473" })) => ({
  paging: { total, offset: Number(params.get("offset") || 0) },
  filters: [...params].filter(([id]) => ["category", "state", "city", "price", "since", "seller_type", "IS_SUITABLE_FOR_PETS"].includes(id))
    .map(([id, value]) => ({ id, values: [{ id: value }] })),
  components: ids.map(id => ({ polycard: card(id, params.get("category") || "MLU1473") })),
});

afterEach(() => {
  fetchJson.mockReset();
  vi.unstubAllEnvs();
});

/**
 * Contesta segun si la URL lleva el filtro. `filteredTotal` es lo que ML dice para la busqueda
 * filtrada — que es exactamente la señal que decide si se marca o no.
 */
function serve(filterKey: string, filteredTotal: number, unfilteredTotal = 100) {
  fetchJson.mockImplementation(async (url: string) => {
    const filtrada = url.includes(filterKey);
    const params = new URL(url).searchParams;
    return page([`${params.get("category")!.slice(3)}1`, `${params.get("category")!.slice(3)}2`], filtrada ? filteredTotal : unfilteredTotal, params);
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

describe("cobertura por categorías y particiones propias de MercadoLibre", () => {
  it("recorre categorías de alquiler diferentes, incluyendo casas, y deduplica por ID nativo", async () => {
    serve("seller_type", 100);
    const out = await harvestMercadoLibre("full", 41.45);
    const params = fetchJson.mock.calls.map(([url]) => new URL(url).searchParams);
    expect(new Set(params.map(p => p.get("category")))).toEqual(new Set(ML_RENTAL_CATEGORIES.map(c => c.id)));
    expect(new Set(params.map(p => p.get("q")))).toEqual(new Set(["alquiler"]));
    expect(out.listings.some(row => row.propertyType === "casa")).toBe(true);
    expect(out.listings).toHaveLength(ML_RENTAL_CATEGORIES.length * 2);
    expect(out.complete).toBe(false);
  });

  it("subdivide la consulta grande por zonas reales, conserva el padre y alcanza IDs fuera de sus primeras páginas", async () => {
    vi.stubEnv("RENTALS_ML_MAX_PAGES", "1");
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      if (p.get("category") !== "MLU1473" || p.has("seller_type") || p.has("IS_SUITABLE_FOR_PETS")) return page([], 0, p);
      if (p.has("state")) return page(p.get("state") === "state-A" ? ["1", "21"] : ["31"], 2, p);
      return { ...page(["1"], 100, p), available_filters: [{ id: "state", values: [
        { id: "state-A", results: 50 }, { id: "state-B", results: 50 },
      ] }] };
    });
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.map(row => row.listingId).sort()).toEqual(["mercadolibre:MLU1", "mercadolibre:MLU21", "mercadolibre:MLU31"]);
    expect(fetchJson.mock.calls.some(([url]) => new URL(url).searchParams.get("state") === "state-B")).toBe(true);
  });

  it("rechaza ventas/temporarios/productos incluso cuando el título diga alquiler y la página conserve su categoría", async () => {
    const base = card("123");
    expect(toRawRental(base)).not.toBeNull();
    for (const [category, domain] of [["MLU1474", "MLU-INDIVIDUAL_APARTMENTS_FOR_SALE"],
      ["MLU6394", "MLU-HOUSES_FOR_VACATION_RENTAL"], ["MLU1196", "MLU-BOOKS"],
      ["MLU1473", "MLU-APARTMENTS_FOR_VACATION_RENTAL"]]) {
      expect(toRawRental({ ...base, metadata: { ...base.metadata, category_id: category, domain_id: domain } })).toBeNull();
    }
  });

  it("no admite ni marca una página que pierda el filtro aplicado aunque su total baje", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      const filtered = p.has("seller_type") || p.has("IS_SUITABLE_FOR_PETS");
      const result = page(["1"], filtered ? 10 : 100, p);
      if (filtered) result.filters = result.filters.filter(f => f.id === "category");
      return result;
    });
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.every(row => row.petsAllowed === null && row.sellerType !== "particular")).toBe(true);
    expect(out.note).toContain("filtro:18");
  });

  it("detiene el reset de offset y una página idéntica con offset aparente correcto", async () => {
    vi.stubEnv("RENTALS_ML_FAST_PAGES", "10");
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      if (!["MLU1473", "MLU1467"].includes(p.get("category")!)) return page([], 0, p);
      const result = page(Array.from({ length: 20 }, (_, i) => String(i + 1)), 200, p);
      if (p.get("category") === "MLU1473") result.paging.offset = 0;
      return result;
    });
    const out = await harvestMercadoLibre("fast", 41.45);
    expect(Math.max(...fetchJson.mock.calls.map(([url]) => Number(new URL(url).searchParams.get("offset"))))).toBe(20);
    expect(out.note).toContain("repetida:1");
    expect(out.note).toContain("filtro:1");
  });

  it("una página de precios rechazados no corta el recorrido de rawIDs nuevos", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      if (p.get("category") !== "MLU1473") return page([], 0, p);
      const result = page(p.get("offset") === "0" ? Array.from({ length: 20 }, (_, i) => String(i)) : ["99"], 21, p);
      if (p.get("offset") === "0") for (const item of result.components) {
        item.polycard.components.find(c => c.type === "price")!.price!.current_price.value = 1;
      }
      return result;
    });
    const out = await harvestMercadoLibre("fast", 41.45);
    expect(out.listings.map(row => row.listingId)).toEqual(["mercadolibre:MLU99"]);
  });

  it("presupuesta fallas y páginas globalmente sin convertir una cosecha parcial en completa", async () => {
    vi.stubEnv("RENTALS_ML_REQUEST_BUDGET", "4");
    fetchJson.mockResolvedValue(null);
    const out = await harvestMercadoLibre("full", 41.45);
    expect(fetchJson).toHaveBeenCalledTimes(4);
    expect(out.ok).toBe(false);
    expect(out.complete).toBe(false);
    expect(out.note).toContain("presupuesto:7");
  });

  it("no atribuye particular contra una inmobiliaria explícita en su propio título", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      const result = page(["1"], p.has("seller_type") ? 20 : 100, p);
      result.components[0]!.polycard.components.find(c => c.type === "title")!.title!.text = "Alquiler apartamento. Somos una inmobiliaria";
      return result;
    });
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.every(row => row.sellerType === "inmobiliaria")).toBe(true);
  });

  it("valida filtros aplicados y rangos hijos contenidos, sin convertir available_filters en evidencia", () => {
    for (const value of [true, false, [], {}, "", " ", "1e3", null, undefined, -1, 1.5]) expect(mlCount(value)).toBeNull();
    expect(mlCount("20")).toBe(20);
    expect(mlPageMatches({ paging: { offset: null }, filters: [] }, {}, 0)).toBe(false);
    expect(mlPageMatches({ paging: { offset: 0 }, available_filters: [{ id: "category", values: [{ id: "MLU1473" }] }] }, { category: "MLU1473" }, 0)).toBe(false);
    const result = mlPartitions({ paging: { total: 100 }, available_filters: [{ id: "price", values: [
      { id: "*-25000", results: 40 }, { id: "25000-30000", results: 30 }, { id: "30000-40000", results: 30 },
      { id: "40000-*", results: 40 }, { id: "25000-40000", results: 100 },
    ] }] }, { category: "MLU1473", price: "25000-40000" });
    expect(result.map(row => row.price)).toEqual(["25000-30000", "30000-40000"]);
  });

  it("no clasifica un warehouse como casa ni un local por las palabras de su título", () => {
    expect(toRawRental(card("11", "MLU455467"))?.propertyType).toBe("local");
    expect(toRawRental(card("12", "MLU1482"))?.propertyType).toBe("local");
    expect(toRawRental(card("13", "MLU1467"))?.propertyType).toBe("casa");
  });

  it("continúa tras una página de19tarjetas cuando total confirma la siguiente y registra un vacío inesperado", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      if (p.get("category") === "MLU1467") return page([], 50, p);
      if (p.get("category") !== "MLU1473") return page([], 0, p);
      return page(p.get("offset") === "0" ? Array.from({ length: 19 }, (_, i) => String(i)) : ["21"], 21, p);
    });
    const out = await harvestMercadoLibre("fast", 41.45);
    expect(out.listings.some(row => row.listingId === "mercadolibre:MLU21")).toBe(true);
    expect(out.note).toContain("vacía:1");
  });

  it("mantiene una lectura residual del padre cuando faltan ubicaciones en las facetas", async () => {
    vi.stubEnv("RENTALS_ML_MAX_PAGES", "2");
    const facets = [{ id: "state", values: [{ id: "state-A", results: 20 }, { id: "state-B", results: 20 }] }];
    const children = mlPartitions({ paging: { total: 60 }, available_filters: facets }, { category: "MLU1473" });
    expect(mlPartitionRemainder({ paging: { total: 60 }, available_filters: facets }, { category: "MLU1473" }, children)).toBe(20);
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      if (p.get("category") !== "MLU1473" || p.has("seller_type") || p.has("IS_SUITABLE_FOR_PETS")) return page([], 0, p);
      if (p.has("state")) return page([p.get("state") === "state-A" ? "2" : "3"], 1, p);
      if (p.get("offset") === "20") return page(["99"], 60, p);
      return { ...page(["1"], 60, p), available_filters: facets };
    });
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings.some(row => row.listingId === "mercadolibre:MLU99")).toBe(true);
    expect(out.note).toContain("residual:1");
  });

  it.each([0, 1])("no atribuye filtros con total%d y recomendaciones que exceden el número de resultados", async total => {
    fetchJson.mockImplementation(async (url: string) => {
      const p = new URL(url).searchParams;
      return page(["1", "2"], p.has("seller_type") || p.has("IS_SUITABLE_FOR_PETS") ? total : 100, p);
    });
    const out = await harvestMercadoLibre("full", 41.45);
    expect(out.listings).toHaveLength(2);
    expect(out.listings.every(row => row.petsAllowed === null && row.sellerType !== "particular")).toBe(true);
  });

  it("no acepta recomendaciones de una categoría sin resultados", async () => {
    fetchJson.mockImplementation(async (url: string) => page(["1"], 0, new URL(url).searchParams));
    const out = await harvestMercadoLibre("fast", 41.45);
    expect(out.listings).toHaveLength(0);
    expect(out.ok).toBe(false);
  });
});
