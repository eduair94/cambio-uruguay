// Los dos archivos que hay que recorrer día por día.
//
// Casi todas las series del tablero se piden de una: el publicador entrega el
// CSV entero y listo. Dos no:
//
//   * el Banco Central del Paraguay tiene archivo, pero sólo por día
//     (`?fecha=dd/mm/yyyy`). Nadie publica la serie paraguaya como serie, así
//     que la única forma de tenerla es armarla.
//   * el tablero uruguayo es NUESTRO: vive en la colección diaria de este mismo
//     backend desde diciembre de 2022, con hasta 48 casas por día. Nunca estuvo
//     en el tablero regional porque nadie lo había mirado como una serie.
//
// Los dos se recorren con presupuesto por corrida y saltando lo ya guardado: la
// primera corrida hace el trabajo pesado, las siguientes no hacen casi nada, y
// en ningún momento se le pega mil veces seguidas a un banco central.
import moment from "moment-timezone";
import { MongooseServer, mongoose } from "../database";
import { fetchBcpReferencialForDay } from "./sources/py_bcp";
import { buildUyQuotes, type LocalRateRow } from "./sources/uy_local";
import type { RegionalHistoryPoint } from "./types";

/** Desde dónde tiene archivo el BCP. Medido: 2014 responde, 2012 no. */
export const PY_HISTORY_START = "2014-01-01";

/** Primer día del tablero uruguayo propio. Medido contra la colección. */
export const UY_HISTORY_START = "2022-12-28";

/** Cuántos días pide cada corrida de cada archivo. */
export const PY_DAYS_PER_RUN = Number(process.env.REGIONAL_PY_DAYS_PER_RUN || 300);
export const UY_DAYS_PER_RUN = Number(process.env.REGIONAL_UY_DAYS_PER_RUN || 400);

/** Todos los días entre dos fechas, del más nuevo al más viejo. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${to}T00:00:00Z`);
  const start = new Date(`${from}T00:00:00Z`);
  while (cursor >= start) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}

/**
 * Los días que faltan, más nuevos primero.
 *
 * El orden importa: si el archivo se corta a la mitad —porque el proceso se
 * cae, porque la fuente se pone lenta— lo que quedó guardado es lo reciente,
 * que es lo que alguien va a mirar.
 */
export function missingDays(existing: Set<string>, from: string, to: string, budget: number): string[] {
  return daysBetween(from, to)
    .filter((day) => !existing.has(day))
    .slice(0, Math.max(0, budget));
}

export interface DeepHistoryResult {
  points: RegionalHistoryPoint[];
  /** Días pedidos en esta corrida. */
  asked: number;
  /** Días que respondieron con datos. */
  found: number;
  /** Días que quedan por pedir después de ésta. */
  remaining: number;
  note: string;
}

/** El referencial paraguayo, un día por pedido. */
export async function backfillPyReferencial(
  existing: Set<string>,
  today: string,
  budget = PY_DAYS_PER_RUN
): Promise<DeepHistoryResult> {
  const pending = daysBetween(PY_HISTORY_START, today).filter((day) => !existing.has(day));
  const batch = pending.slice(0, Math.max(0, budget));
  const points: RegionalHistoryPoint[] = [];
  let found = 0;
  let dead = 0;

  for (const day of batch) {
    const rows = await fetchBcpReferencialForDay(day);
    if (rows === null) {
      dead++;
      // Tres negativas seguidas: la página dejó de responder. Se corta y se
      // sigue mañana en vez de gastar el presupuesto contra una pared.
      if (dead >= 3) break;
      continue;
    }
    dead = 0;
    if (rows.length) {
      points.push(...rows);
      found++;
    }
  }

  return {
    points,
    asked: batch.length,
    found,
    remaining: Math.max(0, pending.length - batch.length),
    note: `${batch.length} días pedidos, ${found} con operaciones, ${Math.max(0, pending.length - batch.length)} pendientes`,
  };
}

/**
 * El tablero uruguayo, reconstruido día por día desde nuestra propia colección.
 *
 * Se rearma con `buildUyQuotes`, la MISMA función que arma la fila de hoy: si la
 * regla de qué casa entra y cuál es un cartel viejo cambia, el histórico y el
 * presente cambian juntos. Reconstruirlo con una lógica paralela sería garantizar
 * que un día dejen de coincidir.
 */
export async function backfillUyBoard(
  existing: Set<string>,
  today: string,
  budget = UY_DAYS_PER_RUN
): Promise<DeepHistoryResult> {
  const pending = daysBetween(UY_HISTORY_START, today).filter((day) => !existing.has(day));
  const batch = pending.slice(0, Math.max(0, budget));
  if (!batch.length) {
    return { points: [], asked: 0, found: 0, remaining: 0, note: "al día" };
  }

  const collection = mongoose.connection.db?.collection("cambio-uys");
  if (!collection) {
    return { points: [], asked: 0, found: 0, remaining: pending.length, note: "sin conexión a la colección diaria" };
  }

  // Una consulta por lote, no una por día: son ~180 filas por día.
  const from = new Date(`${batch[batch.length - 1]}T00:00:00Z`);
  const to = new Date(`${batch[0]}T23:59:59Z`);
  const rows = (await collection
    .find(
      { date: { $gte: from, $lte: to } },
      { projection: { _id: 0, origin: 1, code: 1, type: 1, buy: 1, sell: 1, date: 1 } }
    )
    .toArray()) as unknown as Array<LocalRateRow & { date: Date }>;

  const wanted = new Set(batch);
  const byDay = new Map<string, LocalRateRow[]>();
  for (const row of rows) {
    // La fila diaria tiene DOS codificaciones de fecha (medianoche UTC en las
    // viejas, medianoche de Montevideo en las nuevas). Se normaliza al día
    // calendario de Montevideo, que es el que la fila representa.
    const day = moment.tz(row.date, "America/Montevideo").format("YYYY-MM-DD");
    if (!wanted.has(day)) continue;
    const list = byDay.get(day);
    if (list) list.push(row);
    else byDay.set(day, [row]);
  }

  const points: RegionalHistoryPoint[] = [];
  let found = 0;
  for (const [day, dayRows] of byDay) {
    const quotes = buildUyQuotes(dayRows, new Date(`${day}T23:59:00-03:00`));
    if (!quotes.length) continue;
    found++;
    for (const quote of quotes) {
      points.push({
        key: quote.id,
        country: "UY",
        market: quote.market,
        base: quote.base,
        quote: quote.quote,
        day,
        buy: quote.buy,
        sell: quote.sell,
        avg: quote.avg,
        source: quote.source,
      });
    }
  }

  return {
    points,
    asked: batch.length,
    found,
    remaining: Math.max(0, pending.length - batch.length),
    note: `${batch.length} días leídos, ${found} con tablero, ${Math.max(0, pending.length - batch.length)} pendientes`,
  };
}

/** Para que el job no tenga que saber de mongoose. */
export function dailyBoardCollectionExists(): boolean {
  return Boolean(mongoose.connection.db) && MongooseServer.isConnected();
}
