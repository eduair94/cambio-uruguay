// El cliente de ruteo, con `fetch` de mentira.
//
// Lo que se prueba acá no es "que ande OSRM" sino los CONTRATOS que este módulo tiene que cumplir y
// que un refactor rompe sin que se note:
//
//  * el PERFIL por modo. La moto va por `routed-car` a propósito y la bici por `routed-bike`; un
//    perfil equivocado devuelve 200 y tiempos plausibles, así que nada falla — la página
//    simplemente publica el tiempo del auto como si fuera el de la bicicleta.
//  * el TOPE de coordenadas. Pasarse no da error del servidor: da una URL gigante contra un
//    servicio donado.
//  * el `code` de la respuesta. OSRM contesta 200 con `code: "NoRoute"`; leerlo como éxito
//    publicaría una matriz de nulls como si fuera una corrida buena.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La pausa entre llamadas se lee del entorno al cargar el módulo: sin esto cada test que haga dos
// llamadas se comería 1,5 s de reloj por gusto.
vi.hoisted(() => {
  process.env.TRANSPORT_OSRM_GAP_MS = "0";
});

import { OSRM_MAX_COORDINATES, ROUTER_ATTRIBUTION, TransportRouter, isRoutableMode } from "../../classes/transporte/routing";
import type { TransportRoutableMode } from "../../classes/transporte/types";

const OSRM = "https://osrm.de-prueba";

const MONTEVIDEO = [
  { lat: -34.906, lon: -56.19 },
  { lat: -34.912, lon: -56.152 },
];

let urls: string[] = [];

function mockFetch(payload: unknown, init: { ok?: boolean } = {}): void {
  urls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(String(url));
      return {
        ok: init.ok ?? true,
        status: init.ok === false ? 429 : 200,
        json: async () => payload,
      } as unknown as Response;
    })
  );
}

/** Una respuesta de `/table` con distancias y duraciones, como la devuelve OSRM. */
const OSRM_TABLE = {
  code: "Ok",
  durations: [
    [0, 600],
    [610, 0],
  ],
  distances: [
    [0, 5500],
    [5600, 0],
  ],
};

beforeEach(() => {
  urls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransportRouter.matrix contra OSRM", () => {
  it("parsea la tabla: metros de `distances`, segundos de `durations`", async () => {
    mockFetch(OSRM_TABLE);
    const table = await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "auto");

    expect(table).not.toBeNull();
    expect(table![0]![1]).toEqual({ meters: 5500, seconds: 600 });
    expect(table![1]![0]).toEqual({ meters: 5600, seconds: 610 });
    // La diagonal de OSRM viene en cero: cero segundos no es un viaje, es la misma coordenada.
    expect(table![0]![0]).toBeNull();
    expect(table![1]![1]).toBeNull();
  });

  it("declara que contestó OSRM de FOSSGIS, para que el snapshot lo publique", async () => {
    mockFetch(OSRM_TABLE);
    const router = new TransportRouter("", OSRM);
    expect(router.usedRouter).toBeNull();
    await router.matrix(MONTEVIDEO, MONTEVIDEO, "auto");
    expect(router.usedRouter).toBe("osrm-fossgis");
    expect(ROUTER_ATTRIBUTION["osrm-fossgis"].label).toMatch(/OpenStreetMap/);
    expect(router.callsMade).toBe(1);
  });

  it("devuelve null si el `code` no es Ok, aunque el HTTP sea 200", async () => {
    mockFetch({ code: "NoRoute", durations: [[0, 0]], distances: [[0, 0]] });
    expect(await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "auto")).toBeNull();
  });

  it("devuelve null ante un HTTP que no es 2xx, un cuerpo sin `durations` o un fetch que revienta", async () => {
    mockFetch(OSRM_TABLE, { ok: false });
    expect(await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "auto")).toBeNull();

    mockFetch({ code: "Ok" });
    expect(await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "auto")).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      })
    );
    expect(await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "auto")).toBeNull();
  });

  it("descarta la celda sin distancia o sin duración en vez de publicar media ruta", async () => {
    mockFetch({ code: "Ok", durations: [[0, 600]], distances: [[0, null]] });
    const table = await new TransportRouter("", OSRM).matrix([MONTEVIDEO[0]!], MONTEVIDEO, "auto");
    expect(table![0]![1]).toBeNull();
  });

  it("con más de 100 coordenadas devuelve null en vez de pedirle de más al servicio donado", async () => {
    // El tope es de OSRM y no nuestro: pasarse no da un error claro, da una URL enorme contra un
    // servidor que alguien paga de su bolsillo.
    mockFetch(OSRM_TABLE);
    const many = Array.from({ length: OSRM_MAX_COORDINATES + 1 }, (_value, index) => ({
      lat: -34.9 - index / 10_000,
      lon: -56.19,
    }));
    expect(await new TransportRouter("", OSRM).matrix(many, many, "auto")).toBeNull();
    expect(urls).toHaveLength(0);
  });

  it("cuenta las coordenadas UNA vez cuando orígenes y destinos son el mismo conjunto", async () => {
    // 68 zonas contra sí mismas son 68 coordenadas y no 136: de eso depende que la matriz entera
    // entre en una sola llamada.
    mockFetch(OSRM_TABLE);
    const exactly = Array.from({ length: OSRM_MAX_COORDINATES }, (_value, index) => ({
      lat: -34.9 - index / 10_000,
      lon: -56.19,
    }));
    expect(await new TransportRouter("", OSRM).matrix(exactly, exactly, "auto")).not.toBeNull();
    expect(urls).toHaveLength(1);
    expect(urls[0]!.split("/").pop()!.split("?")[0]!.split(";")).toHaveLength(OSRM_MAX_COORDINATES);
  });

  it("no llama a nadie con una lista vacía", async () => {
    mockFetch(OSRM_TABLE);
    expect(await new TransportRouter("", OSRM).matrix([], MONTEVIDEO, "auto")).toBeNull();
    expect(await new TransportRouter("", OSRM).matrix(MONTEVIDEO, [], "auto")).toBeNull();
    expect(urls).toHaveLength(0);
  });
});

