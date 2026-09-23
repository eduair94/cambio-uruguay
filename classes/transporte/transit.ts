// Cuánto tarda el ómnibus entre dos zonas, con los horarios reales del STM.
//
// No es un ruteador de transporte público completo y no pretende serlo: contesta UNA pregunta, que
// es la que necesita el comparador —"¿cuánto tardo de mi barrio a mi trabajo, un día hábil a la
// mañana?"— y la contesta con el mismo cuidado con el que el resto del sitio contesta un precio.
//
// LAS TRES PARTES DE UN VIAJE EN ÓMNIBUS, y por qué las tres tienen que estar:
//
//  * CAMINAR hasta la parada y desde la parada. Ignorarlo sería regalarle al ómnibus los 6 a 16
//    minutos que un vehículo propio no tiene, que es justamente donde se define la comparación en
//    trayectos cortos.
//  * ESPERAR. En promedio se espera media frecuencia, pero con un tope: si un ómnibus pasa cada
//    cuarenta minutos, nadie espera veinte parado en la parada — mira el horario y sale a la hora.
//    Estimar media frecuencia ahí sería inventarle tiempo muerto al ómnibus.
//  * VIAJAR. Sale de los horarios publicados: el desplazamiento medio desde la salida hasta cada
//    ordinal del recorrido, restado entre la parada de subida y la de bajada.
//
// UN TRASBORDO, no más. Con dos trasbordos la estimación empieza a depender de coordinaciones que
// los horarios teóricos no garantizan, y el error crece más rápido que la cobertura que agrega. Un
// par sin recorrido directo ni de un trasbordo se publica como "sin recorrido relevado" en vez de
// estimarse: es la misma regla que el resto del sitio, la ausencia no es un veredicto.
import { metersBetween } from "./sources/utm";
import type { StmIndex } from "./sources/stm";
import type { TransportTransitPair, TransportZone } from "./types";

/** 5 km/h, la velocidad a la que camina alguien que va al trabajo. */
export const WALK_METERS_PER_MINUTE = 83;
/** Hasta ocho minutos y medio de caminata: más que eso, la gente busca otra parada o no va. */
export const MAX_WALK_METERS = Number(process.env.TRANSPORT_MAX_WALK_METERS || 700);
/**
 * Para una localidad del área metropolitana el punto de la zona es el centro de la ciudad y las
 * paradas del STM están donde pasa la ruta, así que el radio de barrio deja a Ciudad de la Costa sin
 * una sola parada caminable. Esto no es "caminar dos kilómetros": es reconocer que el centroide de
 * una localidad de 20 km de largo no es la casa de nadie.
 */
export const MAX_WALK_METERS_LOCALIDAD = Number(process.env.TRANSPORT_MAX_WALK_METERS_LOCALIDAD || 2500);
/** El tope de espera: por encima de esto se consulta el horario, no se espera. */
export const MAX_WAIT_MINUTES = 15;
/** La hora que se mide: el viaje al trabajo de un día hábil. */
export const PEAK_HOURS = [7, 8] as const;
/**
 * Cuántas paradas de acceso se miran por zona.
 *
 * El primer intento capaba VARIANTES (40) y dejaba 1.105 de 4.556 pares sin viaje, con ausencias
 * imposibles: Malvín→Buceo, que son barrios linderos, y Colón→Centro, que es de los corredores más
 * servidos de la ciudad. El tope estaba mordiendo la cobertura, no la cola: un barrio de Montevideo
 * tiene decenas de paradas caminables y por cada una pasan varias líneas. Se capa la ENTRADA (las
 * paradas más cercanas) y no las líneas, que es lo que de verdad acota el trabajo sin decidir por
 * adelantado qué recorrido gana.
 */
const MAX_ACCESS_STOPS = Number(process.env.TRANSPORT_MAX_ACCESS_STOPS || 60);
/**
 * Cuando el centroide de una zona no tiene NINGUNA parada en su radio, se toma la más cercana igual,
 * hasta este límite, y se cobra la caminata real.
 *
 * Es el caso de Bañados de Carrasco y de Manga/Toledo Chico: barrios enormes y poco densos donde el
 * centro geométrico cae lejos de la calle por donde pasa el ómnibus. Decir "sin recorrido" ahí sería
 * falso —el barrio tiene ómnibus— y poner una parada a 700 m que no existe sería peor. Lo honesto es
 * la parada real con sus veinte minutos de caminata, que es lo que de verdad le pasa a quien vive
 * ahí, y que el comparador va a cobrar como tiempo.
 */
const FALLBACK_WALK_METERS = Number(process.env.TRANSPORT_FALLBACK_WALK_METERS || 3000);

export interface TransitStopAccess {
  stopId: number;
  walkMinutes: number;
  meters: number;
}

