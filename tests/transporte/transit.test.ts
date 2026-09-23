// El viaje en ómnibus entre dos zonas, con un índice de juguete.
//
// Las tres partes del viaje (caminar, esperar, viajar) se prueban por separado porque cada una es
// una decisión distinta y cada una se puede romper sola: la caminata decide la comparación en
// trayectos cortos, la espera está acotada a propósito, y el tiempo en vehículo sale de restar dos
// desplazamientos del horario publicado. Y la cuarta cosa que se prueba es la que NO hace: un par
// sin recorrido no se estima, se declara.
import { describe, expect, it } from "vitest";
import {
  MAX_WAIT_MINUTES,
  MAX_WALK_METERS,
  MAX_WALK_METERS_LOCALIDAD,
  WALK_METERS_PER_MINUTE,
  buildTransitIndex,
  buildTransitMatrix,
  waitMinutesFor,
} from "../../classes/transporte/transit";
import type { StmIndex, StmStop, StmVariant } from "../../classes/transporte/sources/stm";
import type { TransportZone } from "../../classes/transporte/types";

// Una red de juguete con la topología mínima que hace falta: dos pares directos, uno que sólo se
// resuelve con un trasbordo y uno que no se resuelve.
//
//   centro --[variante 10, "100"]--> buceo --[variante 20, "104"]--> carrasco
//   isla   --[variante 30, "999"]--> (ninguna parada más)
//
// Las coordenadas están elegidas para que cada parada quede a ~200-350 m del centro de SU zona y a
// más de 3 km de cualquier otra: así el índice de acceso no mezcla zonas por accidente.
const ZONES: TransportZone[] = [
  { slug: "centro", name: "Centro", department: "Montevideo", lat: -34.906, lon: -56.19, kind: "ine" },
  { slug: "buceo", name: "Buceo", department: "Montevideo", lat: -34.89, lon: -56.13, kind: "ine" },
  { slug: "carrasco", name: "Carrasco", department: "Montevideo", lat: -34.885, lon: -56.05, kind: "ine" },
  { slug: "isla", name: "Isla", department: "Montevideo", lat: -34.7, lon: -56.4, kind: "ine" },
];

const STOPS: StmStop[] = [
  { id: 1, lat: -34.903, lon: -56.19, street: "18 DE JULIO", corner: "EJIDO" },
  { id: 2, lat: -34.892, lon: -56.13, street: "RIVERA", corner: "COMERCIO" },
  { id: 3, lat: -34.887, lon: -56.05, street: "AV BOLIVIA", corner: "ARIZONA" },
  { id: 4, lat: -34.702, lon: -56.4, street: "RUTA 1", corner: "KM 20" },
];

const VARIANTS: StmVariant[] = [
  { id: 10, line: "100", stops: [{ stopId: 1, ordinal: 1 }, { stopId: 2, ordinal: 2 }] },
  { id: 20, line: "104", stops: [{ stopId: 2, ordinal: 1 }, { stopId: 3, ordinal: 2 }] },
  { id: 30, line: "999", stops: [{ stopId: 4, ordinal: 1 }] },
];

function toyIndex(over: Partial<StmIndex> = {}): StmIndex {
  const hours = (perPeakHour: number): number[] => {
    const array = new Array(24).fill(0);
    array[7] = perPeakHour;
    array[8] = perPeakHour;
    return array;
  };
  return {
    stops: new Map(STOPS.map(stop => [stop.id, stop])),
    variants: new Map(VARIANTS.map(variant => [variant.id, variant])),
    offsets: new Map([
      // 12 minutos del Centro al Buceo, 9 del Buceo a Carrasco.
      [10, new Map([[1, 0], [2, 12]])],
      [20, new Map([[1, 0], [2, 9]])],
      [30, new Map([[1, 0]])],
    ]),
    // 6 salidas por hora pico = una cada 10 minutos = 5 de espera media.
    departures: new Map([[10, hours(6)], [20, hours(6)], [30, hours(6)]]),
    fetchedAt: "2026-09-22T00:00:00.000Z",
    scheduleRows: 0,
    stopRows: 0,
    ...over,
  };
}

const pairOf = (result: ReturnType<typeof buildTransitMatrix>, from: string, to: string) =>
  result.pairs.find(
    pair => ZONES[pair.from]!.slug === from && ZONES[pair.to]!.slug === to
  );