describe("el perfil de OSRM por modo — esto es un contrato, no un detalle", () => {
  const cases: [TransportRoutableMode, string][] = [
    ["auto", "routed-car"],
    // La moto se rutea como auto A PROPÓSITO: ningún ruteador público modela pasar entre filas, y
    // Valhalla, que tiene costing `motorcycle`, devuelve prácticamente la misma ruta. Inventarle un
    // descuento de tiempo sería decidir el resultado de la comparación con un número inventado.
    ["moto", "routed-car"],
    // El monopatín NO va por acá: usa la ruta de la bicicleta con su propia velocidad de crucero.
    ["bici", "routed-bike"],
    ["pie", "routed-foot"],
  ];

  for (const [mode, profile] of cases) {
    it(`${mode} pide /${profile}/`, async () => {
      mockFetch(OSRM_TABLE);
      await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, mode);
      expect(urls).toHaveLength(1);
      expect(urls[0]).toContain(`/${profile}/table/v1/`);
    });
  }

  it("la bici no pide el perfil del auto y el auto no pide el de la bici", async () => {
    mockFetch(OSRM_TABLE);
    await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "bici");
    expect(urls[0]).not.toContain("routed-car");
  });

  it("pide duración Y distancia: sin las dos, la mitad de la página no existe", async () => {
    mockFetch(OSRM_TABLE);
    await new TransportRouter("", OSRM).matrix(MONTEVIDEO, MONTEVIDEO, "auto");
    expect(decodeURIComponent(urls[0]!)).toContain("annotations=duration,distance");
  });

  it("el servidor por defecto es el de FOSSGIS y NUNCA router.project-osrm.org", async () => {
    // Medido el 22/9/2026: `router.project-osrm.org` acepta `/bike/` y `/foot/` en la URL, contesta
    // 200 y devuelve EL RESULTADO DE AUTO en los seis perfiles. Un "a pie" que da 41,9 km/h no se
    // nota en un test, se nota en producción.
    mockFetch(OSRM_TABLE);
    await new TransportRouter("", undefined).matrix(MONTEVIDEO, MONTEVIDEO, "pie");
    expect(urls[0]).toContain("routing.openstreetmap.de");
    expect(urls[0]).not.toContain("project-osrm.org");
  });
});

describe("TransportRouter.route", () => {
  it("sin ruteador propio configurado no consulta ningún /status y cae directo a OSRM", async () => {
    // El Valhalla público bloqueó la IP a nivel TCP a mitad del relevamiento del 22/9/2026: acá no
    // hay respaldo público, hay uno propio o ninguno.
    // Una ruta punto a punto es una tabla de 1×1: OSRM devuelve una sola celda.
    mockFetch({ code: "Ok", durations: [[600]], distances: [[5500]] });
    const result = await new TransportRouter("", OSRM).route(MONTEVIDEO[0]!, MONTEVIDEO[1]!, "auto");
    expect(result).toEqual({ meters: 5500, seconds: 600 });
    expect(urls.some(url => url.includes("/status"))).toBe(false);
    expect(urls).toHaveLength(1);
  });

  it("devuelve null cuando el ruteador no contesta, sin inventar la línea recta", async () => {
    mockFetch({ code: "NoRoute" });
    expect(await new TransportRouter("", OSRM).route(MONTEVIDEO[0]!, MONTEVIDEO[1]!, "bici")).toBeNull();
  });
});

describe("isRoutableMode", () => {
  it("acepta los cuatro modos que un ruteador sabe rutear y rechaza el ómnibus", () => {
    expect(isRoutableMode("auto")).toBe(true);
    expect(isRoutableMode("pie")).toBe(true);
    // El ómnibus se resuelve con horarios, no con un ruteador; el monopatín viaja por la ruta de la
    // bici. Ninguno de los dos es un perfil.
    expect(isRoutableMode("omnibus")).toBe(false);
    expect(isRoutableMode("monopatin")).toBe(false);
    expect(isRoutableMode("")).toBe(false);
  });
});