export interface TransitIndex {
  stm: StmIndex;
  /** Paradas caminables desde cada zona, de la más cercana a la más lejana. */
  access: Map<string, TransitStopAccess[]>;
  /** Qué variantes pasan por cada parada, y en qué ordinal. */
  byStop: Map<number, { variantId: number; ordinal: number }[]>;
}

export function buildTransitIndex(stm: StmIndex, zones: readonly TransportZone[]): TransitIndex {
  const byStop = new Map<number, { variantId: number; ordinal: number }[]>();
  for (const variant of stm.variants.values()) {
    for (const stop of variant.stops) {
      const bag = byStop.get(stop.stopId) ?? [];
      bag.push({ variantId: variant.id, ordinal: stop.ordinal });
      byStop.set(stop.stopId, bag);
    }
  }

  const access = new Map<string, TransitStopAccess[]>();
  for (const zone of zones) {
    const radius = zone.kind === "localidad" ? MAX_WALK_METERS_LOCALIDAD : MAX_WALK_METERS;
    const all: TransitStopAccess[] = [];
    for (const stop of stm.stops.values()) {
      const meters = metersBetween({ lat: zone.lat, lon: zone.lon }, { lat: stop.lat, lon: stop.lon });
      if (meters > FALLBACK_WALK_METERS) continue;
      all.push({ stopId: stop.id, meters, walkMinutes: meters / WALK_METERS_PER_MINUTE });
    }
    all.sort((a, b) => a.meters - b.meters);
    const inRadius = all.filter(stop => stop.meters <= radius);
    access.set(zone.slug, (inRadius.length ? inRadius : all.slice(0, 8)).slice(0, MAX_ACCESS_STOPS));
  }

  return { stm, access, byStop };
}

/** Espera media acotada, a partir de las salidas de la hora pico. */
export function waitMinutesFor(index: TransitIndex, variantId: number): number {
  const departures = index.stm.departures.get(variantId);
  if (!departures) return MAX_WAIT_MINUTES;
  const perHour = PEAK_HOURS.reduce((sum, hour) => sum + (departures[hour] ?? 0), 0) / PEAK_HOURS.length;
  if (perHour <= 0) return MAX_WAIT_MINUTES;
  const headway = 60 / perHour;
  return Math.min(MAX_WAIT_MINUTES, headway / 2);
}

function rideMinutes(index: TransitIndex, variantId: number, fromOrdinal: number, toOrdinal: number): number | null {
  if (toOrdinal <= fromOrdinal) return null;
  const offsets = index.stm.offsets.get(variantId);
  if (!offsets) return null;
  const from = offsets.get(fromOrdinal);
  const to = offsets.get(toOrdinal);
  if (from == null || to == null) return null;
  const minutes = to - from;
  return minutes > 0 && minutes < 240 ? minutes : null;
}

interface Leg {
  variantId: number;
  minutes: number;
  walkMinutes: number;
  waitMinutes: number;
  stopId: number;
}

/** Todo lo que se puede alcanzar desde una zona con UNA línea, con el mejor tiempo por parada. */
function reachableFrom(index: TransitIndex, zoneSlug: string): Map<number, Leg> {
  const best = new Map<number, Leg>();
  const access = index.access.get(zoneSlug) ?? [];

  for (const origin of access) {
    for (const entry of index.byStop.get(origin.stopId) ?? []) {
      const variant = index.stm.variants.get(entry.variantId);
      if (!variant) continue;
      const wait = waitMinutesFor(index, entry.variantId);
      for (const stop of variant.stops) {
        const ride = rideMinutes(index, entry.variantId, entry.ordinal, stop.ordinal);
        if (ride == null) continue;
        const minutes = origin.walkMinutes + wait + ride;
        const current = best.get(stop.stopId);
        if (!current || minutes < current.minutes) {
          best.set(stop.stopId, {
            variantId: entry.variantId,
            minutes,
            walkMinutes: origin.walkMinutes,
            waitMinutes: wait,
            stopId: stop.stopId,
          });
        }
      }
    }
  }
  return best;
}

/** Lo mismo al revés: desde qué paradas se llega a la zona con UNA línea. */
function reachingTo(index: TransitIndex, zoneSlug: string): Map<number, Leg> {
  const best = new Map<number, Leg>();
  const access = index.access.get(zoneSlug) ?? [];

  for (const destination of access) {
    for (const entry of index.byStop.get(destination.stopId) ?? []) {
      const variant = index.stm.variants.get(entry.variantId);
      if (!variant) continue;
      const wait = waitMinutesFor(index, entry.variantId);
      for (const stop of variant.stops) {
        const ride = rideMinutes(index, entry.variantId, stop.ordinal, entry.ordinal);
        if (ride == null) continue;
        const minutes = ride + destination.walkMinutes;
        const current = best.get(stop.stopId);
        if (!current || minutes < current.minutes) {
          best.set(stop.stopId, {
            variantId: entry.variantId,
            minutes,
            walkMinutes: destination.walkMinutes,
            waitMinutes: wait,
            stopId: stop.stopId,
          });
        }
      }
    }
  }
  return best;
}