describe("buildTransitIndex", () => {
  it("cada zona toma las paradas de su radio y ninguna de las de otra zona", () => {
    const index = buildTransitIndex(toyIndex(), ZONES);
    expect(index.access.get("centro")!.map(stop => stop.stopId)).toEqual([1]);
    expect(index.access.get("buceo")!.map(stop => stop.stopId)).toEqual([2]);
    expect(index.access.get("carrasco")!.map(stop => stop.stopId)).toEqual([3]);
    // La caminata se cobra en minutos a 5 km/h, no se redondea a cero.
    const walk = index.access.get("centro")![0]!;
    expect(walk.meters).toBeGreaterThan(300);
    expect(walk.meters).toBeLessThanOrEqual(MAX_WALK_METERS);
    expect(walk.walkMinutes).toBeCloseTo(walk.meters / WALK_METERS_PER_MINUTE, 6);
  });

  it("indexa qué variantes pasan por cada parada, con su ordinal", () => {
    const index = buildTransitIndex(toyIndex(), ZONES);
    expect(index.byStop.get(2)).toEqual([
      { variantId: 10, ordinal: 2 },
      { variantId: 20, ordinal: 1 },
    ]);
  });

  it("una zona sin parada en el radio cae a la más cercana dentro del límite, y cobra la caminata", () => {
    // Es el caso real de Bañados de Carrasco y Manga: barrios enormes donde el centro geométrico
    // queda lejos de la calle por la que pasa el ómnibus. Decir "sin recorrido" ahí sería falso.
    const lejana: TransportZone = {
      slug: "lejana",
      name: "Lejana",
      department: "Montevideo",
      lat: -34.917, // ~1,2 km al sur de la parada 1, o sea fuera de los 700 m
      lon: -56.19,
      kind: "ine",
    };
    const index = buildTransitIndex(toyIndex(), [lejana]);
    const access = index.access.get("lejana")!;
    expect(access).toHaveLength(1);
    expect(access[0]!.stopId).toBe(1);
    expect(access[0]!.meters).toBeGreaterThan(MAX_WALK_METERS);
    expect(access[0]!.meters).toBeLessThan(3000);
    expect(access[0]!.walkMinutes).toBeGreaterThan(10);
  });

  it("una zona sin ninguna parada a menos de 3 km se queda sin acceso, no con una parada inventada", () => {
    const desierto: TransportZone = {
      slug: "desierto",
      name: "Desierto",
      department: "Rocha",
      lat: -34.0,
      lon: -54.0,
      kind: "ine",
    };
    const index = buildTransitIndex(toyIndex(), [desierto]);
    expect(index.access.get("desierto")).toEqual([]);
  });

  it("una localidad del área metropolitana usa un radio más grande que un barrio", () => {
    // El centroide de Ciudad de la Costa —20 km de largo— no es la casa de nadie, y con el radio de
    // barrio se quedaría sin una sola parada caminable.
    const comoBarrio: TransportZone = { ...ZONES[0]!, slug: "como-barrio", lat: -34.895, kind: "ine" };
    const comoLocalidad: TransportZone = { ...comoBarrio, slug: "como-localidad", kind: "localidad" };
    const index = buildTransitIndex(toyIndex(), [comoBarrio, comoLocalidad]);
    // A ~890 m de la parada 1: fuera del radio de barrio, dentro del de localidad.
    expect(index.access.get("como-barrio")![0]!.meters).toBeGreaterThan(MAX_WALK_METERS);
    expect(index.access.get("como-localidad")![0]!.meters).toBeLessThanOrEqual(MAX_WALK_METERS_LOCALIDAD);
    expect(index.access.get("como-localidad")).toHaveLength(1);
  });
});

describe("waitMinutesFor", () => {
  it("espera media frecuencia: 6 salidas por hora son 5 minutos", () => {
    expect(waitMinutesFor(buildTransitIndex(toyIndex(), ZONES), 10)).toBe(5);
  });

  it("la acota a 15 minutos: con un ómnibus por hora nadie espera media hora parado", () => {
    // Por encima del tope la gente consulta el horario y sale a la hora; estimar media frecuencia
    // ahí sería inventarle tiempo muerto al ómnibus y decidir la comparación con eso.
    const hours = new Array(24).fill(0);
    hours[7] = 1;
    hours[8] = 1;
    const index = buildTransitIndex(toyIndex({ departures: new Map([[10, hours]]) }), ZONES);
    expect(waitMinutesFor(index, 10)).toBe(MAX_WAIT_MINUTES);
    expect(MAX_WAIT_MINUTES).toBe(15);
  });

  it("una variante sin salidas en la hora pico también cae al tope, no a cero", () => {
    // Cero salidas medidas no es "pasa siempre": es "no sabemos". El tope es el supuesto conservador.
    const index = buildTransitIndex(toyIndex({ departures: new Map([[10, new Array(24).fill(0)]]) }), ZONES);
    expect(waitMinutesFor(index, 10)).toBe(MAX_WAIT_MINUTES);
    expect(waitMinutesFor(index, 999)).toBe(MAX_WAIT_MINUTES);
  });
});

