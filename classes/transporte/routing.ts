// Ruteo sobre la red real de OpenStreetMap: cuántos kilómetros y cuántos minutos hay entre dos
// puntos, por modo.
//
// POR QUÉ UN RUTEADOR Y NO LA DISTANCIA EN LÍNEA RECTA: medido el 22/9/2026 entre Pocitos y el
// Centro, la recta da 4,0 km y la calle da 5,50 en auto y 5,13 en bicicleta. Un factor fijo sobre la
// recta no arregla eso, porque el factor cambia con la trama y porque el TIEMPO —que es la mitad de
// esta página— no sale de la distancia: a pie ese mismo par son 4,85 km y 65 minutos, o sea
// 4,5 km/h. La única forma de no inventar ninguno de los dos números es preguntarle a un ruteador.
//
// DOS RUTEADORES, EN ESTE ORDEN, y la razón de cada uno:
//
//  1. **Valhalla propio** (`TRANSPORT_VALHALLA_URL`), si está levantado. Es el único motor que cubre
//     los cinco modos en un solo lugar, incluido `motor_scooter` para el monopatín. Sin cuota, sin
//     depender de nadie.
//  2. **OSRM de FOSSGIS** (`routing.openstreetmap.de`), que es el que corre hoy. Su `/table` acepta
//     100 coordenadas, así que la matriz ENTERA de 68 zonas entra en UNA llamada por perfil: tres
//     llamadas por corrida, espaciadas, con user-agent propio. Eso sí cabe en la política de un
//     servicio donado.
//
// LO QUE ESTÁ DESCARTADO, Y NO POR PRUDENCIA SINO POR MEDICIÓN (22/9/2026):
//
//  * **El Valhalla público** (`valhalla1.openstreetmap.de`) bloqueó la IP a nivel TCP a mitad del
//    relevamiento, sin un solo 429 y sin `Retry-After`. Su `/sources_to_targets` además limita a 100
//    PARES por llamada, no 100 puntos: la matriz serían ~250 llamadas por corrida. No se usa.
//  * **`router.project-osrm.org`** es la trampa más fácil de todo esto: acepta `/bike/` y `/foot/`
//    en la URL, contesta 200 y devuelve EL RESULTADO DE AUTO en los seis perfiles. Un "a pie" que da
//    41,9 km/h no se nota en un test, se nota en producción. No se usa nunca.
//  * **El proxy propio de Google Maps** tiene habilitada sólo la API de Geocoding: `/directions` y
//    `/distancematrix` devuelven 403. Se usa para geocodificar una dirección, que es lo único que
//    hace bien, y no para rutear.
import { TRANSPORT_ROUTABLE_MODES, type TransportRoutableMode } from "./types";

const LOCAL_URL = process.env.TRANSPORT_VALHALLA_URL || "";
const OSRM_URL = process.env.TRANSPORT_OSRM_URL || "https://routing.openstreetmap.de";
const OSRM_GAP_MS = Number(process.env.TRANSPORT_OSRM_GAP_MS || 1500);
const TIMEOUT_MS = Number(process.env.TRANSPORT_HTTP_TIMEOUT_MS || 60_000);

/** OSRM `/table` no acepta más de esto por llamada; la matriz se parte si hiciera falta. */
export const OSRM_MAX_COORDINATES = 100;

const UA =
  process.env.TRANSPORT_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/conviene-auto-moto-o-omnibus-uruguay; transport cost comparator; contact via site)";

/**
 * Cómo se le pide cada modo a cada motor.
 *
 * La MOTO se rutea como auto, y hay que decirlo en la página en vez de disimularlo: ningún ruteador
 * público modela lo que de verdad hace a una moto más rápida en ciudad —pasar entre filas, usar el
 * hueco del semáforo—, y Valhalla, que sí tiene un costing `motorcycle`, devuelve prácticamente la
 * misma ruta que el auto. Publicar la ruta del auto y aclararlo es honesto; inventarle un descuento
 * de tiempo a la moto sería decidir el resultado de la comparación con un número inventado.
 *
 * El MONOPATÍN no se rutea como auto: usa la ruta de la BICICLETA, que es la red por la que de verdad
 * puede circular, y su propia velocidad de crucero. La diferencia no es menor — en el par medido, la
 * ruta de bici son 5,13 km y la de auto 5,50.
 */
