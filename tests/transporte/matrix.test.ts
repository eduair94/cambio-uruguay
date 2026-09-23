// La matriz de rutas: cómo se aplana, cómo se lee y qué pasa cuando un modo se cae.
//
// El ruteador acá es falso a propósito. Lo que se prueba no es OSRM sino la decisión de esta capa:
// que un modo caído no tumbe la corrida entera, que la diagonal no ocupe lugar en un documento que
// se sirve completo en cada carga, y que el índice de modo que viaja aplanado sea el mismo que el
// que después lo busca.
import { describe, expect, it } from "vitest";
import { buildRouteMatrix, findRoute } from "../../classes/transporte/matrix";
import type { RoutePoint, RouteResult, TransportRouter } from "../../classes/transporte/routing";
import { TRANSPORT_ROUTABLE_MODES, transportModeIndex } from "../../classes/transporte/types";
import type { TransportRoutableMode, TransportZone } from "../../classes/transporte/types";

const ZONES: TransportZone[] = [
  { slug: "centro", name: "Centro", department: "Montevideo", lat: -34.906, lon: -56.19, kind: "ine" },
  { slug: "pocitos", name: "Pocitos", department: "Montevideo", lat: -34.912, lon: -56.152, kind: "ine" },
  { slug: "buceo", name: "Buceo", department: "Montevideo", lat: -34.89, lon: -56.13, kind: "ine" },
];

interface FakeCall {
  mode: TransportRoutableMode;
  sources: number;
  targets: number;
}

/**
 * Un ruteador de mentira con la misma forma que `TransportRouter`.
 *
 * El casteo es inevitable: `TransportRouter` es una clase con campos privados, así que un objeto
 * estructuralmente igual no le tipa. Lo que importa es que `buildRouteMatrix` sólo le pide
 * `matrix`, `usedRouter` y `callsMade`.
 */
function fakeRouter(options: {
  cell?: (mode: TransportRoutableMode, from: number, to: number) => RouteResult | null;
  failing?: readonly TransportRoutableMode[];
}): { router: TransportRouter; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const state = { answered: 0 };
  const fake = {
    usedRouter: "ruteador-de-prueba" as string | null,
    get callsMade(): number {
      return state.answered;
    },
    async matrix(
      sources: RoutePoint[],
      targets: RoutePoint[],
      mode: TransportRoutableMode
    ): Promise<(RouteResult | null)[][] | null> {
      calls.push({ mode, sources: sources.length, targets: targets.length });
      if (options.failing?.includes(mode)) return null;
      state.answered += 1;
      return sources.map((_source, from) =>
        targets.map((_target, to) =>
          options.cell
            ? options.cell(mode, from, to)
            : from === to
              ? null
              : { meters: 1000 * (from + 1) + to, seconds: 60 * (from + 1) + to }
        )
      );
    },
  };
  return { router: fake as unknown as TransportRouter, calls };
}

