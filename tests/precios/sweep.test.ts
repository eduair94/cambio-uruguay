import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeStore } from "../../classes/precios/catalog";
import { matchStore, observationsFor, storeIndex, sweepArticle } from "../../classes/precios/sweep";

const stores = [
  normalizeStore({
    id: 1,
    name: "EXPRES 2- Suc. 2",
    direccion: "Avda. Millán 2683",
    x: -34.87664031030553,
    y: -56.18753242466486,
    localidad: "Montevideo, MONTEVIDEO ",
  }),
  normalizeStore({
    id: 2,
    name: "Autoservice Patricia- Suc. Autoservice Patricia",
    direccion: "Gral Flores  681",
    x: -34.104,
    y: -56.217,
    localidad: "Florida, FLORIDA ",
  }),
  normalizeStore({ id: 3, name: "Sin Coordenada", direccion: "Calle 1", x: null, y: null, localidad: "Salto, SALTO " }),
];

const row = (over: Partial<any> = {}) => ({
  id: 217451,
  precio: "$92.0",
  fecha: "06/09/26",
  name: "EXPRES 2- Suc. 2",
  direccion: "Avda. Millán 2683",
  x: -34.87664031030553,
  y: -56.18753242466486,
  localidad: "Montevideo, MONTEVIDEO ",
  ...over,
});

describe("matchStore", () => {
  const index = storeIndex(stores);

  it("une por coordenada exacta", () => {
    expect(matchStore(index, row() as any)?.id).toBe(1);
  });

  it("cae a nombre+direccion cuando la coordenada no esta", () => {
    expect(matchStore(index, row({ x: null, y: null }) as any)?.id).toBe(1);
  });

  it("devuelve null cuando la fila no corresponde a ningun local del catalogo", () => {
    expect(matchStore(index, row({ x: -30.1, y: -55.1, name: "Otro", direccion: "Otra" }) as any)).toBeNull();
  });
});

describe("observationsFor", () => {
  const index = storeIndex(stores);

  it("convierte filas en observaciones con el dia del origen", () => {
    const { observations, rejected } = observationsFor(1, [row()] as any, index);
    expect(rejected).toHaveLength(0);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      articleId: 1,
      storeId: 1,
      declarationId: 217451,
      price: 92,
      sourceDay: "2026-09-06",
    });
  });

  it("descarta la fila imputada y la fila sin fecha, y dice por que", () => {
    const { observations, rejected } = observationsFor(
      1,
      [row({ precio: "$509.32 (*)" }), row({ fecha: "" })] as any,
      index
    );
    expect(observations).toHaveLength(0);
    expect(rejected).toHaveLength(2);
    expect(rejected.join(" ")).toMatch(/imputad/i);
    expect(rejected.join(" ")).toMatch(/fecha/i);
  });

  it("colapsa dos filas del mismo local para el mismo articulo quedandose con la mas fresca", () => {
    // Medido: 667 locales distintos en 670 filas -> hay coordenadas repetidas.
    const { observations } = observationsFor(
      1,
      [row({ fecha: "01/09/26", precio: "$80.0" }), row({ fecha: "06/09/26", precio: "$92.0" })] as any,
      index
    );
    expect(observations).toHaveLength(1);
    expect(observations[0].price).toBe(92);
  });

  it("conserva la fila huerfana con su propia coordenada", () => {
    const { observations } = observationsFor(
      1,
      [row({ x: -33.5, y: -56.9, name: "Nuevo local", direccion: "Ruta 5" })] as any,
      index
    );
    expect(observations).toHaveLength(1);
    expect(observations[0].storeId).toBeNull();
    expect(observations[0].lat).toBe(-33.5);
  });
});

describe("sweepArticle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pide text/plain, porque el POST del SIPC devuelve 406 con application/json", () => {
    // Medido contra el origen: los dos GET del catalogo aceptan
    // application/json, pero compararArticulo contesta 406 con esa cabecera. El
    // cuerpo que llega es JSON igual; es la cabecera lo que el servidor mira, y
    // es la que manda su propia SPA. Sin este test, un "limpiemos las
    // cabeceras" deja el barrido devolviendo null todos los dias sin fallar.
    const calls: Array<{ url: string; init: any }> = [];
    vi.stubGlobal("fetch", (url: string, init: any) => {
      calls.push({ url, init });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as any);
    });

    return sweepArticle(1).then(() => {
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain("compararArticulo");
      expect(calls[0].init.method).toBe("POST");
      expect(calls[0].init.headers.Accept).toBe("text/plain");
      const body = JSON.parse(calls[0].init.body);
      expect(body).toMatchObject({ id_articulo: "1", v1: -58.5, v2: -35.2, v3: -53.0, v4: -30.0 });
    });
  });
});
