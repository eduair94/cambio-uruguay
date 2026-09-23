// El lector de MLU1763, contra un puente falso: ni red ni base.
//
// Las constantes que este archivo fija están MEDIDAS el 2026-09-22 contra el puente vivo, y son
// justo las que un clon del lector de autos rompería en silencio: la categoría y, sobre todo, el
// host del permalink, que en motos es `moto.mercadolibre.com.uy` y no el `auto.` que autos tiene
// compilado. Con el host equivocado el catálogo sale VACÍO sin que falle nada.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchJsonMock = vi.fn();
vi.mock("../../classes/rentals/net", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

import {
  ML_MOTOS_CATEGORY,
  ML_MOTOS_PERMALINK_PREFIX,
  harvestMercadoLibreMotos,
  motoPageMatches,
  motoSearchUrl,
  toRawMoto,
} from "../../classes/motos/sources/mercadolibre";

const USED = "2230581";

const card = (id: string, over: Record<string, string> = {}) => ({
  polycard: {
    metadata: {
      id,
      category_id: ML_MOTOS_CATEGORY,
      is_pad: "false",
      url_params: new URLSearchParams({
        title: "Yumbo Gs 200 Cc 2020",
        price: "1500",
        currency_id: "USD",
        permalink: `${ML_MOTOS_PERMALINK_PREFIX}${id.replace(/^MLU/, "")}-yumbo-gs-200-_JM`,
        primary_attribute: "2020 | 12000 km",
        condition: "Usado",
        seller_id: "1",
        location: "Cordón, Montevideo",
        ...over,
      }).toString(),
    },
    pictures: { quantity: 4 },
    components: [],
  },
});

const page = (options: {
  offset?: number;
  total?: number;
  applied?: Record<string, string>;
  facets?: Record<string, Array<{ id: string; name: string; results: number }>>;
  cards?: ReturnType<typeof card>[];
}) => ({
  paging: { offset: options.offset ?? 0, total: options.total ?? 0 },
  filters: [
    { id: "ITEM_CONDITION", values: [{ id: USED }] },
    ...Object.entries(options.applied ?? {}).map(([id, value]) => ({ id, values: [{ id: value }] })),
  ],
  available_filters: Object.entries(options.facets ?? {}).map(([id, values]) => ({ id, values })),
  components: options.cards ?? [],
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("la búsqueda", () => {
  it("pide la categoría de motos y sólo lo usado", () => {
    const url = new URL(motoSearchUrl({ BRAND: "2102273" }, 40, "http://bridge/mercadolibre"));
    expect(url.searchParams.get("category")).toBe("MLU1763");
    expect(url.searchParams.get("q.category")).toBe("MLU1763");
    expect(url.searchParams.get("ITEM_CONDITION")).toBe(USED);
    expect(url.searchParams.get("country")).toBe("UY");
    expect(url.searchParams.get("offset")).toBe("40");
    expect(url.searchParams.get("BRAND")).toBe("2102273");
  });
});

describe("la verificación de página", () => {
  it("acepta sólo la página que se pidió", () => {
    const good = page({ offset: 20, applied: { BRAND: "2102273" } });
    expect(motoPageMatches(good, { BRAND: "2102273" }, 20)).toBe(true);
  });

  it("rechaza una página con otro offset — ML contesta la 0 cuando el offset se pasa", () => {
    const desfasada = page({ offset: 0, applied: { BRAND: "2102273" } });
    expect(motoPageMatches(desfasada, { BRAND: "2102273" }, 4_000)).toBe(false);
  });

  it("rechaza una página que perdió el filtro de tipo por el camino", () => {
    const sinTipo = page({ offset: 0 });
    expect(motoPageMatches(sinTipo, { MOTO_TYPE: "399553" }, 0)).toBe(false);
  });
});

describe("la tarjeta", () => {
  const context = { brandId: "2102273", brand: "Yumbo", modelId: "8801", model: "GS 200", observedAt: "2026-09-22T11:00:00.000Z", maxYear: 2027 };

  it("lee marca y modelo del filtro aplicado, no del título", () => {
    const raw = toRawMoto(card("MLU1234567").polycard as never, context);
    expect(raw).not.toBeNull();
    expect(raw!.brand).toBe("Yumbo");
    expect(raw!.model).toBe("GS 200");
    expect(raw!.year).toBe(2020);
    expect(raw!.km).toBe(12_000);
    expect(raw!.price).toBe(1_500);
    expect(raw!.currency).toBe("USD");
    expect(raw!.department).toBe("Montevideo");
  });

  it("descarta la tarjeta cuyo permalink no es el de la vertical de motos", () => {
    const deAutos = card("MLU1234568", {
      permalink: "https://auto.mercadolibre.com.uy/MLU-1234568-un-auto-_JM",
    });
    expect(toRawMoto(deAutos.polycard as never, context)).toBeNull();
  });

  it("descarta lo que no está usado y lo que es publicidad", () => {
    expect(toRawMoto(card("MLU1234569", { condition: "Nuevo" }).polycard as never, context)).toBeNull();
    const pad = card("MLU1234570");
    pad.polycard.metadata.is_pad = "true";
    expect(toRawMoto(pad.polycard as never, context)).toBeNull();
  });
});

describe("la cosecha", () => {
  it("recorre marca → modelo y excluye por la faceta de tipo del propio Mercado Libre", async () => {
    fetchJsonMock.mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      const brand = params.get("BRAND");
      const model = params.get("MODEL");
      const type = params.get("MOTO_TYPE");
      if (type) {
        // Sólo la faceta de cuatriciclos tiene algo; las otras dos excluidas vuelven vacías.
        return type === "399553"
          ? page({ applied: { MOTO_TYPE: type }, total: 1, cards: [card("MLU2000002")] })
          : page({ applied: { MOTO_TYPE: type }, total: 0 });
      }
      if (!brand) return page({ total: 2, facets: { BRAND: [{ id: "2102273", name: "Yumbo", results: 2 }] } });
      if (!model) {
        return page({ applied: { BRAND: brand }, total: 2, facets: { MODEL: [{ id: "8801", name: "GS 200", results: 2 }] } });
      }
      return page({
        applied: { BRAND: brand, MODEL: model },
        total: 2,
        cards: [card("MLU2000001"), card("MLU2000002")],
      });
    });

    const harvest = await harvestMercadoLibreMotos({
      mode: "full",
      maxRequests: 50,
      maxDurationMs: 30_000,
      gapMs: 0,
      apiBase: "http://bridge/mercadolibre",
      now: () => new Date("2026-09-22T11:00:00.000Z"),
    });

    expect(harvest.listings.map(listing => listing.id)).toEqual(["MLU2000001", "MLU2000002"]);
    // El cuatriciclo se identifica por la faceta, no por el título: su título dice "Yumbo Gs 200".
    expect(harvest.excludedIds).toEqual(["MLU2000002"]);
    expect(harvest.completeBrands).toEqual(["2102273"]);
    expect(harvest.note).toBeNull();
    expect(harvest.reportedTotal).toBe(2);
  });

  it("el tramo de cilindrada sale de la faceta, y el borde solapado cae al tramo de abajo", async () => {
    fetchJsonMock.mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      const cc = params.get("ENGINE_DISPLACEMENT");
      const brand = params.get("BRAND");
      const model = params.get("MODEL");
      if (params.get("MOTO_TYPE")) return page({ applied: { MOTO_TYPE: params.get("MOTO_TYPE")! }, total: 0 });
      if (cc) {
        // La de 125 cc está en los dos primeros tramos, que es lo que hace ML de verdad.
        const cards =
          cc === "(*-125cc]"
            ? [card("MLU3000001")]
            : cc === "[125cc-250cc]"
              ? [card("MLU3000001"), card("MLU3000002")]
              : [];
        return page({ applied: { ENGINE_DISPLACEMENT: cc }, total: cards.length, cards });
      }
      if (!brand) return page({ total: 2, facets: { BRAND: [{ id: "2102273", name: "Yumbo", results: 2 }] } });
      if (!model) {
        return page({ applied: { BRAND: brand }, total: 2, facets: { MODEL: [{ id: "8801", name: "GS 200", results: 2 }] } });
      }
      return page({ applied: { BRAND: brand, MODEL: model }, total: 2, cards: [card("MLU3000001"), card("MLU3000002")] });
    });

    const harvest = await harvestMercadoLibreMotos({
      mode: "full",
      maxRequests: 50,
      maxDurationMs: 30_000,
      gapMs: 0,
      apiBase: "http://bridge/mercadolibre",
      displacementSweep: true,
    });

    expect(harvest.displacements).toEqual([
      { id: "MLU3000001", band: "hasta-125" },
      { id: "MLU3000002", band: "126-250" },
    ]);
  });

  it("si el puente no contesta, lo dice y no inventa una cosecha vacía", async () => {
    fetchJsonMock.mockResolvedValue(null);
    const harvest = await harvestMercadoLibreMotos({
      mode: "fast",
      maxRequests: 10,
      maxDurationMs: 5_000,
      gapMs: 0,
      sleep: async () => undefined,
      apiBase: "http://bridge/mercadolibre",
    });
    expect(harvest.listings).toEqual([]);
    expect(harvest.note).toBe("el puente de Mercado Libre no respondió");
    expect(harvest.completeBrands).toEqual([]);
  });

  it("una corrida rápida pide sólo las novedades del día", async () => {
    fetchJsonMock.mockResolvedValue(page({ total: 0 }));
    await harvestMercadoLibreMotos({
      mode: "fast",
      maxRequests: 3,
      maxDurationMs: 5_000,
      gapMs: 0,
      apiBase: "http://bridge/mercadolibre",
    });
    const [url] = fetchJsonMock.mock.calls[0] as [string];
    expect(new URL(url).searchParams.get("since")).toBe("today");
  });
});
