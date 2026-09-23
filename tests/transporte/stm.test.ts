// Los datos abiertos del STM: la hora como entero `hmm` y las dos cosas que se destilan de los
// 61 MB de horarios (cuánto tarda cada recorrido hasta cada parada, y cada cuánto sale).
//
// Todo acá corre sobre archivos armados en memoria: ni red, ni el caché de `.sdd-transporte-source`,
// ni los 1,7 millones de filas reales.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseLineNames, parseSchedule, parseStops, stmMinutesFromHmm } from "../../classes/transporte/sources/stm";
import { buildDbf, buildScheduleCsv, buildZip } from "./fixtures";

let directory: string;

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "cu-transporte-stm-"));
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

function writeZip(name: string, entries: Parameters<typeof buildZip>[0]): string {
  const file = join(directory, name);
  writeFileSync(file, buildZip(entries));
  return file;
}

describe("stmMinutesFromHmm", () => {
  it("lee el entero `hmm` como hora y minuto, no como un número de minutos", () => {
    // Es la trampa del formato: 12 NO son las 12:00, son las 00:12. Leerlo como minutos corridos
    // pondría las salidas de la madrugada al mediodía y viceversa.
    expect(stmMinutesFromHmm(12)).toBe(12);
    expect(stmMinutesFromHmm(1245)).toBe(765);
    expect(stmMinutesFromHmm(0)).toBe(0);
    expect(stmMinutesFromHmm(700)).toBe(420);
    expect(stmMinutesFromHmm(2359)).toBe(1439);
  });

  it("acepta las horas 24 a 27, que es como el STM escribe la madrugada del día siguiente", () => {
    expect(stmMinutesFromHmm(2415)).toBe(24 * 60 + 15);
    expect(stmMinutesFromHmm(2700)).toBe(27 * 60);
  });

  it("devuelve null ante valores imposibles en vez de un minuto inventado", () => {
    expect(stmMinutesFromHmm(1275)).toBeNull(); // 75 minutos no existen
    expect(stmMinutesFromHmm(2800)).toBeNull(); // más allá de la madrugada declarada
    expect(stmMinutesFromHmm(-5)).toBeNull();
    expect(stmMinutesFromHmm(Number.NaN)).toBeNull();
    expect(stmMinutesFromHmm(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("parseStops", () => {
  const FIELDS = [
    { name: "COD_UBIC_P", type: "N" as const, length: 8 },
    { name: "COD_VARIAN", type: "N" as const, length: 8 },
    { name: "ORDINAL", type: "N" as const, length: 5 },
    { name: "DESC_LINEA", type: "C" as const, length: 10 },
    { name: "CALLE", type: "C" as const, length: 14 },
    { name: "ESQUINA", type: "C" as const, length: 14 },
    { name: "X", type: "N" as const, length: 18 },
    { name: "Y", type: "N" as const, length: 18 },
  ];

  const row = (over: Record<string, string>): { values: Record<string, string> } => ({
    values: {
      COD_UBIC_P: "1",
      COD_VARIAN: "10",
      ORDINAL: "1",
      DESC_LINEA: "100",
      CALLE: "CORUÑA",
      ESQUINA: "ROLETTI",
      X: "577981.398032968",
      Y: "6140774.57375357",
      ...over,
    },
  });

  it("arma paradas desproyectadas y variantes con sus paradas ordenadas por ordinal", async () => {
    const file = writeZip("paradas-ok.zip", [
      { name: "v_uptu_paradas.prj", data: Buffer.from("PROJCS[]", "latin1"), method: 0 },
      {
        name: "v_uptu_paradas.dbf",
        data: buildDbf(FIELDS, [
          // A propósito en desorden: el archivo real no garantiza el orden dentro de la variante.
          row({ COD_UBIC_P: "2", ORDINAL: "3", X: "578500", Y: "6141200" }),
          row({ COD_UBIC_P: "1", ORDINAL: "1" }),
          row({ COD_UBIC_P: "3", ORDINAL: "2", X: "578200", Y: "6141000" }),
        ]),
        method: 8,
      },
    ]);

    const { stops, variants, rows } = await parseStops(file);
    expect(rows).toBe(3);
    expect([...stops.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(stops.get(1)!.lat).toBeCloseTo(-34.8724, 3);
    expect(stops.get(1)!.street).toBe("CORUÑA");
    expect(stops.get(1)!.corner).toBe("ROLETTI");

    const variant = variants.get(10)!;
    expect(variant.line).toBe("100");
    expect(variant.stops.map(stop => stop.ordinal)).toEqual([1, 2, 3]);
    expect(variant.stops.map(stop => stop.stopId)).toEqual([1, 3, 2]);
  });

  it("una parada repetida en varias variantes se guarda UNA vez", async () => {
    // En el archivo real hay 42.839 filas para ~5.000 paradas: la misma parada aparece una vez por
    // cada recorrido que pasa por ella. Guardarlas todas multiplicaría el índice por ocho.
    const file = writeZip("paradas-repetidas.zip", [
      {
        name: "v_uptu_paradas.dbf",
        data: buildDbf(FIELDS, [
          row({ COD_UBIC_P: "1", COD_VARIAN: "10", ORDINAL: "1", DESC_LINEA: "100" }),
          row({ COD_UBIC_P: "1", COD_VARIAN: "20", ORDINAL: "7", DESC_LINEA: "104" }),
        ]),
        method: 8,
      },
    ]);

    const { stops, variants } = await parseStops(file);
    expect(stops.size).toBe(1);
    expect([...variants.keys()].sort((a, b) => a - b)).toEqual([10, 20]);
    expect(variants.get(20)!.stops).toEqual([{ stopId: 1, ordinal: 7 }]);
  });

  it("descarta una coordenada que cae fuera de Uruguay en vez de meter una parada fantasma", async () => {
    // Un X/Y en cero desproyecta a mitad del Atlántico; una parada ahí arruinaría el radio de
    // caminata de cualquier zona que la tomara como "la más cercana".
    const file = writeZip("paradas-fuera.zip", [
      {
        name: "v_uptu_paradas.dbf",
        data: buildDbf(FIELDS, [
          row({ COD_UBIC_P: "1" }),
          row({ COD_UBIC_P: "9", X: "0", Y: "0" }),
          row({ COD_UBIC_P: "8", X: "basura", Y: "basura" }),
        ]),
        method: 8,
      },
    ]);

    const { stops } = await parseStops(file);
    expect([...stops.keys()]).toEqual([1]);
  });

  it("falla si el ZIP no trae la tabla .dbf, en vez de devolver cero paradas", async () => {
    const file = writeZip("paradas-sin-dbf.zip", [
      { name: "v_uptu_paradas.prj", data: Buffer.from("PROJCS[]", "latin1"), method: 0 },
    ]);
    await expect(parseStops(file)).rejects.toThrow(/no trae la tabla \.dbf/i);
  });
});

describe("parseSchedule", () => {
  it("calcula el desplazamiento desde la SALIDA del recorrido, promediando las pasadas", async () => {
    // `frecuencia` es la hora de salida en `hmm` × 10: 7000 son las 07:00. El desplazamiento de cada
    // parada es hora de paso − hora de salida, y el índice guarda el promedio de todas las salidas.
    const file = join(directory, "horarios.zip");
    writeFileSync(
      file,
      buildZip([
        {
          name: "uptu_pasada_variante.csv",
          data: buildScheduleCsv([
            { dayType: 1, variantId: 10, frequency: 7000, stopId: 1, ordinal: 1, hora: 700 },
            { dayType: 1, variantId: 10, frequency: 7000, stopId: 2, ordinal: 2, hora: 710 },
            { dayType: 1, variantId: 10, frequency: 7000, stopId: 3, ordinal: 3, hora: 725 },
            // Segunda salida, 07:30: la misma parada tarda 12 minutos en vez de 10.
            { dayType: 1, variantId: 10, frequency: 7300, stopId: 1, ordinal: 1, hora: 730 },
            { dayType: 1, variantId: 10, frequency: 7300, stopId: 2, ordinal: 2, hora: 742 },
          ]),
          method: 8,
        },
      ])
    );

    const { offsets, rows } = await parseSchedule(file);
    expect(rows).toBe(5);
    const variant = offsets.get(10)!;
    expect(variant.get(1)).toBe(0);
    expect(variant.get(2)).toBe(11); // promedio de 10 y 12
    expect(variant.get(3)).toBe(25);
  });

  it("una pasada después de medianoche no da un desplazamiento negativo", async () => {
    // Una salida de las 23:40 que pasa por la última parada a las 00:15 tarda 35 minutos, no −1.405.
    // Sin esta corrección el promedio de la variante se desploma y el viaje sale "más rápido".
    const file = join(directory, "horarios-medianoche.zip");
    writeFileSync(
      file,
      buildZip([
        {
          name: "uptu_pasada_variante.csv",
          data: buildScheduleCsv([
            { dayType: 1, variantId: 30, frequency: 23400, stopId: 1, ordinal: 1, hora: 2340 },
            { dayType: 1, variantId: 30, frequency: 23400, stopId: 9, ordinal: 5, hora: 15 },
          ]),
          method: 8,
        },
      ])
    );

    const variant = (await parseSchedule(file)).offsets.get(30)!;
    expect(variant.get(1)).toBe(0);
    expect(variant.get(5)).toBe(35);
    expect(variant.get(5)).toBeGreaterThan(0);
  });

  it("cuenta las salidas por hora UNA vez por frecuencia, no una por parada", async () => {
    // Cada salida aparece en el CSV con una fila por parada del recorrido. Contarlas todas daría una
    // frecuencia cuarenta veces mayor que la real y una espera de segundos.
    const file = join(directory, "horarios-frecuencia.zip");
    writeFileSync(
      file,
      buildZip([
        {
          name: "uptu_pasada_variante.csv",
          data: buildScheduleCsv([
            { dayType: 1, variantId: 40, frequency: 7000, stopId: 1, ordinal: 1, hora: 700 },
            { dayType: 1, variantId: 40, frequency: 7000, stopId: 2, ordinal: 2, hora: 710 },
            { dayType: 1, variantId: 40, frequency: 7000, stopId: 3, ordinal: 3, hora: 720 },
            { dayType: 1, variantId: 40, frequency: 7200, stopId: 1, ordinal: 1, hora: 720 },
            { dayType: 1, variantId: 40, frequency: 7200, stopId: 2, ordinal: 2, hora: 730 },
            { dayType: 1, variantId: 40, frequency: 8100, stopId: 1, ordinal: 1, hora: 810 },
          ]),
          method: 8,
        },
      ])
    );

    const hours = (await parseSchedule(file)).departures.get(40)!;
    expect(hours).toHaveLength(24);
    expect(hours[7]).toBe(2);
    expect(hours[8]).toBe(1);
    expect(hours.reduce((sum, value) => sum + value, 0)).toBe(3);
  });

  it("sólo toma tipo_dia 1 (día hábil) y descarta sábado y domingo", async () => {
    // Guardar los tres tipos de día triplicaría el índice para contestar una pregunta que esta
    // página no hace: el viaje al trabajo es de lunes a viernes.
    const file = join(directory, "horarios-tipodia.zip");
    writeFileSync(
      file,
      buildZip([
        {
          name: "uptu_pasada_variante.csv",
          data: buildScheduleCsv([
            { dayType: 1, variantId: 50, frequency: 7000, stopId: 1, ordinal: 1, hora: 700 },
            { dayType: 1, variantId: 50, frequency: 7000, stopId: 2, ordinal: 2, hora: 720 },
            { dayType: 2, variantId: 60, frequency: 7000, stopId: 1, ordinal: 1, hora: 700 },
            { dayType: 2, variantId: 60, frequency: 7000, stopId: 2, ordinal: 2, hora: 730 },
            { dayType: 3, variantId: 70, frequency: 7000, stopId: 1, ordinal: 1, hora: 700 },
          ]),
          method: 8,
        },
      ])
    );

    const parsed = await parseSchedule(file);
    expect(parsed.rows).toBe(2);
    expect([...parsed.offsets.keys()]).toEqual([50]);
    expect(parsed.offsets.get(60)).toBeUndefined();
    expect(parsed.departures.get(70)).toBeUndefined();

    // Y el tipo de día es un parámetro: pedir el 2 devuelve el 2 y nada más.
    const saturday = await parseSchedule(file, { dayType: 2 });
    expect([...saturday.offsets.keys()]).toEqual([60]);
  });

  it("descarta un desplazamiento absurdo (más de 8 horas) sin tirar la variante entera", async () => {
    const file = join(directory, "horarios-absurdo.zip");
    writeFileSync(
      file,
      buildZip([
        {
          name: "uptu_pasada_variante.csv",
          data: buildScheduleCsv([
            { dayType: 1, variantId: 80, frequency: 7000, stopId: 1, ordinal: 1, hora: 700 },
            { dayType: 1, variantId: 80, frequency: 7000, stopId: 2, ordinal: 2, hora: 715 },
            // 07:00 → 22:00 en la misma pasada: no es un recorrido urbano, es un dato roto.
            { dayType: 1, variantId: 80, frequency: 7000, stopId: 3, ordinal: 3, hora: 2200 },
          ]),
          method: 8,
        },
      ])
    );

    const variant = (await parseSchedule(file)).offsets.get(80)!;
    expect(variant.get(2)).toBe(15);
    expect(variant.get(3)).toBeUndefined();
  });

  it("guarda además el RECORRIDO que el CSV declara: ordinal → parada por variante", async () => {
    // El shapefile trae el nombre de la línea pero sólo 723 de las 1.088 variantes; el CSV de
    // horarios trae las 1.088 con su parada y su ordinal. Perder el nombre de una línea es
    // cosmético; perder su recorrido es perder la mitad de la red, así que el recorrido sale de acá.
    const file = join(directory, "horarios-recorrido.zip");
    writeFileSync(
      file,
      buildZip([
        {
          name: "uptu_pasada_variante.csv",
          data: buildScheduleCsv([
            { dayType: 1, variantId: 90, frequency: 7000, stopId: 501, ordinal: 1, hora: 700 },
            { dayType: 1, variantId: 90, frequency: 7000, stopId: 502, ordinal: 2, hora: 710 },
            // La segunda salida repite el mismo recorrido: no puede duplicar ni reescribir paradas.
            { dayType: 1, variantId: 90, frequency: 7300, stopId: 501, ordinal: 1, hora: 730 },
            { dayType: 1, variantId: 90, frequency: 7300, stopId: 502, ordinal: 2, hora: 741 },
          ]),
          method: 8,
        },
      ])
    );

    const sequence = (await parseSchedule(file)).stopsByVariant.get(90)!;
    expect([...sequence.entries()]).toEqual([
      [1, 501],
      [2, 502],
    ]);
  });

  it("falla si el ZIP no trae el CSV", async () => {
    const file = writeZip("horarios-sin-csv.zip", [
      { name: "leeme.txt", data: Buffer.from("nada", "latin1"), method: 0 },
    ]);
    await expect(parseSchedule(file)).rejects.toThrow(/no trae el CSV/i);
  });
});


describe("parseLineNames", () => {
  // El nombre público de la línea ("174", "D11") vive en un TERCER archivo: el de horarios por
  // parada sólo trae `cod_variante`, que es un número interno que no le dice nada a nadie.
  // Los saltos de este archivo son CRLF, no LF: es la segunda trampa medida el 22/9/2026.
  const CRLF = "\r\n";
  const linesCsv = (rows: readonly string[]): Buffer =>
    Buffer.from(
      [
        "Id;Linea;Origen;Destino;Variante;Tipo",
        // Segunda fila de encabezado: trae "Línea" doble-codificado en UTF-8 (los bytes C3 83 C2 AD
        // donde va la í), tal como lo publica la Intendencia.
        "Id;LÃ­nea;Origen;Destino;Variante;Tipo",
        ...rows,
      ].join(CRLF) + CRLF,
      "latin1"
    );

  function write(name: string, rows: readonly string[]): string {
    const file = join(directory, name);
    writeFileSync(file, buildZip([{ name: "lineas.csv", data: linesCsv(rows), method: 8 }]));
    return file;
  }

  it("mapea variante → nombre de línea, salteando LAS DOS filas de encabezado", async () => {
    const names = await parseLineNames(
      write("lineas-ok.zip", [
        "110;174;CENTRO;PASO CARRASCO;2601;A",
        "110;174;PASO CARRASCO;CENTRO;2602;B",
        "111;D11;CENTRO;PLAZA;2700;A",
      ])
    );
    expect(names.get(2601)).toBe("174");
    expect(names.get(2602)).toBe("174");
    expect(names.get(2700)).toBe("D11");
    // Si se salteara una sola fila de encabezado, la segunda entraría como si fuera un dato.
    expect(names.size).toBe(3);
  });

  it("aguanta los saltos CRLF de este archivo, que no son los LF del de horarios", async () => {
    const names = await parseLineNames(write("lineas-crlf.zip", ["110;174;A;B;2601;A"]));
    expect(names.get(2601)).toBe("174");
    // El retorno de carro no puede quedar pegado al último campo de la fila.
    expect(names.get(2601)).not.toMatch(/\r/);
  });

  it("descarta filas sin nombre o sin variante numérica, y se queda con la primera aparición", async () => {
    const names = await parseLineNames(
      write("lineas-basura.zip", [
        "110;174;A;B;2601;A",
        "110;OTRO;A;B;2601;A",
        "111;;A;B;2700;A",
        "112;999;A;B;no-es-un-numero;A",
        "113;incompleta",
      ])
    );
    expect(names.get(2601)).toBe("174");
    expect(names.has(2700)).toBe(false);
    expect(names.size).toBe(1);
  });

  it("un ZIP sin CSV devuelve un mapa vacío en vez de romper: el nombre es cosmético", async () => {
    // A diferencia de las paradas y los horarios, este archivo puede faltar y la comparación se
    // publica igual — por eso acá NO se lanza.
    const file = join(directory, "lineas-sin-csv.zip");
    writeFileSync(file, buildZip([{ name: "leeme.txt", data: Buffer.from("nada", "latin1"), method: 0 }]));
    const names = await parseLineNames(file);
    expect(names.size).toBe(0);
  });
});
