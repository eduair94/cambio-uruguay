// Los datos abiertos del STM: dónde están las paradas y a qué hora pasa cada ómnibus por cada una.
//
// Dos archivos de la Intendencia de Montevideo, los dos públicos y los dos actualizados a diario:
//
//  1. `v_uptu_paradas` (shapefile, 0,7 MB) — una fila por (parada, variante) con el código de la
//     parada, la línea, el ordinal dentro del recorrido y la posición en UTM 21S. Se lee el `.dbf`,
//     que trae las coordenadas como columnas: el `.shp` no hace falta.
//  2. `uptu_pasada_variante.zip` (10,6 MB comprimido, 61 MB de CSV) — una fila por
//     (tipo de día, variante, frecuencia, parada): a qué hora pasa esa salida por esa parada. Son
//     ~1,7 millones de filas.
//
// LO QUE SE GUARDA DE ESOS 61 MB, y por qué no todo: no hace falta saber a qué hora exacta pasa cada
// ómnibus por cada parada; hace falta saber CUÁNTO TARDA desde que sale hasta cada parada, y CADA
// CUÁNTO sale. Las dos cosas se calculan en una sola pasada acumulando promedios, así que el índice
// final son decenas de miles de números en vez de millones de filas. Un índice que entra en memoria
// es lo que permite después resolver 4.624 pares de zonas sin volver a tocar el disco.
//
// La `hora` viene como entero `hmm` (1245 = 12:45, 12 = 00:12) y la `frecuencia` como `hmm0`, que es
// la hora de salida del recorrido multiplicada por diez. Esa relación —verificada sobre los datos
// reales el 22/9/2026— es la que permite calcular el desplazamiento desde la salida sin cruzar dos
// archivos.
import { createWriteStream } from "node:fs";
import { mkdir, stat, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { readDbf } from "./dbf";
import { readZipEntry } from "./zip";
import { utm21sToWgs84, type LatLon } from "./utm";

const STOPS_GENERATOR_URL =
  "http://intgis.montevideo.gub.uy/sit/php/common/datos/generar_zip2.php?nom_tab=v_uptu_paradas&tipo=gis";
const STOPS_FILE_URL = "http://intgis.montevideo.gub.uy/sit/tmp/v_uptu_paradas.zip";
const SCHEDULE_URL = "https://datos-abiertos.montevideo.gub.uy/uptu_pasada_variante.zip";
const LINE_NAMES_URL = "https://datos-abiertos.montevideo.gub.uy/HORARIOS_OMNIBUS%20datos.zip";

const UA =
  process.env.TRANSPORT_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/conviene-auto-moto-o-omnibus-uruguay; transport cost comparator; contact via site)";

/** Tope de tamaño por archivo: si la IM publica algo mucho más grande, algo cambió y hay que mirarlo. */
const MAX_BYTES = 80 * 1024 * 1024;

export interface StmStop {
  id: number;
  lat: number;
  lon: number;
  street: string;
  corner: string;
}

export interface StmVariantStop {
  stopId: number;
  ordinal: number;
}

export interface StmVariant {
  id: number;
  line: string;
  stops: StmVariantStop[];
}

export interface StmIndex {
  stops: Map<number, StmStop>;
  variants: Map<number, StmVariant>;
  /** Minutos promedio desde la salida hasta cada ordinal, por variante. */
  offsets: Map<number, Map<number, number>>;
  /** Salidas por hora del día (0-23) en día hábil, por variante. */
  departures: Map<number, number[]>;
  fetchedAt: string;
  scheduleRows: number;
  stopRows: number;
}

function cacheDir(): string {
  const directory = resolve(join(process.cwd(), ".sdd-transporte-source"));
  const root = resolve(process.cwd());
  if (!directory.startsWith(root)) throw new Error("El caché del STM tiene que quedar dentro del worktree");
  return directory;
}

/**
 * Descarga con caché por día: los dos archivos se republican a diario, así que bajarlos una vez por
 * corrida alcanza, y si la corrida se repite el mismo día no se los vuelve a pedir.
 */