describe("buildRouteMatrix", () => {
  it("aplana cada par como [origen, destino, modo, metros, segundos]", async () => {
    const { router } = fakeRouter({});
    const result = await buildRouteMatrix(ZONES, { router, modes: ["auto"] });

    expect(result.routes).toHaveLength(6); // 3 zonas = 3×2 pares, sin la diagonal
    expect(result.routes[0]).toEqual([0, 1, transportModeIndex("auto"), 1001, 61]);
    expect(result.routes).toContainEqual([2, 0, transportModeIndex("auto"), 3000, 180]);
    for (const row of result.routes) {
      expect(row).toHaveLength(5);
      expect(row.every(value => Number.isFinite(value))).toBe(true);
    }
  });

  it("nunca guarda la diagonal: un viaje de un barrio a sí mismo no es una fila", async () => {
    const { router } = fakeRouter({ cell: () => ({ meters: 500, seconds: 30 }) });
    const result = await buildRouteMatrix(ZONES, { router, modes: ["auto", "pie"] });
    expect(result.routes.every(row => row[0] !== row[1])).toBe(true);
    expect(result.routes).toHaveLength(12); // 6 pares × 2 modos
  });

  it("usa el índice de modo del contrato, no el orden en que se pidieron", async () => {
    // El índice es la POSICIÓN en `TRANSPORT_ROUTABLE_MODES`: es lo que el app usa para rehidratar.
    // Si acá se guardara el orden de `options.modes`, una corrida que saltea un modo desplazaría
    // todos los demás y la página publicaría tiempos de bicicleta como si fueran de auto.
    const { router } = fakeRouter({});
    const result = await buildRouteMatrix(ZONES, { router, modes: ["bici"] });
    expect(result.routes.every(row => row[2] === TRANSPORT_ROUTABLE_MODES.indexOf("bici"))).toBe(true);
    expect(result.routes[0]![2]).toBe(2);
  });

  it("un modo que falla va a failedModes y no tumba los demás", async () => {
    // Es la regla de las dos mitades: se publica lo que se pudo rutear y se declara lo que faltó.
    const { router, calls } = fakeRouter({ failing: ["pie"] });
    const result = await buildRouteMatrix(ZONES, { router, modes: ["auto", "pie", "bici"] });

    expect(result.failedModes).toEqual(["pie"]);
    expect(result.routedModes).toEqual(["auto", "bici"]);
    expect(result.routes.some(row => row[2] === transportModeIndex("auto"))).toBe(true);
    expect(result.routes.some(row => row[2] === transportModeIndex("pie"))).toBe(false);
    // Se intentó igual: el fallo es del ruteador, no una omisión nuestra.
    expect(calls.map(call => call.mode)).toEqual(["auto", "pie", "bici"]);
  });

  it("un modo que contesta pero no devuelve un solo par también cuenta como fallado", async () => {
    // Una tabla llena de nulls es una respuesta técnicamente exitosa y sustancialmente vacía:
    // registrarla como "ruteada" publicaría un modo sin una sola fila y sin ninguna nota.
    const { router } = fakeRouter({ cell: mode => (mode === "moto" ? null : { meters: 100, seconds: 10 }) });
    const result = await buildRouteMatrix(ZONES, { router, modes: ["auto", "moto"] });
    expect(result.failedModes).toEqual(["moto"]);
    expect(result.routedModes).toEqual(["auto"]);
  });

  it("le pide al ruteador TODAS las zonas de una vez, una llamada por modo", async () => {
    // 68 zonas son 4.556 pares: pedirlos de a uno sería abusar de un servicio donado 4.556 veces.
    const { router, calls } = fakeRouter({});
    await buildRouteMatrix(ZONES, { router, modes: TRANSPORT_ROUTABLE_MODES });
    expect(calls).toHaveLength(TRANSPORT_ROUTABLE_MODES.length);
    expect(calls.every(call => call.sources === ZONES.length && call.targets === ZONES.length)).toBe(true);
  });

  it("publica qué ruteador contestó y cuántas llamadas costó", async () => {
    const { router } = fakeRouter({});
    const result = await buildRouteMatrix(ZONES, { router, modes: ["auto", "bici"] });
    expect(result.router).toBe("ruteador-de-prueba");
    expect(result.calls).toBe(2);
  });

  it("avisa el progreso una vez por modo ruteado, con la cantidad de pares", async () => {
    const { router } = fakeRouter({ failing: ["pie"] });
    const progress: string[] = [];
    await buildRouteMatrix(ZONES, {
      router,
      modes: ["auto", "pie"],
      onProgress: (mode, pairs) => progress.push(`${mode}:${pairs}`),
    });
    expect(progress).toEqual(["auto:6"]);
  });
});

describe("findRoute", () => {
  it("encuentra el par ruteado por origen, destino y modo", async () => {
    const { router } = fakeRouter({});
    const { routes } = await buildRouteMatrix(ZONES, { router, modes: ["auto", "bici"] });

    expect(findRoute(routes, 0, 1, "auto")).toEqual({ meters: 1001, seconds: 61 });
    expect(findRoute(routes, 1, 0, "auto")).toEqual({ meters: 2000, seconds: 120 });
    expect(findRoute(routes, 0, 1, "bici")).toEqual({ meters: 1001, seconds: 61 });
  });

  it("devuelve null cuando el par o el modo no están, en vez de la fila más parecida", async () => {
    const { router } = fakeRouter({});
    const { routes } = await buildRouteMatrix(ZONES, { router, modes: ["auto"] });

    expect(findRoute(routes, 0, 0, "auto")).toBeNull(); // la diagonal nunca se guardó
    expect(findRoute(routes, 0, 1, "moto")).toBeNull(); // ese modo no se ruteó en esta corrida
    expect(findRoute(routes, 0, 9, "auto")).toBeNull(); // zona inexistente
    expect(findRoute([], 0, 1, "auto")).toBeNull();
  });

  it("no confunde el sentido del viaje", async () => {
    const { router } = fakeRouter({});
    const { routes } = await buildRouteMatrix(ZONES, { router, modes: ["auto"] });
    expect(findRoute(routes, 0, 2, "auto")).not.toEqual(findRoute(routes, 2, 0, "auto"));
  });
});
