// La matriz de rutas: cuántos kilómetros y cuántos minutos hay entre cada par de zonas, por modo.
//
// Se calcula UNA vez por corrida y se guarda. La página no rutea nada: lee la matriz del snapshot y
// hace la aritmética en el navegador. Esa es la regla del repo —lo que procesa la base se calcula
// en un job y se guarda— y acá además es lo único viable: 68 zonas son 4.556 pares por modo, y
// pedirle eso a un ruteador por visitante sería abusar de un servicio ajeno una vez por visita.
//
// La matriz viaja APLANADA (`[origen, destino, modo, metros, segundos]`) y con índices de zona en
// vez de nombres. No es microoptimización: con nombres de campo y slugs, el mismo contenido pesa
// unas seis veces más, y este documento se sirve entero en cada carga de la página.
import type { TransportRoutableMode, TransportZone } from "./types";
import { TRANSPORT_ROUTABLE_MODES, transportModeIndex } from "./types";
import { TransportRouter, type RoutePoint } from "./routing";

export interface MatrixResult {
  /** `[from, to, modeIndex, meters, seconds]` por par ruteado. */
  routes: number[][];
  /** Qué modos se pudieron rutear y cuáles no. */
  routedModes: TransportRoutableMode[];
  failedModes: TransportRoutableMode[];
  router: string | null;
  calls: number;
}

export interface BuildMatrixOptions {
  router?: TransportRouter;
  modes?: readonly TransportRoutableMode[];
  onProgress?: (mode: TransportRoutableMode, pairs: number) => void;
}

/**
 * Rutea todos los pares entre zonas.
 *
 * Un modo que falla NO tumba la corrida: se publica lo que sí se pudo rutear y se declara lo que
 * faltó. Un modo sin matriz cae a la velocidad de crucero declarada, que la página muestra como
 * estimada — nunca se publica un tiempo ruteado que no se ruteó.
 */
export async function buildRouteMatrix(
  zones: readonly TransportZone[],
  options: BuildMatrixOptions = {}
): Promise<MatrixResult> {
  const router = options.router ?? new TransportRouter();
  const modes = options.modes ?? TRANSPORT_ROUTABLE_MODES;
  const points: RoutePoint[] = zones.map(zone => ({ lat: zone.lat, lon: zone.lon }));

  const routes: number[][] = [];
  const routedModes: TransportRoutableMode[] = [];
  const failedModes: TransportRoutableMode[] = [];

  for (const mode of modes) {
    const table = await router.matrix(points, points, mode);
    if (!table) {
      failedModes.push(mode);
      continue;
    }
    const modeIndex = transportModeIndex(mode);
    let pairs = 0;
    for (let from = 0; from < zones.length; from += 1) {
      for (let to = 0; to < zones.length; to += 1) {
        if (from === to) continue;
        const cell = table[from]?.[to];
        if (!cell) continue;
        routes.push([from, to, modeIndex, cell.meters, cell.seconds]);
        pairs += 1;
      }
    }
    if (pairs === 0) {
      failedModes.push(mode);
      continue;
    }
    routedModes.push(mode);
    options.onProgress?.(mode, pairs);
  }

  return { routes, routedModes, failedModes, router: router.usedRouter, calls: router.callsMade };
}

/** Busca un par en la matriz aplanada. Lo usa el app después de rehidratarla. */
export function findRoute(
  routes: readonly number[][],
  from: number,
  to: number,
  mode: TransportRoutableMode
): { meters: number; seconds: number } | null {
  const modeIndex = transportModeIndex(mode);
  for (const row of routes) {
    if (row[0] === from && row[1] === to && row[2] === modeIndex) {
      return { meters: row[3]!, seconds: row[4]! };
    }
  }
  return null;
}