export interface TransitTrip {
  walkMinutes: number;
  waitMinutes: number;
  inVehicleMinutes: number;
  transfers: number;
  lines: string[];
}

/**
 * El mejor viaje entre dos zonas: directo si existe, con un trasbordo si no.
 *
 * `fromReach`/`toReach` se pasan calculados porque en una matriz de N zonas cada uno se reutiliza N
 * veces: calcularlos por par convertiría una corrida de minutos en una de horas.
 */
export function bestTransitTrip(
  index: TransitIndex,
  fromReach: Map<number, Leg>,
  toReach: Map<number, Leg>,
  toZoneSlug: string
): TransitTrip | null {
  const destinationStops = new Set((index.access.get(toZoneSlug) ?? []).map(stop => stop.stopId));

  // Directo: una línea que sale de una parada caminable del origen y llega a una del destino.
  let direct: { leg: Leg; walkOut: number } | null = null;
  for (const stopId of destinationStops) {
    const leg = fromReach.get(stopId);
    if (!leg) continue;
    const walkOut = (index.access.get(toZoneSlug) ?? []).find(stop => stop.stopId === stopId)?.walkMinutes ?? 0;
    const total = leg.minutes + walkOut;
    if (!direct || total < direct.leg.minutes + direct.walkOut) direct = { leg, walkOut };
  }

  if (direct) {
    const variant = index.stm.variants.get(direct.leg.variantId);
    return {
      walkMinutes: round1(direct.leg.walkMinutes + direct.walkOut),
      waitMinutes: round1(direct.leg.waitMinutes),
      inVehicleMinutes: round1(direct.leg.minutes - direct.leg.walkMinutes - direct.leg.waitMinutes),
      transfers: 0,
      lines: variant?.line ? [variant.line] : [],
    };
  }

  // Un trasbordo: una parada donde termina una línea del origen y empieza una que llega al destino.
  let best: { total: number; first: Leg; second: Leg } | null = null;
  for (const [stopId, second] of toReach) {
    const first = fromReach.get(stopId);
    if (!first) continue;
    if (first.variantId === second.variantId) continue;
    const total = first.minutes + second.minutes + second.waitMinutes;
    if (!best || total < best.total) best = { total, first, second };
  }
  if (!best) return null;

  const firstVariant = index.stm.variants.get(best.first.variantId);
  const secondVariant = index.stm.variants.get(best.second.variantId);
  const inVehicle =
    best.first.minutes -
    best.first.walkMinutes -
    best.first.waitMinutes +
    (best.second.minutes - best.second.walkMinutes);
  return {
    walkMinutes: round1(best.first.walkMinutes + best.second.walkMinutes),
    waitMinutes: round1(best.first.waitMinutes + best.second.waitMinutes),
    inVehicleMinutes: round1(inVehicle),
    transfers: 1,
    lines: [firstVariant?.line, secondVariant?.line].filter(Boolean) as string[],
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface TransitMatrixResult {
  pairs: TransportTransitPair[];
  /** Pares sin recorrido: se declaran, no se estiman. */
  missing: number;
}

/** La matriz entera de viajes en ómnibus entre zonas. */
export function buildTransitMatrix(
  index: TransitIndex,
  zones: readonly TransportZone[],
  options: { onProgress?: (done: number, total: number) => void } = {}
): TransitMatrixResult {
  const pairs: TransportTransitPair[] = [];
  let missing = 0;

  const reachFrom = new Map<string, Map<number, Leg>>();
  const reachTo = new Map<string, Map<number, Leg>>();
  for (const zone of zones) {
    reachFrom.set(zone.slug, reachableFrom(index, zone.slug));
    reachTo.set(zone.slug, reachingTo(index, zone.slug));
  }

  const total = zones.length * (zones.length - 1);
  let done = 0;
  for (let from = 0; from < zones.length; from += 1) {
    for (let to = 0; to < zones.length; to += 1) {
      if (from === to) continue;
      done += 1;
      if (done % 500 === 0) options.onProgress?.(done, total);
      const fromZone = zones[from]!;
      const toZone = zones[to]!;
      const trip = bestTransitTrip(index, reachFrom.get(fromZone.slug)!, reachTo.get(toZone.slug)!, toZone.slug);
      if (!trip) {
        missing += 1;
        continue;
      }
      pairs.push({
        from,
        to,
        walkMinutes: trip.walkMinutes,
        waitMinutes: trip.waitMinutes,
        inVehicleMinutes: trip.inVehicleMinutes,
        transfers: trip.transfers,
        lines: trip.lines.slice(0, 3),
        // Los kilómetros del ómnibus no se publican por par: el dato de origen da tiempos, no
        // distancias del recorrido, y estimarlos con la línea recta sería inventar.
        meters: 0,
      });
    }
  }

  return { pairs, missing };
}