async function download(url: string, name: string, maxAgeHours = 20): Promise<string> {
  const directory = cacheDir();
  await mkdir(directory, { recursive: true });
  const file = join(directory, name);
  try {
    const info = await stat(file);
    const ageHours = (Date.now() - info.mtimeMs) / 3_600_000;
    if (info.size > 0 && ageHours < maxAgeHours) return file;
  } catch {
    // No estaba: se baja.
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": UA },
    });
    if (!response.ok || !response.body) throw new Error(`${url} devolvió ${response.status}`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error(`${url} pesa ${declared} bytes, más de lo esperado`);
    await pipeline(Readable.fromWeb(response.body as any), createWriteStream(file));
    const info = await stat(file);
    if (info.size === 0) throw new Error(`${url} vino vacío`);
    if (info.size > MAX_BYTES) throw new Error(`${url} pesa ${info.size} bytes, más de lo esperado`);
    return file;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * El generador de archivos de la IM no devuelve el ZIP: devuelve una página HTML que dispara la
 * descarga de `/sit/tmp/v_uptu_paradas.zip`. Así que se lo llama para que lo regenere y después se
 * baja el archivo de verdad. Si el generador falla, igual se intenta el archivo: suele estar ahí de
 * la corrida anterior, y una foto de paradas de ayer es infinitamente mejor que ninguna.
 */
export async function downloadStops(): Promise<string> {
  try {
    await fetch(STOPS_GENERATOR_URL, { headers: { "user-agent": UA }, redirect: "follow" });
  } catch {
    // El generador es best-effort; el que importa es el archivo.
  }
  return download(STOPS_FILE_URL, "v_uptu_paradas.zip");
}

export async function downloadSchedule(): Promise<string> {
  return download(SCHEDULE_URL, "uptu_pasada_variante.zip");
}

export async function downloadLineNames(): Promise<string> {
  return download(LINE_NAMES_URL, "horarios_omnibus.zip");
}

/**
 * El nombre público de cada variante ("174", "D11", "CA1").
 *
 * Hace falta un tercer archivo porque el de horarios por parada sólo trae `cod_variante`, que es un
 * número interno, y el shapefile de paradas trae el nombre de sólo 723 de las 1.088 variantes. Sin
 * esto, una línea real aparece en pantalla como "sin nombre", que es peor que no mostrar la línea:
 * parece un error del sitio.
 *
 * DOS TRAMPAS DEL ARCHIVO, las dos medidas el 22/9/2026:
 *  - tiene DOS filas de encabezado, y la segunda trae "Línea" doble-codificado en UTF-8 (los bytes
 *    `C3 83 C2 AD` donde va la í). Saltear una sola línea mete esa segunda como si fuera un dato.
 *  - el separador es `;` y los saltos son CRLF, no LF como en el archivo de horarios.
 */
const NEWLINE = String.fromCharCode(10);

export async function parseLineNames(file: string): Promise<Map<number, string>> {
  const entry = await readZipEntry(file, name => /\.csv$/i.test(name));
  if (!entry) return new Map();
  const names = new Map<number, string>();
  const text = entry.data.toString("latin1");
  for (const rawLine of text.split(NEWLINE)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(";");
    if (parts.length < 5) continue;
    const variantId = Number(parts[4]);
    const name = (parts[1] ?? "").trim();
    // Las dos filas de encabezado caen acá: `Variante` no es un número.
    if (!Number.isFinite(variantId) || !name) continue;
    if (!names.has(variantId)) names.set(variantId, name);
  }
  return names;
}

/** Convierte `hmm` (1245 = 12:45) a minutos desde medianoche. */
export function stmMinutesFromHmm(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const hours = Math.floor(value / 100);
  const minutes = value % 100;
  if (hours > 27 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export async function parseStops(file: string): Promise<{ stops: Map<number, StmStop>; variants: Map<number, StmVariant>; rows: number }> {
  const entry = await readZipEntry(file, name => /\.dbf$/i.test(name));
  if (!entry) throw new Error("El ZIP de paradas no trae la tabla .dbf");
  const table = readDbf(entry.data);

  const stops = new Map<number, StmStop>();
  const variants = new Map<number, StmVariant>();

  for (const row of table.rows) {
    const stopId = Number(row.COD_UBIC_P);
    const variantId = Number(row.COD_VARIAN);
    const ordinal = Number(row.ORDINAL);
    const x = Number(row.X);
    const y = Number(row.Y);
    if (!Number.isFinite(stopId) || !Number.isFinite(x) || !Number.isFinite(y)) continue;

    if (!stops.has(stopId)) {
      const point = utm21sToWgs84(x, y);
      if (point && isInsideUruguay(point)) {
        stops.set(stopId, {
          id: stopId,
          lat: Number(point.lat.toFixed(6)),
          lon: Number(point.lon.toFixed(6)),
          street: row.CALLE ?? "",
          corner: row.ESQUINA ?? "",
        });
      }
    }

    if (!Number.isFinite(variantId) || !Number.isFinite(ordinal)) continue;
    const variant = variants.get(variantId) ?? { id: variantId, line: row.DESC_LINEA ?? "", stops: [] };
    variant.stops.push({ stopId, ordinal });
    variants.set(variantId, variant);
  }

  for (const variant of variants.values()) variant.stops.sort((a, b) => a.ordinal - b.ordinal);
  return { stops, variants, rows: table.rows.length };
}

/**
 * Una pasada sobre el CSV de horarios acumulando dos cosas por variante: el desplazamiento medio
 * desde la salida hasta cada ordinal, y cuántas salidas hay en cada hora del día.
 *
 * `tipo_dia` 1 es día hábil, que es el único que le importa a alguien que va a trabajar. Guardar los
 * tres tipos de día triplicaría el índice para contestar una pregunta que nadie hace en esta página.
 */
export async function parseSchedule(
  file: string,
  options: { dayType?: number } = {}
): Promise<{
  offsets: Map<number, Map<number, number>>;
  departures: Map<number, number[]>;
  /**
   * La secuencia de paradas de CADA variante, sacada del propio CSV de horarios.
   *
   * Hace falta porque el shapefile de paradas sólo trae las variantes "maximales": medido el
   * 22/9/2026, 723 de las 1.088 que aparecen en los horarios. Construir los recorridos sólo con el
   * shapefile deja a la mitad de las variantes sin paradas y, por lo tanto, sin viaje posible — y eso
   * se ve en la cobertura: pares de barrios linderos que salen como "sin recorrido". El CSV trae
   * `cod_ubic_parada` y `ordinal` en cada fila, así que el recorrido está acá también, y completo.
   */
  stopsByVariant: Map<number, Map<number, number>>;
  rows: number;
}> {
  const dayType = options.dayType ?? 1;
  const entry = await readZipEntry(file, name => /\.csv$/i.test(name));
  if (!entry) throw new Error("El ZIP de horarios no trae el CSV");

  const sums = new Map<number, Map<number, { total: number; count: number }>>();
  const departures = new Map<number, number[]>();
  const stopsByVariant = new Map<number, Map<number, number>>();
  const seenDeparture = new Set<string>();

  const text = entry.data.toString("latin1");
  let rows = 0;
  let start = text.indexOf("\n") + 1; // saltea el encabezado
  while (start < text.length) {
    let end = text.indexOf("\n", start);
    if (end === -1) end = text.length;
    const line = text.slice(start, end).trim();
    start = end + 1;
    if (!line) continue;

    // tipo_dia;cod_variante;frecuencia;cod_ubic_parada;ordinal;hora;dia_anterior
    const parts = line.split(";");
    if (parts.length < 6) continue;
    if (Number(parts[0]) !== dayType) continue;

    const variantId = Number(parts[1]);
    const frequency = Number(parts[2]);
    const stopId = Number(parts[3]);
    const ordinal = Number(parts[4]);
    const hora = Number(parts[5]);
    if (!Number.isFinite(variantId) || !Number.isFinite(frequency) || !Number.isFinite(ordinal)) continue;

    if (Number.isFinite(stopId)) {
      const sequence = stopsByVariant.get(variantId) ?? new Map<number, number>();
      if (!sequence.has(ordinal)) sequence.set(ordinal, stopId);
      stopsByVariant.set(variantId, sequence);
    }

    const departureMinutes = stmMinutesFromHmm(Math.round(frequency / 10));
    const passMinutes = stmMinutesFromHmm(hora);
    if (departureMinutes == null || passMinutes == null) continue;
    rows += 1;

    // Una salida de las 23:40 que pasa por la última parada a las 00:15 no tarda -1.405 minutos.
    let offset = passMinutes - departureMinutes;
    if (offset < -60) offset += 24 * 60;
    if (offset < 0 || offset > 8 * 60) continue;

    const byOrdinal = sums.get(variantId) ?? new Map<number, { total: number; count: number }>();
    const cell = byOrdinal.get(ordinal) ?? { total: 0, count: 0 };
    cell.total += offset;
    cell.count += 1;
    byOrdinal.set(ordinal, cell);
    sums.set(variantId, byOrdinal);

    const departureKey = `${variantId}:${frequency}`;
    if (!seenDeparture.has(departureKey)) {
      seenDeparture.add(departureKey);
      const hours = departures.get(variantId) ?? new Array(24).fill(0);
      const hour = Math.floor(departureMinutes / 60) % 24;
      hours[hour] += 1;
      departures.set(variantId, hours);
    }
  }

  const offsets = new Map<number, Map<number, number>>();
  for (const [variantId, byOrdinal] of sums) {
    const means = new Map<number, number>();
    for (const [ordinal, cell] of byOrdinal) {
      if (cell.count > 0) means.set(ordinal, cell.total / cell.count);
    }
    offsets.set(variantId, means);
  }

  return { offsets, departures, stopsByVariant, rows };
}

function isInsideUruguay(point: LatLon): boolean {
  return point.lat > -35.5 && point.lat < -30 && point.lon > -58.6 && point.lon < -53;
}

export async function loadStmIndex(): Promise<StmIndex> {
  const [stopsFile, scheduleFile, namesFile] = await Promise.all([
    downloadStops(),
    downloadSchedule(),
    // El nombre de la línea es cosmético: si este archivo no está, la comparación se publica igual.
    downloadLineNames().catch(() => null),
  ]);
  const [stopsData, scheduleData, lineNames] = await Promise.all([
    parseStops(stopsFile),
    parseSchedule(scheduleFile),
    namesFile ? parseLineNames(namesFile).catch(() => new Map<number, string>()) : Promise.resolve(new Map<number, string>()),
  ]);

  // El shapefile manda para el NOMBRE de la línea (el CSV no lo trae) y el CSV manda para el
  // RECORRIDO, que es lo que decide si dos barrios están conectados. Una variante que sólo está en el
  // CSV entra igual, sin nombre: perder el nombre de una línea es cosmético, perder su recorrido es
  // perder la mitad de la red.
  for (const [variantId, sequence] of scheduleData.stopsByVariant) {
    const existing = stopsData.variants.get(variantId);
    if (existing && existing.stops.length >= sequence.size) continue;
    const stops = [...sequence.entries()]
      .map(([ordinal, stopId]) => ({ ordinal, stopId }))
      .filter(stop => stopsData.stops.has(stop.stopId))
      .sort((a, b) => a.ordinal - b.ordinal);
    if (!stops.length) continue;
    stopsData.variants.set(variantId, { id: variantId, line: existing?.line ?? lineNames.get(variantId) ?? "", stops });
  }

  // Y el nombre también para las variantes que sí estaban en el shapefile pero sin `DESC_LINEA`.
  for (const variant of stopsData.variants.values()) {
    if (!variant.line) variant.line = lineNames.get(variant.id) ?? "";
  }

  return {
    stops: stopsData.stops,
    variants: stopsData.variants,
    offsets: scheduleData.offsets,
    departures: scheduleData.departures,
    fetchedAt: new Date().toISOString(),
    scheduleRows: scheduleData.rows,
    stopRows: stopsData.rows,
  };
}

export const STM_SOURCES = {
  stops: { url: STOPS_FILE_URL, label: "Intendencia de Montevideo — paradas de ómnibus (v_uptu_paradas)" },
  schedule: { url: SCHEDULE_URL, label: "Intendencia de Montevideo — horarios por parada (uptu_pasada_variante)" },
} as const;

/** Escribe el índice a disco para inspeccionarlo a mano. Sólo lo usa `--dump`. */
export async function dumpStmIndex(index: StmIndex, file: string): Promise<void> {
  await writeFile(
    file,
    JSON.stringify(
      {
        stops: index.stops.size,
        variants: index.variants.size,
        offsets: index.offsets.size,
        scheduleRows: index.scheduleRows,
        sample: [...index.variants.values()].slice(0, 2),
      },
      null,
      2
    )
  );
}

export async function readCachedFile(name: string): Promise<Buffer | null> {
  try {
    return await readFile(join(cacheDir(), name));
  } catch {
    return null;
  }
}