const OSRM_PROFILE: Record<TransportRoutableMode, string> = {
  auto: "routed-car",
  moto: "routed-car",
  bici: "routed-bike",
  pie: "routed-foot",
};

const VALHALLA_COSTING: Record<TransportRoutableMode, { costing: string; options?: Record<string, unknown> }> = {
  auto: { costing: "auto" },
  moto: { costing: "motorcycle" },
  bici: { costing: "bicycle", options: { bicycle: { bicycle_type: "City", cycling_speed: 18 } } },
  pie: { costing: "pedestrian" },
};

export interface RoutePoint {
  lat: number;
  lon: number;
}

export interface RouteResult {
  meters: number;
  seconds: number;
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class TransportRouter {
  private lastCallAt = 0;
  private localHealthy: boolean | null = null;
  private calls = 0;

  constructor(
    private readonly localUrl: string = LOCAL_URL,
    private readonly osrmUrl: string = OSRM_URL
  ) {}

  /** Qué motor contestó, para que el snapshot lo publique en vez de esconderlo. */
  usedRouter: string | null = null;

  /**
   * Un `/status` al ruteador propio, UNA vez por corrida: si no está, toda la corrida va por OSRM, y
   * eso hay que saberlo antes de empezar, no descubrirlo par a par.
   */
  async localAvailable(): Promise<boolean> {
    if (!this.localUrl) return false;
    if (this.localHealthy !== null) return this.localHealthy;
    this.localHealthy = !!(await this.request(`${this.localUrl}/status`, undefined, 4000));
    return this.localHealthy;
  }

  private async request(url: string, body?: unknown, timeoutMs = TIMEOUT_MS): Promise<any | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: body ? "POST" : "GET",
        signal: controller.signal,
        headers: {
          "user-agent": UA,
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async throttle(isLocal: boolean): Promise<void> {
    if (isLocal) return;
    const elapsed = Date.now() - this.lastCallAt;
    if (elapsed < OSRM_GAP_MS) await sleep(OSRM_GAP_MS - elapsed);
    this.lastCallAt = Date.now();
  }

  /** Una ruta punto a punto. La usa la consulta viva por dirección, no la matriz. */
  async route(from: RoutePoint, to: RoutePoint, mode: TransportRoutableMode): Promise<RouteResult | null> {
    if (await this.localAvailable()) {
      const spec = VALHALLA_COSTING[mode];
      const json = await this.request(`${this.localUrl}/route`, {
        locations: [
          { lat: from.lat, lon: from.lon },
          { lat: to.lat, lon: to.lon },
        ],
        costing: spec.costing,
        costing_options: spec.options,
        units: "kilometers",
        directions_type: "none",
      });
      const summary = json?.trip?.summary;
      if (summary && typeof summary.length === "number" && typeof summary.time === "number") {
        this.usedRouter = "valhalla-local";
        return { meters: Math.round(summary.length * 1000), seconds: Math.round(summary.time) };
      }
    }

    const matrix = await this.matrix([from], [to], mode);
    return matrix?.[0]?.[0] ?? null;
  }

  /**
   * La matriz completa: N orígenes × M destinos.
   *
   * Contra OSRM es UNA llamada por modo mientras las coordenadas entren en el tope; contra Valhalla
   * propio, una llamada a `/sources_to_targets`. En los dos casos, un fallo devuelve `null` y el
   * llamador conserva la matriz anterior en vez de publicar una a medias.
   */
  async matrix(
    sources: RoutePoint[],
    targets: RoutePoint[],
    mode: TransportRoutableMode
  ): Promise<(RouteResult | null)[][] | null> {
    if (!sources.length || !targets.length) return null;

    if (await this.localAvailable()) {
      const spec = VALHALLA_COSTING[mode];
      const json = await this.request(`${this.localUrl}/sources_to_targets`, {
        sources: sources.map(point => ({ lat: point.lat, lon: point.lon })),
        targets: targets.map(point => ({ lat: point.lat, lon: point.lon })),
        costing: spec.costing,
        costing_options: spec.options,
        units: "kilometers",
      });
      const rows = json?.sources_to_targets;
      if (Array.isArray(rows)) {
        this.usedRouter = "valhalla-local";
        this.calls += 1;
        return rows.map((row: any[]) =>
          (Array.isArray(row) ? row : []).map((cell: any) => {
            const meters = typeof cell?.distance === "number" ? Math.round(cell.distance * 1000) : null;
            const seconds = typeof cell?.time === "number" ? Math.round(cell.time) : null;
            return meters != null && seconds != null && seconds > 0 ? { meters, seconds } : null;
          })
        );
      }
    }

    return this.osrmTable(sources, targets, mode);
  }

  private async osrmTable(
    sources: RoutePoint[],
    targets: RoutePoint[],
    mode: TransportRoutableMode
  ): Promise<(RouteResult | null)[][] | null> {
    // OSRM recibe UNA lista de coordenadas y dos listas de índices. Cuando orígenes y destinos son
    // el mismo conjunto —que es el caso de la matriz de zonas— eso son 68 coordenadas y no 136.
    const points: RoutePoint[] = [];
    const indexOf = (point: RoutePoint): number => {
      const key = points.findIndex(candidate => candidate.lat === point.lat && candidate.lon === point.lon);
      if (key >= 0) return key;
      points.push(point);
      return points.length - 1;
    };
    const sourceIndexes = sources.map(indexOf);
    const targetIndexes = targets.map(indexOf);
    if (points.length > OSRM_MAX_COORDINATES) return null;

    const coordinates = points.map(point => `${point.lon.toFixed(6)},${point.lat.toFixed(6)}`).join(";");
    const query = new URLSearchParams({
      annotations: "duration,distance",
      sources: sourceIndexes.join(";"),
      destinations: targetIndexes.join(";"),
    });
    await this.throttle(false);
    const url = `${this.osrmUrl}/${OSRM_PROFILE[mode]}/table/v1/driving/${coordinates}?${query.toString()}`;
    const json = await this.request(url);
    this.calls += 1;
    if (json?.code !== "Ok" || !Array.isArray(json?.durations)) return null;

    this.usedRouter = "osrm-fossgis";
    const durations: (number | null)[][] = json.durations;
    const distances: (number | null)[][] = json.distances ?? [];
    return durations.map((row, rowIndex) =>
      row.map((seconds, columnIndex) => {
        const meters = distances[rowIndex]?.[columnIndex];
        if (seconds == null || meters == null || seconds <= 0 || meters <= 0) return null;
        return { meters: Math.round(meters), seconds: Math.round(seconds) };
      })
    );
  }

  get callsMade(): number {
    return this.calls;
  }
}

export function isRoutableMode(value: string): value is TransportRoutableMode {
  return (TRANSPORT_ROUTABLE_MODES as readonly string[]).includes(value);
}

/**
 * La atribución que la página tiene que mostrar cuando la ruta la calculó OSRM de FOSSGIS: los datos
 * son de OpenStreetMap (ODbL) y el servicio es donado.
 */
export const ROUTER_ATTRIBUTION = {
  "osrm-fossgis": {
    label: "Rutas calculadas con OSRM sobre datos de OpenStreetMap (ODbL), servicio de FOSSGIS e.V.",
    url: "https://routing.openstreetmap.de/",
  },
  "valhalla-local": {
    label: "Rutas calculadas con Valhalla sobre datos de OpenStreetMap (ODbL)",
    url: "https://www.openstreetmap.org/copyright",
  },
} as const;
