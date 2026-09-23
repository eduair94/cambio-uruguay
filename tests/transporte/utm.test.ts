// La desproyección UTM 21S → WGS84 y la distancia entre dos puntos.
//
// Esto es la base de todo lo demás: si la proyección está mal, las paradas caen en otro lado, el
// radio de caminata mide cualquier cosa y la matriz de ómnibus queda mal por un error que no se ve
// en ningún número publicado. Por eso el primer test es contra un punto verificado a mano y no
// contra "lo que da hoy".
import { describe, expect, it } from "vitest";
import { metersBetween, utm21sToWgs84 } from "../../classes/transporte/sources/utm";

describe("utm21sToWgs84", () => {
  it("desproyecta la parada de Coruña y Roletti al punto verificado el 22/9/2026", () => {
    // X/Y tal como vienen en las columnas del .dbf de `v_uptu_paradas`.
    const point = utm21sToWgs84(577981.398032968, 6140774.57375357);
    expect(point).not.toBeNull();
    expect(point!.lat).toBeCloseTo(-34.8724, 3);
    expect(point!.lon).toBeCloseTo(-56.1468, 3);
    // La tolerancia declarada en el encargo: medio milésimo de grado, ~55 m de latitud.
    expect(Math.abs(point!.lat - -34.8724)).toBeLessThan(0.0005);
    expect(Math.abs(point!.lon - -56.1468)).toBeLessThan(0.0005);
  });

  it("queda a unos pocos metros de lo que devuelve el geocodificador para esa misma esquina", () => {
    // Google ubica Coruña y Roletti en -34,872245 / -56,146935 (consulta del 22/9/2026). La
    // diferencia MEDIDA con esta implementación son 24 m, que es la distancia del poste de la parada
    // al centro del cruce — el comentario de `utm.ts` dice "~18 metros", y son 24. No es un error de
    // la proyección (un error de faja o de hemisferio daría kilómetros), pero el número del
    // comentario no reproduce.
    const point = utm21sToWgs84(577981.398032968, 6140774.57375357)!;
    const meters = metersBetween(point, { lat: -34.872245, lon: -56.146935 });
    expect(meters).toBe(24);
    expect(meters).toBeLessThan(60);
  });

  it("devuelve null ante una entrada que no es un número finito, en vez de un NaN que viaja", () => {
    // Una columna vacía del .dbf da `Number("") === 0`, pero una con basura da NaN. Devolver
    // `{ lat: NaN }` metería una parada fantasma en el índice y todas las distancias contra ella
    // serían NaN sin que nada falle.
    expect(utm21sToWgs84(Number.NaN, 6140774)).toBeNull();
    expect(utm21sToWgs84(577981, Number.NaN)).toBeNull();
    expect(utm21sToWgs84(Number.POSITIVE_INFINITY, 6140774)).toBeNull();
    expect(utm21sToWgs84(577981, Number.NEGATIVE_INFINITY)).toBeNull();
  });

  it("dos puntos de Montevideo caen dentro de la ciudad, no en el hemisferio norte", () => {
    // La trampa clásica de UTM 21S es olvidarse del falso norte de 10.000.000: el mismo Y leído como
    // hemisferio norte pone la parada en Guyana. Esto lo detecta de una.
    const point = utm21sToWgs84(574000, 6137000)!;
    expect(point.lat).toBeLessThan(-34);
    expect(point.lat).toBeGreaterThan(-35.5);
    expect(point.lon).toBeLessThan(-53);
    expect(point.lon).toBeGreaterThan(-58.6);
  });
});

describe("metersBetween", () => {
  it("una centésima de grado de latitud son 1.112 metros", () => {
    // Distancia conocida: 0,01° de latitud sobre una esfera de 6.371 km son 6.371.000 × 0,01 × π/180
    // = 1.111,95 m. Es el único eje donde la geometría da un número cerrado sin depender del coseno
    // de la latitud, así que es el que sirve de patrón.
    expect(metersBetween({ lat: -34.9, lon: -56.16 }, { lat: -34.91, lon: -56.16 })).toBe(1112);
  });

  it("es simétrica y da cero contra sí misma", () => {
    const a = { lat: -34.9011, lon: -56.1645 };
    const b = { lat: -34.8721, lon: -56.1467 };
    expect(metersBetween(a, b)).toBe(metersBetween(b, a));
    expect(metersBetween(a, a)).toBe(0);
  });

  it("acorta la distancia en longitud por el coseno de la latitud", () => {
    // A -34,9° el coseno vale 0,82: una centésima de grado de longitud tiene que dar ~912 m, no los
    // 1.112 de la latitud. Un haversine mal escrito (sin el producto de cosenos) da los dos iguales.
    const eastWest = metersBetween({ lat: -34.9, lon: -56.16 }, { lat: -34.9, lon: -56.15 });
    expect(eastWest).toBeGreaterThan(890);
    expect(eastWest).toBeLessThan(930);
    expect(eastWest).toBeLessThan(metersBetween({ lat: -34.9, lon: -56.16 }, { lat: -34.91, lon: -56.16 }));
  });
});