describe("buildTransitMatrix", () => {
  it("resuelve el viaje directo con las tres partes separadas", () => {
    const index = buildTransitIndex(toyIndex(), ZONES);
    const trip = pairOf(buildTransitMatrix(index, ZONES), "centro", "buceo")!;

    expect(trip.transfers).toBe(0);
    expect(trip.inVehicleMinutes).toBe(12); // el desplazamiento del horario, restado entre ordinales
    expect(trip.waitMinutes).toBe(5);
    // Caminata de las dos puntas sumada: ~333 m + ~222 m a 83 m/min.
    expect(trip.walkMinutes).toBeGreaterThan(5);
    expect(trip.walkMinutes).toBeLessThan(9);
    expect(trip.lines).toEqual(["100"]);
    // Los kilómetros del recorrido no se publican: el dato de origen da tiempos, no distancias.
    expect(trip.meters).toBe(0);
  });

  it("resuelve con UN trasbordo lo que no tiene línea directa, y lo declara", () => {
    const index = buildTransitIndex(toyIndex(), ZONES);
    const trip = pairOf(buildTransitMatrix(index, ZONES), "centro", "carrasco")!;

    expect(trip.transfers).toBe(1);
    expect(trip.inVehicleMinutes).toBe(21); // 12 del Centro al Buceo + 9 del Buceo a Carrasco
    expect(trip.waitMinutes).toBe(10); // una espera por cada línea
    expect(trip.lines).toEqual(["100", "104"]);
  });

  it("un par sin recorrido directo ni de un trasbordo NO se estima: no está en la matriz", () => {
    const result = buildTransitMatrix(buildTransitIndex(toyIndex(), ZONES), ZONES);
    expect(pairOf(result, "isla", "centro")).toBeUndefined();
    expect(pairOf(result, "centro", "isla")).toBeUndefined();
    expect(result.missing).toBeGreaterThan(0);
    // Los que sí se pudieron resolver más los que faltan dan el total de pares.
    expect(result.pairs.length + result.missing).toBe(ZONES.length * (ZONES.length - 1));
  });

  it("nunca guarda la diagonal ni un par repetido", () => {
    const result = buildTransitMatrix(buildTransitIndex(toyIndex(), ZONES), ZONES);
    expect(result.pairs.every(pair => pair.from !== pair.to)).toBe(true);
    const keys = result.pairs.map(pair => `${pair.from}:${pair.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("no inventa un viaje cuando la variante no tiene horarios cargados", () => {
    // Paradas sí, horarios no: sin el desplazamiento no hay tiempo en vehículo, y la respuesta
    // correcta es "sin recorrido relevado", no la línea recta dividida por una velocidad.
    const index = buildTransitIndex(toyIndex({ offsets: new Map() }), ZONES);
    const result = buildTransitMatrix(index, ZONES);
    expect(result.pairs).toEqual([]);
    expect(result.missing).toBe(ZONES.length * (ZONES.length - 1));
  });

  it("todo par publicado tiene tiempos positivos y una línea que lo respalda", () => {
    const result = buildTransitMatrix(buildTransitIndex(toyIndex(), ZONES), ZONES);
    expect(result.pairs.length).toBeGreaterThan(0);
    for (const pair of result.pairs) {
      expect(pair.inVehicleMinutes).toBeGreaterThan(0);
      expect(pair.waitMinutes).toBeGreaterThan(0);
      expect(pair.walkMinutes).toBeGreaterThan(0);
      expect(pair.waitMinutes).toBeLessThanOrEqual(MAX_WAIT_MINUTES * (pair.transfers + 1));
      expect(pair.lines.length).toBeGreaterThan(0);
      expect(pair.lines.length).toBeLessThanOrEqual(3);
    }
  });
});
